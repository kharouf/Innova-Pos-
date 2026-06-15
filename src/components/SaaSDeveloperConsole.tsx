import React, { useState, useEffect } from 'react';
import { UserLicenseData, generateLicenseKey, verifyLicenseKey } from '../utils/licensing';
import { loadAllTenantLicenses, saveUserLicense, loadSystemUpdates, saveSystemUpdate } from '../utils/firebaseSync';
import { SystemUpdate } from '../types';
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
  Send, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Lock, 
  Sparkles, 
  CornerDownRight,
  Clipboard,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SaaSDeveloperConsole() {
  const { language, formatCurrency } = useLanguage();
  const [tenants, setTenants] = useState<UserLicenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form states for active editing row
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'trial' | 'active' | 'suspended' | 'expired'>('trial');
  const [editExpiry, setEditExpiry] = useState('');
  const [editAnnouncement, setEditAnnouncement] = useState('');
  const [editStoreName, setEditStoreName] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // ⚙️ Remote client overrides states
  const [editRemoteAdminEmail, setEditRemoteAdminEmail] = useState('');
  const [editRemoteEnableEmailAlerts, setEditRemoteEnableEmailAlerts] = useState<boolean>(false);
  const [editRemoteSmtpHost, setEditRemoteSmtpHost] = useState('');
  const [editRemoteSmtpPort, setEditRemoteSmtpPort] = useState<number>(587);
  const [editRemoteSmtpUser, setEditRemoteSmtpUser] = useState('');
  const [editRemoteSmtpPass, setEditRemoteSmtpPass] = useState('');
  const [showConsoleSmtpPass, setShowConsoleSmtpPass] = useState(false);
  const [editRemoteSmtpSecure, setEditRemoteSmtpSecure] = useState<boolean>(false);
  const [editRemoteSmtpSenderName, setEditRemoteSmtpSenderName] = useState('');

  // Console tab & updates states
  const [consoleTab, setConsoleTab] = useState<'tenants' | 'updates'>('tenants');
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  // New Update Form states
  const [showNewUpdateForm, setShowNewUpdateForm] = useState(false);
  const [newUpdateId, setNewUpdateId] = useState('');
  const [newUpdateDate, setNewUpdateDate] = useState('');
  const [newUpdateTitleFr, setNewUpdateTitleFr] = useState('');
  const [newUpdateTitleAr, setNewUpdateTitleAr] = useState('');
  const [newUpdateDescFr, setNewUpdateDescFr] = useState('');
  const [newUpdateDescAr, setNewUpdateDescAr] = useState('');
  const [newUpdateType, setNewUpdateType] = useState<'major' | 'feature' | 'patch'>('patch');

  // Floating Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
      const data = await loadSystemUpdates();
      setUpdates(data);
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to fetch system updates history');
    } finally {
      setUpdatesLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchUpdates();
  }, []);

  const handleStartEdit = (t: UserLicenseData) => {
    setEditingTenantId(t.uid);
    setEditStatus(t.licenseStatus);
    setEditExpiry(t.licenseExpiry);
    setEditAnnouncement(t.remoteAnnouncement || '');
    setEditStoreName(t.businessName || '');
    setEditLocation(t.location || '');
    
    // Populate remote fields
    setEditRemoteAdminEmail(t.remoteAdminEmail || '');
    setEditRemoteEnableEmailAlerts(t.remoteEnableCriticalStockEmailAlerts ?? false);
    setEditRemoteSmtpHost(t.remoteSmtpHost || '');
    setEditRemoteSmtpPort(t.remoteSmtpPort || 587);
    setEditRemoteSmtpUser(t.remoteSmtpUser || '');
    setEditRemoteSmtpPass(t.remoteSmtpPass || '');
    setEditRemoteSmtpSecure(t.remoteSmtpSecure ?? false);
    setEditRemoteSmtpSenderName(t.remoteSmtpSenderName || '');
  };

  const handleSaveTenantLicense = async (uid: string) => {
    setActionLoading(uid);
    try {
      // 1. Validate hash activation key
      // If the admin changes expiry or state, we automatically re-calculate and push a mathematically solid key to Firestore
      const newKey = generateLicenseKey(uid, editExpiry);
      
      const updatedFields: Partial<UserLicenseData> = {
        licenseExpiry: editExpiry,
        licenseStatus: editStatus,
        licenseKey: newKey,
        remoteAnnouncement: editAnnouncement.trim() || undefined,
        businessName: editStoreName.trim() || undefined,
        location: editLocation.trim() || undefined,
        
        // Save remote configurations managed by admin
        remoteAdminEmail: editRemoteAdminEmail.trim() || undefined,
        remoteEnableCriticalStockEmailAlerts: editRemoteEnableEmailAlerts,
        remoteSmtpHost: editRemoteSmtpHost.trim() || undefined,
        remoteSmtpPort: Number(editRemoteSmtpPort) || undefined,
        remoteSmtpUser: editRemoteSmtpUser.trim() || undefined,
        remoteSmtpPass: editRemoteSmtpPass.trim() || undefined,
        remoteSmtpSecure: editRemoteSmtpSecure,
        remoteSmtpSenderName: editRemoteSmtpSenderName.trim() || undefined
      };

      await saveUserLicense(uid, updatedFields);
      
      showToast(language === 'ar' ? '✅ تم تحديث ترخيص الشركة بنجاح فوري!' : '✅ Licence mise à jour avec succès !');
      setEditingTenantId(null);
      await fetchTenants();
    } catch (err) {
      console.error(err);
      showToast('❌ Critical error saving license update');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSystemUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateId.trim() || !newUpdateTitleFr.trim() || !newUpdateTitleAr.trim()) {
      showToast(language === 'ar' ? '⚠️ يرجى ملء الحقول الإلزامية الأساسية' : '⚠️ Veuillez renseigner les champs requis.');
      return;
    }

    try {
      const descFrArray = newUpdateDescFr
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      const descArArray = newUpdateDescAr
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const updateObj: SystemUpdate = {
        id: newUpdateId.trim(),
        date: newUpdateDate.trim() || new Date().toISOString().replace('T', ' ').substring(0, 16),
        titleFr: newUpdateTitleFr.trim(),
        titleAr: newUpdateTitleAr.trim(),
        descriptionFr: descFrArray.length > 0 ? descFrArray : [newUpdateTitleFr.trim()],
        descriptionAr: descArArray.length > 0 ? descArArray : [newUpdateTitleAr.trim()],
        type: newUpdateType
      };

      await saveSystemUpdate(updateObj);
      showToast(language === 'ar' ? '✅ تم نشر تحديث النظام بنجاح !' : '✅ Tâche de mise à jour envoyée avec succès !');
      
      setNewUpdateId('');
      setNewUpdateDate('');
      setNewUpdateTitleFr('');
      setNewUpdateTitleAr('');
      setNewUpdateDescFr('');
      setNewUpdateDescAr('');
      setNewUpdateType('patch');
      setShowNewUpdateForm(false);

      await fetchUpdates();
    } catch (error) {
      console.error(error);
      showToast('❌ Failed to publish system update');
    }
  };

  // Helper to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(language === 'ar' ? '📋 تم نسخ الرمز إلى الحافظة!' : '📋 Code d\'activation copié !');
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      (t.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.uid.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && t.licenseStatus === filterStatus;
  });

  // KPI Calculations
  const totalCount = tenants.length;
  const activeCount = tenants.filter(t => t.licenseStatus === 'active').length;
  const trialCount = tenants.filter(t => t.licenseStatus === 'trial').length;
  const suspendedCount = tenants.filter(t => t.licenseStatus === 'suspended' || t.licenseStatus === 'expired').length;

  return (
    <div className="space-y-6 font-sans p-1" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Floating feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white font-sans text-xs font-bold py-3 px-5 rounded shadow-lg animate-bounce flex items-center gap-2">
          <span className="text-emerald-400">●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Banner Header */}
      <div className="bg-slate-900 text-white p-6 rounded border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 px-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] uppercase font-mono font-black rounded-sm">
              Developer SaaS Gate • مشرف السيرفر والمطور
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-display font-black tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <span>{language === 'ar' ? 'لوحة التحكم السحابية وتراخيص الشركات والمشتركين' : 'Console de Licenciement SaaS & Tenants'}</span>
          </h1>
          <p className="text-slate-400 mt-1 text-xs md:text-sm">
            {language === 'ar' 
              ? 'بوابة المطور الفنية والتحكم عن بعد في الأجهزة المبيعة، تتيح لك إيقاف الحسابات، تمديد الفترات التجريبية، وتوجيه تحديثات وتنبيهات مباشرة.' 
              : 'Gérez à distance vos abonnements clients locaux, visualisez les connexions actives, suspendez les impayés et attribuez des clés de licence.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] bg-slate-800/80 border border-slate-700/60 rounded p-2 text-slate-300 w-fit max-w-full">
            <span className="font-bold text-amber-400">⚡ {language === 'ar' ? 'آخر تحديث للنظام :' : 'Dernière Mise à Jour :'}</span>
            <span className="font-mono bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-white text-[10px]">24/05/2026 - 15:40</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="font-medium text-slate-200">
              {language === 'ar' ? 'تحديث النظام البرمجي الأساسي للمشتركين' : 'Partie pour mise à jour de système'}
            </span>
          </div>
        </div>

        <button
          onClick={fetchTenants}
          disabled={loading}
          className="self-start md:self-auto flex items-center justify-center gap-1.5 py-2 px-4 rounded border border-slate-700 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث قاعدة الشركات' : 'Rafraîchir'}</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setConsoleTab('tenants')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 hover:bg-slate-50 cursor-pointer ${
            consoleTab === 'tenants'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          👤 {language === 'ar' ? 'الحسابات المسجلة في Firestore' : 'Comptes Firestore / Tenants'} ({tenants.length})
        </button>
        <button
          onClick={() => setConsoleTab('updates')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 hover:bg-slate-50 cursor-pointer ${
            consoleTab === 'updates'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🚀 {language === 'ar' ? 'سجل تحديثات النظام' : 'Mises à jour Système'} ({updates.length})
        </button>
      </div>

      {consoleTab === 'tenants' && (
        <>
          {/* KPI Overviews */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded text-start">
          <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'ar' ? 'إجمالي المحلات المسجلة' : 'Total Boutiques'}</span>
          </div>
          <div className="text-2xl font-mono font-black text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'ar' ? 'قاعدة عملاء نظام INNOVA POS' : 'Comptes enregistrés sur Firestore'}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded text-start">
          <div className="text-[9px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{language === 'ar' ? 'الاشتراكات المفعلة حالياً' : 'Abonnements Actifs'}</span>
          </div>
          <div className="text-2xl font-mono font-black text-emerald-600 mt-1">{activeCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
            {totalCount > 0 ? `${((activeCount / totalCount) * 100).toFixed(1)}%` : 0} {language === 'ar' ? 'معدل التحويل المالي' : 'du total'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded text-start">
          <div className="text-[9px] font-black uppercase text-blue-500 tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>{language === 'ar' ? 'الفترات التجريبية النشطة' : 'Périodes d\'Essai'}</span>
          </div>
          <div className="text-2xl font-mono font-black text-blue-600 mt-1">{trialCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'ar' ? 'حسابات في فترة 14 يوماً الأولى' : 'En phase de démonstration'}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded text-start">
          <div className="text-[9px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1">
            <UserX className="w-3.5 h-3.5 text-rose-500" />
            <span>{language === 'ar' ? 'محلات مقفلة / منتهية' : 'Comptes Verrouillés'}</span>
          </div>
          <div className="text-2xl font-mono font-black text-rose-600 mt-1">{suspendedCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'ar' ? 'تجاوزوا آجال الدفع أو تم تعليقهم' : 'Accès bloqué ou expiré'}</div>
        </div>
      </div>

      {/* CONTROL TABLE SECTION */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        
        {/* Firestore Registered Accounts Header Banner */}
        <div className="p-4 bg-slate-900 border-b border-rose-500/10 flex items-center justify-between text-white flex-wrap gap-2 text-start">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <Users className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider font-mono text-slate-100 flex items-center gap-1.5">
                <span>{language === 'ar' ? '🗂️ الحسابات المسجلة في السحابة' : '🗂️ Comptes enregistrés sur Firestore'}</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                {language === 'ar' 
                  ? 'بوابة المبيعات والتراخيص النشطة للمشتركين للتحكم الفوري عن بعد والتعديل' 
                  : 'Fiches d\'identification, dates de souscription et contrôle d\'accès cloud des boutiques'}
              </p>
            </div>
          </div>
          <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 font-bold font-mono rounded-md uppercase tracking-wide">
            Firestore Master List
          </span>
        </div>

        {/* Filters bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute top-2.5 right-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 pr-9 pl-3 py-2 bg-white rounded focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
              placeholder={language === 'ar' ? 'ابحث عبر البريد الإلكتروني، اسم المحل أو الـ ID...' : 'Rechercher email, boutique, UID...'}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase">{language === 'ar' ? 'تصنيف الحالة :' : 'Filtrer :'}</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs font-bold border border-slate-200 bg-white p-1.5 px-3 rounded text-slate-700"
            >
              <option value="all">{language === 'ar' ? 'الكل' : 'Tous'}</option>
              <option value="active">{language === 'ar' ? 'مشترك مفعل' : 'Actifs'}</option>
              <option value="trial">{language === 'ar' ? 'تجريبي' : 'Essai'}</option>
              <option value="suspended">{language === 'ar' ? 'معلق كلياً' : 'Suspendus'}</option>
              <option value="expired">{language === 'ar' ? 'منتهية الصلاحية' : 'Expirés'}</option>
            </select>
          </div>
        </div>

        {/* Big list load */}
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{language === 'ar' ? 'جاري تحميل هويات المشتركين وتراخيصهم...' : 'Chargement des licences cloud...'}</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-800">{language === 'ar' ? 'لم يتم العثور على مشتركين بعد' : 'Aucun tenant trouvé'}</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {language === 'ar' ? 'لم يسجل أي عميل حساباً جديداً على هذا الخادم السحابي حتى الآن.' : 'Aucun client n\'est encore enregistré avec ce filtre.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto text-start">
            <table className="w-full text-xs font-medium text-slate-800">
              <thead>
                <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-black tracking-wider">
                  <th className="p-4">{language === 'ar' ? 'الشركة / المحل' : 'Boutique'}</th>
                  <th className="p-4">{language === 'ar' ? 'تاريخ التسجيل' : 'Enregistrement'}</th>
                  <th className="p-4">{language === 'ar' ? 'آجال الترخيص والانتهاء' : 'Expiration'}</th>
                  <th className="p-4 text-center">{language === 'ar' ? 'رمز الترخيص الحالي' : 'Clef de Signature'}</th>
                  <th className="p-4">{language === 'ar' ? 'الحالة الحالية' : 'Statut'}</th>
                  <th className="p-4 text-center">{language === 'ar' ? 'التحكم الإداري الفوري' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredTenants.map(t => {
                  const isEditing = editingTenantId === t.uid;
                  const isTrial = t.licenseStatus === 'trial';
                  const isActiveStatus = t.licenseStatus === 'active';
                  const isLocked = t.licenseStatus === 'suspended' || t.licenseStatus === 'expired';

                  return (
                    <tr key={t.uid} className={`hover:bg-slate-50/50 transition-colors ${isEditing ? 'bg-amber-50/20' : ''}`}>
                      
                      {/* Store name and basic identifier fields */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="space-y-1.5 max-w-xs">
                            <input
                              type="text"
                              value={editStoreName}
                              onChange={(e) => setEditStoreName(e.target.value)}
                              className="w-full text-xs font-bold border border-slate-250 p-1.5 rounded bg-white"
                              placeholder="Store Name"
                            />
                            <input
                              type="text"
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              className="w-full text-xs font-medium border border-slate-250 p-1.5 rounded bg-white"
                              placeholder={language === 'ar' ? 'الموقع الجغرافي أو رابط خرائط جوجل' : 'Localisation ou URL Google Maps'}
                            />
                            <div className="text-[10px] text-slate-400 truncate">{t.email || 'Pas d\'email'}</div>
                            
                            {/* Email notification features removed */}
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-850 text-sm">{t.businessName || 'محل تجاري جديد'}</p>
                            <p className="text-[11px] text-slate-500 font-semibold">{t.email || 'Email non fourni'}</p>
                            
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
                                    <span>{language === 'ar' ? 'موقع الشركة على الخريطة 🗺️' : 'Localisation de la boutique 🗺️'}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : (
                                  <span>{t.location}</span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono mt-1">
                              <span>UID:</span>
                              <span className="bg-slate-100 p-0.5 px-1.5 rounded uppercase select-all font-bold">{t.uid}</span>
                              <button 
                                onClick={() => copyToClipboard(t.uid)} 
                                className="hover:text-slate-800 p-0.5 hover:bg-slate-205 rounded cursor-pointer"
                                title="Copy UID"
                              >
                                <Clipboard className="w-3 h-3 text-slate-400 inline" />
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Registration timestamp */}
                      <td className="p-4 whitespace-nowrap text-slate-500 font-semibold">
                        {t.registeredAt || '24/05/2026'}
                      </td>

                      {/* Expiration datepicker */}
                      <td className="p-4 whitespace-nowrap font-bold text-slate-700">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                              type="date"
                              value={editExpiry}
                              onChange={(e) => setEditExpiry(e.target.value)}
                              className="text-xs font-bold font-mono border border-slate-250 p-1.5 rounded bg-white text-slate-800"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-800">{t.licenseExpiry || 'Aucun'}</span>
                            {new Date() > new Date(t.licenseExpiry) && (
                              <span className="text-[8px] bg-red-100 text-red-800 font-bold px-1 rounded uppercase">
                                {language === 'ar' ? 'منتهي' : 'Terminé'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Current Key signature details */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 px-2.5 rounded border border-slate-200 font-mono text-[10px] text-slate-600">
                          <KeyRound className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-bold block truncate max-w-[120px]" title={t.licenseKey}>{t.licenseKey || 'N/A: Non Généré'}</span>
                          {t.licenseKey && (
                            <button 
                              onClick={() => copyToClipboard(t.licenseKey)}
                              className="text-slate-400 hover:text-slate-800 cursor-pointer"
                              title="Copy Key"
                            >
                              <Clipboard className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status pill badge badges */}
                      <td className="p-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="text-xs font-bold border border-slate-250 p-1.5 rounded bg-white"
                          >
                            <option value="trial">{language === 'ar' ? 'فترة تجريبية' : 'Essai'}</option>
                            <option value="active">{language === 'ar' ? 'مشترك مفعّل' : 'Abonnement Actif'}</option>
                            <option value="suspended">{language === 'ar' ? 'معلق ومحجوب' : 'Suspendu (Impayé)'}</option>
                            <option value="expired">{language === 'ar' ? 'منتهي الصلاحية' : 'Expiré'}</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold block text-center capitalize w-24 border ${
                            isActiveStatus
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isTrial
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
                          }`}>
                            {t.licenseStatus === 'active' && (language === 'ar' ? 'نشط مفعل ✅' : 'Actif ✅')}
                            {t.licenseStatus === 'trial' && (language === 'ar' ? 'فترة تجريبية ⏳' : 'Essai Gratuit ⏳')}
                            {t.licenseStatus === 'suspended' && (language === 'ar' ? 'معطل 🛑' : 'Suspendu 🛑')}
                            {t.licenseStatus === 'expired' && (language === 'ar' ? 'منتهي ❌' : 'Expiré ❌')}
                          </span>
                        )}
                      </td>

                      {/* Main action controller rows */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="space-y-2.5 max-w-xs text-start">
                            {/* remote message pusher tool right inside cell */}
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-slate-500 uppercase block">
                                {language === 'ar' ? 'رسالة تنبيه فوري عن بعد تظهر لديه :' : 'Message à pousser en haut :'}
                              </label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={editAnnouncement}
                                  onChange={(e) => setEditAnnouncement(e.target.value)}
                                  className="w-full text-[11px] font-semibold border border-slate-250 p-1 rounded bg-white"
                                  placeholder="e.g. يرجى خلاص الفاتورة السنوية لتجنب التعطيل"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditAnnouncement('برجاء تصفية الفواتير المعلقة للحفاظ على تزامن السيرفر مع خالص الشكر.')}
                                  className="p-1 text-[9px] bg-slate-100 hover:bg-slate-200 rounded shrink-0 cursor-pointer"
                                  title="Utiliser modèles rapides"
                                >
                                  ✍️
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200 mt-1">
                              <button
                                type="button"
                                onClick={() => setEditingTenantId(null)}
                                className="py-1 px-2 text-[10px] font-bold rounded bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-705 cursor-pointer"
                              >
                                {language === 'ar' ? 'إلغاء' : 'Retour'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveTenantLicense(t.uid)}
                                disabled={actionLoading === t.uid}
                                className="py-1 px-2.5 text-[10px] font-bold rounded bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 cursor-pointer"
                              >
                                {actionLoading === t.uid ? '...' : (language === 'ar' ? 'حفظ عن بعد 💾' : 'Appliquer 💾')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(t)}
                              className="py-1.5 px-3 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded text-[10px] font-black text-slate-700 cursor-pointer transition-colors"
                            >
                              ⚙️ {language === 'ar' ? 'تعديل الترخيص والإجراءات' : "Gérer l'accès"}
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

      {/* DETAILED TUTORIAL FOR WALAKHAROUF TO MONETIZE AND SELL INDEPENDENT LICENSE INSTALLMENTS */}
      <div className="bg-amber-50/70 border border-amber-200 p-5 rounded space-y-3.5 text-start">
        <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>{language === 'ar' ? 'دليل تسيير الاشتراكات وبيع النسخة وتأمين السيرفر عن بعد :' : 'Guide technique d\'exploitation commerciale :'}</span>
        </h4>
        <div className="text-[11px] text-amber-850 space-y-2 leading-relaxed">
          <p className="font-bold">
            {language === 'ar' 
              ? '💡 مبروك ! لقد بنيت لك نظاماً فريداً لتأمين ملكيتك الفكرية ومراقبة المشتركين بنسبة 100%' 
              : '💡 Félicitations ! Votre SaaS est entièrement protégé par une double validation cryptée.'}
          </p>
          <ul className="list-disc leading-relaxed pl-4 space-y-1.5 font-medium">
            <li>
              <strong>{language === 'ar' ? 'كيف تبيع البرنامج ؟' : 'Comment ça marche ?'}</strong> 
              {language === 'ar' 
                ? ' عند قيام أي زبون جديد بالتسجيل بجوجل، يتم تخصيص قاعدة بيانات معزولة تماماً له في السيرفر وتفعيل رخصة تجريبية تلقائية (14 يومًا).' 
                : ' Tout client se connectant dispose d\'une période gratuite initiale de 14 jours reliée à son UID unique.'}
            </li>
            <li>
              <strong>{language === 'ar' ? 'تمديد الترخيص أو إلغاؤه (عن بعد)' : 'Paiement / Activation'}</strong> 
              {language === 'ar' 
                ? ' عندما ينتهي المشترك أو يدفع لك ثمن البرنامج، ادخل هنا لتعيين حالة حسابه إلى "مشترك مفعل" (Active) واختيار تاريخ الانتهاء الذي تريده، ليتم تمديد الترخيص كليًا.' 
                : ' Lorsque votre client vous paie sa licence annuelle, modifiez simplement son expiration ci-dessus pour la prolonger.'}
            </li>
            <li>
              <strong>{language === 'ar' ? 'أمان متناهي الصعوبة (تشفير السيرفر)' : 'Sécurité cryptographique'}</strong> 
              {language === 'ar' 
                ? ' لمنع أي عميل ذكي من تغيير كود البرنامج أو التلاعب بقاعدة بيانات Firestore للتحايل، يقوم النظام بمطابقة كود الترخيص بعملية تشفير للـ UID وتاريخ الانتهاء. في حالة عدم التطابق، يقفل البرنامج فوراً!' 
                : ' Même si un utilisateur modifie ses champs Firestore locaux, la signature cryptographique GP-XXXX-YYYY de l\'activation le bloquera instantanément car elle dépend d\'un sel secret que vous êtes seul à posséder.'}
            </li>
            <li>
              <strong>{language === 'ar' ? 'ميزة التحديث والإعلان الفوري' : 'Mise à jour et notifications directes'}</strong> 
              {language === 'ar' 
                ? ' اكتب أي رسالة في خانة الإعلان (Announcement) وسيتم عرضها لديه كشريط عاجل في شاشته لإعلامه بما تريده أو تذكيره بالخلاص.' 
                : ' Vous pouvez envoyer un bandeau dynamique apparaissant immédiatement sur le Dashboard du client en écrivant un message d\'annonce.'}
            </li>
            <li>
              <strong>{language === 'ar' ? 'شركاء وزبائن غير محدودين (بدون قيود)' : 'Partenaires et clients illimités'}</strong> 
              {language === 'ar' 
                ? ' لا توجد أي حدود أو قيود على عدد الزبائن والموردين والمنتجات والمستندات في قاعدة البيانات لجميع المشتركين.' 
                : ' Il n\'y a absolument aucune restriction ou limite sur le nombre de clients, fournisseurs, produits ou transactions pour tous les abonnés.'}
            </li>
          </ul>
        </div>
      </div>
      </>
      )}

      {consoleTab === 'updates' && (
        <div className="space-y-6 text-start">
          
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-xl">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                {language === 'ar' ? 'سجل تتبع الإصدارات البرمجية والتحميلات' : 'Fichier d’Historique des Releases Séquentielles'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar' 
                  ? 'قم بنشر تحديثات فورية وإعلام جميع المشتركين بالإصلاحات وميزات النظام الجديدة.' 
                  : 'Publiez des logs de mise à jour visibles par vos clients pour documenter l’évolution du SaaS.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowNewUpdateForm(!showNewUpdateForm);
                if (!showNewUpdateForm) {
                  setNewUpdateId(`v1.2.${updates.length + 5}`);
                  setNewUpdateDate(new Date().toISOString().replace('T', ' ').substring(0, 16));
                }
              }}
              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-3xs transition-colors self-start sm:self-auto"
            >
              <span>{showNewUpdateForm ? '✕' : '+'}</span>
              <span>{language === 'ar' ? 'نشر تحديث جديد' : 'Rédiger une Mise à jour'}</span>
            </button>
          </div>

          {/* New Update Form */}
          {showNewUpdateForm && (
            <form onSubmit={handleCreateSystemUpdate} className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-4 shadow-md animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-black uppercase tracking-widest text-rose-400 font-mono">
                  🚀 {language === 'ar' ? 'إعلان عن إصدار برمجي جديد للنواة قيد التنزيل' : 'Publication d’un nouveau pack d’amélioration'}
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">UTC Timestamp : {newUpdateDate || 'Maintenant'}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-900">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    {language === 'ar' ? 'رقم الإصدار (Version) *' : 'Version ID (e.g. v1.2.6) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUpdateId}
                    onChange={(e) => setNewUpdateId(e.target.value)}
                    placeholder="v1.2.6"
                    className="w-full text-xs font-bold font-mono border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    {language === 'ar' ? 'تاريخ التحديث *' : 'Date de Publication *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUpdateDate}
                    onChange={(e) => setNewUpdateDate(e.target.value)}
                    placeholder="26/05/2026 - 16:15"
                    className="w-full text-xs font-semibold font-mono border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    {language === 'ar' ? 'نوع الترقية *' : 'Type de Release *'}
                  </label>
                  <select
                    value={newUpdateType}
                    onChange={(e) => setNewUpdateType(e.target.value as any)}
                    className="w-full text-xs font-bold border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500"
                  >
                    <option value="patch">{language === 'ar' ? 'ترقيع بسيط (Patch)' : 'Patch correctif'}</option>
                    <option value="feature">{language === 'ar' ? 'ميزة جديدة (Feature)' : 'Nouvelle Fonctionnalité'}</option>
                    <option value="major">{language === 'ar' ? 'تحديث ضخم (Major)' : 'Mise à niveau Majeure'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    {language === 'ar' ? 'العنوان بالفرنسية *' : 'Titre principal (Français) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUpdateTitleFr}
                    onChange={(e) => setNewUpdateTitleFr(e.target.value)}
                    placeholder="e.g. Carte des Partenaires & Géoréférencement"
                    className="w-full text-xs font-bold border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    {language === 'ar' ? 'العنوان بالعربية *' : 'Titre principal (Arabe) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUpdateTitleAr}
                    onChange={(e) => setNewUpdateTitleAr(e.target.value)}
                    placeholder="e.g. خريطة الشركاء والتتبع الجغرافي"
                    className="w-full text-xs font-bold border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500 text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    {language === 'ar' ? 'نقاط التطوير بالفرنسية (كل سطر هو نقطة مستقلة) *' : 'Notes (Français - 1 point par ligne) *'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newUpdateDescFr}
                    onChange={(e) => setNewUpdateDescFr(e.target.value)}
                    placeholder="Intégration de la carte interactive&#10;Géo-référencement autonome"
                    className="w-full text-xs border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500 font-sans leading-relaxed text-left"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    {language === 'ar' ? 'نقاط التطوير بالعربية (كل سطر هو نقطة مستقلة) *' : 'Notes (Arabe - 1 point par ligne) *'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newUpdateDescAr}
                    onChange={(e) => setNewUpdateDescAr(e.target.value)}
                    placeholder="دمج لوحة التتبع الجغرافي للشركاء&#10;تحديث خريطة جوجل بنقرة واحدة"
                    className="w-full text-xs border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500 text-right font-sans leading-relaxed"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewUpdateForm(false)}
                  className="py-2 px-4 rounded text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  🚀 {language === 'ar' ? 'نشر وتعميم التحديث للمشتركين' : 'Publier et déployer'}
                </button>
              </div>
            </form>
          )}

          {/* Updates List feeds */}
          {updatesLoading ? (
            <div className="py-16 text-center space-y-3 bg-white border border-slate-200 rounded-xl">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {language === 'ar' ? 'جاري استدعاء سجل التحديثات من الخادم...' : 'Chargement des logs système...'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map((up) => {
                const isLatest = up.id === updates[0]?.id;
                return (
                  <div key={up.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all text-start relative overflow-hidden group shadow-3xs">
                    {isLatest && (
                      <div className="absolute top-0 right-0 lg:right-auto lg:left-0 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 shadow-3xs">
                        {language === 'ar' ? 'الإصدار النشط حالياً ⚡' : 'Version Active Actuelle ⚡'}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 pt-4 lg:pt-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded-sm">
                          {up.id}
                        </span>
                        <span className={`text-[9px] uppercase font-mono font-black px-1.5 py-0.5 rounded ${
                          up.type === 'major' 
                            ? 'bg-rose-100 text-rose-800' 
                            : up.type === 'feature' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {up.type === 'major' ? (language === 'ar' ? 'تحديث جذري' : 'Mise à niveau') : up.type === 'feature' ? (language === 'ar' ? 'ميزة جديدة' : 'Fonctionnalité') : 'Patch / Bugfix'}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {language === 'ar' ? up.titleAr : up.titleFr}
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400" dir="ltr">
                        📅 {up.date}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 pl-2 lg:pl-4">
                      <p className="font-bold text-slate-700">
                        {language === 'ar' ? 'العناصر والميزات والتحسينات المشمولة في هذا الإصدار :' : 'Modifications apportées :'}
                      </p>
                      <ul className="list-disc list-inside space-y-1.5 pl-2 leading-relaxed">
                        {(language === 'ar' ? up.descriptionAr : up.descriptionFr).map((bullet, idx) => (
                          <li key={idx} className="font-semibold text-slate-600">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
