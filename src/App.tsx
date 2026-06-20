import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
const defaultPosLogo = "/innova_pos_logo.png";
import { DatabaseState, SystemUpdate, Product, StoreSettings, AppUser } from './types';
import { getDatabase, saveDatabase, DEFAULT_SETTINGS, getSuperetteDatabase, saveSuperetteDatabase } from './utils/db';
import { LanguageProvider, useLanguage } from './utils/LanguageContext';
import { safeLocalStorage } from './utils/storage';
import { auth } from './utils/firebase';
import { 
  loadUserDatabase, 
  seedUserDatabase, 
  syncDatabaseDiff, 
  loadUserLicense, 
  loadSystemUpdates,
  loadUserSuperettesList,
  saveUserSuperetteMeta,
  deleteUserSuperetteMeta,
  SuperetteMeta 
} from './utils/firebaseSync';
import { UserLicenseData, verifyLicenseKey } from './utils/licensing';
import { sendCriticalStockEmail, sendShiftOpeningEmail, sendShiftClosingEmail, sendDailyLowStockSummaryEmail, EmailLog } from './utils/notifications';
import { downloadPurchaseOrderPDF, downloadShiftReportPDF } from './utils/pdfGenerator';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Products from './components/Products';
import Partners from './components/Partners';
import InvoicesList from './components/InvoicesList';
import Finance from './components/Finance';
import DatabaseControl from './components/DatabaseControl';
import TelecomRecharge from './components/TelecomRecharge';
import SaaSDeveloperConsole from './components/SaaSDeveloperConsole';
import SaaSLicenseLockedScreen from './components/SaaSLicenseLockedScreen';
import ToastContainer from './components/ToastContainer';

import { 
  LayoutDashboard, 
  ShoppingCart, 
  Boxes, 
  FileText, 
  Users, 
  Coins, 
  Database,
  Menu,
  X,
  Globe,
  Settings,
  LogOut,
  Building2,
  CloudLightning,
  User,
  ShieldCheck,
  CheckCircle2,
  ShieldAlert,
  Lock,
  Unlock,
  Smartphone,
  Wifi,
  WifiOff,
  Battery,
  Bell,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Printer,
  Store
} from 'lucide-react';

function AppContent() {
  const { language, toggleLanguage, t, formatCurrency } = useLanguage();
  
  // Authentication & Sync State
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [authLockError, setAuthLockError] = useState<string | null>(null);
  const [isAppScreenLocked, setIsAppScreenLocked] = useState<boolean>(false);
  const [showLogoutCenterModal, setShowLogoutCenterModal] = useState<boolean>(false);
  const [isConfirmingLogout, setIsConfirmingLogout] = useState<boolean>(false);

  // SaaS Subscription & Cloud Licensing protection hooks
  const [license, setLicense] = useState<UserLicenseData | null>(null);
  const [isLicenseLocked, setIsLicenseLocked] = useState<boolean>(false);

  // App database state
  const [db, setDb] = useState<DatabaseState | null>(null);
  
  // Multi-store workspaces State
  const [activeSuperetteId, setActiveSuperetteId] = useState<string>('default');
  const [superettesList, setSuperettesList] = useState<SuperetteMeta[]>([
    { id: 'default', name: 'Superette Principale', createdAt: '' }
  ]);
  const [showSuperetteModal, setShowSuperetteModal] = useState(false);
  const [newSuperetteName, setNewSuperetteName] = useState('');
  const [isCreatingSuperette, setIsCreatingSuperette] = useState(false);
  
  // Worker-Only Restricted Mode state
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isOfflineForced, setIsOfflineForced] = useState<boolean>(() => {
    return safeLocalStorage.getItem('isOfflineForced') === 'true';
  });

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  const handleToggleOfflineForced = () => {
    const nextVal = !isOfflineForced;
    setIsOfflineForced(nextVal);
    safeLocalStorage.setItem('isOfflineForced', String(nextVal));
  };

  const isEffectiveOffline = isOfflineForced || !isBrowserOnline;

  const [isWorkerMode, setIsWorkerMode] = useState<boolean>(() => {
    return safeLocalStorage.getItem('isWorkerMode') === 'true';
  });
  const [showCashierDetailsModal, setShowCashierDetailsModal] = useState<boolean>(false);
  const [cashierName, setCashierName] = useState<string>(() => {
    return safeLocalStorage.getItem('activeCashierName') || 'Caissier Principal';
  });

  const handleSaveCashierName = (name: string) => {
    setCashierName(name);
    safeLocalStorage.setItem('activeCashierName', name);
  };

  const resolveStoreLogo = (logo?: string) => {
    if (!logo) return logo;
    if (typeof logo === 'string' && (logo.includes('innova_pos_logo') || logo.includes('app-icon'))) {
      return defaultPosLogo;
    }
    return logo;
  };

  const [activeTab, setActiveTab] = useState<string>(() => {
    const forced = safeLocalStorage.getItem('isWorkerMode') === 'true';
    if (forced) return 'pos';
    const saved = safeLocalStorage.getItem('pos_active_tab');
    if (!saved) return 'pos';
    return saved;
  });

  useEffect(() => {
    safeLocalStorage.setItem('pos_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    safeLocalStorage.setItem('isWorkerMode', isWorkerMode ? 'true' : 'false');
  }, [isWorkerMode]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinInputPass, setShowPinInputPass] = useState(false);

  const handleToggleGlobalTheme = () => {
    const currentDb = db || (user ? getSuperetteDatabase(user.uid, activeSuperetteId) : getDatabase());
    if (!currentDb) return;
    const currentTheme = currentDb.settings?.themeMode || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    const updatedDb = {
      ...currentDb,
      settings: {
        ...(currentDb.settings || {}),
        themeMode: nextTheme
      }
    };
    handleUpdateDb(updatedDb);
  };

  const switchSuperette = async (targetId: string) => {
    if (!user) return;
    setSyncingCloud(true);
    try {
      setActiveSuperetteId(targetId);
      safeLocalStorage.setItem('active_superette_id_' + user.uid, targetId);

      const cloudDb = await loadUserDatabase(user.uid, targetId);
      let loadedDb = cloudDb;

      if (cloudDb) {
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...(getSuperetteDatabase(user.uid, targetId).settings || {}),
          ...(cloudDb.settings || {})
        };
        const finalizedDb = {
          ...cloudDb,
          settings: mergedSettings
        };
        loadedDb = finalizedDb;
        setDb(finalizedDb);
        saveSuperetteDatabase(user.uid, targetId, finalizedDb);
      } else {
        const localFallback = getSuperetteDatabase(user.uid, targetId);
        loadedDb = localFallback;
        setDb(localFallback);

        seedUserDatabase(user.uid, localFallback, targetId).catch(err => {
          console.log("[FIRESTORE SYSTEM INFO] Seeding for new superette:", err);
        });
      }

      const activeTheme = loadedDb?.settings?.themeMode || 'light';
      if (activeTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.error("Failed switching superette", err);
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleCreateNewSuperette = async (name: string) => {
    if (!user || !name.trim()) return;
    setIsCreatingSuperette(true);
    try {
      const newId = 'superette-' + Math.random().toString(36).substring(2, 9);
      const newMeta: SuperetteMeta = {
        id: newId,
        name: name.trim(),
        createdAt: new Date().toISOString().split('T')[0]
      };

      await saveUserSuperetteMeta(user.uid, newMeta);

      const updatedList = await loadUserSuperettesList(user.uid);
      setSuperettesList(updatedList);

      const initialDbForNewStore: DatabaseState = {
        products: [],
        partners: [],
        invoices: [],
        payments: [],
        traites: [],
        expenses: [],
        settings: {
          ...DEFAULT_SETTINGS,
          storeName: name.trim(),
          themeMode: 'light'
        }
      };

      saveSuperetteDatabase(user.uid, newId, initialDbForNewStore);
      await seedUserDatabase(user.uid, initialDbForNewStore, newId);

      await switchSuperette(newId);
      
      setShowSuperetteModal(false);
      setNewSuperetteName('');
    } catch (err) {
      console.error("Failed creating superette workspace", err);
    } finally {
      setIsCreatingSuperette(false);
    }
  };

  // States for low stock levels prompt & banner
  const [showStockAlertBanner, setShowStockAlertBanner] = useState<boolean>(false);
  const [showMobileNotifySim, setShowMobileNotifySim] = useState<boolean>(false);
  const isInitialLoginRef = React.useRef(true);

  // States for critical stock administrative email notification logs and toasts and simulations
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailAlertToast, setEmailAlertToast] = useState<{
    id: string;
    productName: string;
    productCode: string;
    qty: number;
    threshold: number;
    email: string;
    subject: string;
    previewUrl?: string;
  } | null>(null);

  // System updates states
  const [showUpdateHistoryModal, setShowUpdateHistoryModal] = useState(false);
  const [systemUpdates, setSystemUpdates] = useState<SystemUpdate[]>([]);
  const [isPerformingUpdate, setIsPerformingUpdate] = useState(false);
  const [updateStepMessage, setUpdateStepMessage] = useState('');
  const [isSystemFullyUpdated, setIsSystemFullyUpdated] = useState(() => safeLocalStorage.getItem('last_acknowledged_update') === '24/05/2026 - 15:40');
  const [isUpdateSuccess, setIsUpdateSuccess] = useState(false);

  // 👥 Multi-Role User state variables
  const [activeUser, setActiveUser] = useState<AppUser | null>(() => {
    try {
      const saved = safeLocalStorage.getItem('pos_active_user');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });

  const [showUserSwitchModal, setShowUserSwitchModal] = useState(false);
  const [selectedSwitchUser, setSelectedSwitchUser] = useState<AppUser | null>(null);
  const [switchPinInput, setSwitchPinInput] = useState('');
  const [switchPinError, setSwitchPinError] = useState(false);

  // Sync activeUser with the latest DB definitions or default them
  useEffect(() => {
    if (db && db.settings) {
      const usersList: AppUser[] = db.settings.users || [
        { id: 'user-1', name: 'Administrateur', pin: '0000', role: 'admin' as const, isActive: true, avatar: '👑' },
        { id: 'user-2', name: 'Agent de Vente', pin: '1111', role: 'sales' as const, isActive: true, avatar: '💼' },
        { id: 'user-3', name: 'Agent de Stock', pin: '2222', role: 'inventory' as const, isActive: true, avatar: '📦' }
      ];

      // Make sure current db settings has users
      if (!db.settings.users) {
        db.settings.users = usersList;
        saveDatabase(db);
      }

      if (!activeUser) {
        const defaultUser = usersList.find(u => u.role === 'admin' && u.isActive) || usersList[0];
        setActiveUser(defaultUser);
        safeLocalStorage.setItem('pos_active_user', JSON.stringify(defaultUser));
      } else {
        const currentDetails = usersList.find(u => u.id === activeUser.id);
        if (currentDetails) {
          if (!currentDetails.isActive) {
            const defaultUser = usersList.find(u => u.role === 'admin' && u.isActive) || usersList[0];
            setActiveUser(defaultUser);
            safeLocalStorage.setItem('pos_active_user', JSON.stringify(defaultUser));
          } else {
            setActiveUser(currentDetails);
            safeLocalStorage.setItem('pos_active_user', JSON.stringify(currentDetails));
          }
        } else {
          const defaultUser = usersList.find(u => u.role === 'admin' && u.isActive) || usersList[0];
          setActiveUser(defaultUser);
          safeLocalStorage.setItem('pos_active_user', JSON.stringify(defaultUser));
        }
      }
    }
  }, [db]);

  // 🛡️ Enforce Tab Restriction based on Active User Role
  useEffect(() => {
    if (activeUser) {
      if (activeUser.role === 'sales' && !['pos', 'telecom', 'invoices', 'partners'].includes(activeTab)) {
        setActiveTab('pos');
      } else if (activeUser.role === 'inventory' && !['products'].includes(activeTab)) {
        setActiveTab('products');
      }
    }
  }, [activeUser, activeTab]);

  // ⏱️ Security Compliance: Automatic Session Inactivity Timeout per User Role
  useEffect(() => {
    if (isAppScreenLocked || !activeUser || !db?.settings) return;

    // Get timeout duration based on active user role (minutes to milliseconds)
    const role = activeUser.role;
    let timeoutMinutes = 0;
    
    if (role === 'admin') {
      timeoutMinutes = db.settings.adminSessionTimeout ?? 30;
    } else if (role === 'sales') {
      timeoutMinutes = db.settings.salesSessionTimeout ?? 15;
    } else if (role === 'inventory') {
      timeoutMinutes = db.settings.inventorySessionTimeout ?? 10;
    }

    // 0 means timeout is disabled
    if (timeoutMinutes <= 0) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    let lastActivityTime = Date.now();

    const updateActivity = () => {
      lastActivityTime = Date.now();
    };

    // Track user inputs to reset timer
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    // Dynamic interval check for security compliance
    const interval = setInterval(() => {
      const inactiveDuration = Date.now() - lastActivityTime;
      if (inactiveDuration >= timeoutMs) {
        console.warn(`[SECURITY COMPLIANCE] Automatic session timeout triggered for role: ${role} (${timeoutMinutes} min inactive)`);
        setIsAppScreenLocked(true);
        // Prompt user switch modal on screen restart
        setShowUserSwitchModal(true);
      }
    }, 5000); // Check every 5 seconds for precise safety tracking

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(interval);
    };
  }, [activeUser, isAppScreenLocked, db?.settings]);

  const handlePerformSystemUpdate = async () => {
    setIsPerformingUpdate(true);
    setIsUpdateSuccess(false);
    const steps = language === 'ar' ? [
      '🔍 جاري التحقق من ترخيص الشركة لدى الخادم السحابي...',
      '🛠️ جاري مطابقة إصدارات الكتل وتراخيص النواتج الجغرافية...',
      '📥 جاري تصفير الذاكرة المؤقتة وإعادة بناء المؤشرات الرسومية...',
      '🚀 تم التحديث وتثبيت الإصدار الجديد بنجاح فوري!'
    ] : [
      '🔍 Authentification auprès du cluster central INNOVA POS...',
      '🛠️ Téléchargement séquentiel des modules de géoréférencement...',
      '📥 Re-indexation de la base SQLite locale et nettoyage du cache...',
      '🚀 Système INNOVA POS actualisé et parfaitement à jour !'
    ];

    try {
      setUpdateStepMessage(steps[0]);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setUpdateStepMessage(steps[1]);
      await new Promise(resolve => setTimeout(resolve, 800));

      setUpdateStepMessage(steps[2]);
      await new Promise(resolve => setTimeout(resolve, 800));

      if (user) {
        const cloudDb = await loadUserDatabase(user.uid);
        if (cloudDb) setDb(cloudDb);
      }

      setUpdateStepMessage(steps[3]);
      
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.3); 
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch (e) {}

      await new Promise(resolve => setTimeout(resolve, 600));
      
      safeLocalStorage.setItem('last_acknowledged_update', '24/05/2026 - 15:40');
      
      const freshUpdates = await loadSystemUpdates();
      if (freshUpdates && freshUpdates.length > 0) {
        setSystemUpdates(freshUpdates);
      }
      
      setIsPerformingUpdate(false);
      setIsUpdateSuccess(true);
      setIsSystemFullyUpdated(true);
    } catch (err) {
      console.log("[INNOVA POS UPDATES] System update checking failed or cancelled offline:", err);
      setIsPerformingUpdate(false);
    }
  };

  useEffect(() => {
    const fetchSystemUpdatesData = async () => {
      try {
        const data = await loadSystemUpdates();
        setSystemUpdates(data);
      } catch (err) {
        console.log("[INNOVA POS UPDATES] Error loading system updates list in App main, using cached client defaults:", err);
      }
    };
    fetchSystemUpdatesData();
  }, [language]);

  const handleToggleWorkerMode = () => {
    if (isWorkerMode) {
      setShowPinModal(true);
      setPinInput('');
      setPinError(false);
    } else {
      setIsWorkerMode(true);
      safeLocalStorage.setItem('isWorkerMode', 'true');
      setActiveTab('pos');
      setShowCashierDetailsModal(true);
    }
  };

  const handleStartShiftService = async () => {
    const startTimeStamp = new Date().toISOString();
    safeLocalStorage.setItem('shift_open_time', startTimeStamp);
    safeLocalStorage.setItem('shift_active_cashier', cashierName);
    
    setShowCashierDetailsModal(false);

    // Prepare SMTP details if available in db.settings
    const storeName = db?.settings?.storeName || 'Boutique POS';
    const adminEmail = db?.settings?.adminEmail || 'innovapospro@gmail.com';
    const smtpSettings = db?.settings ? {
      smtpHost: db.settings.smtpHost,
      smtpPort: db.settings.smtpPort,
      smtpUser: db.settings.smtpUser,
      smtpPass: db.settings.smtpPass,
      smtpSecure: db.settings.smtpSecure,
      smtpSenderName: db.settings.smtpSenderName,
      useGmailApi: db.settings.useGmailApi
    } : undefined;

    // Send the beautiful Shift Opening Email
    try {
      await sendShiftOpeningEmail(
        adminEmail,
        storeName,
        cashierName,
        startTimeStamp,
        language,
        smtpSettings
      );
    } catch (err) {
      console.log("[SMTP CLIENT INFO] Gracefully skipped/handled session opening email dispatch:", err);
    }
  };

  const handleVerifyWorkerPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPin = db?.settings?.ownerPin || '0000';
    if (pinInput === correctPin) {
      // Get shift parameters
      const startTime = safeLocalStorage.getItem('shift_open_time') || new Date().toISOString();
      const endTime = new Date().toISOString();
      
      // Calculate shifts metrics!
      // Filter invoices during this shift
      const shiftInvoices = db?.invoices.filter(inv => {
        return new Date(inv.date) >= new Date(startTime);
      }) || [];

      // Calculate totals
      const salesCount = shiftInvoices.length;
      const revenueTotal = shiftInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const paidTotal = shiftInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const creditTotal = shiftInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
      
      // Filter expenses created during this shift
      const shiftExpenses = db?.expenses?.filter(exp => {
        return new Date(exp.date) >= new Date(startTime);
      }) || [];
      const expensesTotal = shiftExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      const storeName = db?.settings?.storeName || 'Boutique POS';
      const adminEmail = db?.settings?.adminEmail || 'innovapospro@gmail.com';
      const smtpSettings = db?.settings ? {
        smtpHost: db.settings.smtpHost,
        smtpPort: db.settings.smtpPort,
        smtpUser: db.settings.smtpUser,
        smtpPass: db.settings.smtpPass,
        smtpSecure: db.settings.smtpSecure,
        smtpSenderName: db.settings.smtpSenderName,
        useGmailApi: db.settings.useGmailApi
      } : undefined;

      // Close shift state
      setIsWorkerMode(false);
      safeLocalStorage.setItem('isWorkerMode', 'false');
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);

      // Send the beautiful Shift Closing Email
      try {
        await sendShiftClosingEmail(
          adminEmail,
          storeName,
          cashierName,
          startTime,
          endTime,
          {
            salesCount,
            revenueTotal,
            paidTotal,
            creditTotal,
            expensesTotal
          },
          language,
          smtpSettings
        );
      } catch (err) {
        console.log("[SMTP CLIENT INFO] Gracefully skipped/handled session closing email dispatch:", err);
      }
    } else {
      setPinError(true);
    }
  };

  const handlePrintCurrentShiftReport = () => {
    const startTime = safeLocalStorage.getItem('shift_open_time') || new Date().toISOString();
    const endTime = new Date().toISOString();
    
    const shiftInvoices = db?.invoices.filter(inv => {
      return new Date(inv.date) >= new Date(startTime);
    }) || [];

    const shiftExpenses = db?.expenses?.filter(exp => {
      const expDate = exp.date || startTime;
      return new Date(expDate) >= new Date(startTime);
    }) || [];

    downloadShiftReportPDF({
      settings: db?.settings,
      language,
      cashierName,
      startTime,
      endTime,
      invoices: shiftInvoices,
      expenses: shiftExpenses,
      formatCurrency
    });
  };

  // 1. Listen to Firebase Authentication State
  useEffect(() => {
    // Fail-safe helper to prevent network delays or Firebase hangs from blocking the app boot
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> => {
      let timeoutId: any;
      const timeoutPromise = new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn(`[INNOVA BOOT SAFETY] Operation exceeded ${timeoutMs}ms. Forcing local offline fallback...`);
          resolve(fallbackValue);
        }, timeoutMs);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    };

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      
      if (currentUser) {
        setDemoMode(false);
        setSyncingCloud(true);
        try {
          // 1. Load lists of available superettes from cloud
          const list = await withTimeout(loadUserSuperettesList(currentUser.uid), 4000, [{ id: 'default', name: 'Superette Principale', createdAt: '' }]);
          setSuperettesList(list);

          // 2. Detect active superette Id
          const savedActiveId = safeLocalStorage.getItem('active_superette_id_' + currentUser.uid) || 'default';
          const activeIdObj = list.find(s => s.id === savedActiveId) || list[0] || { id: 'default' };
          const activeId = activeIdObj.id;
          setActiveSuperetteId(activeId);
          safeLocalStorage.setItem('active_superette_id_' + currentUser.uid, activeId);

          // 3. Attempt loading this store's custom cloud database with a 4.5s safe timeout
          const cloudDb = await withTimeout(loadUserDatabase(currentUser.uid, activeId), 4500, null);
          let dbInstance = cloudDb;
          if (cloudDb) {
            const mergedSettings = {
              ...DEFAULT_SETTINGS,
              ...(getSuperetteDatabase(currentUser.uid, activeId).settings || {}),
              ...(cloudDb.settings || {})
            };
            if (
              !mergedSettings.storeLogo ||
              mergedSettings.storeLogo === '🛒' ||
              mergedSettings.storeLogo.includes('fill="%233b82f6"') ||
              mergedSettings.storeLogo.includes('text-anchor="middle">IP</text>')
            ) {
              mergedSettings.storeLogo = DEFAULT_SETTINGS.storeLogo;
            }
            const finalizedDb = {
              ...cloudDb,
              settings: mergedSettings
            };
            dbInstance = finalizedDb;
            setDb(finalizedDb);
            saveSuperetteDatabase(currentUser.uid, activeId, finalizedDb);
          } else {
            // New account or offline fallback: seed or use local cache
            const localFallback = getSuperetteDatabase(currentUser.uid, activeId);
            dbInstance = localFallback;
            seedUserDatabase(currentUser.uid, localFallback, activeId).catch(err => {
              console.log("[FIRESTORE SYSTEM INFO] Background database seeding handled:", err);
            });
            setDb(localFallback);
          }

          // Fetch the license document with a 3.5s safe timeout
          const storeName = dbInstance?.settings?.storeName || '';
          const trialExpiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const defaultOfflineLicense = {
            uid: currentUser.uid,
            email: currentUser.email,
            registeredAt: new Date().toISOString().split('T')[0],
            licenseExpiry: trialExpiryDate,
            licenseStatus: 'trial' as any,
            licenseKey: '',
            remoteAnnouncement: 'Remarque: Connexion lente. Validation locale activée.',
            businessName: storeName || 'Etablissement',
            location: ''
          };
          const userLicense = await withTimeout(
            loadUserLicense(currentUser.uid, currentUser.email, storeName),
            3505,
            defaultOfflineLicense
          );
          setLicense(userLicense);

          // Verify the license signature validity and expiry
          const isVerified = verifyLicenseKey(currentUser.uid, userLicense.licenseExpiry, userLicense.licenseKey);
          const isTrialValid = userLicense.licenseStatus === 'trial' && new Date() <= new Date(userLicense.licenseExpiry);
          const isActiveValid = userLicense.licenseStatus === 'active' && isVerified;

          // Bypass checks if developer is logged in (kharoufwala24@gmail.com, walakharouf665@gmail.com, walakharouf6665@gmail.com)
          const isDeveloper = currentUser.email === 'kharoufwala24@gmail.com' || 
                              currentUser.email === 'walakharouf665@gmail.com' ||
                              currentUser.email === 'walakharouf6665@gmail.com';

          if (!isDeveloper && (userLicense.licenseStatus === 'suspended' || (!isTrialValid && !isActiveValid))) {
            setIsLicenseLocked(true);
          } else {
            setIsLicenseLocked(false);
          }
        } catch (err) {
          console.log("[FIRESTORE SYSTEM INFO] Failed to load user cloud data, falling back to local storage.", err);
          const activeId = safeLocalStorage.getItem('active_superette_id_' + currentUser.uid) || 'default';
          setDb(getSuperetteDatabase(currentUser.uid, activeId));
        } finally {
          setSyncingCloud(false);
        }
      } else {
        // Not authenticated
        setDb(null);
        setLicense(null);
        setIsLicenseLocked(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 1.5. Trigger critical stock level browser notification exactly once on database load after login
  useEffect(() => {
    if (db && db.products && isInitialLoginRef.current) {
      isInitialLoginRef.current = false;
      const criticalCount = db.products.filter(p => p.stock <= p.minAlertQty).length;
      if (criticalCount > 0) {
        setShowStockAlertBanner(true);
        setShowMobileNotifySim(true);

        // Mobile Notification double-tone chime sound simulation (pure Web Audio synthesizer)
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // First tone (C5)
          const osc1 = audioCtx.createOscillator();
          const gain1 = audioCtx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
          gain1.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gain1.gain.exponentialRampToValueAtTime(0.002, audioCtx.currentTime + 0.15);
          osc1.connect(gain1);
          gain1.connect(audioCtx.destination);
          osc1.start();
          osc1.stop(audioCtx.currentTime + 0.15);

          // Second tone (E5 - slightly delayed)
          setTimeout(() => {
            try {
              const osc2 = audioCtx.createOscillator();
              const gain2 = audioCtx.createGain();
              osc2.type = 'sine';
              osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
              gain2.gain.setValueAtTime(0.05, audioCtx.currentTime);
              gain2.gain.exponentialRampToValueAtTime(0.002, audioCtx.currentTime + 0.25);
              osc2.connect(gain2);
              gain2.connect(audioCtx.destination);
              osc2.start();
              osc2.stop(audioCtx.currentTime + 0.25);
            } catch (err) {}
          }, 120);
        } catch (err) {
          console.warn("Synthesizer tone generation blocked or unsupported", err);
        }

        // Native Browser HTML5 Notification request & send
        try {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            const sendDesktopNotification = () => {
              const title = language === 'ar' ? 'تنبيه مستويات المخزون' : 'Alerte de Stock Bas';
              const body = language === 'ar'
                ? `يوجد ${criticalCount} من السلع الهامة تحت حد الإنذار! يرجى مراجعة المخزون حينه.`
                : `Alerte : ${criticalCount} articles de vente critiques ont atteint leur seuil minimal de sécurité !`;
              
              try {
                new Notification(title, {
                  body,
                  icon: db.settings?.storeLogo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80'
                });
              } catch (err) {
                console.warn("[INNOVA POS INFO] Desktop notification direct invocation failed:", err);
              }
            };

            // Safely check permission and request if needed inside sandbox-resilient wrapper
            const currentPermission = Notification.permission;
            if (currentPermission === 'granted') {
              sendDesktopNotification();
            } else if (currentPermission !== 'denied') {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  sendDesktopNotification();
                }
              }).catch(err => {
                console.warn("[INNOVA POS INFO] Notification.requestPermission was blocked inside sandbox iframe:", err);
              });
            }
          }
        } catch (err) {
          console.log("[INNOVA POS INFO] Native HTML5 browser notifications skipped gracefully inside sandboxed preview iframe:", err);
        }

        // 📬 Automatically send daily low stock email if enabled and not already sent today
        if (db.settings?.enableDailyLowStockEmail && db.settings?.adminEmail && db.settings?.adminEmail.includes('@')) {
          const todayStr = new Date().toISOString().split('T')[0];
          const lastSentDate = safeLocalStorage.getItem('lastDailyLowStockEmailDate');
          
          if (lastSentDate !== todayStr) {
            // Identify low-stock products (stock <= minAlertQty)
            const lowStockPrds = db.products.filter(p => p.stock <= p.minAlertQty) || [];
            
            const smtpConfig = {
              smtpHost: license?.remoteSmtpHost !== undefined ? license.remoteSmtpHost : db.settings?.smtpHost,
              smtpPort: license?.remoteSmtpPort !== undefined ? license.remoteSmtpPort : db.settings?.smtpPort,
              smtpUser: license?.remoteSmtpUser !== undefined ? license.remoteSmtpUser : db.settings?.smtpUser,
              smtpPass: license?.remoteSmtpPass !== undefined ? license.remoteSmtpPass : db.settings?.smtpPass,
              smtpSecure: license?.remoteSmtpSecure !== undefined ? license.remoteSmtpSecure : db.settings?.smtpSecure,
              smtpSenderName: license?.remoteSmtpSenderName !== undefined ? license.remoteSmtpSenderName : db.settings?.smtpSenderName,
              useGmailApi: db.settings?.useGmailApi
            };

            const storeName = db.settings?.storeName || 'INNOVA POS';
            
            sendDailyLowStockSummaryEmail(
              db.settings.adminEmail,
              storeName,
              lowStockPrds,
              language,
              smtpConfig.smtpHost ? smtpConfig : undefined
            ).then(res => {
              if (res.success) {
                console.log('[AUTO-DAILY EMAIL] Successfully dispatched daily stock report to:', db.settings?.adminEmail);
                safeLocalStorage.setItem('lastDailyLowStockEmailDate', todayStr);
              } else {
                console.warn('[AUTO-DAILY EMAIL] Failed during background schedule dispatch:', res.error);
              }
            }).catch(err => {
              console.log('[AUTO-DAILY EMAIL] Gracefully skipped/handled exception during automatic delivery:', err);
            });
          }
        }
      }
    }
  }, [db, language, license]);

  // 2. Fallback to Guest/Demo offline mode if explicitly clicked
  const handleEnterDemo = () => {
    setDemoMode(true);
    setDb(getDatabase());
    setLicense(null);
    setIsLicenseLocked(false);
  };

  // 1.8. Automatically trigger saveDatabase(db) whenever db changes and is not null
  useEffect(() => {
    if (db) {
      if (user) {
        saveSuperetteDatabase(user.uid, activeSuperetteId, db);
      } else {
        saveDatabase(db);
      }
    }
  }, [db, activeSuperetteId, user]);

  // Apply visual theme mode dynamically on document element
  useEffect(() => {
    const activeTheme = db?.settings?.themeMode || (user ? getSuperetteDatabase(user.uid, activeSuperetteId) : getDatabase()).settings?.themeMode || 'light';
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [db?.settings?.themeMode]);

  // 3. Keep database states synchronized
  const handleUpdateDb = async (updatedDb: DatabaseState) => {
    const oldDb = db;
    setDb(updatedDb);
    if (user) {
      saveSuperetteDatabase(user.uid, activeSuperetteId, updatedDb);
    } else {
      saveDatabase(updatedDb);
    }

    // If cloud syncing is connected and active, sync diff in background (only if not offline or forced offline)
    if (user && oldDb && !isEffectiveOffline) {
      try {
        await syncDatabaseDiff(user.uid, oldDb, updatedDb, activeSuperetteId);
      } catch (err) {
        console.log("[FIRESTORE SYSTEM INFO] Incremental background cloud synchronization failed or offline", err);
      }
    }

    // 4. Automatically generate a supplier purchase order (PDF) for products having reached their critical threshold during stock alert
    if (oldDb && oldDb.products && updatedDb.products) {
      const oldProductsMap = new Map<string, Product>(oldDb.products.map(p => [p.id, p]));
      const itemsToOrder: Product[] = [];

      for (const newPrd of updatedDb.products) {
        const oldPrd = oldProductsMap.get(newPrd.id);
        const isCurrentlyCritical = newPrd.stock <= newPrd.minAlertQty;
        const wasPreviouslyNotCritical = !oldPrd || oldPrd.stock > oldPrd.minAlertQty;

        if (isCurrentlyCritical && wasPreviouslyNotCritical) {
          itemsToOrder.push(newPrd);
        }
      }

      if (itemsToOrder.length > 0) {
        try {
          console.log("[SYSTEM] Stock alert! Automatically generating Bon de Commande for newly critical products:", itemsToOrder);
          downloadPurchaseOrderPDF({
            products: itemsToOrder,
            settings: updatedDb.settings,
            language,
          });
        } catch (pdfErr) {
          console.error("Auto supplier purchase order PDF generation failed:", pdfErr);
        }
      }
    }

    // Check if any product dropped to critical stock levels to issue real administrative emails
    if (oldDb && oldDb.products && updatedDb.products) {
      // Resolve parameters: prioritize remote configurations set by the platform creator (Super-Admin)
      const emailEnabled = license?.remoteEnableCriticalStockEmailAlerts !== undefined
        ? license.remoteEnableCriticalStockEmailAlerts
        : updatedDb.settings?.enableCriticalStockEmailAlerts;

      const adminEmailAddress = license?.remoteAdminEmail
        ? license.remoteAdminEmail
        : updatedDb.settings?.adminEmail;
      
      if (emailEnabled && adminEmailAddress && adminEmailAddress.includes('@')) {
        const oldProductsMap = new Map<string, Product>(oldDb.products.map(p => [p.id, p]));
        
        for (const newPrd of updatedDb.products) {
          const oldPrd = oldProductsMap.get(newPrd.id);
          const isCurrentlyCritical = newPrd.stock <= newPrd.minAlertQty;
          // Alert on transition (previously above minimal threshold, now at or under minimum quantity)
          const wasPreviouslyNotCritical = !oldPrd || oldPrd.stock > oldPrd.minAlertQty;
          
          if (isCurrentlyCritical && wasPreviouslyNotCritical) {
            // If individual product alerting is active, check if this specific product has muted its alerts
            if (updatedDb.settings?.enableIndividualProductEmailAlerts && newPrd.emailAlertsEnabled === false) {
              console.log(`[SMTP ALERTS SKIP] Notification muted for product ${newPrd.name} (${newPrd.code}) because per-product emailAlertsEnabled is disabled.`);
              continue;
            }

            try {
              // Resolve active SMTP parameters: override if provided by admin/developer remotely
              const activeSmtpSettings = {
                smtpHost: license?.remoteSmtpHost !== undefined ? license.remoteSmtpHost : updatedDb.settings?.smtpHost,
                smtpPort: license?.remoteSmtpPort !== undefined ? license.remoteSmtpPort : updatedDb.settings?.smtpPort,
                smtpUser: license?.remoteSmtpUser !== undefined ? license.remoteSmtpUser : updatedDb.settings?.smtpUser,
                smtpPass: license?.remoteSmtpPass !== undefined ? license.remoteSmtpPass : updatedDb.settings?.smtpPass,
                smtpSecure: license?.remoteSmtpSecure !== undefined ? license.remoteSmtpSecure : updatedDb.settings?.smtpSecure,
                smtpSenderName: license?.remoteSmtpSenderName !== undefined ? license.remoteSmtpSenderName : updatedDb.settings?.smtpSenderName,
                useGmailApi: updatedDb.settings?.useGmailApi
              };

              const res = await sendCriticalStockEmail(
                adminEmailAddress,
                newPrd,
                updatedDb.settings?.storeName || 'INNOVA POS',
                language,
                activeSmtpSettings
              );
              if (res.success) {
                setEmailLogs(prev => [res.log, ...prev]);
                setEmailAlertToast({
                  id: res.log.id,
                  productName: newPrd.name,
                  productCode: newPrd.code,
                  qty: newPrd.stock,
                  threshold: newPrd.minAlertQty,
                  email: adminEmailAddress,
                  subject: res.log.subject,
                  previewUrl: res.log.previewUrl
                });
              }
            } catch (alertError) {
              console.log("[SMTP CLIENT INFO] Gracefully skipped/handled critical stock alert notification dispatch:", alertError);
            }
          }
        }
      }
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await auth.signOut();
      setDemoMode(false);
      setDb(null);
      setLicense(null);
      setIsLicenseLocked(false);
      setActiveTab('dashboard');
      setShowStockAlertBanner(false);
      isInitialLoginRef.current = true;
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans select-none">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-white rounded animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wider text-slate-400">INNOVA POS • جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show authentication gate if not logged in and not in guest demo mode
  if (!user && !demoMode) {
    return (
      <Auth 
        onEnterDemo={handleEnterDemo} 
        user={user} 
        db={db || undefined} 
        lockError={authLockError}
        clearLockError={() => setAuthLockError(null)}
      />
    );
  }

  // Show beautiful lock screen if explicitly locked by cashier or owner
  if (isAppScreenLocked) {
    return (
      <Auth 
        onEnterDemo={() => setIsAppScreenLocked(false)} 
        isLockedState={true} 
        user={user}
        db={db || undefined}
      />
    );
  }

  // Show locked license gate if the license check failed
  if (user && isLicenseLocked && license) {
    return (
      <SaaSLicenseLockedScreen 
        license={license} 
        onUnlockSuccess={(updatedLicense) => {
          setLicense(updatedLicense);
          setIsLicenseLocked(false);
        }}
        onLogout={handleLogout} 
      />
    );
  }

  // Show loading indicator during cloud store database initialization
  if (syncingCloud || !db) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans select-none">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-white rounded animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase">
            {t('loading')}
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            {user ? `Id: ${user.email}` : 'Demo / Local Mode'}
          </p>
        </div>
      </div>
    );
  }

  // Determine if the logged-in user is the super-administrator
  const isSuperAdmin = user && (
    user.email === 'kharoufwala24@gmail.com' || 
    user.email === 'walakharouf665@gmail.com' ||
    user.email === 'walakharouf6665@gmail.com'
  );

  // Count items below safety stocks alert threshold
  const criticalProductsCount = db?.products ? db.products.filter(p => p.stock <= p.minAlertQty).length : 0;

  // Sidebar navigation options dictionary
  let NAV_ITEMS = [
    { id: 'dashboard', label: t('nav_dashboard'), subLabel: language === 'ar' ? 'لوحة القيادة والمؤشرات' : 'Statistiques', icon: LayoutDashboard },
    { id: 'pos', label: t('nav_pos'), subLabel: language === 'ar' ? 'آلة تسجيل النقد السريع' : 'Caisse de vente', icon: ShoppingCart },
    { id: 'telecom', label: language === 'ar' ? 'تذاكر شحن الهاتف' : 'Tickets Télécom', subLabel: language === 'ar' ? 'Ooredoo، اتصالات تونس، Orange' : 'Recharges Ooredoo, TT, Orange', icon: Smartphone },
    { id: 'products', label: t('nav_products'), subLabel: language === 'ar' ? 'المخزون والسلع الغذائية' : 'Catalogue & Prix', icon: Boxes },
    { id: 'invoices', label: t('nav_invoices'), subLabel: language === 'ar' ? 'أرشيف المبيعات والوصولات' : 'Journal ventes', icon: FileText },
    { id: 'partners', label: t('nav_partners'), subLabel: language === 'ar' ? 'الحسابات والديون والعملاء' : 'Comptes auxiliaires', icon: Users },
    { id: 'finance', label: t('nav_finance'), subLabel: language === 'ar' ? 'الكمبيالات والخزينة' : 'Dépenses & Traites', icon: Coins },
    { id: 'backup', label: t('nav_backup'), subLabel: language === 'ar' ? 'التهيئة وتعديل الخصائص' : 'Sauvegardes & Paramètres', icon: Database }
  ];

  if (isSuperAdmin) {
    NAV_ITEMS.push({ 
      id: 'admin', 
      label: language === 'ar' ? 'السيرفر وتراخيص الشركات' : 'SaaS Console', 
      subLabel: language === 'ar' ? 'لوحة تحكم فني المطور والموزع' : 'Gestion abonnés', 
      icon: ShieldAlert 
    });
  }

  if (isWorkerMode) {
    // Workers see both cash sale register (POS) and telecom recharge ticket creator!
    NAV_ITEMS = NAV_ITEMS.filter(item => item.id === 'pos' || item.id === 'telecom');
  }

  // Filter based on assigned user role
  if (activeUser) {
    if (activeUser.role === 'sales') {
      NAV_ITEMS = NAV_ITEMS.filter(item => ['pos', 'telecom', 'invoices', 'partners'].includes(item.id));
    } else if (activeUser.role === 'inventory') {
      NAV_ITEMS = NAV_ITEMS.filter(item => ['products'].includes(item.id));
    }
  }

  const activeItem = NAV_ITEMS.find(item => item.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row text-slate-800 font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* SIDEBAR NAVIGATION - DESKTOP SCREEN (Persistent) */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-slate-900 text-white shrink-0 border-r border-slate-800 shadow-xl no-print overflow-y-auto custom-scrollbar">
        {/* Brand identity */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          {resolveStoreLogo(db.settings?.storeLogo) ? (
            ((resolveStoreLogo(db.settings?.storeLogo) || '').startsWith('data:') || (resolveStoreLogo(db.settings?.storeLogo) || '').startsWith('http') || (resolveStoreLogo(db.settings?.storeLogo) || '').startsWith('/') || (resolveStoreLogo(db.settings?.storeLogo) || '').includes('.') || (resolveStoreLogo(db.settings?.storeLogo) || '').length > 15) ? (
              <img 
                src={resolveStoreLogo(db.settings?.storeLogo)} 
                alt="Logo" 
                className="w-8 h-8 rounded-md object-cover bg-white" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-600/20 text-blue-300 rounded border border-blue-500/30 flex items-center justify-center text-sm font-bold shadow-xs shrink-0 select-none">
                {resolveStoreLogo(db.settings?.storeLogo)}
              </div>
            )
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-xs shrink-0 select-none">
              {db.settings?.storeName ? db.settings.storeName.substring(0, 2).toUpperCase() : 'GP'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-white font-bold tracking-tight text-xs font-display truncate block uppercase leading-tight">
              {db.settings?.storeName || 'INNOVA POS PRO'}
            </span>
            <span className="text-[9px] text-slate-505 block truncate font-mono mt-0.5 capitalize font-semibold tracking-wide">
              {db.settings?.activitySector || 'Etablissement'}
            </span>
          </div>
          {/* Global Theme Toggle Button */}
          <button
            onClick={handleToggleGlobalTheme}
            id="theme-mode-toggle-desktop"
            className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-slate-800 shrink-0 select-none focus:outline-hidden"
            title={language === 'ar' ? 'تغيير المظهر' : 'Changer thème'}
          >
            {(db?.settings?.themeMode || 'light') === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
          </button>

          {/* Secure Logout & Cloud Disconnect Gear Icon (Écrou de Déconnexion) */}
          <button
            onClick={() => {
              setIsConfirmingLogout(false);
              setShowLogoutCenterModal(true);
            }}
            id="disconnect-gear-desktop"
            className="p-1.5 rounded-lg bg-slate-850 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-slate-800 hover:border-rose-900/50 transition-all cursor-pointer flex items-center justify-center shrink-0 select-none focus:outline-hidden group"
            title={language === 'ar' ? 'مركز إدارة الاتصال و فك الارتباط' : 'Déconnexion & Synchro Multi-Appareils'}
          >
            <Settings className="w-3.5 h-3.5 animate-spin-slow group-hover:rotate-90 transition-transform duration-500 shrink-0" />
          </button>
        </div>

        {/* Workspace selector - only visible if logged in and not in restricted cashier worker mode */}
        {user && !isWorkerMode && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-slate-850/60 border border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase tracking-wider select-none">
              <span className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {language === 'ar' ? 'المتجر النشط' : 'Superette Active'}
              </span>
              <button 
                onClick={() => {
                  setNewSuperetteName('');
                  setShowSuperetteModal(true);
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors text-[9px] font-extrabold hover:underline cursor-pointer"
                title={language === 'ar' ? 'إضافة نقطة بيع / محل جديد' : 'Créer une Superette'}
              >
                + {language === 'ar' ? 'جديد' : 'Créer'}
              </button>
            </div>
            
            <div className="relative">
              <select
                value={activeSuperetteId}
                onChange={(e) => switchSuperette(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 text-slate-200 py-1.5 px-2.5 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 cursor-pointer appearance-none pr-8 text-start"
              >
                {superettesList.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    🏪 {sup.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Section title */}
        <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest px-4 pt-5 pb-1">
          {t('nav_principal')}
        </div>

        {/* Sidebar Navigation links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-right rounded-md px-3 py-2 cursor-pointer flex items-center gap-3 transition-colors group relative ${
                  isActive 
                    ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/10' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-115 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                <div className="min-w-0 text-start">
                  <span className="text-xs truncate block leading-none font-bold">{item.label}</span>
                  <span className="text-[9px] text-slate-500 block font-medium mt-0.5 truncate">{item.subLabel}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* User Account state info inside desktop sidebar footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-2.5">
          
          {/* Active POS Software User display and switch button */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">{activeUser?.avatar || '👤'}</span>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold text-blue-400 block truncate leading-none mb-0.5">
                  {activeUser?.name || 'Utilisateur'}
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-wider leading-none">
                  {activeUser?.role === 'admin' ? (language === 'ar' ? '👑 مدير' : '👑 Admin') : 
                   activeUser?.role === 'sales' ? (language === 'ar' ? '💼 مبيعات' : '💼 Ventes') : 
                   (language === 'ar' ? '📦 مخزون' : '📦 Stock')}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedSwitchUser(null);
                setSwitchPinInput('');
                setSwitchPinError(false);
                setShowUserSwitchModal(true);
              }}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-[8px] font-black uppercase text-white rounded transition-colors cursor-pointer shrink-0"
            >
              {language === 'ar' ? 'تغيير' : 'Sessions'}
            </button>
          </div>

          {/* Real-time Connection Indicator & Manual Offline Mode control */}
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-start select-none">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider font-mono">
                {language === 'ar' ? '🔌 الاتصال والمزامنة' : '🔌 Connexion & Sync'}
              </span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                isEffectiveOffline 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                <span className={`w-1 h-1 rounded-full ${isEffectiveOffline ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span>{isEffectiveOffline ? (language === 'ar' ? 'دون اتصال' : 'OFFLINE') : (language === 'ar' ? 'متصل' : 'ONLINE')}</span>
              </span>
            </div>
            
            <p className="text-[8.5px] leading-relaxed text-slate-500">
              {isOfflineForced ? (
                <span className="text-amber-300 font-semibold block">
                  {language === 'ar' ? '⚠️ مفعّل يدوياً لحماية سرعة الكاشير.' : '⚠️ Mode offline forcé activé.'}
                </span>
              ) : !isBrowserOnline ? (
                <span className="text-amber-400 font-semibold block">
                  {language === 'ar' ? '📡 انقطع الاتصال الفعلي بالويب.' : '📡 Réseau web éteint.'}
                </span>
              ) : (
                <span>
                  {language === 'ar' ? '✅ الحساب متزامن سحابياً بالكامل.' : '✅ Synchronisation cloud active.'}
                </span>
              )}
              <span className="block text-[8px] text-slate-600 mt-0.5 font-sans">
                {language === 'ar' ? 'أمان تام ومستمر للبيانات محلياً.' : 'Données sécurisées localement.'}
              </span>
            </p>

            <button
              onClick={handleToggleOfflineForced}
              type="button"
              className={`w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded text-[9px] font-bold uppercase transition-all border cursor-pointer ${
                isOfflineForced 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' 
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850'
              }`}
            >
              {isOfflineForced ? (
                <>
                  <Wifi className="w-3 h-3 text-cyan-400" />
                  <span>{language === 'ar' ? 'تفعيل الوضع السحابي' : 'Activer Mode Cloud'}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  <span>{language === 'ar' ? 'تشغيل وضع أوفلاين' : 'Passer en Hors-ligne'}</span>
                </>
              )}
            </button>
          </div>

          {/* Worker Lock Toggle Button */}
          <button
            onClick={handleToggleWorkerMode}
            className={`w-full flex items-center justify-center gap-2 p-2 rounded text-[10px] font-bold transition-all border cursor-pointer select-none ${
              isWorkerMode 
                ? 'bg-amber-600/20 text-amber-400 border-amber-500/30 hover:bg-amber-600/30' 
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            {isWorkerMode ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{language === 'ar' ? '🔐 وضع العامل: اضغط للإلغاء' : '🔐 Mode Caissier: Déverrouiller'}</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === 'ar' ? '🔒 تفعيل وضع قفل العامل' : '🔒 Activer Mode Caissier'}</span>
              </>
            )}
          </button>

           {/* Global Theme Toggle Button (Shortcut) */}
          <button
            onClick={handleToggleGlobalTheme}
            id="theme-mode-toggle-footer"
            className="w-full flex items-center justify-center gap-2 p-2 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer select-none"
            title={language === 'ar' ? 'تغيير المظهر' : 'Changer thème'}
          >
            {(db?.settings?.themeMode || 'light') === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-450 shrink-0" />
                <span>{language === 'ar' ? '☀️ مظهر فاتح' : '☀️ Mode Clair'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{language === 'ar' ? '🌙 مظهر داكن' : '🌙 Mode Sombre'}</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-1.5 w-full">
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-850 p-2 rounded text-[8px] font-black text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-800"
              title="Langue / لغة"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{language === 'ar' ? 'FR' : 'عربي'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1 bg-slate-900 hover:bg-rose-950/40 hover:text-rose-400 p-2 rounded text-[8px] font-black text-rose-500/80 transition-all cursor-pointer border border-slate-800"
              title={language === 'ar' ? 'تسجيل الخروج' : 'Déconnexion'}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'ar' ? 'خروج' : 'Déconnecter'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER BAR & HAMBURGER (Visible on small screen) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-5 border-b border-slate-800 z-40 no-print">
        <div className="flex items-center gap-2.5">
          {resolveStoreLogo(db.settings?.storeLogo) ? (
            ((resolveStoreLogo(db.settings?.storeLogo) || '').startsWith('data:') || (resolveStoreLogo(db.settings?.storeLogo) || '').startsWith('http') || (resolveStoreLogo(db.settings?.storeLogo) || '').startsWith('/') || (resolveStoreLogo(db.settings?.storeLogo) || '').includes('.') || (resolveStoreLogo(db.settings?.storeLogo) || '').length > 15) ? (
              <img 
                src={resolveStoreLogo(db.settings?.storeLogo)} 
                alt="Logo" 
                className="w-10 h-10 rounded-md object-cover bg-white" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-600/20 text-blue-300 rounded border border-blue-500/30 flex items-center justify-center text-xl font-bold shadow-xs shrink-0 select-none">
                {resolveStoreLogo(db.settings?.storeLogo)}
              </div>
            )
          ) : (
            <div className="p-1.5 bg-blue-550/10 text-blue-400 rounded border border-blue-550/20">
              <Building2 className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xs font-bold tracking-tight font-display text-white truncate max-w-[150px]">
              {db.settings?.storeName || 'INNOVA POS'}
            </h1>
            <span className="text-[8px] text-slate-400 block truncate max-w-[150px]">
              {language === 'ar' ? 'تسيير المحل والمبيعات' : 'Gestion Point de Vente & Stocks'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile active user switch trigger */}
          <button
            onClick={() => {
              setSelectedSwitchUser(null);
              setSwitchPinInput('');
              setSwitchPinError(false);
              setShowUserSwitchModal(true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 bg-slate-850 hover:bg-slate-800 rounded text-[10px] font-bold border border-slate-750 transition-colors"
          >
            <span>{activeUser?.avatar || '👤'}</span>
            <span className="max-w-[70px] truncate text-slate-300 font-extrabold text-[8px]">{activeUser?.name}</span>
          </button>

          {!isSystemFullyUpdated && (
            <button
              onClick={() => {
                setIsUpdateSuccess(false);
                setShowUpdateHistoryModal(true);
              }}
              className="p-2 text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
              title={language === 'ar' ? 'تحديث النظام البرمجي' : 'Mise à jour'}
            >
              <CloudLightning className="w-4 h-4 animate-bounce text-rose-500 shrink-0" />
              <span className="text-[10px] font-mono font-bold">MàJ</span>
            </button>
          )}
          <button
            onClick={toggleLanguage}
            className="p-2 text-slate-405 hover:text-white transition-colors text-xs font-bold"
          >
            {language === 'ar' ? 'FR' : 'عربي'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWERS OVERLAY SIDEBAR */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 lg:hidden no-print" onClick={() => setMobileMenuOpen(false)}>
          <aside 
            className="w-72 bg-slate-950 h-full flex flex-col justify-between pt-20 overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="p-4 space-y-2">
              {/* Mobile Workspace selector */}
              {user && !isWorkerMode && (
                <div className="mb-4 p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase tracking-wider select-none">
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3 text-blue-400 shrink-0" />
                      {language === 'ar' ? 'المتجر النشط' : 'Superette Active'}
                    </span>
                    <button 
                      onClick={() => {
                        setNewSuperetteName('');
                        setShowSuperetteModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors text-[9px] font-extrabold hover:underline cursor-pointer"
                    >
                      + {language === 'ar' ? 'جديد' : 'Créer'}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <select
                      value={activeSuperetteId}
                      onChange={(e) => {
                        switchSuperette(e.target.value);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full bg-slate-950 border border-slate-750 text-slate-200 py-1.5 px-2 rounded-lg text-xs font-semibold focus:outline-hidden cursor-pointer"
                    >
                      {superettesList.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          🏪 {sup.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest px-2 pb-1">
                {t('nav_principal')}
              </div>
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-start rounded-md px-3 py-2 flex items-center gap-3 transition-all ${
                      isActive ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="text-xs block font-bold">{item.label}</span>
                      <span className="text-[9px] text-slate-500 block font-mono">{item.subLabel}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
            
            <div className="p-4 border-t border-slate-900 space-y-3.5">
              <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-slate-300" />
                <span className="truncate">{user ? user.email : 'Démo Hors-ligne'}</span>
              </div>

              {/* Mobile Connection Toggler */}
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-start select-none">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    {language === 'ar' ? '🔌 الاتصال والشبكة' : '🔌 Statut Réseau'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                    isEffectiveOffline 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${isEffectiveOffline ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    <span>{isEffectiveOffline ? (language === 'ar' ? 'أوفلاين' : 'OFFLINE') : (language === 'ar' ? 'متصل' : 'ONLINE')}</span>
                  </span>
                </div>
                
                <button
                  onClick={handleToggleOfflineForced}
                  type="button"
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                    isOfflineForced 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' 
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  {isOfflineForced ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{language === 'ar' ? 'توصيل بالإنترنت' : 'Activer Mode Cloud'}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                      <span>{language === 'ar' ? 'قطع الاتصال (أوفلاين)' : 'Mode Sans Internet'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Mobile Worker Lock Toggle */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleToggleWorkerMode();
                }}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-[11px] font-bold transition-all border cursor-pointer select-none ${
                  isWorkerMode 
                    ? 'bg-amber-600/20 text-amber-400 border-amber-500/30 hover:bg-amber-600/30' 
                    : 'bg-slate-905 text-slate-300 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                {isWorkerMode ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>{language === 'ar' ? '🔐 إلغاء قفل العمال' : '🔐 Déverrouiller Caissier'}</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'ar' ? '🔒 تفعيل قفل العمال' : '🔒 Activer Mode Caissier'}</span>
                  </>
                )}
              </button>

              {/* Mobile Global Theme Toggle */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleToggleGlobalTheme();
                }}
                id="theme-mode-toggle-mobile"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-[11px] font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer select-none"
              >
                {(db?.settings?.themeMode || 'light') === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{language === 'ar' ? '☀️ مظهر فاتح' : '☀️ Mode Clair'}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{language === 'ar' ? '🌙 مظهر داكن' : '🌙 Mode Sombre'}</span>
                  </>
                )}
              </button>

              {/* Mobile Logout Button representing the settings gear / 'écrou' */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsConfirmingLogout(false);
                  setShowLogoutCenterModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-[11px] font-bold bg-rose-950/25 hover:bg-rose-900/35 border border-rose-900/20 text-rose-400 hover:text-rose-350 transition-all cursor-pointer select-none group"
              >
                <Settings className="w-3.5 h-3.5 animate-spin-slow group-hover:rotate-45 transition-transform" />
                <span>{language === 'ar' ? '⚙️ إعدادات الخروج والربط' : '⚙️ Déconnexion & Synchro'}</span>
              </button>


            </div>
          </aside>
        </div>
      )}

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 hidden lg:flex items-center justify-between px-8 shrink-0 no-print">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tighter italic">
              {activeItem?.label || "Vue d'Ensemble"}
            </h1>
            <span className="text-slate-300">|</span>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
              <span className="text-emerald-600 animate-pulse">●</span> 
              <span>{t('status_online')}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {isSystemFullyUpdated ? (
              <button
                type="button"
                onClick={() => {
                  setIsUpdateSuccess(true);
                  setShowUpdateHistoryModal(true);
                }}
                className="text-right hover:bg-slate-50 p-1.5 px-3 rounded-lg border border-slate-250 transition-all active:scale-95 flex flex-col items-end text-slate-500 cursor-pointer select-none group shrink-0"
                title={language === 'ar' ? 'عرض سجل وتفاصيل تحديثات النظام' : 'Consulter l’historique des versions'}
              >
                <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span>{language === 'ar' ? 'نظام محدث' : 'Système à jour'}</span>
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-600 mt-0.5">
                  V.24/05/2026
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsUpdateSuccess(false);
                  setShowUpdateHistoryModal(true);
                }}
                className="text-right hover:bg-rose-50/70 p-1.5 px-3 rounded-lg border border-dashed border-slate-200 hover:border-rose-200 transition-all active:scale-95 flex flex-col items-end text-slate-750 cursor-pointer select-none group shrink-0"
                title={language === 'ar' ? 'عرض سجل وتفاصيل تحديثات النظام' : 'Consulter l’historique des versions'}
              >
                <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest group-hover:text-rose-600 transition-colors flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                  <span>{language === 'ar' ? 'تحديث متاح' : 'MàJ Active'}</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <CloudLightning className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
                  <span className="group-hover:text-rose-600 transition-colors">24/05/2026 - 15:40</span>
                </div>
              </button>
            )}
            
            {/* Active Store Accent Badge */}
            <div className="hidden sm:flex items-center gap-2 py-1 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 shrink-0 select-none">
              {resolveStoreLogo(db.settings?.storeLogo) && (
                <div className="w-5 h-5 flex items-center justify-center rounded-sm overflow-hidden bg-white shrink-0 border border-slate-200">
                  {((resolveStoreLogo(db.settings?.storeLogo) || '').startsWith('data:') || (resolveStoreLogo(db.settings?.storeLogo) || '').startsWith('http') || (resolveStoreLogo(db.settings?.storeLogo) || '').startsWith('/') || (resolveStoreLogo(db.settings?.storeLogo) || '').includes('.') || (resolveStoreLogo(db.settings?.storeLogo) || '').length > 15) ? (
                    <img src={resolveStoreLogo(db.settings?.storeLogo)} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[11px]">{resolveStoreLogo(db.settings?.storeLogo)}</span>
                  )}
                </div>
              )}
              <span className="font-bold font-display truncate max-w-[150px]">{db.settings?.storeName || 'INNOVA POS PRO'}</span>
              <span className="inline-block px-1 bg-slate-100 rounded text-[9px] text-slate-500 font-bold font-mono">
                {db.settings?.activitySector || 'Standard'}
              </span>
            </div>
            
            {/* Sync Status Badge */}
            <div className={`py-1 px-3 border rounded text-[10px] flex items-center gap-1.5 shrink-0 font-bold uppercase tracking-normal ${
              isEffectiveOffline 
                ? 'bg-amber-50 text-amber-800 border-amber-250 animate-pulse' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-150'
            }`}>
              {isEffectiveOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{language === 'ar' ? 'وضع العمل دون اتصال' : 'Hors-ligne (Actif)'}</span>
                </>
              ) : user ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Cloud {user.displayName ? user.displayName.split(' ')[0] : 'Connecté'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Sûr hors-ligne (Démo)</span>
                </>
              )}
            </div>

            {/* Simple Header Logout button if logged in */}
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-3xs hover:shadow-2xs active:scale-95 animate-fade-in"
                title={language === 'ar' ? 'تسجيل الخروج' : 'Déconnexion'}
              >
                <LogOut className="w-4 h-4 text-rose-600" />
              </button>
            )}


          </div>
        </header>

        {/* CONTAINER FOR CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between pt-16 lg:pt-0">
          <main className="flex-1 p-4 md:p-8">
            <div className="max-w-7xl mx-auto pb-12 print-card">
              
              {/* Responsive Offline Alert Strip */}
              {isEffectiveOffline && (
                <div 
                  className="mb-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-900 rounded-lg p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-3xs relative overflow-hidden animate-fade-in no-print" 
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                  <div className="absolute top-0 right-0 h-full w-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center gap-3 relative z-10 text-start">
                    <div className="p-2 bg-amber-500/20 text-amber-700 rounded-md border border-amber-500/20 shrink-0">
                      <WifiOff className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-amber-700 block leading-none mb-1">
                        {language === 'ar' ? 'وضع العمل بدون اتصال بالإنترنت' : 'MODE DE FONCTIONNEMENT HORS-LIGNE'}
                      </span>
                      <p className="text-xs font-semibold leading-relaxed text-amber-800">
                        {language === 'ar' 
                          ? '⚠️ أنت تعمل بموثوقية وسرعة فائقة دون إنترنت. فواتيرك ومخازنك آمنة على الذاكرة المحلية لجهازك، وسوف تتزامن تلقائياً حين يتصل النظام بالإنترنت.' 
                          : '⚠️ Vous travaillez avec succès et ultra-rapidement hors-ligne. Vos factures et stocks sont stockés localement sur votre terminal et se synchroniseront au retour de la connexion.'}
                      </p>
                    </div>
                  </div>
                  {isOfflineForced && (
                    <button
                      onClick={handleToggleOfflineForced}
                      className="p-1 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold uppercase transition-all select-none shrink-0 cursor-pointer shadow-xs active:scale-95"
                    >
                      {language === 'ar' ? 'توصيل السحابة والإنترنت' : 'Passer en Ligne'}
                    </button>
                  )}
                </div>
              )}

              {/* Remote SaaS Developer Announcement Banner */}
              {user && license?.remoteAnnouncement && (
                <div className="mb-5 bg-gradient-to-r from-blue-900 to-indigo-950 border border-blue-500/20 text-white rounded p-4 flex items-center justify-between shadow-md relative overflow-hidden animate-fade-in no-print" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <div className="absolute top-0 right-0 h-full w-32 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center gap-3 relative z-10 text-start">
                    <span className="p-1 px-2.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[9px] uppercase font-bold rounded-sm animate-pulse tracking-wide shrink-0">
                      {language === 'ar' ? 'إعلان عاجل من الموزع الفني' : 'Message urgent du distributeur'}
                    </span>
                    <p className="text-xs font-semibold leading-relaxed">
                      {license.remoteAnnouncement}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setLicense({ ...license, remoteAnnouncement: undefined });
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer text-xs font-bold leading-none select-none shrink-0"
                    title="Dismiss notification"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Critical Stock Alert Banner */}
              {showStockAlertBanner && criticalProductsCount > 0 && (
                <div className="mb-5 bg-amber-500/10 border border-amber-500/25 text-slate-900 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-3xs relative overflow-hidden animate-fade-in no-print" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <div className="absolute top-0 right-0 h-full w-32 bg-amber-500/4 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center gap-3 relative z-10 text-start">
                    <div className="p-2 bg-amber-500/20 text-amber-600 rounded-md border border-amber-500/20 shrink-0">
                      <ShieldAlert className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-amber-600 block leading-none mb-1">
                        {language === 'ar' ? 'تنبيه مخزون حرج' : 'ALERTE STOCK CRITIQUE'}
                      </span>
                      <p className="text-xs font-bold text-slate-800 leading-snug">
                        {language === 'ar' 
                          ? `تنبيه: يوجد ${criticalProductsCount} من السلع الهامة في المحل التي نفدت أو شارفت على النفاد (تحت حد الإنذار)!` 
                          : `Attention : Il y a ${criticalProductsCount} produits critiques dont le stock est inférieur ou égal au seuil d'alerte !`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center relative z-10 shrink-0">
                    <button
                      onClick={() => {
                        setActiveTab('products');
                      }}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] uppercase font-black rounded-md transition-all cursor-pointer shadow-3xs"
                    >
                      {language === 'ar' ? 'عرض المخزون' : 'Voir Catalogue'}
                    </button>
                    <button 
                      onClick={() => {
                        setShowStockAlertBanner(false);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-800 rounded bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer text-xs font-bold leading-none select-none shrink-0"
                      title="Dismiss alert"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <Dashboard db={db} onNavigate={(tab) => { setActiveTab(tab); }} onUpdateDb={handleUpdateDb} />
                  </motion.div>
                )}
                {activeTab === 'pos' && (
                  <motion.div
                    key="pos"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <POS db={db} onUpdateDb={handleUpdateDb} onNavigate={(tab) => { setActiveTab(tab); }} />
                  </motion.div>
                )}
                {activeTab === 'telecom' && (
                  <motion.div
                    key="telecom"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <TelecomRecharge db={db} onUpdateDb={handleUpdateDb} />
                  </motion.div>
                )}
                {activeTab === 'products' && (
                  <motion.div
                    key="products"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <Products db={db} onUpdateDb={handleUpdateDb} />
                  </motion.div>
                )}
                {activeTab === 'partners' && (
                  <motion.div
                    key="partners"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <Partners db={db} onUpdateDb={handleUpdateDb} />
                  </motion.div>
                )}
                {activeTab === 'invoices' && (
                  <motion.div
                    key="invoices"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <InvoicesList db={db} onUpdateDb={handleUpdateDb} />
                  </motion.div>
                )}
                {activeTab === 'finance' && (
                  <motion.div
                    key="finance"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <Finance db={db} onUpdateDb={handleUpdateDb} />
                  </motion.div>
                )}
                {activeTab === 'backup' && (
                  <motion.div
                    key="backup"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <DatabaseControl db={db} onUpdateDb={handleUpdateDb} license={license} user={user} />
                  </motion.div>
                )}
                {activeTab === 'admin' && isSuperAdmin && (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <SaaSDeveloperConsole />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

          {/* Status Bar */}
          <footer className="h-10 bg-white border-t border-slate-200 hidden md:flex items-center justify-between px-8 text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] shrink-0 no-print">
            <div className="flex items-center gap-4">
              <span>{user ? 'PROJET SYNC: CONNECTÉ' : 'MODE SYNC: DÉMO'}</span>
              <span>•</span>
              <span>TUNISIE REGION: ACTIVE</span>
            </div>
            <div className="flex items-center gap-4 font-sans text-[10px] tracking-normal font-semibold">
              <span className="text-slate-400 uppercase tracking-[0.2em]">{t('stable_version')}</span>
              <span className="text-slate-300">|</span>
              <span className="text-blue-600">{t('tech_support')}</span>
            </div>
          </footer>
        </div>
      </div>

      {/* 🏪 Modal to Create a New Superette Workspace */}
      {showSuperetteModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCreatingSuperette) {
              setShowSuperetteModal(false);
            }
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" 
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5 text-center relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              disabled={isCreatingSuperette}
              onClick={() => setShowSuperetteModal(false)}
              className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={language === 'ar' ? 'إغلاق' : 'Fermer'}
            >
              ✕
            </button>

            <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Store className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                {language === 'ar' ? 'إضافة نقطة بيع أو محل جديد' : 'Ajouter une nouvelle Superette'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === 'ar' 
                  ? 'سيتم إنشاء قاعدة بيانات سحابية وتجهيز كاشير مالي مستقل تماماً وخاص بهذا الفرع.' 
                  : 'Créez un point de vente indépendant avec son propre inventaire, historique de ventes et paramètres dédiés.'}
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateNewSuperette(newSuperetteName);
            }} className="space-y-4 text-start">
              <div>
                <label className="block text-xs font-bold text-slate-650 dark:text-slate-300 uppercase tracking-widest mb-1.5">
                  {language === 'ar' ? 'إسم المحل أو الفرع' : 'Nom de la Superette / POS'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'مثال: سوبرماركت النصر' : 'Ex: Superette Centre-Ville'}
                  disabled={isCreatingSuperette}
                  value={newSuperetteName}
                  onChange={(e) => setNewSuperetteName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-hidden focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCreatingSuperette}
                  onClick={() => setShowSuperetteModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSuperette || !newSuperetteName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingSuperette ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  <span>{language === 'ar' ? 'تأكيد الإنشاء' : 'Créer l’Établissement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔐 PIN Validation Modal for Owner Status */}
      {showPinModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPinModal(false);
              setPinInput('');
              setPinError(false);
            }
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto" 
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 md:p-6 space-y-4 text-center my-auto relative">
            <button
              type="button"
              onClick={() => {
                setShowPinModal(false);
                setPinInput('');
                setPinError(false);
              }}
              className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-slate-400 hover:text-slate-650 transition-colors cursor-pointer text-lg p-1.5 rounded-full hover:bg-slate-50"
              title={language === 'ar' ? 'إغلاق' : 'Fermer'}
            >
              ✕
            </button>
            <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-xl shadow-xs">
              🔐
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {language === 'ar' ? 'فك قفل المسؤول / المالك' : 'Code Confidentiel Propriétaire'}
              </h3>
              <p className="text-xs text-slate-500 leading-normal">
                {language === 'ar' 
                  ? 'برجاء إدخال الرمز السري للانتقال إلى الحسابات والأرباح ومحرر الإعدادات'
                  : 'Veuillez saisir le code confidentiel pour afficher la comptabilité et le stock'}
              </p>
            </div>

            <form onSubmit={handleVerifyWorkerPin} className="space-y-3.5">
              <div>
                <div className="relative">
                  <input
                    type={showPinInputPass ? "text" : "password"}
                    inputMode={showPinInputPass ? "text" : "numeric"}
                    pattern={showPinInputPass ? undefined : "[0-9]*"}
                    maxLength={8}
                    autoFocus
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value.replace(/\D/g, ''));
                      setPinError(false);
                    }}
                    className={`w-full text-center text-xl font-mono tracking-widest bg-slate-50 border rounded py-2 pl-10 pr-10 focus:outline-hidden text-slate-800 ${
                      pinError 
                        ? 'border-rose-500 bg-rose-50/10 focus:border-rose-500' 
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white'
                    }`}
                    placeholder="••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinInputPass(!showPinInputPass)}
                    className="absolute top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-slate-650 p-1.5 rounded-md transition-colors cursor-pointer"
                    title={showPinInputPass ? (language === 'ar' ? "إخفاء" : "Masquer") : (language === 'ar' ? "إظهار" : "Afficher")}
                  >
                    {showPinInputPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                {pinError && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1.5 animate-bounce">
                    {language === 'ar' ? '❌ الرمز المدخل غير صحيح!' : '❌ Code d\'accès incorrect !'}
                  </p>
                )}
              </div>

              {/* Imprimer Rapport Shift ticket */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handlePrintCurrentShiftReport}
                  className="w-full bg-indigo-650 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs border border-indigo-600/30 font-sans"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>
                    {language === 'ar' ? 'طباعة تقرير المناوبة الحالية (Ticket)' : 'Imprimer Rapport Shift'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                    setPinError(false);
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded text-xs font-bold transition-all cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {language === 'ar' ? 'تأكيد الرمز' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 👤 Cashier Session Info Modal Alert */}
      {showCashierDetailsModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCashierDetailsModal(false);
            }
          }}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-55 p-3 md:p-4 overflow-y-auto animate-fade-in" 
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-500/30 max-w-md w-full overflow-hidden shrink-0 my-auto relative">
            
            {/* Header with Amber accent */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-md">
                  👤
                </div>
                <div className="text-start">
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'ar' ? 'جلسة الكاشير مفعّلة الآن' : 'Session Caissier Activée'}
                  </h3>
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider font-mono">
                    {language === 'ar' ? 'رمز الوضع: caissier-restrict-prod' : 'ID MODE: CAISSIER-RESTRICT-PROD'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCashierDetailsModal(false)}
                className="text-slate-400 hover:text-slate-650 transition-colors p-1.5 rounded-full hover:bg-slate-100/50 cursor-pointer text-lg font-bold"
                title={language === 'ar' ? 'إغلاق' : 'Fermer'}
              >
                ✕
              </button>
            </div>

            {/* Credential coordinates */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                
                {/* Cashier Name Input & Customization */}
                <div className="text-start">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    {language === 'ar' ? 'الاسم الكامل للكاشير النشط' : 'Nom Complet du Caissier de Service'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cashierName}
                      onChange={(e) => handleSaveCashierName(e.target.value)}
                      placeholder="Ex: Wala Kharouf"
                      className="flex-1 text-xs font-bold border border-slate-250 p-2.5 rounded bg-white focus:outline-hidden focus:border-amber-500 transition-colors text-slate-850"
                    />
                  </div>
                </div>

                {/* Opening Hours */}
                <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-start">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">{language === 'ar' ? 'ساعة الدخول' : 'Heure de Début'}</span>
                    <span className="font-bold text-slate-700 font-mono">
                      {new Date().toLocaleTimeString(language === 'ar' ? 'ar-TN' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">{language === 'ar' ? 'التاريخ اليوم' : 'Date d\'ouverture'}</span>
                    <span className="font-bold text-slate-705 font-mono">
                      {new Date().toLocaleDateString(language === 'ar' ? 'ar-TN' : 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Privilege Info status */}
                <div className="border-t border-slate-200/60 pt-3 flex items-start gap-2 text-[11px] text-slate-600 leading-normal text-start">
                  <div className="text-emerald-500 text-sm mt-0.5">🔒</div>
                  <div>
                    <p className="font-bold text-slate-750">
                      {language === 'ar' ? 'صلاحيات الكاشير المقيدة اليومية' : 'Droits d\'accès Restreints'}
                    </p>
                    <p className="text-[10px] text-slate-505 leading-relaxed mt-0.5">
                      {language === 'ar' 
                        ? 'متاح فقط: تحرير تذاكر ومبيعات (POS). تم إخفاء وعزل كتل الأرباح والخزينة والتحكم بقواعد البيانات بنجاح.'
                        : 'Disponible : Clavier de ventes (POS) uniquement. La comptabilité, les stocks bruts et les paramètres de sécurité sont verrouillés.'}
                    </p>
                  </div>
                </div>

                {/* Supervisor Quick Contact */}
                <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between text-[11px] text-slate-605">
                  <span className="font-bold">{language === 'ar' ? 'رقم مشرف البوتيك:' : 'Téléphone Superviseur :'}</span>
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">+216 24260711</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200/60 text-amber-900 rounded-xl p-3 text-[10px] leading-relaxed flex items-start gap-2 text-start">
                <span className="text-amber-500 text-xs">⚠️</span>
                <p>
                  {language === 'ar' 
                    ? 'لمغادرة هذا الوضع والعودة لحساب المسؤول، انقر زر "قفل وضع العامل" أعلى الشاشة ثم أدخل الكود السري الخاص بك.'
                    : 'Pour quitter le mode caissier et restaurer les droits admin, cliquez sur le bouton de verrouillage doré en haut et saisissez votre code PIN.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartShiftService}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀 {language === 'ar' ? 'بدء نوبة العمل اليومية' : 'Commencer le service'}</span>
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* 🚀 Interactive System Update & Release Logs Modal */}
      {showUpdateHistoryModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPerformingUpdate) {
              setShowUpdateHistoryModal(false);
            }
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-3 md:p-4 font-sans overflow-y-auto" 
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn my-auto">
            
            {/* Header Area */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                  <CloudLightning className="w-5 h-5 text-rose-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    {language === 'ar' ? 'مركز تحديث النظام البرمجي • INNOVA POS' : 'Centre de Mise à Jour Système • INNOVA POS'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5" dir="ltr">
                    Current Stable Version: 24/05/2026 - 15:40
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isPerformingUpdate) setShowUpdateHistoryModal(false);
                }}
                disabled={isPerformingUpdate}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold p-1 disabled:opacity-30"
              >
                ✕
              </button>
            </div>

            {isUpdateSuccess ? (
              <div className="bg-emerald-50 border-b border-emerald-100 p-4 shrink-0 flex items-center gap-3 animate-fadeIn">
                <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-lg shrink-0 font-bold">
                  ✓
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-emerald-950">
                    {language === 'ar' ? '🎉 تم تحديث النظام بنجاح وتثبيت التحديثات!' : '🎉 Système mis à jour avec succès avec les dernières optimisations !'}
                  </h4>
                  <p className="text-[10px] text-emerald-700 mt-0.5 leading-tight">
                    {language === 'ar' ? 'تمت مطابقة وتثبيت كافة كتل البيانات والتحسينات السحابية فورياً بنجاح.' : 'Toutes les fonctionnalités s’exécutent désormais sous la dernière version stable de production.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpdateHistoryModal(false)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                >
                  {language === 'ar' ? 'حسناً' : 'D’accord'}
                </button>
              </div>
            ) : (
              /* Simulated Live Update Actions Bar */
              <div className="bg-amber-50/75 border-b border-amber-100 p-4 shrink-0 flex flex-col gap-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    <span>
                      {language === 'ar' ? 'تحديثات هامة متصلة بالسحابة متاحة الآن !' : 'Un nouveau pack correctif est disponible au serveur !'}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    disabled={isPerformingUpdate}
                    onClick={handlePerformSystemUpdate}
                    className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-black cursor-pointer shadow-3xs flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    {isPerformingUpdate ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span>🚀</span>
                    )}
                    <span>{language === 'ar' ? 'تحديث وتنزيل فوري بنقرة واحدة' : 'Actualiser & Installer MàJ'}</span>
                  </button>
                </div>

                {isPerformingUpdate && (
                  <div className="bg-slate-900 rounded p-2.5 border border-slate-800 animate-pulse">
                    <span className="text-[10px] font-mono font-bold text-rose-400 block mb-1">
                      {language === 'ar' ? '⚡ جاري المعالجة الفورية للنظام :' : '⚡ SÉQUENCE DE CHARGEMENT :'}
                    </span>
                    <span className="text-xs font-sans font-semibold text-white">
                      {updateStepMessage}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* System Update Feed / Logs */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-start bg-slate-50">
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                {language === 'ar' ? 'سجل تتبع الإصدارات والتحديثات المتراكمة :' : 'Notes de Versions & Correctifs cumulés :'}
              </p>

              {systemUpdates.length === 0 ? (
                <div className="bg-white border rounded-lg p-5 text-center text-xs text-slate-400 font-bold">
                  {language === 'ar' ? 'جاري قراءة سجل التحديثات من السيرفر...' : 'Aucun journal disponible.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {systemUpdates.map((up) => {
                    const isLatest = up.id === systemUpdates[0]?.id;
                    return (
                      <div key={up.id} className="bg-white border border-slate-150 rounded-lg p-4 shadow-3xs relative overflow-hidden">
                        {isLatest && (
                          <div className="absolute top-0 right-0 lg:right-auto lg:left-0 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 shadow-3xs">
                            {language === 'ar' ? 'الإصدار النشط حالياً ⚡' : 'Actif ⚡'}
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-50 pb-2.5 mb-2.5 pt-3.5 lg:pt-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                              {up.id}
                            </span>
                            <span className={`text-[8px] uppercase font-mono font-black px-1.5 py-0.5 rounded ${
                              up.type === 'major' 
                                ? 'bg-rose-100 text-rose-800' 
                                : up.type === 'feature' 
                                ? 'bg-blue-105 text-blue-800' 
                                : 'bg-slate-150 text-slate-700'
                            }`}>
                              {up.type === 'major' ? (language === 'ar' ? 'تحديث جذري' : 'Majeure') : up.type === 'feature' ? (language === 'ar' ? 'ميزة جديدة' : 'Feature') : 'Patch'}
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-900">
                              {language === 'ar' ? up.titleAr : up.titleFr}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                            📅 {up.date}
                          </span>
                        </div>

                        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-650 leading-relaxed font-semibold">
                          {(language === 'ar' ? up.descriptionAr : up.descriptionFr).map((bullet, idx) => (
                            <li key={idx} className="text-slate-600">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!isPerformingUpdate) setShowUpdateHistoryModal(false);
                }}
                disabled={isPerformingUpdate}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-25"
              >
                {language === 'ar' ? 'إغلاق النافذة' : 'Fermer'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📱 SMARTPHONE SIMULATION FOR STOCK NOTIFICATION ON LOGIN */}
      <AnimatePresence>
        {showMobileNotifySim && criticalProductsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="fixed bottom-4 right-4 z-50 w-[300px] bg-slate-950 border-4 border-slate-800 rounded-[36px] p-4 overflow-hidden text-white font-sans select-none no-print shadow-[0_12px_45px_-6px_rgba(0,0,0,0.85)] ring-6 ring-slate-900/40"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            {/* Dynamic Island Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-20 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 absolute right-4" />
            </div>

            {/* Smart Phone Content Screen */}
            <div className="relative pt-6 pb-2 px-1">
              {/* Phone Status Bar */}
              <div className="flex justify-between items-center text-[9px] text-slate-300 font-semibold font-mono tracking-normal mb-6">
                <div className="flex items-center gap-1">
                  <span>INNOVA</span>
                  <Wifi className="w-2.5 h-2.5 text-slate-200" />
                  <span className="text-[8px] bg-emerald-500 text-slate-950 px-1 py-0.2 rounded font-black">5G</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>100%</span>
                  <Battery className="w-3.5 h-3.5 fill-white text-slate-400 rotate-90" />
                </div>
              </div>

              {/* Phone Date & Time Display */}
              <div className="text-center mb-5 mt-2">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest font-mono">
                  {new Date().toLocaleDateString(language === 'ar' ? 'ar-TN' : 'fr-TN', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <span className="text-3xl font-light tracking-tight block text-slate-100 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[9px] text-slate-500 font-bold block uppercase mt-0.5 tracking-wider font-mono">
                  {language === 'ar' ? 'جوال صاحب المشروع' : 'NOTIF. TÉLÉPHONE'}
                </span>
              </div>

              {/* LOCK-SCREEN PUSH IOS-STYLE NOTIFICATION GLASS CARD */}
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-xl space-y-2 backdrop-blur-md relative"
              >
                {/* Notification App Header */}
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-sm">
                      <Bell className="w-3 h-3 text-white fill-white" />
                    </div>
                    <span className="text-[9.5px] font-black tracking-wider text-slate-200">INNOVA POS CLOUD</span>
                  </div>
                  <span className="text-[8.5px] text-slate-400 font-medium font-mono">{language === 'ar' ? 'الآن' : 'Maintenant'}</span>
                </div>

                {/* Notification content */}
                <div className="space-y-1 text-start">
                  <h4 className="text-[11px] font-black text-rose-400 uppercase tracking-wide flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    {language === 'ar' ? '🚨 تنبيه: سلغ في الحد الأدنى!' : '🚨 ALERTE : Stock Bas !'}
                  </h4>
                  <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                    {language === 'ar' 
                      ? `لديكم ${criticalProductsCount} من المنتجات التي وصلت لإنذار المخزون الأدنى في المحل. يرجى التزود!` 
                      : `Il y a ${criticalProductsCount} produits en alerte critique sous le seuil d'approvisionnement.`}
                  </p>
                </div>

                {/* Micro product preview inside phone */}
                <div className="bg-slate-950/70 p-2 rounded-md border border-slate-800/80 font-mono text-[9px] text-slate-400 space-y-1">
                  {db.products.filter(p => p.stock <= p.minAlertQty).slice(0, 2).map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate max-w-[120px] font-sans font-bold text-slate-300">{p.name}</span>
                      <span className="text-rose-400 bg-rose-500/10 px-1 rounded font-bold">Qty: {p.stock}</span>
                    </div>
                  ))}
                  {criticalProductsCount > 2 && (
                    <div className="text-[8.5px] text-slate-500 italic text-center pt-0.5">
                      + {criticalProductsCount - 2} {language === 'ar' ? 'منتجات أخرى' : 'autres articles'}...
                    </div>
                  )}
                </div>

                {/* Action buttons embedded in Notification */}
                <div className="flex gap-2 pt-1.5 border-t border-slate-800/40 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('products');
                      setShowMobileNotifySim(false);
                    }}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-center cursor-pointer transition-colors"
                  >
                    {language === 'ar' ? '📝 مراجعة السلع' : 'Consulter Catalog'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobileNotifySim(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 text-center cursor-pointer transition-colors"
                  >
                    {language === 'ar' ? 'تجاهل' : 'Fermer'}
                  </button>
                </div>
              </motion.div>

              {/* Bottom Phone Indicator swipe bar */}
              <div className="mx-auto w-24 h-1 bg-slate-700 rounded-full mt-5 mb-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📧 EMAIL ALERT FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {emailAlertToast && (
          <motion.div
            key={emailAlertToast.id}
            initial={{ opacity: 0, scale: 0.85, y: -50, x: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -30, x: 20 }}
            className="fixed top-4 right-4 z-55 w-[335px] bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-4 overflow-hidden"
            style={{ zIndex: 9999 }}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500" />
            
            <div className="flex gap-3 items-start">
              {/* Fly open envelope icon */}
              <div className="p-2 bg-gradient-to-tr from-emerald-600/30 to-teal-400/20 text-emerald-400 rounded-lg shrink-0 border border-emerald-500/25">
                <span className="text-xl">📧</span>
              </div>
              
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase font-mono">
                    {language === 'ar' ? 'تم إرسال البريد الإداري للمخزون' : 'EMAIL D\'ALERTE ENVOYÉ'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmailAlertToast(null)}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-200 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <h4 className="text-xs font-black text-rose-300 truncate tracking-tight">
                  {emailAlertToast.productName}
                </h4>
                
                <p className="text-[10.5px] text-slate-300 leading-normal font-medium">
                  {language === 'ar' 
                    ? `وصلت السلعة إلى الحد الحرج (${emailAlertToast.qty} <= ${emailAlertToast.threshold}). تم إرسال إشعار فوري إلى:`
                    : `Le produit a atteint le niveau critique (${emailAlertToast.qty} ≤ ${emailAlertToast.threshold}). Notification expédiée à :`}
                </p>
                
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800 font-mono text-[9px] text-slate-400 select-all break-inside-avoid">
                  <div className="truncate text-emerald-400 font-bold">📩 {emailAlertToast.email}</div>
                  <div className="truncate text-[8.5px] mt-1 text-slate-500">Sujet: {emailAlertToast.subject}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const matchedProduct = db?.products?.find(p => p.name === emailAlertToast.productName || p.code === emailAlertToast.productCode);
                    if (matchedProduct) {
                      downloadPurchaseOrderPDF({
                        products: [matchedProduct],
                        settings: db?.settings,
                        language,
                      });
                    }
                  }}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-sans text-[10px] font-bold py-1.5 px-2.5 rounded flex items-center justify-center gap-1 transition-all text-center cursor-pointer shadow-sm"
                >
                  <FileText className="w-3 h-3 shrink-0 text-white" />
                  <span>
                    {language === 'ar' ? 'تحميل أمر الشراء (PDF)' : 'Bon de Commande (PDF)'}
                  </span>
                </button>

              </div>
            </div>
            
            {/* Self closing automatic progress indicator */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 8, ease: 'linear' }}
              onAnimationComplete={() => setEmailAlertToast(null)}
              className="absolute bottom-0 left-0 h-0.5 bg-emerald-500"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👤 ACTIVE SESSION USER SWITCHER MODAL WITH SECURE KEYPAD */}
      <AnimatePresence>
        {showUserSwitchModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs no-print" style={{ zIndex: 9999 }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-205 w-full max-w-md overflow-hidden text-start font-sans"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide">
                      {language === 'ar' ? 'تبديل جلسة المستخدم الحالي' : 'Changer de Session Agent'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {language === 'ar' ? 'اختر حسابك المخصص ثم أدخل الرمز السري 🔒' : 'Sélectionnez votre compte commercial puis validez le code secret 🔒'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUserSwitchModal(false)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {!selectedSwitchUser ? (
                  /* STEP 1: Select agent */
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                      {language === 'ar' ? 'اختر حساب المستخدم و الدور:' : 'CHOISISSEZ UN MEMBRE COMMERCIAL :'}
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {(db?.settings?.users || [
                        { id: 'user-1', name: 'Administrateur', pin: '0000', role: 'admin', isActive: true, avatar: '👑' },
                        { id: 'user-2', name: 'Agent de Vente', pin: '1111', role: 'sales', isActive: true, avatar: '💼' },
                        { id: 'user-3', name: 'Agent de Stock', pin: '2222', role: 'inventory', isActive: true, avatar: '📦' }
                      ]).filter((u: any) => u.isActive).map((u: any) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedSwitchUser(u);
                            setSwitchPinInput('');
                            setSwitchPinError(false);
                          }}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-start group cursor-pointer transition-all w-full"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{u.avatar || '👤'}</span>
                            <div>
                              <div className="text-xs font-black text-slate-800 group-hover:text-blue-700">{u.name}</div>
                              <div className="text-[9px] font-bold text-slate-400 capitalize tracking-wider mt-0.5">
                                {u.role === 'admin' ? (language === 'ar' ? '👑 مدير النظام' : '👑 Administrateur') :
                                 u.role === 'sales' ? (language === 'ar' ? '💼 موظف مبيعات' : '💼 Personnel ventes & caisse') :
                                 (language === 'ar' ? '📦 مسؤول مخزن' : '📦 Gestionnaire des stocks')}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-2.5 py-1 rounded transition-colors shrink-0">
                            {language === 'ar' ? 'دخول' : 'Choisir'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* STEP 2: Input PIN */
                  <div className="space-y-4 font-sans">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-150">
                      <button
                        type="button"
                        onClick={() => setSelectedSwitchUser(null)}
                        className="text-[10px] font-black text-blue-600 hover:underline uppercase shrink-0"
                      >
                        ← {language === 'ar' ? 'الرجوع للقائمة' : 'Retour'}
                      </button>
                      <div className="flex items-center gap-1.5 ml-auto text-end shrink-0">
                        <span className="text-sm">{selectedSwitchUser.avatar || '👤'}</span>
                        <span className="text-xs font-extrabold text-slate-800">{selectedSwitchUser.name}</span>
                      </div>
                    </div>

                    <div className="text-center space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                        {language === 'ar' ? 'أدخل الرمز السري الخاص بك (PIN):' : 'SAISISSEZ LE CODE PIN (4 CHIFFRES) :'}
                      </label>
                      <div className="flex justify-center gap-2" dir="ltr">
                        {[0, 1, 2, 3].map((idx) => (
                          <div
                            key={idx}
                            className={`w-10 h-11 border-2 rounded-lg flex items-center justify-center font-mono text-lg font-black transition-all ${
                              switchPinError 
                                ? 'border-rose-500 bg-rose-50 text-rose-600 animate-pulse' 
                                : switchPinInput.length > idx 
                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' 
                                : 'border-slate-300'
                            }`}
                          >
                            {switchPinInput.length > idx ? '●' : ''}
                          </div>
                        ))}
                      </div>

                      {switchPinError && (
                        <p className="text-[10px] font-bold text-rose-500">
                          ❌ {language === 'ar' ? 'الرمز السري خاطئ! حاول مجددا.' : 'Code PIN incorrect ! Réessayez.'}
                        </p>
                      )}

                      {/* Numeric PIN Keypad */}
                      <div className="grid grid-cols-3 gap-2 max-w-[210px] mx-auto pt-3" dir="ltr">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              if (switchPinInput.length < 4) {
                                const nextVal = switchPinInput + val;
                                setSwitchPinInput(nextVal);
                                setSwitchPinError(false);
                                if (nextVal.length === 4) {
                                  // Verify pin
                                  if (nextVal === selectedSwitchUser.pin) {
                                    setActiveUser(selectedSwitchUser);
                                    safeLocalStorage.setItem('pos_active_user', JSON.stringify(selectedSwitchUser));
                                    
                                    // Custom redirect tab
                                    if (selectedSwitchUser.role === 'sales') {
                                      setActiveTab('pos');
                                    } else if (selectedSwitchUser.role === 'inventory') {
                                      setActiveTab('products');
                                    } else {
                                      setActiveTab('dashboard');
                                    }

                                    setShowUserSwitchModal(false);
                                    
                                    // Display toast
                                    const welcomeMsg = language === 'ar'
                                      ? `👋 أهلاً بك، تم تسجيل دخولك بنجاح كـ ${selectedSwitchUser.name}`
                                      : `👋 Bienvenue, session active sous ${selectedSwitchUser.name} (${selectedSwitchUser.role.toUpperCase()})`;
                                    
                                    // Custom timeout toast
                                    setTimeout(() => {
                                      try {
                                        const event = new CustomEvent('show-toast', {
                                          detail: { message: welcomeMsg, type: 'success' }
                                        });
                                        window.dispatchEvent(event);
                                      } catch(_) {}
                                    }, 100);
                                  } else {
                                    setSwitchPinInput('');
                                    setSwitchPinError(true);
                                  }
                                }
                              }
                            }}
                            className="h-10 text-xs font-black text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-md flex items-center justify-center cursor-pointer transition-all border border-slate-200"
                          >
                            {val}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setSwitchPinInput('');
                            setSwitchPinError(false);
                          }}
                          className="h-10 text-[9px] font-extrabold text-rose-500 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-md flex items-center justify-center cursor-pointer transition-all border border-rose-150"
                        >
                          Clear
                        </button>
                        <button
                          key={0}
                          type="button"
                          onClick={() => {
                            if (switchPinInput.length < 4) {
                              const nextVal = switchPinInput + '0';
                              setSwitchPinInput(nextVal);
                              setSwitchPinError(false);
                              if (nextVal.length === 4) {
                                if (nextVal === selectedSwitchUser.pin) {
                                  setActiveUser(selectedSwitchUser);
                                  safeLocalStorage.setItem('pos_active_user', JSON.stringify(selectedSwitchUser));
                                  
                                  if (selectedSwitchUser.role === 'sales') {
                                    setActiveTab('pos');
                                  } else if (selectedSwitchUser.role === 'inventory') {
                                    setActiveTab('products');
                                  } else {
                                    setActiveTab('dashboard');
                                  }

                                  setShowUserSwitchModal(false);
                                  const welcomeMsg = language === 'ar'
                                    ? `👋 أهلاً بك، تم تسجيل دخولك بنجاح كـ ${selectedSwitchUser.name}`
                                    : `👋 Bienvenue, session active sous ${selectedSwitchUser.name} (${selectedSwitchUser.role.toUpperCase()})`;
                                  
                                  setTimeout(() => {
                                    try {
                                      const event = new CustomEvent('show-toast', {
                                        detail: { message: welcomeMsg, type: 'success' }
                                      });
                                      window.dispatchEvent(event);
                                    } catch(_) {}
                                  }, 100);
                                } else {
                                  setSwitchPinInput('');
                                  setSwitchPinError(true);
                                }
                              }
                            }
                          }}
                          className="h-10 text-xs font-black text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-md flex items-center justify-center cursor-pointer transition-all border border-slate-200"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (switchPinInput.length > 0) {
                              setSwitchPinInput(switchPinInput.slice(0, -1));
                              setSwitchPinError(false);
                            }
                          }}
                          className="h-10 text-xs text-slate-400 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-md flex items-center justify-center cursor-pointer transition-all border border-slate-200"
                        >
                          ⌫
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚙️ SECURE MULTI-DEVICE DISOPERATION & CLOUD DISCONNECTION CONTROL CENTER MODAL */}
      <AnimatePresence>
        {showLogoutCenterModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md no-print" style={{ zIndex: 9999 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto text-start font-sans custom-scrollbar"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Modal Brand strip */}
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800 relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-indigo-500 to-emerald-500" />
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 text-rose-400 rounded-lg border border-slate-705">
                    <Settings className="w-5 h-5 text-rose-450 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide">
                      {language === 'ar' ? 'مركز التحكم بإزالة الربط وتسجيل الخروج' : 'Contrôle de Déconnexion & Appareils'}
                    </h3>
                    <span className="text-[9px] text-slate-400 block font-mono font-bold tracking-widest uppercase mt-0.5">
                      {language === 'ar' ? 'إعدادات الأجهزة المشتركة ومزامنة السحابة' : 'MULTI-DEVICE CLOUD SYNCHRONIZATION GATE'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogoutCenterModal(false)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Connection Status block */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">
                      {language === 'ar' ? 'الحالة الحالية للجهاز' : 'État de Session de l\'Appareil'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                      user 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {user 
                        ? (language === 'ar' ? '🟢 متصل بالسحابة / Cloud' : '🟢 Session Cloud Active') 
                        : (language === 'ar' ? '🔴 وضع غير متصل / Hors-ligne' : '🔴 Session Locale Hors-ligne')}
                    </span>
                  </div>

                  {user && (
                    <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">
                          {language === 'ar' ? 'البريد الإلكتروني المتصل :' : 'Compte Google connecté :'}
                        </span>
                        <span className="font-extrabold text-slate-800 font-mono text-xs">{user.email}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">
                          {language === 'ar' ? 'معرّف السيرفر المتصل (UID) :' : 'ID Unique de Synchro :'}
                        </span>
                        <span className="font-bold text-slate-500 font-mono text-[9px] truncate max-w-[200px]">{user.uid}</span>
                      </div>
                    </div>
                  )}

                  {/* Multi-device sync explanation context */}
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-indigo-950 text-xs select-none">
                    <p className="font-bold text-indigo-900 mb-1 leading-snug">
                      {language === 'ar' ? '💡 ميزة المزامنة المتعددة للأجهزة :' : '💡 Synchronisation Multi-Appareils Active :'}
                    </p>
                    <p className="text-[11px] leading-relaxed text-indigo-750">
                      {language === 'ar'
                        ? 'عند تسجيل الدخول بنفس البريد الإلكتروني (Gmail) في هذا المحل وعلى جهاز أو هاتف آخر، يفتح التطبيق تلقائياً نفس الحساب مع جلب وتحديث نفس قاعدة البيانات مباشرة من السيرفر السحابي الآمن لـ Firebase في نفس الوقت.'
                        : 'Lorsque vous vous connectez avec ce COMPTE GOOGLE sur n\'importe quel autre appareil (PC, Tablette, Mobile ou sur un autre navigateur), l\'application charge instantanément exactement le même compte avec les mêmes stocks, reçus et ventes extraits en temps réel de Firebase.'}
                    </p>
                  </div>
                </div>

                {/* Secure disconnection prompt explaining how to log out properly */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] uppercase font-black text-slate-500 tracking-wider">
                    {language === 'ar' ? 'كيفية تسجيل الخروج الكامل بأمان' : 'PROCÉDURE DE DÉCONNEXION FINALE'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {language === 'ar'
                      ? 'لإلغاء قفل هذا الجهاز أو التبديل إلى حساب بريدي آخر، اضغط على زر تسجيل الخروج الكامل الآمن أدناه. سيتم فك ارتباط البريد وتهيئة مساحة العمل دون لمس أو التأثير على بياناتك المحفوظة داخل Firebase السحابي.'
                      : 'Pour libérer cet appareil, changer de compte Gmail ou désactiver l\'accès à l\'établissement de ce poste, cliquez sur le bouton de déconnexion officielle ci-dessous. Cette action n\'altère en aucun cas vos données sauvegardées de manière sécurisée sur Firebase.'}
                  </p>
                </div>

                {/* Disconnect actions */}
                <div className="space-y-4 pt-1">
                  {!isConfirmingLogout ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Button to start confirmation */}
                      <button
                        type="button"
                        onClick={() => setIsConfirmingLogout(true)}
                        className="flex-1 py-3 bg-slate-900 hover:bg-rose-950/20 hover:text-rose-450 text-slate-200 border border-slate-800 hover:border-rose-900/30 rounded-xl text-xs font-black uppercase text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/5 font-display"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>
                          {language === 'ar' ? 'تسجيل الخروج والفك الآمن (Clean Signout)' : 'Déconnexion Propre & Dissociation'}
                        </span>
                      </button>

                      {/* Close modal */}
                      <button
                        type="button"
                        onClick={() => setShowLogoutCenterModal(false)}
                        className="py-3 px-5 bg-slate-100 hover:bg-slate-250 border border-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
                      >
                        {language === 'ar' ? 'إغلاق' : 'Fermer'}
                      </button>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-4"
                    >
                      <div className="flex gap-3">
                        <span className="text-xl shrink-0">⚠️</span>
                        <div className="space-y-1">
                          <h5 className="text-xs font-black uppercase text-rose-800 tracking-wider">
                            {language === 'ar' ? 'تأكيد تسجيل الخروج النهائي' : 'CONFIRMATION DE SÉCURITÉ REQUISE'}
                          </h5>
                          <p className="text-[11px] font-semibold text-rose-700 leading-relaxed">
                            {language === 'ar' 
                              ? 'هل أنت متأكد تمامًا؟ سيتم قطع الاتصال وتطهير الجلسة من هذا الجهاز وتوجيهك إلى شاشة قفل الدخول.' 
                              : 'Êtes-vous absolument sûr ? Cette action déconnectera ce compte Google de cet appareil et purifiera votre session locale.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsConfirmingLogout(false)}
                          className="px-3.5 py-1.5 bg-white border border-slate-250 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-extrabold cursor-pointer transition-colors"
                        >
                          {language === 'ar' ? 'تراجع / الغاء' : 'Non, Annuler'}
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            await handleLogout();
                            setIsConfirmingLogout(false);
                            setShowLogoutCenterModal(false);
                            const confirmMsg = language === 'ar'
                              ? '✅ تم تسجيل الخروج وفك الارتباط بنجاح!'
                              : '✅ Déconnexion et nettoyage de session exécutés avec succès !';
                            
                            setTimeout(() => {
                              try {
                                const event = new CustomEvent('show-toast', {
                                  detail: { message: confirmMsg, type: 'success' }
                                });
                                window.dispatchEvent(event);
                              } catch(_) {}
                            }, 120);
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-colors shadow-sm shadow-rose-900/10 flex items-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {language === 'ar' ? 'نعم، قم بالخروج الآن' : 'Oui, me Déconnecter'}
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Modal Footer warning badge */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex items-center gap-2 select-none">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-[10px] text-slate-500 font-bold leading-normal">
                  {language === 'ar'
                    ? '🔒 بياناتك ومبيعاتك مشفرة ومحمية بالكامل على خوادم سحابية متباعدة جغرافياً.'
                    : '🔒 Vos transactions et inventaires sont chiffrés de bout en bout et protégés par Firebase Shield.'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global generic CRUD operations toast container */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
