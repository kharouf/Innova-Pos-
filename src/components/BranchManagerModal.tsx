import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseState, BranchMeta } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { showToast } from '../utils/toast';
import { DEFAULT_SETTINGS, saveSuperetteDatabase, getSuperetteDatabase } from '../utils/db';
import { saveUserSuperetteMeta, deleteUserSuperetteMeta, seedUserDatabase } from '../utils/firebaseSync';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  Phone, 
  MapPin, 
  User, 
  ShieldCheck, 
  ArrowRightLeft,
  BarChart3,
  Copy,
  Layers,
  Sparkles
} from 'lucide-react';

interface BranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: BranchMeta[];
  currentBranchId: string;
  onSwitchBranch: (branchId: string) => void;
  onRefreshBranches: () => Promise<void>;
  onOpenStockTransfer: () => void;
  onOpenGlobalOverview: () => void;
  currentDb: DatabaseState;
  user?: any;
}

export default function BranchManagerModal({
  isOpen,
  onClose,
  branches,
  currentBranchId,
  onSwitchBranch,
  onRefreshBranches,
  onOpenStockTransfer,
  onOpenGlobalOverview,
  currentDb,
  user
}: BranchManagerModalProps) {
  const { language, formatCurrency } = useLanguage();
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingBranch, setEditingBranch] = useState<BranchMeta | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  const [catalogStrategy, setCatalogStrategy] = useState<'clone_zero' | 'clone_with_stock' | 'empty'>('clone_zero');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setName('');
    setPhone('');
    setAddress('');
    setCity('');
    setManagerName('');
    setCatalogStrategy('clone_zero');
    setViewMode('add');
  };

  const handleOpenEdit = (branch: BranchMeta) => {
    setEditingBranch(branch);
    setName(branch.name);
    setPhone(branch.phone || '');
    setAddress(branch.address || '');
    setCity(branch.city || '');
    setManagerName(branch.managerName || '');
    setViewMode('edit');
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(language === 'ar' ? '⚠️ يرجى إدخال اسم الفرع' : '⚠️ Nom de la branche requis', 'error');
      return;
    }

    setIsSaving(true);
    const userId = user ? user.uid : 'default';

    try {
      const newBranchId = 'branch-' + Math.random().toString(36).substring(2, 9);
      const newMeta: BranchMeta = {
        id: newBranchId,
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        managerName: managerName.trim() || undefined,
        isMain: false,
        createdAt: new Date().toISOString().split('T')[0]
      };

      // Prepare Initial DB Products for the new branch based on strategy
      let initialProducts = [];
      if (catalogStrategy === 'clone_zero') {
        initialProducts = currentDb.products.map(p => ({ ...p, stock: 0 }));
      } else if (catalogStrategy === 'clone_with_stock') {
        initialProducts = currentDb.products.map(p => ({ ...p }));
      }

      const initialDbForNewBranch: DatabaseState = {
        products: initialProducts,
        partners: [],
        invoices: [],
        payments: [],
        traites: [],
        expenses: [],
        settings: {
          ...DEFAULT_SETTINGS,
          storeName: name.trim(),
          storePhone: phone.trim() || DEFAULT_SETTINGS.storePhone,
          storeAddress: address.trim() || DEFAULT_SETTINGS.storeAddress,
          themeMode: currentDb.settings?.themeMode || 'light'
        }
      };

      // Save locally & to Firestore
      saveSuperetteDatabase(userId, newBranchId, initialDbForNewBranch);
      await saveUserSuperetteMeta(userId, newMeta);

      if (user) {
        await seedUserDatabase(user.uid, initialDbForNewBranch, newBranchId).catch(err => {
          console.warn("Seeding new branch cloud error:", err);
        });
      }

      await onRefreshBranches();

      showToast(
        language === 'ar' 
          ? `✅ تم إنشاء الفرع الجديد [${name.trim()}] بنجاح!` 
          : `✅ Nouvelle branche [${name.trim()}] créée avec succès !`,
        'success'
      );

      // Auto switch to newly created branch
      onSwitchBranch(newBranchId);
      onClose();
    } catch (err) {
      console.error("Create branch error:", err);
      showToast(language === 'ar' ? '❌ تعذر إنشاء الفرع الجديد' : '❌ Erreur de création', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !name.trim()) return;

    setIsSaving(true);
    const userId = user ? user.uid : 'default';

    try {
      const updatedMeta: BranchMeta = {
        ...editingBranch,
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        managerName: managerName.trim() || undefined
      };

      await saveUserSuperetteMeta(userId, updatedMeta);

      // Also update the storeSettings name/phone/address in the branch database
      const branchDb = getSuperetteDatabase(userId, editingBranch.id);
      const updatedBranchDb: DatabaseState = {
        ...branchDb,
        settings: {
          ...(branchDb.settings || DEFAULT_SETTINGS),
          storeName: name.trim(),
          storePhone: phone.trim() || branchDb.settings?.storePhone || '',
          storeAddress: address.trim() || branchDb.settings?.storeAddress || ''
        }
      };
      saveSuperetteDatabase(userId, editingBranch.id, updatedBranchDb);

      await onRefreshBranches();

      showToast(
        language === 'ar' ? '✅ تم تحديث بيانات الفرع بنجاح!' : '✅ Branche mise à jour !',
        'success'
      );
      setViewMode('list');
      setEditingBranch(null);
    } catch (err) {
      console.error("Update branch error:", err);
      showToast(language === 'ar' ? '❌ تعذر تعديل الفرع' : '❌ Erreur de mise à jour', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (branchId === 'default' || branchId === currentBranchId) {
      showToast(
        language === 'ar' ? '⚠️ لا يمكن حذف الفرع الرئيسي أو الفرع النشط حالياً' : '⚠️ Impossible de supprimer la branche active/principale',
        'error'
      );
      return;
    }

    const userId = user ? user.uid : 'default';
    try {
      await deleteUserSuperetteMeta(userId, branchId);
      await onRefreshBranches();
      setDeletingBranchId(null);
      showToast(language === 'ar' ? '🗑️ تم حذف الفرع بنجاح' : '🗑️ Branche supprimée', 'info');
    } catch (err) {
      console.error("Delete branch error:", err);
      showToast(language === 'ar' ? '❌ تعذر حذف الفرع' : '❌ Erreur de suppression', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-6 relative max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        <button
          type="button"
          disabled={isSaving}
          onClick={onClose}
          className="absolute top-5 right-5 rtl:left-5 rtl:right-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={language === 'ar' ? 'إغلاق' : 'Fermer'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                {viewMode === 'list' && (language === 'ar' ? '🏢 مركز إدارة الفروع ونقاط البيع' : '🏢 Gestion des Succursales & Branches')}
                {viewMode === 'add' && (language === 'ar' ? '➕ إضافة نقطة بيع أو فرع جديد' : '➕ Nouvelle Succursale')}
                {viewMode === 'edit' && (language === 'ar' ? '✏️ تعديل بيانات الفرع' : '✏️ Modifier la Branche')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'إدارة الحسابات المنفصلة، المخزون المستقل، وتقارير المبيعات لكل فرع.' 
                  : 'Gérez vos points de vente avec inventaire, comptabilité et factures isolés.'}
              </p>
            </div>
          </div>

          {viewMode === 'list' && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'إضافة فرع' : 'Ajouter'}</span>
            </button>
          )}
        </div>

        {/* VIEW MODE: LIST OF BRANCHES */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {/* Quick Action Tools Bar */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStockTransfer();
                }}
                className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-center gap-2.5 text-start transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block">
                    {language === 'ar' ? 'تحويل بضاعة بين الفروع' : 'Transfert de Stock'}
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-medium">
                    {language === 'ar' ? 'نقل كميات فوري وآمن' : 'Déplacer des articles'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGlobalOverview();
                }}
                className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-2.5 text-start transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                    {language === 'ar' ? 'التقرير الموحد لجميع الفروع' : 'Rapport Consolidé'}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                    {language === 'ar' ? 'إجمالي المبيعات والأرباح' : 'Statistiques globales'}
                  </span>
                </div>
              </button>
            </div>

            {/* Branches List */}
            <div className="space-y-3">
              {branches.map(b => {
                const isActive = b.id === currentBranchId;
                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isActive 
                        ? 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 shadow-sm ring-1 ring-blue-500/20' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          🏢 {b.name}
                        </span>
                        {b.isMain && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            {language === 'ar' ? 'الفرع الرئيسي' : 'Principal'}
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{language === 'ar' ? 'الفرع النشط' : 'Actif'}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                        {b.city && <span>📍 {b.city}</span>}
                        {b.address && <span>🏠 {b.address}</span>}
                        {b.phone && <span>📞 {b.phone}</span>}
                        {b.managerName && <span>👤 {b.managerName}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchBranch(b.id);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                        >
                          <span>{language === 'ar' ? 'فتح' : 'Ouvrir'}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{language === 'ar' ? 'محدد' : 'Actif'}</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(b)}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title={language === 'ar' ? 'تعديل بيانات الفرع' : 'Modifier'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {!b.isMain && b.id !== 'default' && b.id !== currentBranchId && (
                        <button
                          type="button"
                          onClick={() => setDeletingBranchId(b.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                          title={language === 'ar' ? 'حذف الفرع' : 'Supprimer'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Delete Confirmation Dialog */}
            {deletingBranchId && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-3">
                <div className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  {language === 'ar' ? '⚠️ هل أنت متأكد من رغبتك في حذف هذا الفرع؟' : '⚠️ Confirmer la suppression de cette branche ?'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteBranch(deletingBranchId)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    {language === 'ar' ? 'نعم، تأكيد الحذف' : 'Oui, Supprimer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingBranchId(null)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW MODE: ADD NEW BRANCH */}
        {viewMode === 'add' && (
          <form onSubmit={handleCreateBranch} className="space-y-4 text-start">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'إسم الفرع أو نقطة البيع *' : 'Nom de la Succursale / Point de Vente *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'مثال: فرع قابس - الغنوش' : 'Ex: Succursale Gabes'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'المدينة / المنطقة' : 'Ville / Région'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'مثال: قابس، تونس، صفاقس' : 'Ex: Gabes, Tunis'}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'رقم هاتف الفرع' : 'Téléphone de la branche'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'مثال: +216 24260711' : 'Ex: +216 24260711'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'العنوان الجغرافي للفرع' : 'Adresse physique'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'مثال: شارع الحبيب بورقيبة غنوش قابس' : 'Ex: Avenue Habib Bourguiba...'}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'اسم مسؤول الفرع / الكاشير' : 'Responsable / Gérant de la branche'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'مثال: أحمد الطرابلسي' : 'Ex: Ahmed...'}
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Starting Inventory Strategy */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {language === 'ar' ? '📦 تهيئة قائمة المنتجات للفرع الجديد' : '📦 Stratégie de Catalogue Initial'}
              </label>

              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  catalogStrategy === 'clone_zero'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}>
                  <input
                    type="radio"
                    name="catalogStrategy"
                    checked={catalogStrategy === 'clone_zero'}
                    onChange={() => setCatalogStrategy('clone_zero')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {language === 'ar' 
                        ? 'نسخ قائمة أسماء وأسعار السلع من الفرع الحالي مع تصفير الكميات (0 مخزون)' 
                        : 'Dupliquer le catalogue actuel avec stock à zéro (0)'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'ar'
                        ? 'الخيار الموصى به: يتيح نفس الباركود والأسعار لتعبئة المخزون الخاص بالفرع الجديد بسهولة.'
                        : 'Option recommandée : mêmes codes-barres et tarifs, gestion de stock indépendante.'}
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  catalogStrategy === 'empty'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}>
                  <input
                    type="radio"
                    name="catalogStrategy"
                    checked={catalogStrategy === 'empty'}
                    onChange={() => setCatalogStrategy('empty')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {language === 'ar' ? 'البدء بقائمة فارغة تماماً' : 'Commencer avec un catalogue vierge'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'ar' ? 'إدخال منتجات جديدة خاصة بهذا الفرع من الصفر.' : 'Ajoutez manuellement les articles du nouveau point de vente.'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setViewMode('list')}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs py-3 rounded-xl cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'رجوع' : 'Retour'}
              </button>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{language === 'ar' ? 'تأكيد إنشاء الفرع' : 'Créer la Succursale'}</span>
              </button>
            </div>
          </form>
        )}

        {/* VIEW MODE: EDIT BRANCH */}
        {viewMode === 'edit' && editingBranch && (
          <form onSubmit={handleUpdateBranch} className="space-y-4 text-start">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'إسم الفرع أو نقطة البيع *' : 'Nom de la Succursale *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'المدينة / المنطقة' : 'Ville / Région'}
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'رقم هاتف الفرع' : 'Téléphone'}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'العنوان الجغرافي للفرع' : 'Adresse'}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'اسم مسؤول الفرع / الكاشير' : 'Gérant / Responsable'}
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setViewMode('list');
                  setEditingBranch(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs py-3 rounded-xl cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{language === 'ar' ? 'حفظ التعديلات' : 'Enregistrer'}</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
