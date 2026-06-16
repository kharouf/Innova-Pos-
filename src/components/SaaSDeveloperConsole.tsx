import React, { useState, useEffect } from 'react';
import { UserLicenseData, generateLicenseKey } from '../utils/licensing';
import { loadAllTenantLicenses, saveUserLicense, deleteTenantCompletely } from '../utils/firebaseSync';
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
  MessageSquare
} from 'lucide-react';

export default function SaaSDeveloperConsole() {
  const { language, formatCurrency } = useLanguage();
  const [tenants, setTenants] = useState<UserLicenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Editing tenant inline row state
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

  const handleStartEdit = (t: UserLicenseData) => {
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
      showToast(language === 'ar' ? '✅ تم تحديث ترخيص المشترك بنجاح!' : '✅ Licence mise à jour avec succès !');
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
      showToast(language === 'ar' ? '🗑️ تم حذف حساب المشترك وقاعدة بياناته بالكامل بنجاح!' : '🗑️ Compte utilisateur et base de données supprimés avec succès !');
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
      showToast(language === 'ar' ? '⚠️ يرجى إدخال البريد الإلكتروني و كود الـ UID' : '⚠️ L\'adresse email et l\'UID du client sont obligatoires !');
      return;
    }

    const targetUid = newTenantUid.trim();
    setActionLoading(targetUid);
    try {
      const regDate = newTenantRegisteredAt || new Date().toISOString().split('T')[0];
      const expiryDate = newTenantExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1050).toISOString().split('T')[0]; // 1 Year default
      
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
      showToast(language === 'ar' ? '✅ تم تسجيل المشترك وجدولة رخصته بنجاح!' : '✅ Utilisateur pré-enregistré avec succès !');
      
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

  const totalCount = tenants.length;
  const activeCount = tenants.filter(t => t.licenseStatus === 'active').length;
  const trialCount = tenants.filter(t => t.licenseStatus === 'trial').length;
  const suspendedCount = tenants.filter(t => t.licenseStatus === 'suspended' || t.licenseStatus === 'expired').length;

  return (
    <div className="space-y-6 font-sans p-1 text-slate-800" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Floating feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white font-sans text-xs font-bold py-3 px-5 rounded shadow-lg flex items-center gap-2">
          <span className="text-emerald-400 animate-pulse">●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Banner Header */}
      <div className="bg-slate-900 text-white p-6 rounded border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-start">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 px-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] uppercase font-mono font-black rounded-sm">
              SaaS Console • Administrateur
            </span>
          </div>
          <h1 className="text-xl font-display font-black tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-55 h-5 text-rose-500" />
            <span>{language === 'ar' ? 'إدارة تراخيص محلات Superette والمشتركين' : 'Gestion des Licences Superettes & Tenants'}</span>
          </h1>
          <p className="text-slate-400 mt-1 text-xs">
            {language === 'ar' 
              ? 'مراقبة تراخيص البيع السحابية للمحلات النشطة والتحكم المباشر في قفل أو تمديد حساباتهم.' 
              : 'Gérez à distance vos points de vente abonnés, suspendez les impayés et attribuez des clés de licence.'}
          </p>
        </div>

        <button
          onClick={fetchTenants}
          disabled={loading}
          className="self-start sm:self-auto flex items-center justify-center gap-1.5 py-1.5 px-3 mb-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-755 text-xs font-bold text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث البيانات' : 'Rafraîchir'}</span>
        </button>
      </div>

      {/* KPI Overviews (Exactly as shown in your layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded text-start shadow-3xs">
          <div className="text-[9px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'ar' ? 'إجمالي المحلات' : 'TOTAL BOUTIQUES'}</span>
          </div>
          <div className="text-2xl font-mono font-black text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'ar' ? 'الحسابات المسجلة في السحابة' : 'Comptes enregistrés sur Firestore'}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded text-start shadow-3xs">
          <div className="text-[9px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{language === 'ar' ? 'اشتراكات نشطة' : 'ABONNEMENTS ACTIFS'}</span>
          </div>
          <div className="text-2xl font-mono font-black text-emerald-600 mt-1">{activeCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
            {activeCount} {language === 'ar' ? 'مفعلين حالياً' : 'du total'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded text-start shadow-3xs">
          <div className="text-[9px] font-black uppercase text-blue-500 tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>{language === 'ar' ? 'فترات تجريبية' : 'PÉRIODES D\'ESSAI'}</span>
          </div>
          <div className="text-2xl font-mono font-black text-blue-600 mt-1">{trialCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'ar' ? 'تحت العرض والتجريب' : 'En phase de démonstration'}</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded text-start shadow-3xs">
          <div className="text-[9px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1">
            <UserX className="w-3.5 h-3.5 text-rose-500" />
            <span>{language === 'ar' ? 'حسابات مغلقة' : 'COMPTES VERROUILLÉS'}</span>
          </div>
          <div className="text-2xl font-mono font-black text-rose-600 mt-1">{suspendedCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'ar' ? 'الدخول معلق للتراخيص المنتهية' : 'Accès bloqué ou expiré'}</div>
        </div>
      </div>

      {/* Main Table section */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-3xs">
        
        {/* Table Banner Header in Dark Theme matches the screenshot */}
        <div className="p-4 bg-slate-900 border-b border-rose-500/10 flex items-center justify-between text-white flex-wrap gap-2 text-start">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <Users className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider font-mono text-slate-100 flex items-center gap-1.5">
                <span>{language === 'ar' ? '📁 ملفات المشتركين والمحلات المسجلة في السحابة' : '📁 COMPTES ENREGISTRÉS SUR FIRESTORE'}</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                {language === 'ar' 
                  ? 'قائمة التراخيص وعناوين البريد المسجلة والتحكم الفوري بآجالها' 
                  : 'Fiches d\'identification, dates de souscription et contrôle d\'accès cloud des boutiques'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters and search area */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:max-w-xl">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute top-2.5 right-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 pr-9 pl-3 py-2 bg-white rounded focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800 text-start"
                placeholder={language === 'ar' ? 'بحث عن بريد إلكتروني، محل...' : 'Rechercher par email, boutique, UID...'}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddTenantForm(!showAddTenantForm);
                if (!showAddTenantForm) {
                  setNewTenantRegisteredAt(new Date().toISOString().split('T')[0]);
                  setNewTenantExpiry(new Date(Date.now() + 365 * 24 * 60 * 60 * 1050).toISOString().split('T')[0]);
                  setNewTenantActivationDate(new Date().toISOString().split('T')[0]);
                }
              }}
              className="py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded text-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs transition-all"
            >
              <span>{showAddTenantForm ? '✕' : '➕'}</span>
              <span>{language === 'ar' ? 'تسجيل مشترك جديد' : 'Pré-enregistrer utilisateur Gmail'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase">{language === 'ar' ? 'تصفية :' : 'Filtrer :'}</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs font-bold border border-slate-200 bg-white p-1.5 px-3 rounded text-slate-700"
            >
              <option value="all">{language === 'ar' ? 'الكل' : 'Tous'}</option>
              <option value="active">{language === 'ar' ? 'مشترك مفعل' : 'Actifs'}</option>
              <option value="trial">{language === 'ar' ? 'تجريبي' : 'Essai'}</option>
              <option value="suspended">{language === 'ar' ? 'معطل' : 'Suspendus'}</option>
              <option value="expired">{language === 'ar' ? 'منتهي الصلاحية' : 'Expirés'}</option>
            </select>
          </div>
        </div>

        {/* Pre-registration Form */}
        {showAddTenantForm && (
          <form onSubmit={handleCreateNewTenant} className="bg-slate-900 border-b border-rose-500/15 text-white p-5 space-y-4 text-start animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-xs font-black uppercase tracking-widest text-rose-450 font-mono flex items-center gap-1.5">
                <span>➕ {language === 'ar' ? 'تسجيل مشترك Gmail جديد وحجز بياناته' : 'PRÉ-ENREGISTRER UN UTILISATEUR GMAIL (SaaS CONSOLE)'}</span>
              </h4>
              <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 font-bold font-mono rounded">SaaS CONFIGURATION</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {language === 'ar' ? 'البريد الإلكتروني للعميل Gmail *' : 'Adresse Email du Client (Gmail) *'}
                </label>
                <input
                  type="email"
                  required
                  value={newTenantEmail}
                  onChange={(e) => setNewTenantEmail(e.target.value)}
                  placeholder="exemple@gmail.com"
                  className="w-full text-xs font-bold border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500 text-start"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {language === 'ar' ? 'معرف المستخدم الفردي UID *' : 'Identifiant Unique UID (Firebase UID) *'}
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    required
                    value={newTenantUid}
                    onChange={(e) => setNewTenantUid(e.target.value)}
                    placeholder="Saisir ou générer un UID..."
                    className="w-full text-xs font-bold font-mono border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500 text-start"
                  />
                  <button
                    type="button"
                    onClick={() => setNewTenantUid('usr_' + Math.random().toString(36).substring(2, 11))}
                    className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[10px] rounded text-slate-300 font-mono cursor-pointer"
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
                  className="w-full text-xs font-bold border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500 text-start"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {language === 'ar' ? 'نوع حالة الحساب *' : 'Type de Statut *'}
                </label>
                <select
                  value={newTenantStatus}
                  onChange={(e) => setNewTenantStatus(e.target.value as any)}
                  className="w-full text-xs font-bold border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden focus:border-rose-500"
                >
                  <option value="trial">{language === 'ar' ? 'فترة تجريبية (Trial)' : 'Essai Gratuit'}</option>
                  <option value="active">{language === 'ar' ? 'نشط مفعل (Active)' : 'Actif / Abonné'}</option>
                  <option value="suspended">{language === 'ar' ? 'معطل ومحجوب' : 'Suspendu / Bloqué'}</option>
                  <option value="expired">{language === 'ar' ? 'منتهي الترخيص (Expired)' : 'Expiré'}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {language === 'ar' ? 'تاريخ التفعيل (Activation Date)' : "Date d'activation"}
                </label>
                <input
                  type="date"
                  value={newTenantActivationDate}
                  onChange={(e) => setNewTenantActivationDate(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {language === 'ar' ? 'تاريخ نهاية الترخيص' : "Date d'expiration"}
                </label>
                <input
                  type="date"
                  value={newTenantExpiry}
                  onChange={(e) => setNewTenantExpiry(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {language === 'ar' ? 'تاريخ انضمام العميل' : "Date d'inscription"}
                </label>
                <input
                  type="date"
                  value={newTenantRegisteredAt}
                  onChange={(e) => setNewTenantRegisteredAt(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                {language === 'ar' ? 'الموقع الجغرافي للنشاط (اختياري)' : 'Localisation ou URL Google Maps (Optionnel)'}
              </label>
              <input
                type="text"
                value={newTenantLocation}
                onChange={(e) => setNewTenantLocation(e.target.value)}
                placeholder="Ex: Tunis, Tunisie ou coordonnées GPS"
                className="w-full text-xs font-medium border border-slate-800 bg-slate-950 p-2.5 rounded text-white focus:outline-hidden text-start"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddTenantForm(false)}
                className="py-2 px-4 rounded text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="submit"
                disabled={actionLoading !== null}
                className="py-2 px-5 rounded text-xs bg-rose-600 hover:bg-rose-700 text-white font-extrabold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
              >
                {actionLoading ? '...' : '🚀'}
                <span>{language === 'ar' ? 'حفظ وحجز ترخيص المشترك' : 'Sauvegarder et Initialiser'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Loading Spinner / Void states */}
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{language === 'ar' ? 'جاري تحميل هويات المشتركين وتراخيصهم...' : 'Chargement des licences cloud...'}</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="py-20 text-center space-y-2 bg-white">
            <Users className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-sm font-bold text-slate-700">{language === 'ar' ? 'لم يتم العثور على مشتركين بعد' : 'Aucun tenant trouvé'}</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {language === 'ar' ? 'لا يوجد أي حساب متصل أو محجوز يطابق فلتر البحث حالياً.' : 'Aucun client n\'est enregistré avec ce filtre pour le moment.'}
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
                  <th className="p-4 text-center">{language === 'ar' ? 'رمز الترخيص السحابي' : 'Clef de Signature'}</th>
                  <th className="p-4">{language === 'ar' ? 'الحالة الحالية' : 'Statut'}</th>
                  <th className="p-4 text-center">{language === 'ar' ? 'التحكم والتعديل' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredTenants.map(t => {
                  const isEditing = editingTenantId === t.uid;
                  const isTrial = t.licenseStatus === 'trial';
                  const isActiveStatus = t.licenseStatus === 'active';

                  return (
                    <tr key={t.uid} className={`hover:bg-slate-50/50 transition-colors ${isEditing ? 'bg-amber-50/20' : ''}`}>
                      
                      {/* Store detail block */}
                      <td className="p-4 text-start">
                        {isEditing ? (
                          <div className="space-y-1.5 max-w-xs">
                            <input
                              type="text"
                              value={editStoreName}
                              onChange={(e) => setEditStoreName(e.target.value)}
                              className="w-full text-xs font-bold border border-slate-250 p-1.5 rounded bg-white text-slate-850"
                              placeholder="Nom du commerce"
                            />
                            <input
                              type="text"
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              className="w-full text-xs font-medium border border-slate-250 p-1.5 rounded bg-white text-slate-850"
                              placeholder={language === 'ar' ? 'الموقع الجغرافي أو رابط خرائط جوجل' : 'Localisation ou URL Google Maps'}
                            />
                            <div className="text-[10px] text-slate-400 font-mono font-bold truncate select-all">{t.email || 'Pas d\'email'}</div>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-850 text-sm">{t.businessName || 'Superette Tunisienne'}</p>
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
                                    className="hover:underline flex items-center gap-1.5"
                                  >
                                    <span>{language === 'ar' ? 'مربع الموقع الجغرافي 🗺️' : 'Localisation boutique 🗺️'}</span>
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
                                className="hover:text-slate-800 p-0.5 hover:bg-slate-200 rounded cursor-pointer"
                                title="Copy UID"
                              >
                                <Clipboard className="w-3 h-3 text-slate-400 inline" />
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="p-4 whitespace-nowrap text-slate-500 font-semibold">
                        {t.registeredAt || '24/05/2026'}
                      </td>

                      {/* Expiry Date */}
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

                      {/* Cloud Signature Key */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 px-2.5 rounded border border-slate-200 font-mono text-[10px] text-slate-600">
                          <KeyRound className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-bold block truncate max-w-[120px]" title={t.licenseKey}>{t.licenseKey || 'N/A: Non Généré'}</span>
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

                      {/* Status select/render */}
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
                          <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold block text-center capitalize w-24 border ${
                            isActiveStatus
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isTrial
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {t.licenseStatus === 'active' && (language === 'ar' ? 'نشط مفعل ✅' : 'Actif ✅')}
                            {t.licenseStatus === 'trial' && (language === 'ar' ? 'تجريبي ⏳' : 'Essai ⏳')}
                            {t.licenseStatus === 'suspended' && (language === 'ar' ? 'معطل 🛑' : 'Suspendu 🛑')}
                            {t.licenseStatus === 'expired' && (language === 'ar' ? 'منتهي ❌' : 'Expiré ❌')}
                          </span>
                        )}
                      </td>

                      {/* Row specific inline fields editing controls */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="space-y-2 max-w-xs text-start">
                            
                            {/* Fast remote message broadcast text */}
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-slate-500 uppercase block">
                                {language === 'ar' ? 'شريط إعلان يظهر له أعلى الشاشة :' : 'Notification à pousser en haut :'}
                              </label>
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={editAnnouncement}
                                  onChange={(e) => setEditAnnouncement(e.target.value)}
                                  className="w-full text-[11px] font-semibold border border-slate-250 p-1 rounded bg-white text-slate-800"
                                  placeholder="e.g. يرجى تصفية الفاتورة السنوية"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditAnnouncement(language === 'ar' ? 'برجاء تصفية الفواتير المعلقة للحفاظ على تزامن السيرفر مع خالص الشكر.' : 'Veuillez régulariser votre abonnement annuel pour éviter le blocage du système.')}
                                  className="p-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded shrink-0 cursor-pointer font-bold"
                                  title="Utiliser modèle rapide"
                                >
                                  ✍️
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-200 mt-1">
                              <button
                                type="button"
                                onClick={() => setEditingTenantId(null)}
                                className="py-1 px-2 text-[10px] font-bold rounded bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              >
                                {language === 'ar' ? 'رجوع' : 'Retour'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveTenantLicense(t.uid)}
                                disabled={actionLoading === t.uid}
                                className="py-1 px-2.5 text-[10px] font-bold rounded bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 cursor-pointer"
                              >
                                {actionLoading === t.uid ? '...' : (language === 'ar' ? 'حفظ 💾' : 'Appliquer 💾')}
                              </button>
                            </div>
                          </div>
                        ) : deletingTenantId === t.uid ? (
                          <div className="flex flex-col gap-1 items-stretch max-w-[180px] mx-auto text-center font-sans">
                            <span className="text-[9px] text-rose-600 font-bold block bg-rose-50 p-1 px-1.5 border border-rose-200 rounded">
                              {language === 'ar' ? '⚠️ سيتم مسح بيانات المحل تماماً وسجلاته نهائياً!' : '⚠️ Supprimer définitivement cette boutique ?'}
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
                              onClick={() => handleStartEdit(t)}
                              className="py-1 px-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded text-[10px] font-black text-slate-705 cursor-pointer transition-colors inline-flex items-center gap-1 shrink-0"
                            >
                              <span>⚙️</span>
                              <span>{language === 'ar' ? 'تعديل الترخيص والإجراءات' : "Gérer l'accès"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTenantId(t.uid)}
                              className="py-1 px-2 bg-rose-100 border border-rose-200 hover:bg-rose-200 text-rose-700 rounded text-[10px] font-black cursor-pointer transition-colors inline-flex items-center gap-1 shrink-0"
                            >
                              <span>🗑️</span>
                              <span>{language === 'ar' ? 'حذف الحساب' : "Supprimer"}</span>
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
  );
}
