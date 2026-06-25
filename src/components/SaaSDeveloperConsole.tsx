import React, { useState, useEffect } from 'react';
import { UserLicenseData, generateLicenseKey } from '../utils/licensing';
import { SystemUpdate } from '../types';
import { 
  loadAllTenantLicenses, 
  saveUserLicense, 
  deleteTenantCompletely,
  wipeAllSaaSTenantsAndDatabases,
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
  PlusCircle,
  Phone,
  Mail
} from 'lucide-react';

export default function SaaSDeveloperConsole() {
  const { language, formatCurrency } = useLanguage();
  
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
  const [editPaymentStatus, setEditPaymentStatus] = useState<'paid' | 'pending' | 'free_trial' | 'refunded'>('free_trial');
  const [editPaymentAmount, setEditPaymentAmount] = useState<number>(0);
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [editPhone, setEditPhone] = useState('');

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

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleRefreshAll = () => {
    fetchTenants();
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
    setEditPaymentStatus(t.paymentStatus || 'free_trial');
    setEditPaymentAmount(t.paymentAmount || 0);
    setEditAdminNotes(t.adminNotes || '');
    setEditPhone(t.phone || '');
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
        paymentStatus: editPaymentStatus,
        paymentAmount: Number(editPaymentAmount) || 0,
        adminNotes: editAdminNotes.trim() || undefined,
        phone: editPhone.trim() || undefined,
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
          disabled={loading}
          className="self-start sm:self-auto flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-75 * bg-linear-to-b text-xs font-bold text-white transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-95 text-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث وتزامن السيرفر' : 'Actualiser Firebase'}</span>
        </button>
      </div>

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
            </div>

            {/* Filter and query toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between text-start">
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
                                <input
                                  type="text"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  className="w-full text-xs font-medium border border-slate-250 p-1.5 rounded-lg bg-white text-slate-850"
                                  placeholder={language === 'ar' ? 'رقم الهاتف (اختياري)' : 'Numéro de téléphone (Optionnel)'}
                                />
                                <textarea
                                  rows={2}
                                  value={editAdminNotes}
                                  onChange={(e: any) => setEditAdminNotes(e.target.value)}
                                  className="w-full text-[10px] font-sans font-medium border border-slate-250 p-1.5 rounded-lg bg-white text-slate-850"
                                  placeholder="Notes administratives secrètes (Dossier Interne)"
                                />
                                <div className="text-[10px] text-slate-400 font-mono font-bold truncate">{t.email}</div>
                              </div>
                            ) : (
                              <div>
                                <p className="font-bold text-slate-850 text-sm">{t.businessName || 'Superette Tunisienne'}</p>
                                <p className="text-[11px] text-slate-500 font-bold">{t.email || 'Email non fourni'}</p>
                                
                                {/* 📞 Quick Action Contact Buttons */}
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {t.email && (
                                    <a
                                      href={`mailto:${t.email}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[10px] font-bold rounded border border-sky-200 transition-colors cursor-pointer"
                                      title={language === 'ar' ? 'إرسال بريد إلكتروني' : 'Envoyer un e-mail'}
                                    >
                                      <Mail className="w-3 h-3 text-sky-600 shrink-0" />
                                      <span>{language === 'ar' ? 'بريد' : 'E-mail'}</span>
                                    </a>
                                  )}
                                  {t.phone ? (
                                    <a
                                      href={`tel:${t.phone}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-bold rounded border border-rose-200 transition-colors cursor-pointer"
                                      title={language === 'ar' ? 'اتصال هاتفي سريع' : 'Appeler rapidement'}
                                    >
                                      <Phone className="w-3 h-3 text-rose-600 shrink-0" />
                                      <span>{t.phone}</span>
                                    </a>
                                  ) : null}
                                </div>
                                
                                {/* 💰 Premium SaaS Payment Status Row */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  <span className={`p-0.5 px-2 rounded font-sans text-[8px] font-black border uppercase tracking-wider ${
                                    t.paymentStatus === 'paid'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                                      : t.paymentStatus === 'pending'
                                      ? 'bg-amber-50 text-amber-800 border-amber-250 animate-pulse'
                                      : t.paymentStatus === 'refunded'
                                      ? 'bg-rose-50 text-rose-800 border-rose-250'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    💰 {t.paymentStatus === 'paid' ? (language === 'ar' ? 'خالص ومسدد ✅' : 'PAYÉ ✅') :
                                        t.paymentStatus === 'pending' ? (language === 'ar' ? 'قيد الانتظار ودفع الصكوك ⏳' : 'Attente paiement ⏳') :
                                        t.paymentStatus === 'refunded' ? (language === 'ar' ? 'مسترجع مالي 🛑' : 'REFUNDED 🛑') :
                                        (language === 'ar' ? 'عرض تجريبي مجاني 🎁' : 'ESSAI SANS FRAIS 🎁')}
                                  </span>
                                  
                                  {t.paymentAmount > 0 ? (
                                    <span className="bg-slate-50 text-slate-800 border border-slate-200 text-[9px] font-mono font-black p-0.5 px-2 rounded">
                                      {t.paymentAmount.toFixed(3)} TND
                                    </span>
                                  ) : null}
                                </div>

                                {/* 🔒 Intern Admin Notes Display */}
                                {t.adminNotes ? (
                                  <div className="bg-slate-50 text-slate-600 border-l-2 border-slate-400 p-1 px-2 font-sans text-[10px] mt-1.5 max-w-xs italic rounded-r select-all text-start">
                                    ℹ️ {t.adminNotes}
                                  </div>
                                ) : null}
                                
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
                              <div className="space-y-2 text-start">
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value as any)}
                                  className="w-full text-xs font-bold border border-slate-250 p-1.5 rounded bg-white text-slate-850"
                                >
                                  <option value="active">{language === 'ar' ? 'مفعّل ونشط ✅' : 'Abonnement Actif'}</option>
                                  <option value="trial">{language === 'ar' ? 'فترة تجريبية ⏳' : 'Essai Gratuit'}</option>
                                  <option value="suspended">{language === 'ar' ? 'مغلق ومجمد 🛑' : 'Suspendu / Impayé'}</option>
                                  <option value="expired">{language === 'ar' ? 'منتهي الصلاحية ❌' : 'Expiré'}</option>
                                </select>

                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase text-slate-500 block">Règlement :</label>
                                  <select
                                    value={editPaymentStatus}
                                    onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                                    className="w-full text-[10px] font-bold border border-slate-250 p-1 rounded bg-white text-slate-850"
                                  >
                                    <option value="paid">{language === 'ar' ? 'خالص ومسدد ✅' : 'Paid ✅'}</option>
                                    <option value="pending">{language === 'ar' ? 'قيد الانتظار ⏳' : 'Pending ⏳'}</option>
                                    <option value="free_trial">{language === 'ar' ? 'عرض تجريبي 🎁' : 'Free Trial 🎁'}</option>
                                    <option value="refunded">{language === 'ar' ? 'مسترجع مالي 🛑' : 'Refunded 🛑'}</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase text-slate-500 block">Tarif perçu (TND) :</label>
                                  <input
                                    type="number"
                                    step="5"
                                    value={editPaymentAmount}
                                    onChange={(e) => setEditPaymentAmount(parseFloat(e.target.value) || 0)}
                                    className="w-full text-[10px] font-mono font-bold border border-slate-250 p-1 rounded bg-white text-slate-850"
                                    placeholder="0.000"
                                  />
                                </div>
                              </div>
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
      </div>
  );
}
