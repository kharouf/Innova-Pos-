import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Product, DatabaseState, BranchMeta } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { showToast } from '../utils/toast';
import { getSuperetteDatabase, saveSuperetteDatabase } from '../utils/db';
import { loadUserDatabase, seedUserDatabase, syncDatabaseDiff } from '../utils/firebaseSync';
import { 
  ArrowRightLeft, 
  Building2, 
  Boxes, 
  CheckCircle2, 
  Search, 
  AlertTriangle, 
  X,
  Send,
  Package,
  Layers
} from 'lucide-react';

interface BranchStockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranchId: string;
  branches: BranchMeta[];
  currentDb: DatabaseState;
  onUpdateCurrentDb: (updatedDb: DatabaseState) => void;
  user?: any;
}

export default function BranchStockTransferModal({
  isOpen,
  onClose,
  currentBranchId,
  branches,
  currentDb,
  onUpdateCurrentDb,
  user
}: BranchStockTransferModalProps) {
  const { language, formatCurrency } = useLanguage();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentBranch = branches.find(b => b.id === currentBranchId) || {
    id: currentBranchId,
    name: currentDb.settings?.storeName || 'الفرع الحالي'
  };

  const otherBranches = branches.filter(b => b.id !== currentBranchId);

  const filteredProducts = currentDb.products.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.code && p.code.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  });

  const selectedProduct = currentDb.products.find(p => p.id === selectedProductId);

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast(language === 'ar' ? '⚠️ يرجى اختيار المنتج المراد تحويله' : '⚠️ Veuillez sélectionner un article', 'error');
      return;
    }

    if (!targetBranchId) {
      showToast(language === 'ar' ? '⚠️ يرجى تحديد الفرع المستلم' : '⚠️ Veuillez choisir la branche destinataire', 'error');
      return;
    }

    if (transferQty <= 0) {
      showToast(language === 'ar' ? '⚠️ الكمية يجب أن تكون أكبر من الصفر' : '⚠️ Quantité invalide', 'error');
      return;
    }

    if (transferQty > selectedProduct.stock) {
      showToast(
        language === 'ar' 
          ? `⚠️ الكمية المطلوبة (${transferQty}) تتجاوز المخزون المتوفر في هذا الفرع (${selectedProduct.stock})!` 
          : `⚠️ Stock insuffisant (${selectedProduct.stock} dispo)`, 
        'error'
      );
      return;
    }

    const targetBranch = branches.find(b => b.id === targetBranchId);
    const targetBranchName = targetBranch?.name || 'الفرع المستلم';

    setIsTransferring(true);

    try {
      // 1. Deduct from Current Branch
      const updatedCurrentProducts = currentDb.products.map(p => {
        if (p.id === selectedProduct.id) {
          return {
            ...p,
            stock: Math.max(0, p.stock - transferQty)
          };
        }
        return p;
      });

      const updatedCurrentDb: DatabaseState = {
        ...currentDb,
        products: updatedCurrentProducts
      };

      onUpdateCurrentDb(updatedCurrentDb);

      // 2. Load & Add to Target Branch
      const userId = user ? user.uid : 'default';
      let targetDb: DatabaseState = getSuperetteDatabase(userId, targetBranchId);

      // If user is connected to cloud, attempt cloud pull
      if (user) {
        try {
          const cloudTargetDb = await loadUserDatabase(user.uid, targetBranchId);
          if (cloudTargetDb) targetDb = cloudTargetDb;
        } catch (err) {
          console.warn("Could not load target branch from cloud, using local:", err);
        }
      }

      // Check if product exists in target branch
      const existingInTargetIndex = targetDb.products.findIndex(
        p => p.id === selectedProduct.id || (p.code && p.code === selectedProduct.code)
      );

      let updatedTargetProducts = [...targetDb.products];

      if (existingInTargetIndex >= 0) {
        const targetProd = updatedTargetProducts[existingInTargetIndex];
        updatedTargetProducts[existingInTargetIndex] = {
          ...targetProd,
          stock: (targetProd.stock || 0) + transferQty
        };
      } else {
        // Auto clone product to target branch with initial transferred stock
        updatedTargetProducts.push({
          ...selectedProduct,
          stock: transferQty
        });
      }

      const updatedTargetDb: DatabaseState = {
        ...targetDb,
        products: updatedTargetProducts
      };

      // Save target branch locally & cloud
      saveSuperetteDatabase(userId, targetBranchId, updatedTargetDb);

      if (user) {
        syncDatabaseDiff(user.uid, targetDb, updatedTargetDb, targetBranchId).catch(e => {
          console.warn("Syncing target branch transfer error:", e);
        });
      }

      showToast(
        language === 'ar'
          ? `✅ تم تحويل ${transferQty} ${selectedProduct.unit || 'وحدة'} من [${selectedProduct.name}] بنجاح إلى [${targetBranchName}]!`
          : `✅ Transfert de ${transferQty} ${selectedProduct.unit || 'unités'} vers [${targetBranchName}] validé !`,
        'success'
      );

      onClose();
    } catch (err) {
      console.error("Transfer error:", err);
      showToast(language === 'ar' ? '❌ حدث خطأ أثناء تنفيذ التحويل' : '❌ Erreur de transfert', 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isTransferring) onClose();
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 space-y-6 relative max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        <button
          type="button"
          disabled={isTransferring}
          onClick={onClose}
          className="absolute top-5 right-5 rtl:left-5 rtl:right-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={language === 'ar' ? 'إغلاق' : 'Fermer'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner">
            <ArrowRightLeft className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
              {language === 'ar' ? '🔄 تحويل المخزون والبضاعة بين الفروع' : '🔄 Transfert de Stock Inter-Branches'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'ar' 
                ? 'خصم كمية من الفرع الحالي وإضافتها فورياً إلى فرع آخر مع تحديث الأرصدة.'
                : 'Déplacez des quantités en temps réel vers un autre point de vente.'}
            </p>
          </div>
        </div>

        {otherBranches.length === 0 ? (
          <div className="p-6 text-center space-y-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <div className="text-sm font-bold text-amber-900 dark:text-amber-300">
              {language === 'ar' ? 'لا يوجد فروع أخرى مسجلة حالياً' : 'Aucune autre branche disponible'}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {language === 'ar'
                ? 'يرجى إنشاء فرع إضافي أولاً من خلال نافذة إدارة الفروع للتمكن من تحويل المخزون بينها.'
                : 'Veuillez créer une nouvelle branche avant de pouvoir transférer du stock.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleExecuteTransfer} className="space-y-5">
            {/* Visual Route Indicator */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex-1 text-center p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                  {language === 'ar' ? 'من الفرع الحالي (المصدر)' : 'De la branche source'}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400 truncate block">
                  🏢 {currentBranch.name}
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>

              <div className="flex-1 text-center p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                  {language === 'ar' ? 'إلى الفرع المستلم' : 'Vers la branche cible'}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                  {targetBranchId 
                    ? `🏢 ${branches.find(b => b.id === targetBranchId)?.name || targetBranchId}`
                    : (language === 'ar' ? 'حدد الفرع...' : 'Sélectionnez...')}
                </span>
              </div>
            </div>

            {/* Target Branch Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {language === 'ar' ? 'الفرع المستلم *' : 'Branche Destinataire *'}
              </label>
              <select
                required
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">{language === 'ar' ? '-- اختر الفرع المستلم --' : '-- Choisir la branche --'}</option>
                {otherBranches.map(b => (
                  <option key={b.id} value={b.id}>
                    🏢 {b.name} {b.city ? `(${b.city})` : ''} {b.address ? `- ${b.address}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Selector with Live Search */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {language === 'ar' ? 'المنتج المراد تحويله *' : 'Article à Transférer *'}
              </label>
              
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3 rtl:right-3 rtl:left-auto" />
                <input 
                  type="text"
                  placeholder={language === 'ar' ? 'بحث باسم السلعة أو الباركود...' : 'Recherche par nom ou code...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2 pl-9 pr-9 text-xs focus:outline-hidden focus:border-indigo-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute top-1/2 -translate-y-1/2 right-3 rtl:left-3 rtl:right-auto text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                required
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setTransferQty(1);
                }}
                size={5}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-1 px-2 text-xs font-medium focus:outline-hidden focus:border-indigo-500 transition-all custom-scrollbar"
              >
                {filteredProducts.length === 0 ? (
                  <option disabled className="p-2 text-slate-400 text-center">
                    {language === 'ar' ? 'لا يوجد منتجات مطابقة' : 'Aucun article trouvé'}
                  </option>
                ) : (
                  filteredProducts.map(p => (
                    <option key={p.id} value={p.id} className="p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer">
                      📦 {p.name} — [المخزون الحالي: {p.stock} {p.unit || 'وحدة'}] — {formatCurrency(p.sellingPrice)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Selected Product Summary & Quantity */}
            {selectedProduct && (
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-150 dark:border-indigo-900/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedProduct.name}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                    selectedProduct.stock > 0 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}>
                    {language === 'ar' ? `المخزون المتوفر: ${selectedProduct.stock}` : `Stock dispo: ${selectedProduct.stock}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      {language === 'ar' ? 'الكمية المحولة *' : 'Quantité à transférer *'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={selectedProduct.stock}
                        value={transferQty}
                        onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2 px-3 text-sm font-bold text-center focus:outline-hidden focus:border-indigo-500"
                      />
                      <span className="text-xs text-slate-500 font-bold shrink-0">
                        {selectedProduct.unit || 'Pcs'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      {language === 'ar' ? 'المخزون المتبقي بعد التحويل' : 'Stock restant après transfert'}
                    </label>
                    <div className="py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-center text-slate-700 dark:text-slate-300">
                      {Math.max(0, selectedProduct.stock - transferQty)} {selectedProduct.unit || 'Pcs'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {language === 'ar' ? 'ملاحظة أو سبب التحويل (اختياري)' : 'Motif ou référence du transfert (optionnel)'}
              </label>
              <input
                type="text"
                placeholder={language === 'ar' ? 'مثال: تعزيز مخزون فرع تونس، رقم إذن الإرسال #104' : 'Ex: Réapprovisionnement urgent...'}
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isTransferring}
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs py-3 rounded-xl cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>

              <button
                type="submit"
                disabled={isTransferring || !selectedProduct || !targetBranchId || selectedProduct.stock < 1}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/20"
              >
                {isTransferring ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{language === 'ar' ? 'تأكيد وإرسال التحويل' : 'Valider le Transfert'}</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
