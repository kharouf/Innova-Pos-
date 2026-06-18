import React, { useState, useEffect } from 'react';
import { UserLicenseData, generateLicenseKey } from '../utils/licensing';
import { SystemUpdate } from '../types';
import { 
  loadAllTenantLicenses, 
  saveUserLicense, 
  deleteTenantCompletely,
  loadSystemUpdates,
  saveSystemUpdate,
  deleteSystemUpdate
} from '../utils/firebaseSync';
import { useLanguage } from '../utils/LanguageContext';
import { 
  ShieldAlert, 
  MapPin,
  Users, 
  UserCheck, 
  Clock, 
  Search, 
  RefreshCw, 
  UserX, 
  KeyRound, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Clipboard,
  ExternalLink,
  Rocket,
  Plus,
  Edit,
  Trash2,
  Info,
  Check,
  X,
  PlusCircle
} from 'lucide-react';

export default function SaaSDeveloperConsole() {
  const { language, formatCurrency } = useLanguage();
  const [activeTab, setActiveTab] = useState<'tenants' | 'updates'>('tenants');
  
  // Tenants (Clients) States
  const [tenants, setTenants] = useState<UserLicenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Editing tenant row inline state
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'trial' | 'active' | 'suspended' | 'expired'>('trial');
  const [editExpiry, setEditExpiry] = useState('');
  const [editActivationDate, setEditActivationDate] = useState('');
  const [editAnnouncement, setEditAnnouncement] = useState('');
  const [editStoreName, setEditStoreName] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Pre-registration state
  const [showAddTenantForm, setShowAddTenantForm] = useState(false);
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantUid, setNewTenantUid] = useState('');
  const [newTenantStoreName, setNewTenantStoreName] = useState('');
  const [newTenantStatus, setNewTenantStatus] = useState<'trial' | 'active' | 'suspended' | 'expired'>('trial');
  const [newTenantRegisteredAt, setNewTenantRegisteredAt] = useState('');
  const [newTenantActivationDate, setNewTenantActivationDate] = useState('');
  const [newTenantExpiry, setNewTenantExpiry] = useState('');
  const [newTenantLocation, setNewTenantLocation] = useState('');

  // Updates (Mise à jour) States
  const [updatesList, setUpdatesList] = useState<SystemUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [showAddUpdateForm, setShowAddUpdateForm] = useState(false);
  const [editUpdateId, setEditUpdateId] = useState<string | null>(null); // holds update ID if editing
  
  // Form fields for system update
  const [updateId, setUpdateId] = useState(''); // e.g., 'v1.4.0'
  const [updateTitleFr, setUpdateTitleFr] = useState('');
  const [updateTitleAr, setUpdateTitleAr] = useState('');
  const [updateType, setUpdateType] = useState<'major' | 'feature' | 'patch'>('feature');
  const [updateDescFr, setUpdateDescFr] = useState('');
  const [updateDescAr, setUpdateDescAr] = useState('');

  // Floating Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3050);
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const data = await loadAllTenantLicenses();
      setTenants(data);
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to fetch tenants database');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdates = async () => {
    setUpdatesLoading(true);
    try {
      const list = await loadSystemUpdates();
      setUpdatesList(list);
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to fetch system updates catalog');
    } finally {
      setUpdatesLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchUpdates();
  }, []);

  const handleRefreshAll = () => {
    fetchTenants();
    fetchUpdates();
    showToast(language === 'ar' ? '🔄 تم تحديث السيرفر السحابي وقاعدة البيانات!' : '🔄 Données SaaS actualisées depuis Firestore !');
  };

  // ----- TENANT ACTIONS -----
  const handleStartEditTenant = (t: UserLicenseData) => {
    setEditingTenantId(t.uid);
    setEditStatus(t.licenseStatus);
    setEditExpiry(t.licenseExpiry);
    setEditActivationDate(t.activationDate || '');
    setEditAnnouncement(t.remoteAnnouncement || '');
    setEditStoreName(t.businessName || '');
    setEditLocation(t.location || '');
  };

  const handleSaveTenantLicense = async (uid: string) => {
    setActionLoading(uid);
    try {
      const newKey = generateLicenseKey(uid, editExpiry);
      
      let actDate = editActivationDate.trim();
      if (editStatus === 'active' && !actDate) {
        actDate = new Date().toISOString().split('T')[0];
      }

      const updatedFields: Partial<UserLicenseData> = {
        licenseExpiry: editExpiry,
        licenseStatus: editStatus,
        licenseKey: newKey,
        activationDate: actDate || undefined,
        remoteAnnouncement: editAnnouncement.trim() || undefined,
        businessName: editStoreName.trim() || undefined,
        location: editLocation.trim() || undefined,
      };

      await saveUserLicense(uid, updatedFields);
      showToast(language === 'ar' ? '✅ تم تحديث ترخيص المشترك وإجراءاته بنجاح!' : '✅ Licence mise à jour avec succès !');
      setEditingTenantId(null);
      await fetchTenants();
    } catch (err) {
      console.error(err);
      showToast('❌ Error saving license update');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTenant = async (uid: string) => {
    setActionLoading(uid);
    try {
      await deleteTenantCompletely(uid);
      showToast(language === 'ar' ? '🗑️ تم حذف حساب المشترك وقاعدة بياناته بالكامل بنجاح!' : '🗑️ Compte de la boutique nettoyé complètement !');
      setDeletingTenantId(null);
      await fetchTenants();
    } catch (err) {
      console.error(err);
      showToast('❌ Error deleting tenant database');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateNewTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantUid.trim() || !newTenantEmail.trim()) {
      showToast(language === 'ar' ? '⚠️ يرجى إدخال البريد الإلكتروني و كود الـ UID' : '⚠️ Email et UID obligatoires !');
      return;
    }

    const targetUid = newTenantUid.trim();
    setActionLoading(targetUid);
    try {
      const regDate = newTenantRegisteredAt || new Date().toISOString().split('T')[0];
      const expiryDate = newTenantExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 Year default
      
      let actDate = newTenantActivationDate.trim();
      if (newTenantStatus === 'active' && !actDate) {
        actDate = new Date().toISOString().split('T')[0];
      }

      const hashKey = generateLicenseKey(targetUid, expiryDate);

      const payload: UserLicenseData = {
        uid: targetUid,
        email: newTenantEmail.trim(),
        registeredAt: regDate,
        activationDate: actDate || undefined,
        licenseExpiry: expiryDate,
        licenseStatus: newTenantStatus,
        licenseKey: hashKey,
        businessName: newTenantStoreName.trim() || 'Superette Tunisienne',
        location: newTenantLocation.trim() || '',
        remoteAnnouncement: newTenantStatus === 'trial' 
          ? 'Bienvenue sur INNOVA POS PRO. Version démonstration active.' 
          : 'Votre abonnement annuel Innova POS a été configuré avec succès.'
      };

      await saveUserLicense(targetUid, payload);
      showToast(language === 'ar' ? '✅ تم تسجيل المشترك وحفظ رخصته بنجاح!' : '✅ Utilisateur pré-enregistré avec succès !');
      
      // Reset variables
      setNewTenantUid('');
      setNewTenantEmail('');
      setNewTenantStoreName('');
      setNewTenantStatus('trial');
      setNewTenantRegisteredAt('');
      setNewTenantActivationDate('');
      setNewTenantExpiry('');
      setNewTenantLocation('');
      setShowAddTenantForm(false);
      
      await fetchTenants();
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to register new tenant');
    } finally {
      setActionLoading(null);
    }
  };

  // ----- SYSTEM UPDATE (MISE A JOUR) ACTIONS -----
  const handleSaveSystemUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateId.trim() || !updateTitleFr.trim() || !updateTitleAr.trim()) {
      showToast(language === 'ar' ? '⚠️ يرجى تعبئة الحقول الأساسية ورقم الإصدار' : '⚠️ Remplissez les champs obligatoires');
      return;
    }

    const payload: SystemUpdate = {
      id: updateId.trim(),
      date: new Date().toLocaleDateString('fr-FR') + ' - ' + new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
      titleFr: updateTitleFr.trim(),
      titleAr: updateTitleAr.trim(),
      descriptionFr: updateDescFr.split('\n').map(line => line.trim()).filter(Boolean),
      descriptionAr: updateDescAr.split('\n').map(line => line.trim()).filter(Boolean),
      type: updateType
    };

    try {
      await saveSystemUpdate(payload);
      showToast(language === 'ar' ? '🚀 تم حفظ ونشر ملف التحديث بنجاح!' : '🚀 Mise à jour publiée avec succès !');
      setShowAddUpdateForm(false);
      // Clear form
      setUpdateId('');
      setUpdateTitleFr('');
      setUpdateTitleAr('');
      setUpdateDescFr('');
      setUpdateDescAr('');
      setEditUpdateId(null);
      await fetchUpdates();
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to save system update');
    }
  };

  const handleStartEditUpdate = (up: SystemUpdate) => {
    setEditUpdateId(up.id);
    setUpdateId(up.id);
    setUpdateTitleFr(up.titleFr);
    setUpdateTitleAr(up.titleAr);
    setUpdateType(up.type);
    setUpdateDescFr(up.descriptionFr.join('\n'));
    setUpdateDescAr(up.descriptionAr.join('\n'));
    setShowAddUpdateForm(true);
  };

  const handleDeleteSystemUpdate = async (id: string) => {
    if (!window.confirm(language === 'ar' ? `⚠️ هل أنت متأكد من رغبتك في حذف وإلغاء الإصدار ${id}؟` : `Voulez-vous vraiment retirer la mise à jour ${id} ?`)) {
      return;
    }
    try {
      await deleteSystemUpdate(id);
      showToast(language === 'ar' ? '🗑️ تم إزالة ملف التحديث وسحبه بنجاح!' : '🗑️ Version mise à jour retirée !');
      await fetchUpdates();
    } catch (err) {
      console.error(err);
      showToast('❌ Error deleting system update');
    }
  };

  // ----- HELPERS -----
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(language === 'ar' ? '📋 تم نسخ الرمز إلى الحافظة!' : '📋 Code d\'activation copié !');
  };

  const getDaysLeftLabel = (expiryDateStr: string) => {
    if (!expiryDateStr) return { label: 'Aucun', color: 'text-slate-400 bg-slate-50 border-slate-100' };
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        label: language === 'ar' ? `منتهي منذ ${Math.abs(diffDays)} يوم` : `Expiré de ${Math.abs(diffDays)} j`,
        color: 'text-rose-600 bg-rose-50 border-rose-200'
      };
    } else if (diffDays === 0) {
      return {
        label: language === 'ar' ? 'ينتهي اليوم ⚠️' : 'Expire aujourd’hui ⚠️',
        color: 'text-amber-600 bg-amber-50 border-amber-300 animate-pulse font-black'
      };
    } else if (diffDays <= 7) {
      return {
        label: language === 'ar' ? `${diffDays} أيام متبقية ⚠️` : `${diffDays} j restants ⚠️`,
        color: 'text-amber-600 bg-amber-50 border-amber-200 font-bold'
      };
    } else {
      return {
        label: language === 'ar' ? `${diffDays} يوم متبقي` : `${diffDays} j restants`,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-250 font-bold'
      };
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      (t.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.uid || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && t.licenseStatus === filterStatus;
  });

  // KPI Calculations
  const totalCount = tenants.length;
  const activeCount = tenants.filter(t => t.licenseStatus === 'active').length;
  const trialCount = tenants.filter(t => t.licenseStatus === 'trial').length;
  const suspendedCount = tenants.filter(t => t.licenseStatus === 'suspended' || t.licenseStatus === 'expired').length;

  return (
    <div className="space-y-6 font-sans p-1 text-slate-800" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Floating Alert Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white font-sans text-xs font-bold py-3 px-5 rounded-lg shadow-xl flex items-center gap-2">
          <span className="text-emerald-400 animate-pulse text-sm">●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary SaaS Console Header Block */}
      <div className="bg-slate-900 text-white p-6 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-start">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] uppercase font-mono font-black rounded">
              {language === 'ar' ? 'لوحة تحكم المطور والتحكم بكامل النظام' : 'Developer Admin Web SaaS Suite'}
            </span>
          </div>
          <h1 className="text-xl font-display font-black tracking-tight flex items-center gap-2 text-white">
            <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
            <span>{language === 'ar' ? 'لوحة القيادة السحابية المتكاملة | Innova POS Pro' : 'Console de Pilotage Centralisée | Innova POS Pro'}</span>
          </h1>
          <p className="text-slate-400 mt-1 text-xs">
            {language === 'ar' 
              ? 'النافذة المركزية للأدمن لإدارة محلات البقالة وتراخيص المشتركين ونشر تحديثات النظام الفورية.' 
              : 'Gérer l\'ensemble des points de vente connectés, gérer les licences d\'accès et pousser des mises à jour système.'}
          </p>
        </div>

        <button
          onClick={handleRefreshAll}
          disabled={loading || updatesLoading}
          className="self-start sm:self-auto flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-75 * bg-linear-to-b text-xs font-bold text-white transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-95 text-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${(loading || updatesLoading) ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث وتزامن السيرفر' : 'Actualiser Firebase'}</span>
        </button>
      </div>

      {/* Elegant Nav Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('tenants')}
          className={`py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'tenants' 
              ? 'border-rose-600 text-rose-600 font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{language === 'ar' ? '📁 قائمة المشتركين ونطاق التراخيص' : '📁 Clients & Contrôle des Licences'}</span>
        </button>
        <button 
          onClick={() => setActiveTab('updates')}
          className={`py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'updates' 
              ? 'border-rose-600 text-rose-600 font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>{language === 'ar' ? '🚀 إدارة وتحديثات النظام (Mise à Jour)' : '🚀 Mises à Jour & Annonces SaaS'}</span>
        </button>
      </div>

      {/* TAB 1: TENANTS LIST */}
      {activeTab === 'tenants' && (
        <div className="space-y-6 animate-fade-in animate-duration-300">
          
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-lg text-start shadow-3xs">
              <div className="text-[9px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500 animate-bounce" />
                <span>{language === 'ar' ? 'إجمالي المحلات' : 'TOTAL CLIENTS'}</span>
              </div>
              <div className="text-2xl font-mono font-black text-slate-900 mt-1">{totalCount}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'ar' ? 'الحسابات المسجلة في السحابة' : 'Enregistrés sur Firestore'}</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg text-start shadow-3xs">
              <div className="text-[9px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === 'ar' ? 'اشتراكات نشطة' : 'ABONNEMENTS ACTIFS'}</span>
              </div>
              <div className="text-2xl font-mono font-black text-emerald-600 mt-1">{activeCount}</div>
              <div className="text-[10px] text-slate-450 font-bold mt-0.5">
                {activeCount} {language === 'ar' ? 'مفعلين حالياً' : 'abonnés payants'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg text-start shadow-3xs">
              <div className="text-[9px] font-black uppercase text-blue-500 tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{language === 'ar' ? 'فترات تجريبية' : 'PÉRIODES D\'ESSAI'}</span>
              </div>
              <div className="text-2xl font-mono font-black text-blue-600 mt-1">{trialCount}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'ar' ? 'تحت العرض والتجريب' : 'Mode démonstration'}</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg text-start shadow-3xs">
              <div className="text-[9px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1">
                <UserX className="w-3.5 h-3.5 text-rose-500" />
                <span>{language === 'ar' ? 'حسابات مغلقة ومجمدة' : 'COMPTES FERMÉS'}</span>
              </div>
              <div className="text-2xl font-mono font-black text-rose-600 mt-1">{suspendedCount}</div>
              <div className="text-[10px] text-slate-450 font-bold mt-0.5">{language === 'ar' ? 'منتهية الصلاحية أو المعلقة للبيع' : 'Accès bloqué ou expiré'}</div>
            </div>
          </div>

          {/* Table list panel */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-3xs">
            
            {/* Table Header and search tool */}
            <div className="p-4 bg-slate-900 border-b border-rose-500/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-white gap-3 text-start">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider font-mono text-slate-100 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-rose-500" />
                  <span>{language === 'ar' ? '📁 ملفات المشتركين المفعلين والمغلقين في السيرفر السحابي' : '📁 HISTORIQUE ET CONTRÔLE DE TOUS LES ABONNÉS'}</span>
                </h2>
                <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                  {language === 'ar' 
                    ? 'قائمة التراخيص وعناوين البريد المسجلة والتحكم الفوري بآجالها' 
                    : 'Fiches d\'identification, dates de souscription et réglage d\'activation globale'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTenantForm(!showAddTenantForm);
                    if (!showAddTenantForm) {
                      setNewTenantRegisteredAt(new Date().toISOString().split('T')[0]);
                      setNewTenantExpiry(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                      setNewTenantActivationDate(new Date().toISOString().split('T')[0]);
                    }
                  }}
                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs transition-all"
                >
                  <span>{showAddTenantForm ? '✕' : '➕'}</span>
                  <span>{language === 'ar' ? 'تسجيل زبون جديد' : 'Pré-enregistrer un client (Gmail)'}</span>
                </button>
              </div>
            </div>

            {/* Filter and query toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute top-2.5 right-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 pr-9 pl-3 py-2 bg-white rounded-lg focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800 text-start"
                  placeholder={language === 'ar' ? 'بحث عن بريد إلكتروني، محل أو معرف مستخدم...' : 'Chercher par email, boutique, UID...'}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                <span className="text-[10px] font-black text-slate-500 uppercase">{language === 'ar' ? 'تصفية الحالة :' : 'Filtrer par :'}</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs font-bold border border-slate-200 bg-white p-1.5 px-3 rounded-lg text-slate-700"
                >
                  <option value="all">{language === 'ar' ? 'الكل' : 'Tous les abonnés'}</option>
                  <option value="active">{language === 'ar' ? 'مشترك مفعّل ✅' : 'Actifs ✅'}</option>
                  <option value="trial">{language === 'ar' ? 'تجريبي ⏳' : 'Période d\'essai ⏳'}</option>
                  <option value="suspended">{language === 'ar' ? 'معطل ومغلق 🛑' : 'Suspendu / Fermé 🛑'}</option>
                  <option value="expired">{language === 'ar' ? 'منتهي الصلاحية ❌' : 'Expirés ❌'}</option>
                </select>
              </div>
            </div>

            {/* Pre-registration form drop-down */}
            {showAddTenantForm && (
              <form onSubmit={handleCreateNewTenant} className="bg-slate-900 border-b border-rose-500/15 text-white p-5 space-y-4 text-start animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-rose-450 font-mono flex items-center gap-1.5">
                    <span>➕ {language === 'ar' ? 'تسجيل مشترك Gmail وحجز وترخيص بياناته' : 'PRÉ-ENREGISTRER UN LOGICIEL CLIENT (SAAS CONSOLE)'}</span>
                  </h4>
                  <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 font-bold font-mono rounded">SaaS CONFIG</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {language === 'ar' ? 'البريد الإلكتروني للعميل (Gmail) *' : 'Adresse Email du Client (Gmail) *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={newTenantEmail}
                      onChange={(e) => setNewTenantEmail(e.target.value)}
                      placeholder="exemple@gmail.com"
                      className="w-full text-xs font-bold border border-slate-800 bg-slate-950 p-2.5 rounded-lg text-white focus:outline-hidden focus:border-rose-500 text-start"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {language === 'ar' ? 'معرف المستخدم الفردي UID *' : 'Firebase UID Client *'}
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        required
                        value={newTenantUid}
                        onChange={(e) => setNewTenantUid(e.target.value)}
                        placeholder="Saisir ou générer un UID..."
                        className="w-full text-xs font-bold font-mono border border-slate-800 bg-slate-950 p-2.5 rounded-lg text-white focus:outline-hidden focus:border-rose-500 text-start"
                      />
                      <button
                        type="button"
                        onClick={() => setNewTenantUid('usr_' + Math.random().toString(36).substring(2, 11))}
                        className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[10px] rounded-lg text-slate-300 font-mono cursor-pointer"
                      >
                        Gen
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {language === 'ar' ? 'اسم المحل / الشركة' : 'Nom de la Boutique / Business Name'}
                    </label>
                    <input
                      type="text"
                      value={newTenantStoreName}
                      onChange={(e) => setNewTenantStoreName(e.target.value)}
                      placeholder="Ex: Superette Tunisienne"
                      className="w-full text-xs font-bold border border-slate-800 bg-slate-950 p-2.5 rounded-lg text-white focus:outline-hidden focus:border-rose-500 text-start"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {language === 'ar' ? 'نوع حالة الحساب صلوحية الجبايات *' : 'Type de Statut *'}
                    </label>
                    <select
                      value={newTenantStatus}
                      onChange={(e) => setNewTenantStatus(e.target.value as any)}
                      className="w-full text-xs font-bold border border-slate-800 bg-slate-950 p-2.5 rounded-lg text-white focus:outline-hidden focus:border-rose-500"
                    >
                      <option value="active">{language === 'ar' ? 'نشط مفعل (Active) ✅' : 'Actif / Abonné ✅'}</option>
                      <option value="trial">{language === 'ar' ? 'فترة تجريبية (Trial) ⏳' : 'Essai Gratuit ⏳'}</option>
                      <option value="suspended">{language === 'ar' ? 'معطل ومغلق 🛑' : 'Suspendu / Fermé 🛑'}</option>
                      <option value="expired">{language === 'ar' ? 'منتهي الصلاحية ❌' : 'Expiré ❌'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {language === 'ar' ? 'تاريخ التفعيل (Activation)' : "Date d'activation"}
                    </label>
                    <input
                      type="date"
                      value={newTenantActivationDate}
                      onChange={(e) => setNewTenantActivationDate(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-800 bg-slate-950 p-2.5 rounded-lg text-white focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {language === 'ar' ? 'تاريخ الاستحقاق والانتهاء' : "Date d'expiration"}
                    </label>
                    <input
                      type="date"
                      value={newTenantExpiry}
                      onChange={(e) => setNewTenantExpiry(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-800 bg-slate-950 p-2.5 rounded-lg text-white focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      {language === 'ar' ? 'تاريخ التسجيل باللوجيسيال' : "Date d'inscription"}
                    </label>
                    <input
                      type="date"
                      value={newTenantRegisteredAt}
                      onChange={(e) => setNewTenantRegisteredAt(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-800 bg-slate-950 p-2.5 rounded-lg text-white focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    {language === 'ar' ? 'مربع الموقع الجغرافي (رابط خرائط جوجل)' : 'Coordonnées GPS / URL Google Maps (Optionnel)'}
                  </label>
                  <input
                    type="text"
                    value={newTenantLocation}
                    onChange={(e) => setNewTenantLocation(e.target.value)}
                    placeholder="Ex: Tunis, Tunisie ou coordonnées GPS"
                    className="w-full text-xs font-medium border border-slate-800 bg-slate-950 p-2.5 rounded-lg text-white focus:outline-hidden text-start"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                     onClick={() => setShowAddTenantForm(false)}
                    className="py-1.5 px-4 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading !== null}
                    className="py-1.5 px-5 rounded-lg text-xs bg-rose-600 hover:bg-rose-700 text-white font-extrabold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    {actionLoading ? '...' : '🚀'}
                    <span>{language === 'ar' ? 'حفظ رخصة وإتاحة صلاحية المشترك' : 'Créer et Sauvegarder'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Core Tenants Table Database */}
            {loading ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{language === 'ar' ? 'جاري تحميل هويات المشتركين وتراخيصهم...' : 'Synchro Cloud Firestore...'}</p>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="py-20 text-center space-y-2 bg-white">
                <Users className="w-12 h-12 text-slate-200 mx-auto" />
                <p className="text-sm font-bold text-slate-700">{language === 'ar' ? 'لم يتم العثور على مشتركين بعد' : 'Aucun point de vente trouvé'}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {language === 'ar' ? 'لا يوجد أي حساب متصل أو محجوز يطابق فلتر البحث حالياً.' : 'Ajustez votre recherche ou pré-enregistrez un nouveau client.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto text-start">
                <table className="w-full text-xs font-medium text-slate-800">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-black tracking-wider">
                      <th className="p-4">{language === 'ar' ? 'الشركة / المحل' : 'Boutique Client'}</th>
                      <th className="p-4">{language === 'ar' ? 'تاريخ التسجيل' : 'Enregistrement'}</th>
                      <th className="p-4">{language === 'ar' ? 'نوع الرخص والصلوحية' : 'Solvabilité / Expiration'}</th>
                      <th className="p-4 text-center">{language === 'ar' ? 'مفتاح توقيع السيرفر' : 'Licence Key'}</th>
                      <th className="p-4">{language === 'ar' ? 'صلاحية اللوجيسيال' : 'Statut Accès'}</th>
                      <th className="p-4 text-center">{language === 'ar' ? 'التحكم الفوري وعقوبات المشترك' : 'Gestion d\'Accès'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredTenants.map(t => {
                      const isEditing = editingTenantId === t.uid;
                      const isExpired = new Date() > new Date(t.licenseExpiry);
                      const daysLeft = getDaysLeftLabel(t.licenseExpiry);

                      return (
                        <tr key={t.uid} className={`hover:bg-slate-50/50 transition-colors ${isEditing ? 'bg-amber-50/20' : ''}`}>
                          
                          {/* Commercial detail card */}
                          <td className="p-4 text-start">
                            {isEditing ? (
                              <div className="space-y-1.5 max-w-xs">
                                <input
                                  type="text"
                                  value={editStoreName}
                                  onChange={(e) => setEditStoreName(e.target.value)}
                                  className="w-full text-xs font-bold border border-slate-250 p-1.5 rounded-lg bg-white text-slate-850"
                                  placeholder="Nom du commerce"
                                />
                                <input
                                  type="text"
                                  value={editLocation}
                                  onChange={(e) => setEditLocation(e.target.value)}
                                  className="w-full text-xs font-medium border border-slate-250 p-1.5 rounded-lg bg-white text-slate-850"
                                  placeholder="Maps Coordonnées"
                                />
                                <div className="text-[10px] text-slate-400 font-mono font-bold truncate">{t.email}</div>
                              </div>
                            ) : (
                              <div>
                                <p className="font-bold text-slate-850 text-sm">{t.businessName || 'Superette Tunisienne'}</p>
                                <p className="text-[11px] text-slate-500 font-bold">{t.email || 'Email non fourni'}</p>
                                
                                {t.location && (
                                  <div className="flex items-center gap-1 text-[11px] text-rose-600 font-semibold mt-1">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    {t.location.startsWith('http') ? (
                                      <a 
                                        href={t.location} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        referrerPolicy="no-referrer"
                                        className="hover:underline flex items-center gap-1"
                                      >
                                        <span>{language === 'ar' ? 'الموقع الجغرافي للنشاط 🗺️' : 'Localisation Google Maps 🗺️'}</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    ) : (
                                      <span>{t.location}</span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono mt-1">
                                  <span>UID:</span>
                                  <span className="bg-slate-100 p-0.5 px-1 rounded uppercase select-all font-bold">{t.uid}</span>
                                  <button 
                                    onClick={() => copyToClipboard(t.uid)} 
                                    className="hover:text-slate-800 p-0.5 hover:bg-slate-200 rounded cursor-pointer"
                                    title="Copy UID"
                                  >
                                    <Clipboard className="w-3 h-3 text-slate-400 inline" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Client signup Date */}
                          <td className="p-4 whitespace-nowrap text-slate-500 font-mono font-bold">
                            {t.registeredAt || '24/05/2026'}
                          </td>

                          {/* Days remaining badge */}
                          <td className="p-4 whitespace-nowrap text-start">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                                <input
                                  type="date"
                                  value={editExpiry}
                                  onChange={(e) => setEditExpiry(e.target.value)}
                                  className="text-xs font-bold font-mono border border-slate-250 p-1 rounded bg-white text-slate-800"
                                />
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-mono text-slate-800 font-bold">{t.licenseExpiry || 'N/A'}</div>
                                <span className={`p-0.5 px-2 rounded-full text-[10px] font-black border uppercase inline-block ${daysLeft.color}`}>
                                  {daysLeft.label}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Private Server License Key */}
                          <td className="p-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 px-2.5 rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-w-[150px]">
                              <KeyRound className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-bold block truncate max-w-[100px]" title={t.licenseKey}>{t.licenseKey || 'N/A'}</span>
                              {t.licenseKey && (
                                <button 
                                  onClick={() => copyToClipboard(t.licenseKey)}
                                  className="text-slate-400 hover:text-slate-800 cursor-pointer"
                                >
                                  <Clipboard className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Current software lock status */}
                          <td className="p-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as any)}
                                className="text-xs font-bold border border-slate-250 p-1.5 rounded bg-white"
                              >
                                <option value="active">{language === 'ar' ? 'مفعّل ونشط ✅' : 'Abonnement Actif'}</option>
                                <option value="trial">{language === 'ar' ? 'فترة تجريبية ⏳' : 'Essai Gratuit'}</option>
                                <option value="suspended">{language === 'ar' ? 'مغلق ومجمد 🛑' : 'Suspendu / Impayé'}</option>
                                <option value="expired">{language === 'ar' ? 'منتهي الصلاحية ❌' : 'Expiré'}</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-black block text-center capitalize w-26 border ${
                                t.licenseStatus === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                                  : t.licenseStatus === 'trial'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : t.licenseStatus === 'suspended'
                                  ? 'bg-rose-50 text-rose-800 border-rose-250 animate-pulse'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}>
                                {t.licenseStatus === 'active' && (language === 'ar' ? 'مفعل نشط ✅' : 'Actif ✅')}
                                {t.licenseStatus === 'trial' && (language === 'ar' ? 'فـترة تجريبية ⏳' : 'Essai ⏳')}
                                {t.licenseStatus === 'suspended' && (language === 'ar' ? 'مغلق معلق 🛑' : 'Fermé / Lock 🛑')}
                                {t.licenseStatus === 'expired' && (language === 'ar' ? 'منتهي ❌' : 'Expiré ❌')}
                              </span>
                            )}
                          </td>

                          {/* Action panel triggers */}
                          <td className="p-4 text-center">
                            {isEditing ? (
                              <div className="space-y-2 max-w-xs text-start">
                                
                                {/* Broadcast temporary banner notice */}
                                <div className="space-y-1">
                                  <label className="text-[8.5px] font-black text-slate-500 uppercase block">
                                    {language === 'ar' ? 'نص إعلان يظهر للمشترك أعلى الشاشة :' : 'Affichage message défilant bandeau client :'}
                                  </label>
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={editAnnouncement}
                                      onChange={(e) => setEditAnnouncement(e.target.value)}
                                      className="w-full text-[11px] font-semibold border border-slate-250 p-1 rounded bg-white text-slate-800"
                                      placeholder="Ex: Régulariser la traite annuelle"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditAnnouncement(language === 'ar' ? 'تنبيه لقسم المحاسبة: يرجى تصفية المستحقات المالية السنوية للمحافظة على صلاحية السحابة.' : 'Alerte: Veuillez renouveler votre licence annuelle Innova POS Pro afin d\'éviter la fermeture de votre caisse.')}
                                      className="p-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded shrink-0 cursor-pointer font-bold"
                                      title="Macro rapide"
                                    >
                                      ✍️
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-200 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingTenantId(null)}
                                    className="py-1 px-2.5 text-[9.5px] font-bold rounded bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                  >
                                    {language === 'ar' ? 'رجوع' : 'Retour'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveTenantLicense(t.uid)}
                                    disabled={actionLoading === t.uid}
                                    className="py-1 px-3 text-[9.5px] font-bold rounded bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 cursor-pointer"
                                  >
                                    {actionLoading === t.uid ? '...' : (language === 'ar' ? 'حفظ الصلاحية 💾' : 'Sauver 💾')}
                                  </button>
                                </div>
                              </div>
                            ) : deletingTenantId === t.uid ? (
                              <div className="flex flex-col gap-1 items-stretch max-w-[180px] mx-auto text-center font-sans">
                                <span className="text-[9px] text-rose-600 font-bold block bg-rose-50 p-1 px-1.5 border border-rose-200 rounded">
                                  {language === 'ar' ? '⚠️ سيتم إزالة قاعدة بيانات المتجر من السيرفر نهائياً!' : '⚠️ Supprimer de Firestore ?'}
                                </span>
                                <div className="flex gap-1 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTenant(t.uid)}
                                    disabled={actionLoading === t.uid}
                                    className="py-1 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9.5px] font-bold cursor-pointer transition-colors"
                                  >
                                    {actionLoading === t.uid ? '...' : (language === 'ar' ? 'تأكيد الحذف 🗑️' : 'Supprimer 🗑️')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingTenantId(null)}
                                    className="py-1 px-2 bg-slate-100 border border-slate-200 hover:bg-slate-250 text-slate-700 rounded text-[9.5px] font-bold cursor-pointer"
                                  >
                                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditTenant(t)}
                                  className="py-1 px-2.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700 cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0"
                                >
                                  <span>⚙️</span>
                                  <span>{language === 'ar' ? 'تعديل الترخيص وصلاحية القفل' : 'Régler la licence'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingTenantId(t.uid)}
                                  className="py-1 px-2.5 bg-rose-100 border border-rose-200 hover:bg-rose-200 text-rose-700 rounded text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0"
                                >
                                  <span>🗑️</span>
                                  <span>{language === 'ar' ? 'حذف الحساب' : 'Supprimer'}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM UPDATES (MISE A JOUR) MANAGEMENT */}
      {activeTab === 'updates' && (
        <div className="space-y-6 animate-fade-in animate-duration-300">
          
          {/* SaaS Updates Publisher Block */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-3xs text-start">
            <div className="p-4 bg-slate-900 border-b border-rose-500/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-white gap-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider font-mono text-slate-100 flex items-center gap-1.5">
                  <Rocket className="w-4 h-4 text-rose-500" />
                  <span>{language === 'ar' ? '🚀 إدارة وتحديثات النظام الأساسي (Software Updates Rollout)' : '🚀 MODULE DE GESTION DES MISES À JOUR SYSTÈME'}</span>
                </h2>
                <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                  {language === 'ar' 
                    ? 'صياغة ونشر إعلانات الإصدارات وخط وخصائص الميزات الجديدة للمحلات والمستخدمين.' 
                    : 'Configurez la liste des versions logicielles et affichez les nouveautés directement sur la caisse client.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddUpdateForm(!showAddUpdateForm);
                  if (!showAddUpdateForm) {
                    setUpdateId('');
                    setUpdateTitleFr('');
                    setUpdateTitleAr('');
                    setUpdateDescFr('');
                    setUpdateDescAr('');
                    setEditUpdateId(null);
                  }
                }}
                className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs transition-all"
              >
                <span>{showAddUpdateForm ? '✕' : '➕'}</span>
                <span>{language === 'ar' ? 'صياغة إصدار نظام جديد' : 'Rédiger une mise à jour'}</span>
              </button>
            </div>

            {/* Publishing System Update Bulletin Form */}
            {showAddUpdateForm && (
              <form onSubmit={handleSaveSystemUpdate} className="p-5 border-b border-slate-200 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 font-mono flex items-center gap-1">
                    <span>{editUpdateId ? '⚙️' : '➕'}</span>
                    <span>{editUpdateId ? (language === 'ar' ? `تعديل ملف الإصدار ${editUpdateId}` : `MODIFIER LA VERSION ${editUpdateId}`) : (language === 'ar' ? 'صياغة بطاقة تحديث نظام جديد' : 'REDIGER UN BULLETIN DE MISE À JOUR GLOBAL')}</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      {language === 'ar' ? 'رقم الإصدار (Version Code ID) *' : 'Code Version unique (e.g., v1.3.0) *'}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editUpdateId}
                      value={updateId}
                      onChange={(e) => setUpdateId(e.target.value)}
                      placeholder="v1.2.6"
                      className="w-full text-xs font-bold font-mono border border-slate-250 p-2 rounded-lg bg-white text-slate-800 disabled:bg-slate-100 placeholder-slate-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      {language === 'ar' ? 'نوع هذا الإصدار / تصنيف التغيير *' : 'Importance de la Version *'}
                    </label>
                    <select
                      value={updateType}
                      onChange={(e) => setUpdateType(e.target.value as any)}
                      className="w-full text-xs font-bold border border-slate-250 p-2 rounded-lg bg-white text-slate-800"
                    >
                      <option value="feature">{language === 'ar' ? 'ميزة جديدة وإضافة للمتجر (Feature Update) ✨' : 'Nouvelle Fonctionnalité Importante ✨'}</option>
                      <option value="major">{language === 'ar' ? 'تحديث جذري وتوطيد الخادم (Major Upgrade) 🚀' : 'Mise à niveau Majeure du Système 🚀'}</option>
                      <option value="patch">{language === 'ar' ? 'إصلاح برمي وتعديل أخطاء (Patch Fix) 🔧' : 'Correction de bug & Patch technique 🔧'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      {language === 'ar' ? 'عنوان التحديث بالفرنسية *' : 'Titre de la mise à jour (Français) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={updateTitleFr}
                      onChange={(e) => setUpdateTitleFr(e.target.value)}
                      placeholder="e.g. Optimisation et impression thermique"
                      className="w-full text-xs font-bold border border-slate-250 p-2.5 rounded-lg bg-white text-slate-800 placeholder-slate-400 text-start"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      {language === 'ar' ? 'عنوان التحديث بالعربية *' : 'Titre de la mise à jour (Arabe) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={updateTitleAr}
                      onChange={(e) => setUpdateTitleAr(e.target.value)}
                      placeholder="مثال: تحسين سرعة ومجالات الطباعة للفاتورة"
                      className="w-full text-xs font-bold border border-slate-250 p-2.5 rounded-lg bg-white text-slate-800 placeholder-slate-400 text-start"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      {language === 'ar' ? 'تفصيل الميزات بالفرنسية (سطر لكل سطر) *' : 'Améliorations en Français (Une par ligne) *'}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={updateDescFr}
                      onChange={(e) => setUpdateDescFr(e.target.value)}
                      placeholder="Ajout du support imprimante thermique 80mm&#10;Correctif de défilement des stocks en caisse&#10;Optimisation base locale"
                      className="w-full text-xs font-medium border border-slate-250 p-2.5 rounded-lg bg-white text-slate-800 font-sans focus:outline-hidden text-start placeholder-slate-450"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      {language === 'ar' ? 'تفصيل الميزات بالعربية (سطر لكل سطر) *' : 'Améliorations en Arabe (Une par ligne) *'}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={updateDescAr}
                      onChange={(e) => setUpdateDescAr(e.target.value)}
                      placeholder="إضافة الدعم الكامل للطباعة مقاس 80 مم&#10;إصلاح مشكلة تراكم الحسابات على الكاشير&#10;تسريع رفع النسخ الاحتياطية"
                      className="w-full text-xs font-medium border border-slate-250 p-2.5 rounded-lg bg-white text-slate-800 font-sans focus:outline-hidden text-start placeholder-slate-450"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUpdateForm(false);
                      setEditUpdateId(null);
                    }}
                    className="py-1.5 px-4 rounded-lg text-xs bg-white text-slate-700 border border-slate-250 hover:bg-slate-50 cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-5 rounded-lg text-xs bg-slate-900 border border-slate-900 hover:bg-slate-850 text-white font-extrabold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <Rocket className="w-3.5 h-3.5 text-rose-450 shrink-0" />
                    <span>{editUpdateId ? (language === 'ar' ? 'حفظ التحديث 💾' : 'Sauvegarder les modifications') : (language === 'ar' ? 'نشر وتحديث النظام 🚀' : 'Diffuser la Version 🚀')}</span>
                  </button>
                </div>
              </form>
            )}

            {/* List of Rolled-out Releases */}
            <div className="p-4">
              <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider mb-4 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'مخطط زمني للتحديثات النشطة على قاعدة البيانات' : 'LOG DES CONFIGURATIONS ET VERSIONS PUBLIÉES'}</span>
              </h3>

              {updatesLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase font-mono">{language === 'ar' ? 'تحميل أرشيف إصدارات السيرفر...' : 'Lecture du log Firebase...'}</p>
                </div>
              ) : updatesList.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 space-y-2">
                  <Rocket className="w-10 h-10 mx-auto text-slate-200" />
                  <p className="text-sm font-bold text-slate-600">{language === 'ar' ? 'لم يتم نشر أي تحديث بعد' : 'Aucune mise à jour publiée'}</p>
                  <p className="text-xs text-slate-450 max-w-sm mx-auto">{language === 'ar' ? 'استخدم الزر بالأعلى لصياغة ونشر التحديث الأول للسيستم' : 'Activez le bouton ci-dessus pour publier le premier bulletin de mise à jour.'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {updatesList.map((up) => {
                    const isMajor = up.type === 'major';
                    const isPatch = up.type === 'patch';

                    return (
                      <div 
                        key={up.id} 
                        className={`p-4 rounded-lg border text-start transition-shadow hover:shadow-2xs relative bg-white flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                          isMajor 
                            ? 'border-indigo-150 bg-indigo-50/5' 
                            : isPatch 
                            ? 'border-slate-200 bg-slate-50/15' 
                            : 'border-slate-200'
                        }`}
                      >
                        {/* Bullet detail card */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="p-1 px-2.5 bg-slate-900 text-white font-mono text-xs font-black rounded-lg">
                              {up.id}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                              isMajor 
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200' 
                                : isPatch 
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-250'
                            }`}>
                              {up.type === 'major' && (language === 'ar' ? 'ترقية كبرى 🚀' : 'Mise à niveau Majeure 🚀')}
                              {up.type === 'feature' && (language === 'ar' ? 'ميزة جديدة ✨' : 'Nouvelle Option ✨')}
                              {up.type === 'patch' && (language === 'ar' ? 'إصلاح برمجي 🔧' : 'Patch technique 🔧')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">{up.date}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1.5">
                            {/* French version details */}
                            <div className="space-y-1.5">
                              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                <span className="text-slate-400 font-mono text-xs">[FR]</span>
                                <span>{up.titleFr}</span>
                              </h4>
                              <ul className="list-disc list-inside text-[11px] text-slate-555 space-y-1 pr-1.5">
                                {(up.descriptionFr || []).map((bullet, i) => (
                                  <li key={i} className="leading-relaxed">
                                    <span className="text-slate-600 pl-1">{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Arabic version details */}
                            <div className="space-y-1.5" dir="rtl">
                              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                <span className="text-slate-400 font-mono text-xs">[AR]</span>
                                <span>{up.titleAr}</span>
                              </h4>
                              <ul className="list-disc list-inside text-[11px] text-slate-555 space-y-1 pl-1.5 text-right">
                                {(up.descriptionAr || []).map((bullet, i) => (
                                  <li key={i} className="leading-relaxed">
                                    <span className="text-slate-600 pr-1">{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Top corner actions */}
                        <div className="shrink-0 flex sm:flex-col gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartEditUpdate(up)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                            title="Edit version"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{language === 'ar' ? 'تعديل' : 'Modifier'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSystemUpdate(up.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                            title="Delete version"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span className="hidden sm:inline">{language === 'ar' ? 'سحب' : 'Retirer'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
