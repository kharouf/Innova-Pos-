import React, { useState, useEffect } from 'react';
import { UserLicenseData, generateLicenseKey } from '../utils/licensing';
import { SystemUpdate, SystemUpdateSettings } from '../types';
import { 
  loadAllTenantLicenses, 
  saveUserLicense, 
  deleteTenantCompletely,
  wipeAllSaaSTenantsAndDatabases,
  loadSystemUpdates,
  saveSystemUpdate,
  deleteSystemUpdate,
  loadSystemUpdateSettings,
  saveSystemUpdateSettings,
  DEFAULT_UPDATE_SETTINGS
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
  Mail,
  Bell,
  Sparkles,
  Sliders,
  Settings,
  Radio,
  DownloadCloud,
  Send,
  Eye
} from 'lucide-react';

export default function SaaSDeveloperConsole() {
  const { language, formatCurrency } = useLanguage();
  
  // Console Tab: 'tenants' (Abonnés & Licences) vs 'updates' (Paramètres & Mises à Jour)
  const [consoleTab, setConsoleTab] = useState<'tenants' | 'updates'>('tenants');

  // Tenants (Clients) States
  const [tenants, setTenants] = useState<UserLicenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // System Updates & Automation Settings States
  const [updatesList, setUpdatesList] = useState<SystemUpdate[]>([]);
  const [updateSettings, setUpdateSettings] = useState<SystemUpdateSettings>(DEFAULT_UPDATE_SETTINGS);
  const [loadingUpdates, setLoadingUpdates] = useState<boolean>(false);
  const [savingUpdateSettings, setSavingUpdateSettings] = useState<boolean>(false);

  // Modal for adding / editing a system update
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [modalVersion, setModalVersion] = useState<string>('v1.3.0');
  const [modalDate, setModalDate] = useState<string>('');
  const [modalType, setModalType] = useState<'major' | 'feature' | 'patch'>('feature');
  const [modalIsMandatory, setModalIsMandatory] = useState<boolean>(false);
  const [modalTitleFr, setModalTitleFr] = useState<string>('');
  const [modalTitleAr, setModalTitleAr] = useState<string>('');
  const [modalDescFr, setModalDescFr] = useState<string[]>([]);
  const [modalDescAr, setModalDescAr] = useState<string[]>([]);
  const [newDescItemFr, setNewDescItemFr] = useState<string>('');
  const [newDescItemAr, setNewDescItemAr] = useState<string>('');

  // Preview Modal for testing notification look
  const [previewUpdate, setPreviewUpdate] = useState<SystemUpdate | null>(null);

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
  const [editDatabaseSecurityPin, setEditDatabaseSecurityPin] = useState('');

  // Floating Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Tenant Creation State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDatabaseSecurityPin, setNewDatabaseSecurityPin] = useState('0000');
  const [newStatus, setNewStatus] = useState<'trial' | 'active' | 'suspended'>('trial');
  const [newExpiry, setNewExpiry] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days trial/active period by default
    return date.toISOString().split('T')[0];
  });
  const [newPaymentStatus, setNewPaymentStatus] = useState<'paid' | 'pending' | 'free_trial' | 'refunded'>('free_trial');
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>('0');
  const [newAdminNotes, setNewAdminNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3050);
  };

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadAllTenantLicenses();
      setTenants(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
      showToast('❌ Failed to fetch tenants database');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdatesAndConfig = async () => {
    setLoadingUpdates(true);
    try {
      const [updates, config] = await Promise.all([
        loadSystemUpdates(),
        loadSystemUpdateSettings()
      ]);
      setUpdatesList(updates);
      setUpdateSettings(config);
    } catch (err) {
      console.warn("Could not fetch updates or settings:", err);
    } finally {
      setLoadingUpdates(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchUpdatesAndConfig();
  }, []);

  const handleRefreshAll = () => {
    fetchTenants();
    fetchUpdatesAndConfig();
    showToast(language === 'ar' ? '🔄 تم تحديث السيرفر السحابي وقاعدة البيانات!' : '🔄 Données SaaS actualisées depuis Firestore !');
  };

  // ----- SYSTEM UPDATE SETTINGS ACTIONS -----
  const handleSaveGlobalUpdateSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingUpdateSettings(true);
    try {
      await saveSystemUpdateSettings(updateSettings);
      showToast(language === 'ar' ? '✅ تم حفظ ونشر إعدادات التحديث التلقائي لكافة المشتركين!' : '✅ Paramètres de mise à jour synchronisés et diffusés à tous les clients !');
    } catch (err) {
      console.error(err);
      showToast(language === 'ar' ? '❌ خطأ أثناء حفظ إعدادات التحديث' : '❌ Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSavingUpdateSettings(false);
    }
  };

  const formatCurrentDateTime = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${mins}`;
  };

  const handleOpenAddUpdateModal = () => {
    setEditingUpdateId(null);
    setModalVersion(`v1.${updatesList.length + 3}.0`);
    setModalDate(formatCurrentDateTime());
    setModalType('feature');
    setModalIsMandatory(false);
    setModalTitleFr('');
    setModalTitleAr('');
    setModalDescFr(['', '']);
    setModalDescAr(['', '']);
    setNewDescItemFr('');
    setNewDescItemAr('');
    setShowUpdateModal(true);
  };

  const handleOpenEditUpdateModal = (up: SystemUpdate) => {
    setEditingUpdateId(up.id);
    setModalVersion(up.id);
    setModalDate(up.date || formatCurrentDateTime());
    setModalType(up.type || 'feature');
    setModalIsMandatory(!!up.isMandatory);
    setModalTitleFr(up.titleFr || '');
    setModalTitleAr(up.titleAr || '');
    setModalDescFr([...up.descriptionFr]);
    setModalDescAr([...up.descriptionAr]);
    setNewDescItemFr('');
    setNewDescItemAr('');
    setShowUpdateModal(true);
  };

  const handleAddDescPointFr = () => {
    if (!newDescItemFr.trim()) return;
    setModalDescFr([...modalDescFr, newDescItemFr.trim()]);
    setNewDescItemFr('');
  };

  const handleRemoveDescPointFr = (index: number) => {
    setModalDescFr(modalDescFr.filter((_, i) => i !== index));
  };

  const handleAddDescPointAr = () => {
    if (!newDescItemAr.trim()) return;
    setModalDescAr([...modalDescAr, newDescItemAr.trim()]);
    setNewDescItemAr('');
  };

  const handleRemoveDescPointAr = (index: number) => {
    setModalDescAr(modalDescAr.filter((_, i) => i !== index));
  };

  const handleSaveUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVersion.trim() || !modalTitleFr.trim() || !modalTitleAr.trim()) {
      showToast(language === 'ar' ? '⚠️ يرجى كتابة رقم الإصدار والعناوين بالفرنسية والعربية' : '⚠️ Veuillez renseigner le numéro de version et les titres');
      return;
    }

    const cleanDescFr = modalDescFr.filter(d => d.trim().length > 0);
    const cleanDescAr = modalDescAr.filter(d => d.trim().length > 0);

    if (cleanDescFr.length === 0) {
      cleanDescFr.push(modalTitleFr.trim());
    }
    if (cleanDescAr.length === 0) {
      cleanDescAr.push(modalTitleAr.trim());
    }

    const newUpdateDoc: SystemUpdate = {
      id: modalVersion.trim(),
      date: modalDate.trim() || formatCurrentDateTime(),
      type: modalType,
      isMandatory: modalIsMandatory,
      titleFr: modalTitleFr.trim(),
      titleAr: modalTitleAr.trim(),
      descriptionFr: cleanDescFr,
      descriptionAr: cleanDescAr
    };

    setActionLoading('save_update');
    try {
      await saveSystemUpdate(newUpdateDoc);
      
      // Also update latestAppVersion in settings if this update is newer
      const updatedSettings = {
        ...updateSettings,
        latestAppVersion: newUpdateDoc.id,
        lastUpdatedTimestamp: new Date().toISOString()
      };
      await saveSystemUpdateSettings(updatedSettings);
      setUpdateSettings(updatedSettings);

      showToast(language === 'ar' 
        ? `🚀 تم نشر التحديث ${newUpdateDoc.id} وإشعار كافة زبائن ومحلات النظام فورياً!` 
        : `🚀 Version ${newUpdateDoc.id} publiée et diffusée aux terminaux clients avec succès !`);

      setShowUpdateModal(false);
      await fetchUpdatesAndConfig();
    } catch (err) {
      console.error(err);
      showToast('❌ Erreur lors de la publication de la mise à jour');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUpdateConfirm = async (id: string) => {
    setActionLoading(`delete_update_${id}`);
    try {
      await deleteSystemUpdate(id);
      showToast(language === 'ar' ? '🗑️ تم حذف سجل التحديث بنجاح' : '🗑️ Journal de version supprimé avec succès');
      await fetchUpdatesAndConfig();
    } catch (err) {
      console.error(err);
      showToast('❌ Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePushBroadcastNotification = async () => {
    try {
      const updatedSettings = {
        ...updateSettings,
        forceNotificationModal: true,
        lastUpdatedTimestamp: new Date().toISOString()
      };
      await saveSystemUpdateSettings(updatedSettings);
      setUpdateSettings(updatedSettings);
      showToast(language === 'ar' 
        ? '📢 تم إرسال إشعار فوري وتنبيه منبثق لجميع المشتركين المتصلين!' 
        : '📢 Signal de mise à jour et notification immédiate envoyés à tous les postes clients !');
    } catch (err) {
      console.error(err);
    }
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
    setEditDatabaseSecurityPin(t.databaseSecurityPin || '0000');
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
        databaseSecurityPin: editDatabaseSecurityPin.trim() || undefined,
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

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newStoreName.trim()) {
      showToast(language === 'ar' ? '⚠️ يرجى إدخال البريد الإلكتروني واسم المحل!' : '⚠️ Veuillez saisir l\'email et le nom du commerce !');
      return;
    }

    // Generate a unique clean ID for the brand new tenant
    const tempUid = 'user-' + Math.random().toString(36).substring(2, 9);
    const key = generateLicenseKey(tempUid, newExpiry);

    const newTenant: UserLicenseData = {
      uid: tempUid,
      email: newEmail.trim().toLowerCase(),
      registeredAt: new Date().toISOString().split('T')[0],
      activationDate: newStatus === 'active' ? new Date().toISOString().split('T')[0] : '',
      licenseExpiry: newExpiry,
      licenseStatus: newStatus,
      licenseKey: key,
      remoteAnnouncement: language === 'ar' ? 'مرحباً بك في نظام INNOVA POS.' : 'Bienvenue sur INNOVA POS.',
      businessName: newStoreName.trim(),
      location: newLocation.trim(),
      phone: newPhone.trim(),
      paymentStatus: newPaymentStatus,
      paymentAmount: Number(newPaymentAmount) || 0,
      adminNotes: newAdminNotes.trim(),
      isOnboarded: false,
      databaseSecurityPin: newDatabaseSecurityPin.trim() || '0000'
    };

    setActionLoading('create');
    try {
      await saveUserLicense(tempUid, newTenant);
      showToast(language === 'ar' ? '✅ تم إضافة المشترك الجديد بنجاح في قاعدة البيانات!' : '✅ Client SaaS créé avec succès !');
      setShowAddModal(false);
      
      // Reset form fields
      setNewEmail('');
      setNewStoreName('');
      setNewPhone('');
      setNewLocation('');
      setNewDatabaseSecurityPin('0000');
      setNewStatus('trial');
      setNewPaymentStatus('free_trial');
      setNewPaymentAmount('0');
      setNewAdminNotes('');

      await fetchTenants();
    } catch (err) {
      console.error(err);
      showToast('❌ Error creating new tenant record');
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
          disabled={loading || loadingUpdates}
          className="self-start sm:self-auto flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-white transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-95 text-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${(loading || loadingUpdates) ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث وتزامن السيرفر' : 'Actualiser Firebase'}</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs: Abonnés vs Mises à Jour & Paramètres */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setConsoleTab('tenants')}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-t-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
            consoleTab === 'tenants'
              ? 'bg-white text-rose-600 border-rose-600 shadow-3xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{language === 'ar' ? `👥 المشتركون والتراخيص (${totalCount})` : `👥 Abonnés & Licences (${totalCount})`}</span>
        </button>

        <button
          type="button"
          onClick={() => setConsoleTab('updates')}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-t-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
            consoleTab === 'updates'
              ? 'bg-white text-rose-600 border-rose-600 shadow-3xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent'
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>{language === 'ar' ? `🚀 إعدادات وتحديثات النظام (${updatesList.length})` : `🚀 Paramètres & Mises à Jour (${updatesList.length})`}</span>
          {updateSettings.autoApplyUpdates && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Auto-Update Actif" />
          )}
        </button>
      </div>

      {/* TAB 1: TENANTS & LICENSES */}
      {consoleTab === 'tenants' && (
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

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'سجل مشترك جديد' : 'Inscrire un abonné'}</span>
              </button>
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
            ) : error ? (
              <div className="py-12 px-4 text-center space-y-3 bg-rose-50/50 border border-rose-100 rounded-lg m-4">
                <p className="text-sm font-bold text-rose-700">{language === 'ar' ? 'فشل الاتصال بقاعدة البيانات السحابية' : 'Erreur de connexion Firestore'}</p>
                <p className="text-xs text-rose-500 font-mono max-w-lg mx-auto">{error}</p>
                <button 
                  onClick={fetchTenants} 
                  className="px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-bold hover:bg-rose-700"
                >
                  {language === 'ar' ? 'إعادة المحاولة 🔄' : 'Réessayer 🔄'}
                </button>
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
                      <th className="p-4 text-center">{language === 'ar' ? 'كلمة مرور قاعدة البيانات' : 'PIN Base de Données'}</th>
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

                          {/* Database Access Password/PIN */}
                          <td className="p-4 text-center whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                maxLength={12}
                                value={editDatabaseSecurityPin}
                                onChange={(e) => setEditDatabaseSecurityPin(e.target.value)}
                                className="w-22 text-center text-xs font-mono font-bold border border-slate-250 p-1.5 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                                placeholder="0000"
                              />
                            ) : (
                              <span className="font-mono bg-indigo-50 border border-indigo-150 text-indigo-700 font-extrabold px-2.5 py-1 rounded text-xs select-all inline-block">
                                {t.databaseSecurityPin || '0000'}
                              </span>
                            )}
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
      )}

      {/* TAB 2: SYSTEM UPDATES & AUTOMATION SETTINGS */}
      {consoleTab === 'updates' && (
        <div className="space-y-6 animate-fade-in animate-duration-300">
          
          {/* Quick Metrics for Updates */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-lg text-start shadow-3xs">
              <div className="text-[9px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                <Rocket className="w-3.5 h-3.5 text-indigo-500" />
                <span>{language === 'ar' ? 'الإصدار النشط حالياً' : 'VERSION DE PRODUCTION'}</span>
              </div>
              <div className="text-xl font-mono font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <span className="p-1 px-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                  {updateSettings.latestAppVersion || 'v1.3.0'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-1">
                {language === 'ar' ? 'النسخة المفروضة على كافة نقاط البيع' : 'Déployée sur tous les terminaux'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg text-start shadow-3xs">
              <div className="text-[9px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                <DownloadCloud className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === 'ar' ? 'التحديث التلقائي للزبائن' : 'AUTO-UPDATE CLIENTS'}</span>
              </div>
              <div className="text-xl font-mono font-black mt-1">
                {updateSettings.autoApplyUpdates ? (
                  <span className="text-emerald-600 flex items-center gap-1 text-sm font-bold">
                    <CheckCircle className="w-4 h-4" /> {language === 'ar' ? 'مفعّل تلقائياً ⚡' : 'Automatique ⚡'}
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1 text-sm font-bold">
                    <Clock className="w-4 h-4" /> {language === 'ar' ? 'يدوي فقط ✋' : 'Manuel ✋'}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-1">
                {updateSettings.autoApplyUpdates 
                  ? (language === 'ar' ? 'تحديث التطبيق فورياً دون إزعاج المستخدم' : 'Mise à jour en tâche de fond') 
                  : (language === 'ar' ? 'يتطلب نقرة من المستخدم للتحديث' : 'Mise à jour manuelle requise')}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg text-start shadow-3xs">
              <div className="text-[9px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>{language === 'ar' ? 'إشعار منبثق للمستخدم' : 'POP-UP NOTIFICATION'}</span>
              </div>
              <div className="text-xl font-mono font-black mt-1">
                {updateSettings.forceNotificationModal ? (
                  <span className="text-blue-600 flex items-center gap-1 text-sm font-bold">
                    <Radio className="w-4 h-4 animate-pulse" /> {language === 'ar' ? 'إشعار فوري 📢' : 'Immédiat 📢'}
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1 text-sm font-bold">
                    <Info className="w-4 h-4" /> {language === 'ar' ? 'هادئ ومكتوم 🔕' : 'Discret 🔕'}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-1">
                {language === 'ar' ? 'عرض نافذة الميزات الجديدة فور الإطلاق' : 'Modal changelog affiché aux caisses'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg text-start shadow-3xs">
              <div className="text-[9px] font-black uppercase text-rose-600 tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>{language === 'ar' ? 'وضع الصيانة العام' : 'MODE MAINTENANCE'}</span>
              </div>
              <div className="text-xl font-mono font-black mt-1">
                {updateSettings.maintenanceMode ? (
                  <span className="text-rose-600 flex items-center gap-1 text-sm font-bold">
                    <AlertTriangle className="w-4 h-4 animate-bounce" /> {language === 'ar' ? 'صيانة نشطة ⚠️' : 'Maintenance ⚠️'}
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1 text-sm font-bold">
                    <Check className="w-4 h-4" /> {language === 'ar' ? 'سيرفر نشط 🟢' : 'Opérationnel 🟢'}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-1">
                {updateSettings.maintenanceMode ? (language === 'ar' ? 'الوصول محجوب مؤقتاً للصيانة' : 'Accès bloqué aux caisses') : (language === 'ar' ? 'كافة الخدمات تعمل بامتياز' : 'Services actifs')}
              </div>
            </div>
          </div>

          {/* Section 1: Global System Update & Automated Settings Form */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-3xs text-start">
            <div className="p-4 bg-slate-900 border-b border-rose-500/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-white gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider font-mono text-slate-100">
                    {language === 'ar' ? '⚙️ إعدادات التحديث التلقائي وقواعد النشر للأجهزة والزبائن' : '⚙️ CONFIGURATION DES MISES À JOUR AUTOMATIQUES & NOTIFICATIONS'}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {language === 'ar' 
                      ? 'التحكم بطريقة تطبيق التحديثات وإرسال الإشعارات المنبثقة لكل حسابات ومحلات النظام فورياً' 
                      : 'Contrôler la diffusion en temps réel, l\'auto-update silencieux et les alertes auprès des clients'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePushBroadcastNotification}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-3xs active:scale-95"
                  title="Envoyer une notification push immédiate"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إرسال إشعار فوري للكل 📢' : 'Diffuser Notification 📢'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveGlobalUpdateSettings()}
                  disabled={savingUpdateSettings}
                  className="flex items-center gap-1.5 py-1.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-3xs active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingUpdateSettings ? '...' : (language === 'ar' ? 'حفظ ونشر الإعدادات 💾' : 'Enregistrer les Réglages 💾')}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveGlobalUpdateSettings} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Latest Target Version */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-700 block flex items-center justify-between">
                    <span>{language === 'ar' ? 'الإصدار العام المستهدف (Production Version)' : 'Version Cible de Production'}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">Ex: v1.3.0</span>
                  </label>
                  <input
                    type="text"
                    value={updateSettings.latestAppVersion}
                    onChange={(e) => setUpdateSettings({ ...updateSettings, latestAppVersion: e.target.value })}
                    className="w-full text-xs font-mono font-bold border border-slate-250 p-2.5 rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-hidden focus:border-rose-500 transition-colors"
                    placeholder="v1.3.0"
                    required
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    {language === 'ar' ? 'الرقم المرجعي الذي تقارن به أجهزة الزبائن لمعرفة توفر تحديث جديد.' : 'Identifiant de version comparé par les terminaux pour détecter les nouveautés.'}
                  </p>
                </div>

                {/* Min Supported Version */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-700 block flex items-center justify-between">
                    <span>{language === 'ar' ? 'الحد الأدنى المدعوم (Min Supported Version)' : 'Version Minimale Compatible'}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">Ex: v1.0.0</span>
                  </label>
                  <input
                    type="text"
                    value={updateSettings.minSupportedVersion}
                    onChange={(e) => setUpdateSettings({ ...updateSettings, minSupportedVersion: e.target.value })}
                    className="w-full text-xs font-mono font-bold border border-slate-250 p-2.5 rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-hidden focus:border-rose-500 transition-colors"
                    placeholder="v1.0.0"
                    required
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    {language === 'ar' ? 'الإصدارات الأقدم من هذا الحد ستلزم بتحديث فوري إجباري.' : 'Les versions antérieures seront obligées de se mettre à niveau immédiatement.'}
                  </p>
                </div>

              </div>

              {/* Toggles Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                
                {/* Auto Apply Toggle */}
                <div className={`p-4 rounded-xl border transition-all ${
                  updateSettings.autoApplyUpdates 
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateSettings.autoApplyUpdates}
                      onChange={(e) => setUpdateSettings({ ...updateSettings, autoApplyUpdates: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded mt-0.5 cursor-pointer accent-emerald-600"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase block leading-tight">
                        {language === 'ar' ? '⚡ تحديث تلقائي بدون إزعاج' : '⚡ Mise à Jour Automatique'}
                      </span>
                      <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                        {language === 'ar' 
                          ? 'يقوم النظام بتثبيت وتحديث الكاشير وقاعدة البيانات تلقائياً وفورياً عند تشغيل التطبيق.' 
                          : 'Applique automatiquement les correctifs côté client sans bloquer le caissier.'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Force Notification Modal */}
                <div className={`p-4 rounded-xl border transition-all ${
                  updateSettings.forceNotificationModal 
                    ? 'bg-blue-50/70 border-blue-200 text-blue-950' 
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateSettings.forceNotificationModal}
                      onChange={(e) => setUpdateSettings({ ...updateSettings, forceNotificationModal: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer accent-blue-600"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase block leading-tight">
                        {language === 'ar' ? '📢 نافذة منبثقة للمستجدات' : '📢 Pop-up Changelog Client'}
                      </span>
                      <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                        {language === 'ar' 
                          ? 'إظهار نافذة تفاعلية تشرح مميزات التحديث والتعديلات الجديدة في أول فتح للنظام.' 
                          : 'Affiche la boîte de dialogue avec les nouveautés détaillées dès l\'ouverture de la caisse.'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Maintenance Mode Toggle */}
                <div className={`p-4 rounded-xl border transition-all ${
                  updateSettings.maintenanceMode 
                    ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateSettings.maintenanceMode}
                      onChange={(e) => setUpdateSettings({ ...updateSettings, maintenanceMode: e.target.checked })}
                      className="w-4 h-4 text-rose-600 rounded mt-0.5 cursor-pointer accent-rose-600"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase block leading-tight text-rose-700">
                        {language === 'ar' ? '🛑 وضع الصيانة المؤقت' : '🛑 Mode Maintenance Serveur'}
                      </span>
                      <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                        {language === 'ar' 
                          ? 'تعليق الوصول وإظهار شاشة صيانة لكافة المحلات أثناء تحديث البنية السحابية.' 
                          : 'Bloque l\'accès temporairement avec un écran de maintenance lors des gros déploiements.'}
                      </p>
                    </div>
                  </label>
                </div>

              </div>

              {/* Broadcast Announcement Banner Text */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-black uppercase text-slate-700 block flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{language === 'ar' ? 'شريط التنبيه الإداري العام (Broadcast Announcement Banner)' : 'Bandeau d\'Annonce Flash Général'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {language === 'ar' ? 'يظهر أعلى لوحة كافة المشتركين' : 'S\'affiche en haut chez tous les abonnés'}
                  </span>
                </label>
                <input
                  type="text"
                  value={updateSettings.globalAnnouncement || ''}
                  onChange={(e) => setUpdateSettings({ ...updateSettings, globalAnnouncement: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-250 p-2.5 rounded-lg bg-slate-50 focus:bg-white text-slate-900 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  placeholder={language === 'ar' ? 'مثال: تم إطلاق تحديث جديد لنظام نقاط البيع مع دعم أجهزة الباركود اللاسلكية...' : 'Ex: Nouvelle mise à jour déployée : découvrez les nouvelles options de tickets et synchronisation...'}
                />
              </div>

              {/* Maintenance Messages (if active) */}
              {updateSettings.maintenanceMode && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                  <span className="text-xs font-black text-rose-800 uppercase block">
                    {language === 'ar' ? 'رسالة الصيانة المخصصة للمستخدمين' : 'Messages de Maintenance Personnalisés'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Français :</label>
                      <input
                        type="text"
                        value={updateSettings.maintenanceMessageFr || ''}
                        onChange={(e) => setUpdateSettings({ ...updateSettings, maintenanceMessageFr: e.target.value })}
                        className="w-full text-xs border border-rose-200 p-2 rounded-lg bg-white text-slate-800"
                        placeholder="Maintenance programmée..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">العربية :</label>
                      <input
                        type="text"
                        value={updateSettings.maintenanceMessageAr || ''}
                        onChange={(e) => setUpdateSettings({ ...updateSettings, maintenanceMessageAr: e.target.value })}
                        className="w-full text-xs border border-rose-200 p-2 rounded-lg bg-white text-slate-800 text-right"
                        placeholder="صيانة دورية جارية..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button Bar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingUpdateSettings}
                  className="py-2.5 px-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{savingUpdateSettings ? 'Sauvegarde...' : (language === 'ar' ? 'حفظ وتطبيق التغييرات 💾' : 'Appliquer et Sauvegarder 💾')}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Section 2: Releases History & Publishing (Versions & Changelogs) */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-3xs text-start">
            <div className="p-4 bg-slate-900 border-b border-rose-500/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-white gap-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider font-mono text-slate-100 flex items-center gap-1.5">
                  <Rocket className="w-4 h-4 text-rose-500" />
                  <span>{language === 'ar' ? '🚀 سجل وإدارة تحديثات النظام وملاحظات الإصدار' : '🚀 JOURNAL DES VERSIONS & PUBLICATIONS DE MISES À JOUR'}</span>
                </h2>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {language === 'ar' 
                    ? 'نشر إصدارات جديدة، كتابة ملخص التحسينات باللغتين ومتابعة التحديثات المنشورة' 
                    : 'Publier de nouvelles releases, rédiger les changelogs bilingues et gérer l\'historique'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddUpdateModal}
                className="flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'نشر تحديث جديد 🚀' : 'Publier une Mise à Jour 🚀'}</span>
              </button>
            </div>

            {/* Releases list */}
            {loadingUpdates ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400 font-bold uppercase">{language === 'ar' ? 'جاري قراءة سجل التحديثات...' : 'Chargement des versions...'}</p>
              </div>
            ) : updatesList.length === 0 ? (
              <div className="p-12 text-center space-y-3 text-slate-400">
                <Rocket className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold">{language === 'ar' ? 'لم يتم العثور على تحديثات منشورة.' : 'Aucune version publiée.'}</p>
                <button
                  type="button"
                  onClick={handleOpenAddUpdateModal}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {language === 'ar' ? 'إنشاء أول تحديث للنظام' : 'Créer la première mise à jour'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 p-4 space-y-4">
                {updatesList.map((up, idx) => {
                  const isCurrentTarget = up.id === updateSettings.latestAppVersion;
                  return (
                    <div key={up.id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 hover:bg-white hover:shadow-xs transition-all space-y-4 text-start">
                      
                      {/* Release header row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-900 text-white rounded-md">
                            {up.id}
                          </span>

                          <span className={`text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded ${
                            up.type === 'major' 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : up.type === 'feature' 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : 'bg-slate-200 text-slate-800 border border-slate-300'
                          }`}>
                            {up.type === 'major' ? (language === 'ar' ? 'تحديث جذري 🚀' : 'Majeure 🚀') : up.type === 'feature' ? (language === 'ar' ? 'ميزة جديدة ✨' : 'Feature ✨') : (language === 'ar' ? 'تصحيح أخطاء 🛠️' : 'Patch 🛠️')}
                          </span>

                          {up.isMandatory && (
                            <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              {language === 'ar' ? 'إجباري ⚠️' : 'Obligatoire ⚠️'}
                            </span>
                          )}

                          {isCurrentTarget && (
                            <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500 text-white shadow-3xs">
                              {language === 'ar' ? 'النسخة النشطة ⚡' : 'Active sur les clients ⚡'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-400" dir="ltr">
                            📅 {up.date}
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Preview Pop-up */}
                            <button
                              type="button"
                              onClick={() => setPreviewUpdate(up)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Aperçu du pop-up client"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditUpdateModal(up)}
                              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Modifier ce journal"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(language === 'ar' ? `هل أنت متأكد من حذف التحديث ${up.id}؟` : `Supprimer la mise à jour ${up.id} ?`)) {
                                  handleDeleteUpdateConfirm(up.id);
                                }
                              }}
                              disabled={actionLoading === `delete_update_${up.id}`}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Titles & descriptions grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* French Column */}
                        <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-[10px] font-black uppercase text-blue-600 font-mono">Français :</span>
                            <span className="font-bold text-slate-900">{up.titleFr}</span>
                          </div>
                          <ul className="space-y-1 text-slate-600 font-medium text-[11px] list-disc list-inside">
                            {up.descriptionFr.map((item, i) => (
                              <li key={i} className="leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Arabic Column */}
                        <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2" dir="rtl">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-[10px] font-black uppercase text-emerald-600 font-mono">العربية :</span>
                            <span className="font-bold text-slate-900">{up.titleAr}</span>
                          </div>
                          <ul className="space-y-1 text-slate-600 font-medium text-[11px] list-disc list-inside">
                            {up.descriptionAr.map((item, i) => (
                              <li key={i} className="leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 🚀 MODAL: ADD / EDIT SYSTEM UPDATE */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-start animate-scale-up max-h-[90vh] flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-rose-500/10 shrink-0">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="font-display font-black text-sm">
                    {editingUpdateId 
                      ? (language === 'ar' ? `تعديل سجل التحديث: ${editingUpdateId}` : `Modifier le journal de version : ${editingUpdateId}`) 
                      : (language === 'ar' ? 'نشر إصدار وتحديث جديد للنظام' : 'Publier une nouvelle version du système')}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {language === 'ar' ? 'سيتم بث التحديث وإشعار كافة المشتركين تلقائياً عبر السحابة' : 'Diffusé en direct sur Firestore à l\'ensemble des points de vente'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveUpdateSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Row 1: Version, Date, Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Version ID */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-600 block">
                    {language === 'ar' ? 'رقم الإصدار (Version Tag)' : 'Numéro de Version'}
                  </label>
                  <input
                    type="text"
                    value={modalVersion}
                    onChange={(e) => setModalVersion(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-250 p-2.5 rounded-lg bg-slate-50 focus:bg-white text-slate-900"
                    placeholder="v1.3.0"
                    required
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-600 block">
                    {language === 'ar' ? 'تاريخ وساعة النشر' : 'Date de Publication'}
                  </label>
                  <input
                    type="text"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-250 p-2.5 rounded-lg bg-slate-50 focus:bg-white text-slate-900"
                    placeholder="26/05/2026 - 16:30"
                    required
                  />
                </div>

                {/* Update Type */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-600 block">
                    {language === 'ar' ? 'نوع التحديث' : 'Type de Release'}
                  </label>
                  <select
                    value={modalType}
                    onChange={(e) => setModalType(e.target.value as any)}
                    className="w-full text-xs font-bold border border-slate-250 p-2.5 rounded-lg bg-slate-50 focus:bg-white text-slate-900"
                  >
                    <option value="feature">{language === 'ar' ? 'ميزة جديدة ✨ (Feature)' : 'Nouvelle Fonctionnalité ✨'}</option>
                    <option value="major">{language === 'ar' ? 'تحديث جذري 🚀 (Major)' : 'Mise à Jour Majeure 🚀'}</option>
                    <option value="patch">{language === 'ar' ? 'تصحيح وسرعة 🛠️ (Patch)' : 'Correctif & Optimisation 🛠️'}</option>
                  </select>
                </div>

              </div>

              {/* Mandatory Checkbox */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={modalIsMandatory}
                    onChange={(e) => setModalIsMandatory(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer accent-amber-600"
                  />
                  <span>{language === 'ar' ? '⚠️ تحديد كتحديث حرج وإجباري لكافة المشتركين' : '⚠️ Définir comme mise à jour critique et obligatoire'}</span>
                </label>
              </div>

              {/* French Content Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-black uppercase text-blue-600 block font-mono">
                  🇫🇷 Section Française (Titre & Changelog) :
                </span>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block">Titre de la mise à jour (FR) :</label>
                  <input
                    type="text"
                    value={modalTitleFr}
                    onChange={(e) => setModalTitleFr(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 p-2 rounded-lg bg-white text-slate-900"
                    placeholder="Ex: Refonte du module caisse et impression thermique..."
                    required
                  />
                </div>

                {/* Points list FR */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 block">Détails des points & nouveautés (FR) :</label>
                  <div className="space-y-1.5">
                    {modalDescFr.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">•</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const copy = [...modalDescFr];
                            copy[idx] = e.target.value;
                            setModalDescFr(copy);
                          }}
                          className="flex-1 text-xs border border-slate-200 p-1.5 rounded-md bg-white text-slate-800"
                          placeholder={`Point n°${idx + 1}...`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDescPointFr(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add point input FR */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newDescItemFr}
                      onChange={(e) => setNewDescItemFr(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDescPointFr();
                        }
                      }}
                      className="flex-1 text-xs border border-slate-200 p-1.5 rounded-md bg-white text-slate-800"
                      placeholder="Ajouter un point (FR)..."
                    />
                    <button
                      type="button"
                      onClick={handleAddDescPointFr}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold cursor-pointer"
                    >
                      + Ajouter
                    </button>
                  </div>
                </div>
              </div>

              {/* Arabic Content Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3" dir="rtl">
                <span className="text-xs font-black uppercase text-emerald-600 block font-mono">
                  🇸🇦 القسم العربي (العنوان وقائمة التحسينات) :
                </span>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block">عنوان التحديث بالعربية :</label>
                  <input
                    type="text"
                    value={modalTitleAr}
                    onChange={(e) => setModalTitleAr(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 p-2 rounded-lg bg-white text-slate-900"
                    placeholder="مثال: تطوير وحدة الكاشير والطباعة الحرارية المباشرة..."
                    required
                  />
                </div>

                {/* Points list AR */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 block">تفاصيل التحسينات الجديدة (العربية) :</label>
                  <div className="space-y-1.5">
                    {modalDescAr.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">•</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const copy = [...modalDescAr];
                            copy[idx] = e.target.value;
                            setModalDescAr(copy);
                          }}
                          className="flex-1 text-xs border border-slate-200 p-1.5 rounded-md bg-white text-slate-800 text-right"
                          placeholder={`نقطة رقم ${idx + 1}...`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDescPointAr(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add point input AR */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newDescItemAr}
                      onChange={(e) => setNewDescItemAr(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDescPointAr();
                        }
                      }}
                      className="flex-1 text-xs border border-slate-200 p-1.5 rounded-md bg-white text-slate-800 text-right"
                      placeholder="إضافة نقطة تفصيلية (بالعربية)..."
                    />
                    <button
                      type="button"
                      onClick={handleAddDescPointAr}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer"
                    >
                      + إضافة
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="py-2 px-4 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'save_update'}
                  className="py-2 px-6 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Rocket className="w-4 h-4" />
                  <span>{actionLoading === 'save_update' ? '...' : (language === 'ar' ? 'نشر وإشعار المشتركين فورياً 📢' : 'Publier et Notifier Tous les Magasins 📢')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 👁️ MODAL: PREVIEW CLIENT UPDATE POPUP */}
      {previewUpdate && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-start animate-scale-up my-auto flex flex-col max-h-[90vh]">
            
            {/* Header Area */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                  <Rocket className="w-5 h-5 text-rose-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    {language === 'ar' ? 'مركز تحديث النظام البرمجي • INNOVA POS' : 'Centre de Mise à Jour Système • INNOVA POS'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5" dir="ltr">
                    Version: {previewUpdate.id} • {previewUpdate.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUpdate(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Simulated Live Update Notification Bar */}
            <div className="bg-emerald-50 border-b border-emerald-100 p-4 shrink-0 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm shrink-0 font-bold">
                ✓
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-emerald-950">
                  {language === 'ar' ? '🎉 تم اكتشاف الإصدار الأحدث وتطبيقه بنجاح!' : '🎉 Nouvelle version disponible et optimisée !'}
                </h4>
                <p className="text-[10px] text-emerald-700 mt-0.5 leading-tight">
                  {language === 'ar' ? 'تمت مطابقة وحفظ كافة كتل البيانات والتحسينات السحابية فورياً.' : 'Toutes les fonctionnalités s’exécutent sous la dernière version stable.'}
                </p>
              </div>
            </div>

            {/* Changelog Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-start bg-slate-50">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {previewUpdate.id}
                    </span>
                    <span className="text-[8px] uppercase font-mono font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                      {previewUpdate.type === 'major' ? 'Majeure 🚀' : previewUpdate.type === 'feature' ? 'Feature ✨' : 'Patch 🛠️'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                    {previewUpdate.date}
                  </span>
                </div>

                <h4 className="text-xs font-extrabold text-slate-900">
                  {language === 'ar' ? previewUpdate.titleAr : previewUpdate.titleFr}
                </h4>

                <div className="space-y-1.5 pt-1">
                  {(language === 'ar' ? previewUpdate.descriptionAr : previewUpdate.descriptionFr).map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
                      <span className="text-rose-500 font-bold shrink-0 mt-0.5">✦</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">
                {language === 'ar' ? '🔍 معاينة حية لما يشاهده العميل' : '🔍 Aperçu en conditions réelles'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewUpdate(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق المعاينة' : 'Fermer l\'Aperçu'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ➕ Modal: Add Subscriber */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-start animate-scale-up" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-rose-500/10">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-rose-500" />
                  <h3 className="font-display font-black text-sm">
                    {language === 'ar' ? 'تسجيل مشترك جديد في السحابة' : 'Inscrire un nouvel abonné'}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTenant} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email address */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {language === 'ar' ? 'البريد الإلكتروني للعميل *' : 'Email du client *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 text-slate-800"
                      placeholder="client@gmail.com"
                    />
                  </div>

                  {/* Business Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {language === 'ar' ? 'اسم المتجر / الشركة *' : 'Nom du commerce *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 text-slate-800"
                      placeholder={language === 'ar' ? 'مثال: سوبرماركت الياسمين' : 'Ex: Superette Jasmin'}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {language === 'ar' ? 'رقم الهاتف (اختياري)' : 'Téléphone (Optionnel)'}
                    </label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 text-slate-800"
                      placeholder="+216 99 999 999"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {language === 'ar' ? 'العنوان / الموقع الجغرافي' : 'Localisation / Adresse'}
                    </label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 text-slate-800"
                      placeholder={language === 'ar' ? 'مثال: تونس العاصمة أو رابط خرائط' : 'Ex: Tunis or Google Maps Link'}
                    />
                  </div>

                  {/* Database Security Pin */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {language === 'ar' ? 'رمز حماية قاعدة البيانات' : 'PIN Base de Données'}
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={newDatabaseSecurityPin}
                      onChange={(e) => setNewDatabaseSecurityPin(e.target.value)}
                      className="w-full text-xs font-semibold font-mono border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 text-slate-800"
                      placeholder="0000"
                    />
                  </div>

                  {/* License Status */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {language === 'ar' ? 'حالة الاشتراك' : 'Statut d\'accès'}
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full text-xs font-bold border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
                    >
                      <option value="trial">{language === 'ar' ? 'فترة تجريبية ⏳' : 'Période d\'essai'}</option>
                      <option value="active">{language === 'ar' ? 'نشط ومفعّل بالكامل ✅' : 'Actif / Abonné'}</option>
                      <option value="suspended">{language === 'ar' ? 'معلق ومغلق مؤقتاً 🛑' : 'Suspendu / Bloqué'}</option>
                    </select>
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {language === 'ar' ? 'تاريخ انتهاء الصلاحية' : 'Date d\'expiration'}
                    </label>
                    <input
                      type="date"
                      required
                      value={newExpiry}
                      onChange={(e) => setNewExpiry(e.target.value)}
                      className="w-full text-xs font-bold font-mono border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
                    />
                  </div>

                  {/* Payment Status */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {language === 'ar' ? 'حالة الدفع' : 'Règlement'}
                    </label>
                    <select
                      value={newPaymentStatus}
                      onChange={(e) => setNewPaymentStatus(e.target.value as any)}
                      className="w-full text-xs font-bold border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
                    >
                      <option value="free_trial">{language === 'ar' ? 'عرض تجريبي مجاني 🎁' : 'Essai sans frais'}</option>
                      <option value="paid">{language === 'ar' ? 'خالص ومسدد بالكامل ✅' : 'Payé'}</option>
                      <option value="pending">{language === 'ar' ? 'قيد الانتظار ودفع الصكوك ⏳' : 'Attente règlement'}</option>
                      <option value="refunded">{language === 'ar' ? 'مسترجع مالي 🛑' : 'Remboursé 🛑'}</option>
                    </select>
                  </div>

                  {/* Payment Amount */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500 block">
                      {language === 'ar' ? 'المبلغ المستخلص (د.ت)' : 'Montant perçu (TND)'}
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                      className="w-full text-xs font-mono font-bold border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
                      placeholder="0.000"
                    />
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 block">
                    {language === 'ar' ? 'ملاحظات إدارية سرية' : 'Notes administratives secrètes'}
                  </label>
                  <textarea
                    rows={2}
                    value={newAdminNotes}
                    onChange={(e) => setNewAdminNotes(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-250 p-2 rounded-lg bg-slate-50 focus:bg-white text-slate-800"
                    placeholder={language === 'ar' ? 'أي ملاحظات للمتابعة اللاحقة للمشترك...' : 'Notes privées de suivi...'}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-2 px-4 text-xs font-bold rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === 'create'}
                    className="py-2 px-5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {actionLoading === 'create' ? '...' : (language === 'ar' ? 'إضافة وتفعيل المشترك 💾' : 'Créer et activer 💾')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
