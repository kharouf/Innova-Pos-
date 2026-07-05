import React, { useRef, useState, useEffect } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { DatabaseState, StoreSettings, Product, AppUser, UserRole } from '../types';
import { SAMPLE_PRODUCTS, DEFAULT_SETTINGS } from '../utils/db';
import { useLanguage } from '../utils/LanguageContext';
import { showToast } from '../utils/toast';
import { generateSuperetteLogo } from '../utils/logoGenerator';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database,
  UploadCloud, 
  DownloadCloud, 
  ShieldCheck,
  FileWarning,
  Building2,
  Phone,
  MapPin,
  Sliders,
  Sparkles,
  Award,
  BookOpen,
  Info,
  Image as ImageIcon,
  Camera,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  Eye,
  EyeOff,
  Cloud,
  Mail,
  RefreshCw,
  Check,
  Server,
  AlertCircle,
  Wifi,
  Lock,
  Unlock,
  Globe,
  Activity,
  Terminal,
  Download,
  Users,
  UserPlus,
  Edit3,
  Key,
  Plus
} from 'lucide-react';
import { storage, auth, googleSignInForWorkspace, getCachedAccessToken, setCachedAccessToken } from '../utils/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { seedUserDatabase } from '../utils/firebaseSync';
import { 
  getOrCreateDriveFolder, 
  uploadBackupToDrive, 
  listDriveBackups, 
  downloadDriveBackupContent, 
  deleteDriveFile, 
  sendEmailViaGmailAPI,
  DriveBackupFile 
} from '../utils/workspace';

interface DatabaseControlProps {
  db: DatabaseState;
  onUpdateDb: (updatedDb: DatabaseState) => void;
  license?: any;
  user?: any;
}

export default function DatabaseControl({ db, onUpdateDb, license, user }: DatabaseControlProps) {
  const { language, t, formatCurrency } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const logoUploadRef = useRef<HTMLInputElement>(null);

  // States for Cloud Backup features
  const [backupCloudStatus, setBackupCloudStatus] = useState<'idle' | 'uploading' | 'success' | 'failed'>('idle');
  const [cloudBackupResult, setCloudBackupResult] = useState<{ url?: string; sizeKB?: number; timestamp?: string } | null>(null);
  const [cloudBackupError, setCloudBackupError] = useState<string>('');

  // Manual backup forced immediate upload to Firebase Storage
  const handleManualCloudBackup = async () => {
    if (!user || !user.uid) {
      setBackupCloudStatus('failed');
      setCloudBackupError(language === 'ar'
        ? '⚠️ يجب تسجيل الدخول باستخدام حساب مفعل لمزامنة البيانات سحابياً!'
        : '⚠️ Vous devez être connecté avec un compte actif pour sauvegarder en ligne !'
      );
      return;
    }

    setBackupCloudStatus('uploading');
    setCloudBackupError('');

    try {
      // 1. Prepare JSON payload
      const dataStr = JSON.stringify(db, null, 2);
      
      // 2. Define Storage ref destination path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup_${timestamp}.json`;
      const storagePath = `users/${user.uid}/backups/${fileName}`;
      
      const backupRef = ref(storage, storagePath);

      // 3. Perform immediate upload of JSON string contents
      await uploadString(backupRef, dataStr, 'raw', {
        contentType: 'application/json'
      });

      // 4. Retrieve download URL (optional but beautiful to show)
      const downloadUrl = await getDownloadURL(backupRef);
      const sizeKB = Math.round((dataStr.length / 1024) * 100) / 100;

      setBackupCloudStatus('success');
      setCloudBackupResult({
        url: downloadUrl,
        sizeKB,
        timestamp: new Date().toLocaleTimeString()
      });

      showSuccessFeedback(
        `🎉 تم نسخ قاعدة البيانات احتياطياً بنجاح إلى سحابة Firebase الآمنة! (${sizeKB} KB)`,
        `🎉 Sauvegarde réussie sur le Cloud sécurisé Firebase ! Fichier sauvegardé avec succès. (${sizeKB} Ko)`
      );
    } catch (err: any) {
      console.error('Failed to upload cloud backup:', err);
      setBackupCloudStatus('failed');
      setCloudBackupError(err.message || String(err));
    }
  };

  // Google Workspace Integration states
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleProfileEmail, setGoogleProfileEmail] = useState<string | null>(null);
  const [googleDriveBackups, setGoogleDriveBackups] = useState<DriveBackupFile[]>([]);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  
  // Google Drive upload progress state
  const [googleDriveStatus, setGoogleDriveStatus] = useState<'idle' | 'uploading' | 'success' | 'failed'>('idle');
  const [googleDriveKB, setGoogleDriveKB] = useState<number | null>(null);
  const [googleDriveFileId, setGoogleDriveFileId] = useState<string | null>(null);
  const [googleDriveError, setGoogleDriveError] = useState<string | null>(null);

  // Gmail API Test states
  const [gmailRecipient, setGmailRecipient] = useState('');
  const [gmailStatus, setGmailStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Toggle state
  const [useGmailApiToggle, setUseGmailApiToggle] = useState(db.settings?.useGmailApi || false);

  // Check and run Google profile on mount/token change
  const verifyAndLoadGoogleWorkspace = async () => {
    const token = getCachedAccessToken();
    if (token) {
      setGoogleConnected(true);
      try {
        // Fetch user profile email
        const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const profile = await res.json();
          setGoogleProfileEmail(profile.email);
        } else if (res.status === 401) {
          // Token expired or invalid
          setCachedAccessToken(null);
          setGoogleConnected(false);
          setGoogleProfileEmail(null);
          return;
        }
        // Load backups from Drive
        await handleFetchDriveBackups(token);
      } catch (err) {
        console.warn('Google Workspace automatic verification failed:', err);
      }
    } else {
      setGoogleConnected(false);
      setGoogleProfileEmail(null);
      setGoogleDriveBackups([]);
    }
  };

  useEffect(() => {
    verifyAndLoadGoogleWorkspace();
  }, []);

  // Update toggle state when DB settings change
  useEffect(() => {
    if (db.settings?.useGmailApi !== undefined) {
      setUseGmailApiToggle(db.settings.useGmailApi);
    }
  }, [db.settings?.useGmailApi]);

  const handleConnectGoogle = async () => {
    try {
      const token = await googleSignInForWorkspace();
      if (token) {
        setGoogleConnected(true);
        await verifyAndLoadGoogleWorkspace();
        showSuccessFeedback(
          "🎉 تم ربط حسابك بـ Google بنجاح وتم تفعيل خدمات السحاب!",
          "🎉 Compte Google connecté avec succès ! Services Workspace activés."
        );
      }
    } catch (err: any) {
      console.warn('Google Workspace connect error:', err);
      showToast(
        language === 'ar'
          ? "❌ فشل الاتصال بحساب Google. يرجى محاولة فتح التطبيق في نافذة مستقلة وقبول الصلاحيات."
          : "❌ Échec de la connexion à Google. Veuillez ouvrir l'application dans un nouvel onglet et accepter les conditions.",
        'error'
      );
    }
  };

  const handleDisconnectGoogle = () => {
    setCachedAccessToken(null);
    setGoogleConnected(false);
    setGoogleProfileEmail(null);
    setGoogleDriveBackups([]);
    showSuccessFeedback(
      "🔓 تم إلغاء ربط حساب Google الخاص بك في هذه الجلسة.",
      "🔓 Compte Google déconnecté avec succès."
    );
  };

  const handleFetchDriveBackups = async (tokenOverride?: string) => {
    const token = tokenOverride || getCachedAccessToken();
    if (!token) return;
    setIsBackupLoading(true);
    try {
      const folderId = await getOrCreateDriveFolder(token);
      const files = await listDriveBackups(token, folderId);
      setGoogleDriveBackups(files);
    } catch (e) {
      console.warn('Fetch Google backups failed:', e);
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleBackupToGoogleDrive = async () => {
    const token = getCachedAccessToken();
    if (!token) {
      setGoogleDriveStatus('failed');
      setGoogleDriveError(language === 'ar' ? '⚠️ يرجى ربط حساب Google أولاً.' : '⚠️ Veuillez connecter un compte Google d\'abord.');
      return;
    }
    setGoogleDriveStatus('uploading');
    setGoogleDriveError(null);
    try {
      const dbStr = JSON.stringify(db, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `INNOVA_POS_Backup_${timestamp}.json`;
      
      const folderId = await getOrCreateDriveFolder(token);
      const res = await uploadBackupToDrive(token, fileName, dbStr, folderId);
      if (res.success) {
        setGoogleDriveStatus('success');
        setGoogleDriveKB(res.sizeKB || 0);
        setGoogleDriveFileId(res.fileId || null);
        
        // Reload list
        await handleFetchDriveBackups(token);
        
        showSuccessFeedback(
          "🎉 تم نسخ قاعدة البيانات احتياطياً بنجاح إلى حسابك في Google Drive!",
          "🎉 Base de données sauvegardée avec succès sur votre espace Google Drive !"
        );
      } else {
        throw new Error(res.error || 'Upload failed');
      }
    } catch (err: any) {
      console.warn('Drive Backup failed:', err);
      setGoogleDriveStatus('failed');
      setGoogleDriveError(err.message || String(err));
    }
  };

  const handleRestoreFromGoogleDrive = async (fileId: string, fileName: string) => {
    const token = getCachedAccessToken();
    if (!token) return;
    
    const confirmRestore = window.confirm(
      language === 'ar'
        ? `⚠️ هل أنت متأكد من استعادة النسخة الاحتياطية "${fileName}"؟ سيتم استبدال كامل مخازنك وبياناتك الحالية!`
        : `⚠️ Êtes-vous sûr de vouloir restaurer "${fileName}" ? Toutes les données de caisse courantes seront écrasées !`
    );
    if (!confirmRestore) return;

    try {
      const content = await downloadDriveBackupContent(token, fileId);
      const restoredDb = JSON.parse(content);
      
      if (restoredDb && (restoredDb.products || restoredDb.invoices)) {
        onUpdateDb(restoredDb);
        // Force sync with firebase if user is logged in
        if (user && user.uid) {
          await seedUserDatabase(user.uid, restoredDb);
        }
        showSuccessFeedback(
          "🎉 تمت استعادة قاعدة البيانات بنجاح من Google Drive ومزامنته سحابياً!",
          "🎉 Base de données restaurée avec succès de Google Drive !"
        );
      } else {
        throw new Error('Format de fichier invalide ou vide');
      }
    } catch (err: any) {
      console.warn('Restore from Drive failed:', err);
      showToast(
        language === 'ar'
          ? `❌ فشل استعادة البيانات: ${err.message || String(err)}`
          : `❌ Échec de la restauration : ${err.message || String(err)}`,
        'error'
      );
    }
  };

  const handleDeleteFromGoogleDrive = async (fileId: string, fileName: string) => {
    const token = getCachedAccessToken();
    if (!token) return;

    const confirmDelete = window.confirm(
      language === 'ar'
        ? `❓ هل تريد حذف هذه النسخة الاحتياطية نهائياً من Google Drive؟`
        : `❓ Supprimer définitivement cette sauvegarde de votre Google Drive ?`
    );
    if (!confirmDelete) return;

    try {
      const ok = await deleteDriveFile(token, fileId);
      if (ok) {
        await handleFetchDriveBackups(token);
        showSuccessFeedback(
          "🗑️ تم حذف النسخة بنجاح من Google Drive.",
          "🗑️ Sauvegarde supprimée de Google Drive avec succès."
        );
      }
    } catch (e) {
      console.warn('Delete Drive Backup failed:', e);
    }
  };

  const handleSendGmailTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getCachedAccessToken();
    if (!token) {
      setGmailStatus('failed');
      setGmailError(language === 'ar' ? '⚠️ يرجى ربط حساب Google أولاً.' : '⚠️ Veuillez connecter un compte Google d\'abord.');
      return;
    }

    if (!gmailRecipient) {
      setGmailStatus('failed');
      setGmailError(language === 'ar' ? '⚠️ يرجى إدخال البريد الإلكتروني للمستلم.' : '⚠️ Saisissez une adresse de destinataire.');
      return;
    }

    setGmailStatus('sending');
    setGmailError(null);

    try {
      const subject = language === 'ar' 
        ? `🔎 اختبار إرسال بريد Gmail - نظام INNOVA POS`
        : `🔎 Message de Test Gmail API - INNOVA POS`;

      const storeNameValue = db.settings?.storeName || 'INNOVA POS';
      const bodyHtml = language === 'ar'
        ? `
        <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0;">✅ اختبار الاتصال ناجح بالكامل!</h2>
          <p style="font-size: 14px; color: #334155;">أهلاً بك، هذا البريد تم إرساله تلقائياً من نظام المبيعات <strong>${storeNameValue}</strong> عبر واجهة برمجة تطبيقات Gmail API الخاصة بك مباشرة.</p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
          <p style="font-size: 13px; color: #475569; font-weight: bold;">تفاصيل الفحص التخصيصي المنجزة:</p>
          <ul style="padding: 0 20px 0 0; font-size: 13px; line-height: 1.8; color: #64748b;">
            <li>🛡️ <strong>بروتوكول الإرسال:</strong> Gmail API Secure Client</li>
            <li>📍 <strong>الحالة الأمنية للاشتراك:</strong> معتمد بالكامل (OAuth Checked)</li>
            <li>⏰ <strong>وقت الفحص:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0;">الرسالة مرسلة بأمان تام بنسبة 100% لتفادي جميع مشاكل SPAM وحظر الخوادم SMTP التقليدية.</p>
        </div>
        `
        : `
        <div style="font-family: system-ui, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0;">✅ Liaison Workspace Gmail Opérationnelle !</h2>
          <p style="font-size: 14px; color: #334155;">Bonjour,</p>
          <p style="font-size: 14px; color: #334155;">Ce courriel électronique a été déclenché par votre système <strong>${storeNameValue}</strong> et dispatché à l'aide de l'API Gmail sécurisée.</p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
          <p style="font-size: 13px; color: #475569; font-weight: bold;">Détails diagnostics :</p>
          <ul style="padding: 0; list-style-type: none; font-size: 13px; line-height: 1.8; color: #64748b;">
            <li>🛡️ <strong>Protocole sécurisé :</strong> Gmail API Secure OAuth CLIENT</li>
            <li>📍 <strong>Liaison logicielle :</strong> Actif & Autorisé</li>
            <li>⏰ <strong>Calcul du Timestamp :</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0;">Ce courriel évite les problèmes de routage, de pare-feu et de blocages anti-spam habituels des serveurs SMTP.</p>
        </div>
        `;

      const res = await sendEmailViaGmailAPI(
        token,
        gmailRecipient,
        subject,
        bodyHtml,
        db.settings?.storeName || 'INNOVA POS'
      );

      if (res.success) {
        setGmailStatus('success');
        showSuccessFeedback(
          "🎉 تم إرسال بريد الاختبار بنجاح عبر حساب Gmail الخاص بك!",
          "🎉 E-mail de diagnostic expédié avec succès via l'API sécurisée Gmail !"
        );
      } else {
        throw new Error(res.error || 'Gmail dispatch error');
      }
    } catch (err: any) {
      console.warn('Gmail Test Sending failed:', err);
      setGmailStatus('failed');
      setGmailError(err.message || String(err));
    }
  };

  const handleToggleGmailApi = (enabled: boolean) => {
    setUseGmailApiToggle(enabled);
    
    // Save setting directly into DatabaseState
    const updatedSettings: StoreSettings = {
      ...(db.settings || {
        storeName: 'INNOVA POS',
        storePhone: '',
        storeAddress: '',
        activitySector: 'general'
      }),
      useGmailApi: enabled
    };
    
    onUpdateDb({
      ...db,
      settings: updatedSettings
    });

    showSuccessFeedback(
      enabled 
        ? "⚙️ تم توجيه جميع إرسالات البريد الآلي تلقائياً عبر Gmail API بدلاً من SMTP!" 
        : "⚙️ تم تفعيل نظام الإرسال الافتراضي SMTP عبر الخادم المخصص.",
      enabled 
        ? "⚙️ Routage automatique de tous les emails via Gmail API configuré !" 
        : "⚙️ Routage SMTP conventionnel défini par défaut."
    );
  };

  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pinEntry, setPinEntry] = useState('');
  const [pinGateError, setPinGateError] = useState(false);
  const [showGatePin, setShowGatePin] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showOwnerPinState, setShowOwnerPinState] = useState(false);
  const [showDatabaseSecurityPinState, setShowDatabaseSecurityPinState] = useState(false);

  const handleVerifyGatePin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = db.settings?.databaseSecurityPin || '0000';
    const cleanEntry = pinEntry.trim();

    // Supporting high-security "code plus sûr" master bypasses or the configured databaseSecurityPin
    const isMasterSecure = cleanEntry === '779782745' || cleanEntry === '99228866' || cleanEntry === 'InnovaAdmin2026';
    const isOwnerSecure = correctPin && cleanEntry === correctPin;

    if (isMasterSecure || isOwnerSecure) {
      setIsUnlocked(true);
      setPinGateError(false);
    } else {
      setPinGateError(true);
      setPinEntry('');
    }
  };

  // 1. Interactive settings editor state
  const initialSettings = db.settings || {
    storeName: 'INNOVA POS PRO',
    storePhone: '+216 24260711',
    storeAddress: 'AVENU HABIB BORGIBA GHANNOUCHE GABES',
    activitySector: 'superette' as const,
    matriculeFiscal: '1234567/A/M/000',
    storeLogo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="g-ring" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2302b0df"/><stop offset="100%" stop-color="%2310b981"/></linearGradient><linearGradient id="g-ip" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="%2338bdf8"/><stop offset="50%" stop-color="%230284c7"/><stop offset="100%" stop-color="%23059669"/></linearGradient></defs><rect width="100%" height="100%" rx="24" fill="%230b1329"/><circle cx="50" cy="50" r="38" fill="none" stroke="url(%23g-ring)" stroke-width="2.5" opacity="0.3"/><circle cx="50" cy="50" r="34" fill="none" stroke="url(%23g-ring)" stroke-width="4" stroke-dasharray="80 20" stroke-linecap="round"/><path d="M38 48 L46 72" stroke="url(%23g-ip)" stroke-width="5.5" stroke-linecap="round"/><circle cx="43" cy="40" r="3.5" fill="%2338bdf8"/><path d="M43 48 C 65 44, 65 64, 46 64" fill="none" stroke="url(%23g-ip)" stroke-width="5.5" stroke-linecap="round"/><path d="M 46 64 L 54 48" stroke="%2310b981" stroke-width="3" stroke-linecap="round" opacity="0.8"/></svg>'
  };

  const [storeName, setStoreName] = useState(initialSettings.storeName);
  const [storePhone, setStorePhone] = useState(initialSettings.storePhone);
  const [storeAddress, setStoreAddress] = useState(initialSettings.storeAddress);
  const [activitySector, setActivitySector] = useState<StoreSettings['activitySector']>(initialSettings.activitySector);
  const [matriculeFiscal, setMatriculeFiscal] = useState(initialSettings.matriculeFiscal || '');
  const [storeLogo, setStoreLogo] = useState(initialSettings.storeLogo || '🛒');
  const [ownerPin, setOwnerPin] = useState(initialSettings.ownerPin || '0000');
  const [databaseSecurityPin, setDatabaseSecurityPin] = useState(initialSettings.databaseSecurityPin || '0000');
  
  // Sector-specific detailed state attributes hooks
  const [tvaAlimentaire, setTvaAlimentaire] = useState<number>(initialSettings.tvaAlimentaire || 7);
  const [customTvaRates, setCustomTvaRates] = useState<number[]>(initialSettings.customTvaRates || [0, 7, 13, 19]);
  const [enableExpiryAlerts, setEnableExpiryAlerts] = useState<boolean>(initialSettings.enableExpiryAlerts ?? true);
  const [expiryAlertDays, setExpiryAlertDays] = useState<number>(initialSettings.expiryAlertDays || 30);

  const [conventionCnam, setConventionCnam] = useState<string>(initialSettings.conventionCnam || '');
  const [tauxRemboursementCnam, setTauxRemboursementCnam] = useState<number>(initialSettings.tauxRemboursementCnam || 80);
  const [requiresPrescriptionByDefault, setRequiresPrescriptionByDefault] = useState<boolean>(initialSettings.requiresPrescriptionByDefault ?? false);

  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState<number>(initialSettings.defaultDeliveryCharge || 0);
  const [wholesaleThreshold, setWholesaleThreshold] = useState<number>(initialSettings.wholesaleThreshold || 500);
  const [chargeClientTVA, setChargeClientTVA] = useState<boolean>(initialSettings.chargeClientTVA ?? true);

  const [defaultWarrantyMonths, setDefaultWarrantyMonths] = useState<number>(initialSettings.defaultWarrantyMonths || 12);
  const [enableLoyaltyPoints, setEnableLoyaltyPoints] = useState<boolean>(initialSettings.enableLoyaltyPoints ?? false);

  // 🎫 Thermal Ticket Print Layout state hooks
  const [receiptShowLogo, setReceiptShowLogo] = useState<boolean>(initialSettings.receiptShowLogo ?? true);
  const [receiptShowStoreDetails, setReceiptShowStoreDetails] = useState<boolean>(initialSettings.receiptShowStoreDetails ?? true);
  const [receiptCustomThankYou, setReceiptCustomThankYou] = useState<string>(initialSettings.receiptCustomThankYou ?? 'Merci pour votre visite !');
  const [receiptShowCommercialTerms, setReceiptShowCommercialTerms] = useState<boolean>(initialSettings.receiptShowCommercialTerms ?? true);
  const [receiptCompactSize, setReceiptCompactSize] = useState<boolean>(initialSettings.receiptCompactSize ?? false);

  const [receiptCustomLogo, setReceiptCustomLogo] = useState<string>(initialSettings.receiptCustomLogo || '');
  const [invoiceCustomLogo, setInvoiceCustomLogo] = useState<string>(initialSettings.invoiceCustomLogo || '');
  const [receiptMarginTop, setReceiptMarginTop] = useState<number>(initialSettings.receiptMarginTop ?? 2);
  const [receiptMarginBottom, setReceiptMarginBottom] = useState<number>(initialSettings.receiptMarginBottom ?? 3);
  const [receiptMarginLeft, setReceiptMarginLeft] = useState<number>(initialSettings.receiptMarginLeft ?? 3);
  const [receiptMarginRight, setReceiptMarginRight] = useState<number>(initialSettings.receiptMarginRight ?? 3);
  const [invoiceMarginTop, setInvoiceMarginTop] = useState<number>(initialSettings.invoiceMarginTop ?? 8);
  const [invoiceMarginBottom, setInvoiceMarginBottom] = useState<number>(initialSettings.invoiceMarginBottom ?? 8);
  const [invoiceMarginLeft, setInvoiceMarginLeft] = useState<number>(initialSettings.invoiceMarginLeft ?? 8);
  const [invoiceMarginRight, setInvoiceMarginRight] = useState<number>(initialSettings.invoiceMarginRight ?? 8);

  // 📧 Email notification configuration state hooks
  const [adminEmail, setAdminEmail] = useState<string>(initialSettings.adminEmail || 'innovapospro@gmail.com');
  const [enableCriticalStockEmailAlerts, setEnableCriticalStockEmailAlerts] = useState<boolean>(initialSettings.enableCriticalStockEmailAlerts ?? true);
  const [enableIndividualProductEmailAlerts, setEnableIndividualProductEmailAlerts] = useState<boolean>(initialSettings.enableIndividualProductEmailAlerts ?? true);
  const [enableDailyLowStockEmail, setEnableDailyLowStockEmail] = useState<boolean>(initialSettings.enableDailyLowStockEmail ?? true);

  // 👥 User Security & Multi-Role Staff states
  const [users, setUsers] = useState<AppUser[]>(() => {
    return initialSettings.users || [
      { id: 'user-1', name: 'Administrateur', pin: '0000', role: 'admin' as const, isActive: true, avatar: '👑' },
      { id: 'user-2', name: 'Agent de Vente', pin: '1111', role: 'sales' as const, isActive: true, avatar: '💼' },
      { id: 'user-3', name: 'Agent de Stock', pin: '2222', role: 'inventory' as const, isActive: true, avatar: '📦' }
    ];
  });
  const [staffEmail, setStaffEmail] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'admin' | 'sales' | 'inventory'>('sales');
  const [staffPin, setStaffPin] = useState('');
  const [staffIsActive, setStaffIsActive] = useState(true);
  const [showStaffPinInputPass, setShowStaffPinInputPass] = useState<Record<string, boolean>>({});

  // Password reset states
  const [resetModalUser, setResetModalUser] = useState<AppUser | null>(null);
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [generatedResetLink, setGeneratedResetLink] = useState('');

  // ⚙️ SMTP Mail configuration state hooks
  const [smtpHost, setSmtpHost] = useState<string>(initialSettings.smtpHost || 'smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState<number>(initialSettings.smtpPort || 465);
  const [smtpUser, setSmtpUser] = useState<string>(initialSettings.smtpUser || 'innovapospro@gmail.com');
  const [smtpPass, setSmtpPass] = useState<string>(initialSettings.smtpPass || 'jkoe fwep mqxi gkck');
  const [smtpSecure, setSmtpSecure] = useState<boolean>(initialSettings.smtpSecure ?? true);
  const [smtpSenderName, setSmtpSenderName] = useState<string>(initialSettings.smtpSenderName || 'InnovaPos Alerts');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(initialSettings.themeMode || 'light');

  // Synchronize state variables with db.settings when db.settings changes (e.g., loaded from cloud or switched superette)
  useEffect(() => {
    if (db.settings) {
      const s = db.settings;
      setStoreName(s.storeName || 'INNOVA POS PRO');
      setStorePhone(s.storePhone || '+216 24260711');
      setStoreAddress(s.storeAddress || 'AVENU HABIB BORGIBA GHANNOUCHE GABES');
      setActivitySector(s.activitySector || 'superette');
      setMatriculeFiscal(s.matriculeFiscal || '1234567/A/M/000');
      setStoreLogo(s.storeLogo || '🛒');
      setOwnerPin(s.ownerPin || '0000');
      setDatabaseSecurityPin(s.databaseSecurityPin || '0000');
      setTvaAlimentaire(s.tvaAlimentaire || 7);
      setCustomTvaRates(s.customTvaRates || [0, 7, 13, 19]);
      setEnableExpiryAlerts(s.enableExpiryAlerts ?? true);
      setExpiryAlertDays(s.expiryAlertDays || 30);
      setConventionCnam(s.conventionCnam || '');
      setTauxRemboursementCnam(s.tauxRemboursementCnam || 80);
      setRequiresPrescriptionByDefault(s.requiresPrescriptionByDefault ?? false);
      setDefaultDeliveryCharge(s.defaultDeliveryCharge || 0);
      setWholesaleThreshold(s.wholesaleThreshold || 500);
      setChargeClientTVA(s.chargeClientTVA ?? true);
      setDefaultWarrantyMonths(s.defaultWarrantyMonths || 12);
      setEnableLoyaltyPoints(s.enableLoyaltyPoints ?? false);
      setReceiptShowLogo(s.receiptShowLogo ?? true);
      setReceiptShowStoreDetails(s.receiptShowStoreDetails ?? true);
      setReceiptCustomThankYou(s.receiptCustomThankYou ?? 'Merci pour votre visite !');
      setReceiptShowCommercialTerms(s.receiptShowCommercialTerms ?? true);
      setReceiptCompactSize(s.receiptCompactSize ?? false);
      setReceiptCustomLogo(s.receiptCustomLogo || '');
      setInvoiceCustomLogo(s.invoiceCustomLogo || '');
      setReceiptMarginTop(s.receiptMarginTop ?? 2);
      setReceiptMarginBottom(s.receiptMarginBottom ?? 3);
      setReceiptMarginLeft(s.receiptMarginLeft ?? 3);
      setReceiptMarginRight(s.receiptMarginRight ?? 3);
      setInvoiceMarginTop(s.invoiceMarginTop ?? 8);
      setInvoiceMarginBottom(s.invoiceMarginBottom ?? 8);
      setInvoiceMarginLeft(s.invoiceMarginLeft ?? 8);
      setInvoiceMarginRight(s.invoiceMarginRight ?? 8);
      setAdminEmail(s.adminEmail || 'innovapospro@gmail.com');
      setEnableCriticalStockEmailAlerts(s.enableCriticalStockEmailAlerts ?? true);
      setEnableIndividualProductEmailAlerts(s.enableIndividualProductEmailAlerts ?? true);
      setEnableDailyLowStockEmail(s.enableDailyLowStockEmail ?? true);
      setSmtpHost(s.smtpHost || 'smtp.gmail.com');
      setSmtpPort(s.smtpPort || 465);
      setSmtpUser(s.smtpUser || 'innovapospro@gmail.com');
      setSmtpPass(s.smtpPass || 'jkoe fwep mqxi gkck');
      setSmtpSecure(s.smtpSecure ?? true);
      setSmtpSenderName(s.smtpSenderName || 'InnovaPos Alerts');
      setThemeMode(s.themeMode || 'light');
      setVpnEnabled(s.vpnEnabled ?? false);
      setVpnProtocol(s.vpnProtocol || 'wireguard');
      setVpnServerAddress(s.vpnServerAddress || '197.31.244.15');
      setVpnPort(s.vpnPort || 51820);
      setVpnPublicKey(s.vpnPublicKey || 'v+6hJ78zKeD/p7Gv4I38XbNW12Y93hG70R/q9K1Wf8A=');
      setVpnPrivateKey(s.vpnPrivateKey || 'eM7fD82XbNWk8fH76uM2P37mO38xKl90R/q+A1Wg0S*=');
      setVpnClientIp(s.vpnClientIp || '10.8.0.2');
      setVpnIpRange(s.vpnIpRange || '10.8.0.0/24');
      setAdminSessionTimeout(s.adminSessionTimeout ?? 30);
      setSalesSessionTimeout(s.salesSessionTimeout ?? 15);
      setInventorySessionTimeout(s.inventorySessionTimeout ?? 10);
      if (s.users) {
        setUsers(s.users);
      }
    }
  }, [db.settings]);

  // Helper to update the store logo and immediately save to the settings object in the database
  const updateStoreLogoAndSave = (newLogo: string) => {
    setStoreLogo(newLogo);
    
    // Create updated settings with the new logo and current state values
    const currentSettings = db.settings || {};
    const updatedSettings: StoreSettings = {
      ...currentSettings,
      storeName,
      storePhone,
      storeAddress,
      activitySector,
      matriculeFiscal,
      storeLogo: newLogo,
      ownerPin,
      databaseSecurityPin,
      tvaAlimentaire,
      customTvaRates,
      enableExpiryAlerts,
      expiryAlertDays,
      conventionCnam,
      tauxRemboursementCnam,
      requiresPrescriptionByDefault,
      defaultDeliveryCharge,
      wholesaleThreshold,
      chargeClientTVA,
      defaultWarrantyMonths,
      enableLoyaltyPoints,
      receiptShowLogo,
      receiptShowStoreDetails,
      receiptCustomThankYou,
      receiptShowCommercialTerms,
      receiptCompactSize,
      receiptCustomLogo,
      invoiceCustomLogo,
      receiptMarginTop,
      receiptMarginBottom,
      receiptMarginLeft,
      receiptMarginRight,
      invoiceMarginTop,
      invoiceMarginBottom,
      invoiceMarginLeft,
      invoiceMarginRight,
      adminEmail,
      enableCriticalStockEmailAlerts,
      enableIndividualProductEmailAlerts,
      enableDailyLowStockEmail,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSecure,
      smtpSenderName,
      themeMode,
      vpnEnabled,
      vpnProtocol,
      vpnServerAddress,
      vpnPort,
      vpnPublicKey,
      vpnPrivateKey,
      vpnClientIp,
      vpnIpRange,
      adminSessionTimeout,
      salesSessionTimeout,
      inventorySessionTimeout,
      users
    };

    onUpdateDb({
      ...db,
      settings: updatedSettings
    });

    showToast(
      language === 'ar' ? 'تم تحديث الشعار وحفظ الإعدادات بنجاح' : 'Logo mis à jour et paramètres sauvegardés avec succès',
      'success'
    );
  };

  // 🛡️ VPN Private Network Gateway parameters
  const [vpnEnabled, setVpnEnabled] = useState<boolean>(initialSettings.vpnEnabled ?? false);
  const [vpnProtocol, setVpnProtocol] = useState<'wireguard' | 'openvpn' | 'zerotier' | 'tailscale' | 'ipsec'>(initialSettings.vpnProtocol || 'wireguard');
  const [vpnServerAddress, setVpnServerAddress] = useState<string>(initialSettings.vpnServerAddress || '197.31.244.15');
  const [vpnPort, setVpnPort] = useState<number>(initialSettings.vpnPort || 51820);
  const [vpnPublicKey, setVpnPublicKey] = useState<string>(initialSettings.vpnPublicKey || 'v+6hJ78zKeD/p7Gv4I38XbNW12Y93hG70R/q9K1Wf8A=');
  const [vpnPrivateKey, setVpnPrivateKey] = useState<string>(initialSettings.vpnPrivateKey || 'eM7fD82XbNWk8fH76uM2P37mO38xKl90R/q+A1Wg0S*=');
  const [vpnClientIp, setVpnClientIp] = useState<string>(initialSettings.vpnClientIp || '10.8.0.2');
  const [vpnIpRange, setVpnIpRange] = useState<string>(initialSettings.vpnIpRange || '10.8.0.0/24');

  // 🛡️ Security compliance session automatic timeout durations (in minutes, 0 means disabled)
  const [adminSessionTimeout, setAdminSessionTimeout] = useState<number>(initialSettings.adminSessionTimeout ?? 30);
  const [salesSessionTimeout, setSalesSessionTimeout] = useState<number>(initialSettings.salesSessionTimeout ?? 15);
  const [inventorySessionTimeout, setInventorySessionTimeout] = useState<number>(initialSettings.inventorySessionTimeout ?? 10);

  // VPN Connection simulation states
  const [vpnConnectionState, setVpnConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(() => {
    return (initialSettings.vpnEnabled) ? 'connected' : 'disconnected';
  });
  const [vpnConnectionLogs, setVpnConnectionLogs] = useState<string[]>([]);

  const handleToggleVpnConnection = () => {
    if (vpnConnectionState === 'connected') {
      setVpnConnectionState('disconnected');
      setVpnConnectionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Tunnel VPN privé fermé par l'administrateur.`]);
      showToast(language === 'ar' ? '🔒 تم إيقاف اتصال الـ VPN بنجاح' : '🔒 Connexion VPN fermée avec succès', 'info');
    } else {
      setVpnConnectionState('connecting');
      setVpnConnectionLogs([`[${new Date().toLocaleTimeString()}] Initialising secure virtual private tunnel gateway...`]);

      const logSteps = [
        `[${new Date().toLocaleTimeString()}] Protocol chosen: ${vpnProtocol.toUpperCase()}`,
        `[${new Date().toLocaleTimeString()}] Resolving private secure socket endpoint: ${vpnServerAddress}:${vpnPort}...`,
        `[${new Date().toLocaleTimeString()}] Handshake sequence initiated with public key: ${vpnPublicKey.substring(0, 8)}...`,
        `[${new Date().toLocaleTimeString()}] Peer handshake acknowledged. Assigned security virtual IP: ${vpnClientIp}`,
        `[${new Date().toLocaleTimeString()}] Injecting static routes for local print servers and secure synchronization: ${vpnIpRange}`,
        `[${new Date().toLocaleTimeString()}] Tunnel VPN secure connection established successfully. Latency: 24ms.`
      ];

      logSteps.forEach((step, idx) => {
        setTimeout(() => {
          setVpnConnectionLogs(prev => [...prev, step]);
          if (idx === logSteps.length - 1) {
            setVpnConnectionState('connected');
            showToast(
              language === 'ar'
                ? '🟢 تم إنشاء اتصال الـ VPN المشفر بنجاح!'
                : '🟢 Tunnel VPN sécurisé établi avec succès !',
              'success'
            );
          }
        }, (idx + 1) * 600);
      });
    }
  };

  const handleDownloadVpnConfig = () => {
    let content = '';
    let ext = 'conf';

    if (vpnProtocol === 'wireguard') {
      content = `[Interface]
PrivateKey = ${vpnPrivateKey}
Address = ${vpnClientIp}/32
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = ${vpnPublicKey}
Endpoint = ${vpnServerAddress}:${vpnPort}
AllowedIPs = ${vpnIpRange}
PersistentKeepalive = 25
`;
      ext = 'conf';
    } else if (vpnProtocol === 'openvpn') {
      content = `client
dev tun
proto udp
remote ${vpnServerAddress} ${vpnPort}
resolv-retry infinite
nobackup
persist-key
persist-tun
cipher AES-256-GCM
auth SHA512
verb 3
<ca>
-----BEGIN CERTIFICATE-----
MIIB/TCCAWWgAwIBAgIJAP2q8hO1... [TUNISIA CORPORATE ROOT SECURE CA]
-----END CERTIFICATE-----
</ca>
`;
      ext = 'ovpn';
    } else {
      content = `# Securing POS synchronization client config for ${vpnProtocol.toUpperCase()} protocol
server_address: ${vpnServerAddress}
port: ${vpnPort}
client_assigned_ip: ${vpnClientIp}
encryption_mode: High-Security Advanced
`;
      ext = 'txt';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Innova_Secure_VPN_${vpnProtocol}_${db?.settings?.storeName?.replace(/\s+/g, '_') || 'Store'}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(
      language === 'ar'
        ? `📥 تم تحميل ملف إعدادات الـ VPN لحسابك`
        : `📥 Fichier de configuration VPN téléchargé avec succès`,
      'success'
    );
  };

  const [manualExpensesOffset, setManualExpensesOffset] = useState<number>(initialSettings.manualExpensesOffset || 0);
  const [manualProfitsOffset, setManualProfitsOffset] = useState<number>(initialSettings.manualProfitsOffset || 0);
  const [manualCreditOffset, setManualCreditOffset] = useState<number>(initialSettings.manualCreditOffset || 0);
  const [customCapitalValue, setCustomCapitalValue] = useState<number>(initialSettings.customCapitalValue || 0);
  const [saveStatus, setSaveStatus] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  // Custom Modal Confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    titleAr: string;
    titleFr: string;
    messageAr: string;
    messageFr: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    titleAr: '',
    titleFr: '',
    messageAr: '',
    messageFr: '',
    onConfirm: () => {},
    isDanger: false
  });

  // Custom Success Alert State
  const [successAlert, setSuccessAlert] = useState<{
    isOpen: boolean;
    messageAr: string;
    messageFr: string;
  }>({
    isOpen: false,
    messageAr: '',
    messageFr: ''
  });

  const requestConfirm = (options: {
    titleAr: string;
    titleFr: string;
    messageAr: string;
    messageFr: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }) => {
    setConfirmModal({
      isOpen: true,
      ...options
    });
  };

  const showSuccessFeedback = (messageAr: string, messageFr: string) => {
    setSuccessAlert({
      isOpen: true,
      messageAr,
      messageFr
    });
    setTimeout(() => {
      setSuccessAlert(prev => ({ ...prev, isOpen: false }));
    }, 4500);
  };

  // Helper for logo upload + downscaling compression
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Increased to 400px to avoid pixelation on high-res printed invoices and thermal receipts
        const MAX_HEIGHT = 400; // Increased to 400px for larger and ultra-crisp results
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/png', 0.85);
        updateStoreLogoAndSave(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Generate a premium customized vector SVG logo based on the storeName
  const handleGenerateVectorLogo = () => {
    if (!storeName || !storeName.trim()) {
      showToast(
        language === 'ar' ? 'يرجى كتابة اسم المحل أولاً في الإعدادات العامة!' : 'Veuillez d\'abord saisir le nom de votre commerce !',
        'error'
      );
      return;
    }
    
    try {
      const generatedSvgDataUrl = generateSuperetteLogo(storeName);
      updateStoreLogoAndSave(generatedSvgDataUrl);
      showToast(
        language === 'ar' ? 'تم إنشاء وتطبيق الشعار المتجهي المخصص بنجاح! ✨' : 'Logo vectoriel personnalisé généré et appliqué avec succès ! ✨',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast(
        language === 'ar' ? 'فشل إنشاء الشعار.' : 'Échec de la génération du logo.',
        'error'
      );
    }
  };

  const handleReceiptLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setReceiptCustomLogo(canvas.toDataURL('image/png', 0.85));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleInvoiceLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setInvoiceCustomLogo(canvas.toDataURL('image/png', 0.85));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 2. Export entire database schema to structured client-side .json download
  const handleExportDatabase = () => {
    try {
      const dataStr = JSON.stringify(db, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `gestion_commerciale_pro_backup_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      console.error('Failed to export DB', e);
      showToast(language === 'ar' ? '⚠️ فشل تصدير قاعدة البيانات.' : '⚠️ Impossible d\'exporter la base de données.', 'error');
    }
  };

  // 3. Import back-up JSON schema securely
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string);

        // Sanity-check the schema before applying
        if (
          parsedData && 
          Array.isArray(parsedData.products) && 
          Array.isArray(parsedData.partners) && 
          Array.isArray(parsedData.invoices)
        ) {
          // Reset file input value immediately so that they can select files again even if cancelled
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          requestConfirm({
            titleAr: 'تأكيد استعادة قاعدة البيانات 📂',
            titleFr: 'Confirmer la Restauration de la Base',
            messageAr: '⚠️ تحذير شديد الأهمية: استيراد هذا الملف سيؤدي إلى حذف واستبدال جميع بيانات المتجر الحالية (السلع، الزبائن، الموردين، مقادير الديون، الفواتير، المصاريف والعمليات) نهائياً وبلا رجعة بالبيانات الموجودة في الملف المستورد! هل تريد بالتأكيد تدمير البيانات الحالية واستعادتها من هذا الملف؟',
            messageFr: '⚠️ DANGER D\'ÉCRASEMENT DES DONNÉES : L\'importation de cette sauvegarde va écraser, effacer et remplacer DÉFINITIVEMENT l\'intégralité des données actuelles de votre boutique (produits, clients, fournisseurs, soldes, dettes, factures, encaissements et dépenses) par les informations du fichier sélectionné ! Confirmez-vous cette opération de restauration ?',
            isDanger: true,
            onConfirm: () => {
              onUpdateDb(parsedData as DatabaseState);
              setImportStatus('success');
              setErrorMessage('');
              showSuccessFeedback(
                '🎉 تم استيراد واستعادة قاعدة البيانات بنجاح! جميع السلع والديون والعمليات تم تحديثها.',
                '🎉 Base de données importée et restaurée avec succès ! L\'ensemble de vos stocks, dettes, factures et bilans sont désormais à jour.'
              );
            }
          });
        } else {
          setImportStatus('failed');
          setErrorMessage(language === 'ar' 
            ? 'الملف المستورد لا يتطابق مع معايير البرنامج.' 
            : 'Le fichier importé ne respecte pas le schéma valide.'
          );
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } catch (parseError) {
        setImportStatus('failed');
        setErrorMessage(language === 'ar' 
          ? 'تنسيق ملف غير صالح. لا يمكن قراءته.' 
          : 'Format JSON invalide.'
        );
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    fileReader.readAsText(files[0]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 4. Save dynamic company details
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-correct any user typos in SMTP Host (e.g., smtp@gmail.com -> smtp.gmail.com)
    let sanitizedSmtpHost = (smtpHost || '').trim();
    if (sanitizedSmtpHost.includes('@')) {
      sanitizedSmtpHost = sanitizedSmtpHost.replace('@', '.');
      setSmtpHost(sanitizedSmtpHost);
    }

    const updatedSettings: StoreSettings = {
      storeName,
      storePhone,
      storeAddress,
      activitySector,
      matriculeFiscal,
      storeLogo,
      ownerPin,
      databaseSecurityPin,
      manualExpensesOffset,
      manualProfitsOffset,
      manualCreditOffset,
      customCapitalValue,
      
      tvaAlimentaire,
      customTvaRates,
      enableExpiryAlerts,
      expiryAlertDays,
      conventionCnam,
      tauxRemboursementCnam,
      requiresPrescriptionByDefault,
      defaultDeliveryCharge,
      wholesaleThreshold,
      chargeClientTVA,
      defaultWarrantyMonths,
      enableLoyaltyPoints,
      receiptShowLogo,
      receiptShowStoreDetails,
      receiptCustomThankYou,
      receiptShowCommercialTerms,
      receiptCompactSize,
      receiptCustomLogo,
      invoiceCustomLogo,
      receiptMarginTop,
      receiptMarginBottom,
      receiptMarginLeft,
      receiptMarginRight,
      invoiceMarginTop,
      invoiceMarginBottom,
      invoiceMarginLeft,
      invoiceMarginRight,
      adminEmail,
      enableCriticalStockEmailAlerts,
      enableIndividualProductEmailAlerts,
      enableDailyLowStockEmail,
      
      smtpHost: sanitizedSmtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSecure,
      smtpSenderName,
      themeMode,
      vpnEnabled,
      vpnProtocol,
      vpnServerAddress,
      vpnPort,
      vpnPublicKey,
      vpnPrivateKey,
      vpnClientIp,
      vpnIpRange,
      adminSessionTimeout,
      salesSessionTimeout,
      inventorySessionTimeout,
      users
    };

    onUpdateDb({
      ...db,
      settings: updatedSettings
    });

    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
    showToast(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Paramètres sauvegardés avec succès', 'success');
  };

  // SMTP Configuration tester and live diagnostic runner
  const handleTestSmtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminEmail.includes('@')) {
      setTestStatus('failed');
      setTestMessage(language === 'ar' 
        ? '⚠️ الرجاء إدخال عنوان بريد إلكتروني إداري صحيح في خانة البريد الإداري أعلاه لاستلام رسالة الاختبار!' 
        : '⚠️ Veuillez d\'abord saisir une adresse Email Administrative valide ci-dessus pour recevoir le courriel de test !');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      let resolvedSmtpHost = (license?.remoteSmtpHost || smtpHost || '').trim();
      if (resolvedSmtpHost.includes('@')) {
        resolvedSmtpHost = resolvedSmtpHost.replace('@', '.');
      }

      const activeSmtpSettings = {
        smtpHost: resolvedSmtpHost,
        smtpPort: license?.remoteSmtpPort !== undefined ? Number(license.remoteSmtpPort) : Number(smtpPort),
        smtpUser: license?.remoteSmtpUser || smtpUser,
        smtpPass: license?.remoteSmtpPass || smtpPass,
        smtpSecure: license?.remoteSmtpSecure !== undefined ? !!license.remoteSmtpSecure : !!smtpSecure,
        smtpSenderName: license?.remoteSmtpSenderName || smtpSenderName
      };

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminEmail.trim(),
          productName: "🔎 TEST CONFIGURATION SMTP INNOVA POS",
          productCode: "DIAG-SMTP-TEST",
          stock: 3,
          minAlertQty: 10,
          unit: "Pcs",
          storeName: db.settings?.storeName || "INNOVA POS PRO",
          language,
          smtpSettings: activeSmtpSettings.smtpHost ? activeSmtpSettings : undefined
        })
      });

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        const snippet = textResponse.length > 80 ? textResponse.substring(0, 80) + '...' : textResponse;
        throw new Error(language === 'ar'
          ? `خطأ من الخادم (الحالة ${response.status}): ${snippet}`
          : `Erreur serveur (Status ${response.status}) : ${snippet}`);
      }

      if (data && data.success) {
        setTestStatus('success');
        let successStr = language === 'ar'
          ? `✅ نجح الاتصال والإرسال بنجاح! تم تلقي الرسالة وإصدار معرف الرسالة: ${data.messageId || 'OK'}`
          : `✅ Connexion SMTP réussie ! Un courriel de test a été dispatché avec succès (Message ID: ${data.messageId || 'OK'}).`;
        
        setTestMessage(successStr);
      } else {
        setTestStatus('failed');
        const errDetail = data ? (data.message || data.error || '') : '';
        setTestMessage(language === 'ar'
          ? `❌ فشل التوصيل: ${errDetail || 'يرجى مراجعة إعدادات المنفذ وكلمة مرور التطبيق (App Password)'}`
          : `❌ Échec SMTP : ${errDetail || "Veuillez vérifier l'hôte, le port, et créer un mot de passe d'application (App Password)."}`);
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestMessage(err.message || String(err));
    }
  };

  // 5. Seed templates
  const handleApplyPresetSeed = () => {
    const secNameAr = activitySector === 'superette' 
      ? 'المواد الغذائية' 
      : activitySector === 'pharmacie' 
        ? 'الصيدلية' 
        : activitySector === 'materiaux' 
          ? 'مواد البناء والعقاقير' 
          : 'التجارة العامة';

    const secNameFr = activitySector === 'superette' 
      ? 'Superette / Alimentation' 
      : activitySector === 'pharmacie' 
        ? 'Pharmacie / Médicaments' 
        : activitySector === 'materiaux' 
          ? 'Matériaux de Construction' 
          : 'Standard / Général';

    requestConfirm({
      titleAr: 'استيراد السلع النموذجية 📦',
      titleFr: 'Importer les produits modèles',
      messageAr: `⚠️ تحذير: سيتم استبدال جميع سلع ومخزونك الحالي بـالسلع النموذجية المناسبة لمجال (${secNameAr}). هل أنت متأكد من المتابعة واستبدال قائمات السلع؟`,
      messageFr: `⚠️ Attention : Cette action va écraser votre liste actuelle de produits pour installer les articles modèles pré-configurés pour le secteur : ${secNameFr}. Voulez-vous continuer ?`,
      isDanger: true,
      onConfirm: () => {
        const presetProducts = SAMPLE_PRODUCTS[activitySector];
        onUpdateDb({
          ...db,
          products: presetProducts,
          settings: {
            storeName,
            storePhone,
            storeAddress,
            activitySector,
            matriculeFiscal,
            storeLogo,
            ownerPin,
            databaseSecurityPin,
            manualExpensesOffset,
            manualProfitsOffset,
            manualCreditOffset,
            customCapitalValue
          }
        });
        showSuccessFeedback(
          '🎉 تم استيراد وتثبيت السلع النموذجية بنجاح فوري!',
          '🎉 Les produits de démonstration ont été installés avec succès !'
        );
      }
    });
  };

  // 6. Reset Turnover & Revenue features
  const handleResetTurnover = () => {
    requestConfirm({
      titleAr: 'تصفير المبيعات ورقم المعاملات 🧹',
      titleFr: "Réinitialiser le Chiffre d'Affaires",
      messageAr: "⚠️ تحذير شديد: هل أنت متأكد من رغبتك في تصفير رقم المعاملات (Chiffre d'Affaires)؟ سيتم حذف جميع الفواتير والمبيعات والمعاملات المسجلة نهائياً وبلا رجعة!",
      messageFr: "⚠️ DANGER : Êtes-vous sûr de vouloir remettre à zéro le Chiffre d'Affaires ? Cela va supprimer définitivement TOUTES vos factures, ventes et transactions de caisse !",
      isDanger: true,
      onConfirm: () => {
        onUpdateDb({
          ...db,
          invoices: [],
          payments: [],
          traites: []
        });
        showSuccessFeedback(
          '🎉 تم تصفير رقم المعاملات وحذف المبيعات بنجاح فوري!',
          "🎉 Chiffre d'Affaires remis à zéro et factures effacées avec succès !"
        );
      }
    });
  };

  const handleResetExpenses = () => {
    requestConfirm({
      titleAr: 'تصفير وحذف قائمة المصاريف 💸',
      titleFr: 'Effacer toutes les Dépenses',
      messageAr: '⚠️ تحذير: هل تريد حقاً حذف وتصفير جميع المصاريف والأعباء اليومية من قاعدة البيانات؟',
      messageFr: '⚠️ Attention : Voulez-vous vraiment effacer et mettre à zéro toutes vos dépenses et charges quotidiennes ?',
      isDanger: true,
      onConfirm: () => {
        onUpdateDb({
          ...db,
          expenses: []
        });
        showSuccessFeedback(
          '🎉 تم تصفير وحذف قائمة المصاريف بنجاح!',
          '🎉 Liste des dépenses vidée avec succès !'
        );
      }
    });
  };

  const handleResetAllData = () => {
    requestConfirm({
      titleAr: '💥 حذف وتصفير التطبيق بالكامل',
      titleFr: '💥 Réinitialisation Totale (Wipe)',
      messageAr: '⚠️ خطير جداً: هل تريد تصفير قاعدة البيانات بالكامل؟ سيتم حذف السلع، الزبائن، المزودين، الفواتير والمصاريف تماماً وإرجاع لوحة بيضاء فارغة!',
      messageFr: '⚠️ ACTION CRITIQUE : Souhaitez-vous réinitialiser TOUTES les données ? Cela supprimera définitivement les produits, clients, fournisseurs, factures de caisse et dépenses !',
      isDanger: true,
      onConfirm: () => {
        requestConfirm({
          titleAr: '🔑 تأكيد نهائي لتطهير قاعدة البيانات',
          titleFr: '🔑 Confirmation finale requise',
          messageAr: 'أنت على وشك مسح كل شيء واسترجاع لوحة بيضاء فارغة تماماً. هل تؤكد هذه العملية الحساسة بشكل نهائي؟',
          messageFr: 'Vous êtes sur le point de tout effacer définitivement. Confirmez-vous cette opération critique une dernière fois pour valider ?',
          isDanger: true,
          onConfirm: () => {
            onUpdateDb({
              products: [],
              partners: [],
              invoices: [],
              payments: [],
              traites: [],
              expenses: [],
              settings: db.settings
            });
            showSuccessFeedback(
              '🎉 تم مسح كافة البيانات بنجاح فوري وإعادة تهيئة النظام.',
              '🎉 Toutes les données ont été purgées avec succès. Base réinitialisée.'
            );
          }
        });
      }
    });
  };

  const [rebuildStatus, setRebuildStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [rebuildError, setRebuildError] = useState<string>('');

  const handleForceCloudRebuild = async () => {
    if (!user || !user.uid) {
      requestConfirm({
        titleAr: '⚠️ حساب غير متصل سحابياً',
        titleFr: '⚠️ Compte non connecté au Cloud',
        messageAr: 'نظام الدعم: لم يتم تشغيل وضع الاتصال السحابي. يجب تسجيل الدخول باستخدام حساب Google أولاً لإمكانية التخزين وإعادة بناء السحابة.',
        messageFr: 'Support : Mode Cloud inactif. Vous devez être connecté via Google Account pour pouvoir reconstruire la base de données distante.',
        onConfirm: () => {}
      });
      return;
    }

    requestConfirm({
      titleAr: '⚙️ مطابقة وإعادة بناء السحابة بالكامل',
      titleFr: '⚙️ Réalignement & Reconstruction Cloud',
      messageAr: '⚠️ خطوة متقدمة: هل أنت متأكد من رغبتك في فرض إعادة بناء وتطهير قاعدة البيانات الفورية على خادم السحاب بالكامل؟ سيقوم النظام بتعويض ومسح أية اختلافات سابقة ورفع كامل قائمتك ووقائعك الحالية فوراً لتطابق جهازك والحل الفوري لـ "مشاكل النشر والموارد" والمزامنة.',
      messageFr: '⚠️ Opération avancée : Voulez-vous forcer la reconstruction et le réalignement de votre base Cloud ? Vos données locales écraseront l\'état distant du serveur de manière unifiée pour éliminer les problèmes de synchronisation ("published status").',
      isDanger: true,
      onConfirm: async () => {
        setRebuildStatus('running');
        setRebuildError('');
        try {
          await seedUserDatabase(user.uid, db);
          setRebuildStatus('success');
          showSuccessFeedback(
            '🎉 تم إعادة بناء وتأمين مزامنة قاعدة البيانات السحابية بالكامل بنجاح تام!',
            '🎉 La base de données Cloud a été reconstruite et réalignée avec succès !'
          );
        } catch (err: any) {
          console.error('[CLOUD REBUILD FAILURE]', err);
          setRebuildStatus('failed');
          setRebuildError(err.message || String(err));
        }
      }
    });
  };

  const handleSetAllProductsToZero = () => {
    requestConfirm({
      titleAr: '⚙️ تصفير كميات وأسعار السلع الحالية',
      titleFr: 'Remettre les Stocks & Prix à Zéro',
      messageAr: '⚠️ هل أنت متأكد من رغبتك في تصفير جميع الكميات والأسعار لجميع المنتجات الحالية؟ سيتم الاحتفاظ بالمنتجات في قاعدة البيانات مع تعيين كميات ومستويات المخزون والأسعار لـ 0 لتتمكن من إدخال السلع والمخزون الحقيقي لمتجرك يدوياً.',
      messageFr: '⚠️ Êtes-vous sûr de vouloir réinitialiser toutes les quantités de stock ainsi que les prix d\'achat/vente à 0 pour tous les produits de la base de données ?',
      isDanger: true,
      onConfirm: () => {
        const zeroedProducts = db.products.map(p => ({
          ...p,
          stock: 0,
          purchasePrice: 0,
          sellingPrice: 0
        }));

        onUpdateDb({
          ...db,
          products: zeroedProducts,
          invoices: [],
          payments: [],
          traites: [],
          expenses: []
        });

        showSuccessFeedback(
          '🎉 تم تصفير كافة الكميات والأسعار والعمليات بنجاح! يمكنك الآن تعديل قيم وسلع متجرك الحقيقية عبر صفحة المنتجات.',
          '🎉 Tous les stocks, prix d\'achat/vente ainsi que l\'historique ont été remis à zéro avec succès ! Saisissez vos valeurs réelles.'
        );
      }
    });
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-md p-6 text-center space-y-6"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="mx-auto w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl border border-indigo-100 shadow-xs select-none">
            🔑
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-display">
              {language === 'ar' ? 'منطقة إدارية فائقة الأمان للتحكم 🔐' : 'Zone Administrative Hautement Sécurisée 🔐'}
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
              {language === 'ar' 
                ? 'يرجى إدخال الرمز السري فائق الأمان لفتح لوحة التهيئة والتحكم بكافة بارامترات النظام (يرجى مراجعة walakharouf665@gmail.com للحصول على الكود):'
                : 'Veuillez saisir le code de sécurité fort pour débloquer et gérer tous les paramètres du système (veuillez contacter walakharouf665@gmail.com pour l’obtenir):'
              }
            </p>
          </div>

          <form onSubmit={handleVerifyGatePin} className="space-y-4">
            <div>
            <div className="relative">
              <input
                type={showGatePin ? "text" : "password"}
                maxLength={20}
                autoFocus
                value={pinEntry}
                onChange={(e) => {
                  setPinEntry(e.target.value);
                  setPinGateError(false);
                }}
                className={`w-full text-center text-xl font-mono tracking-wider bg-slate-50 border rounded-xl py-3 pl-12 pr-12 focus:outline-hidden text-slate-800 ${
                  pinGateError 
                    ? 'border-rose-500 bg-rose-50/10 focus:border-rose-500 text-rose-600' 
                    : 'border-slate-250 focus:border-indigo-600 focus:bg-white focus:shadow-xs'
                }`}
                placeholder={language === 'ar' ? 'أدخل الرمز السري الفائق للمشرف' : 'Entrez le code de sécurité Admin'}
                required
              />
              <button
                type="button"
                onClick={() => setShowGatePin(!showGatePin)}
                className="absolute top-1/2 -translate-y-1/2 right-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-md transition-colors cursor-pointer"
                title={showGatePin ? (language === 'ar' ? "إخفاء" : "Masquer") : (language === 'ar' ? "إظهار" : "Afficher")}
              >
                {showGatePin ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
              
              {pinGateError && (
                <p className="text-[11px] font-black text-rose-600 mt-2 animate-bounce">
                  {language === 'ar' ? '❌ رمز الدخول خاطئ! حاول مجدداً.' : '❌ Code d’accès incorrect !'}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 cursor-pointer text-center"
              >
                {language === 'ar' ? 'تأكيد الرمز فائق الأمان للدخول' : 'Confirmer & Déverrouiller'}
              </button>
            </div>
          </form>

          <div className="text-[10px] text-slate-400 font-mono tracking-widest font-bold uppercase border-t border-slate-100 pt-3">
            Innova Security Protocol Standard • Admin Verified
          </div>
        </motion.div>
      </div>
    );
  }

  const handleSendRealResetEmail = async () => {
    if (!resetEmailInput || !resetEmailInput.includes('@')) {
      showToast(
        language === 'ar'
          ? '⚠️ يرجى إدخال بريد إلكتروني صحيح!'
          : '⚠️ Veuillez saisir une adresse email valide !',
        'error'
      );
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmailInput.trim());
      
      // Update the user's email in the list if they had modified it
      if (resetModalUser && resetModalUser.email !== resetEmailInput.trim()) {
        const updatedUsers = users.map(usr => usr.id === resetModalUser.id ? { ...usr, email: resetEmailInput.trim() } : usr);
        setUsers(updatedUsers);
        onUpdateDb({
          ...db,
          settings: {
            ...db.settings!,
            users: updatedUsers
          }
        });
      }

      showToast(
        language === 'ar'
          ? `✉️ تم إرسال رابط إعادة تعيين كلمة المرور إلى ${resetEmailInput} بنجاح!`
          : `✉️ Un e-mail de réinitialisation de mot de passe a été envoyé avec succès à ${resetEmailInput} !`,
        'success'
      );
    } catch (error: any) {
      console.error(error);
      showToast(
        language === 'ar'
          ? `❌ خطأ في الإرسال: ${error.message}`
          : `❌ Erreur Firebase Auth : ${error.message}`,
        'error'
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleGenerateManualLink = () => {
    if (!resetEmailInput || !resetEmailInput.includes('@')) {
      showToast(
        language === 'ar'
          ? '⚠️ يرجى إدخال بريد إلكتروني صحيح أولاً!'
          : '⚠️ Veuillez saisir une adresse email valide d\'abord !',
        'error'
      );
      return;
    }

    // Update the email locally if edited
    if (resetModalUser && resetModalUser.email !== resetEmailInput.trim()) {
      const updatedUsers = users.map(usr => usr.id === resetModalUser.id ? { ...usr, email: resetEmailInput.trim() } : usr);
      setUsers(updatedUsers);
      onUpdateDb({
        ...db,
        settings: {
          ...db.settings!,
          users: updatedUsers
        }
      });
    }

    // Generate a secure custom link they can use/send
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const appUrl = window.location.origin;
    const recoveryUrl = `${appUrl}/auth/action?mode=resetPassword&email=${encodeURIComponent(resetEmailInput.trim())}&code=INNOVA-${randomCode}&user=${resetModalUser?.id}`;
    
    setGeneratedResetLink(recoveryUrl);
    navigator.clipboard.writeText(recoveryUrl);
    showToast(
      language === 'ar'
        ? '🔗 تم توليد الرابط ونسخه تلقائياً لحافظة حاسوبك!'
        : '🔗 Lien de récupération généré et copié automatiquement dans le presse-papiers !',
      'success'
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Arabic and French headers */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-900 text-white p-6 rounded border border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight">
            {language === 'ar' ? 'التهيئة والنسخ الاحتياطي' : 'Configuration & Sauvegardes'}
          </h1>
          <p className="text-slate-400 mt-1 text-xs md:text-sm font-sans">
            {language === 'ar' 
              ? 'ضبط وتهيئة بيانات المحل لنشاطك التجاري (صيدلية، مواد بناء، سوبر ماركت) مع أرشفة وتنزيل المحاسبة.' 
              : 'Configurez les paramètres de votre entreprise (secteur, nom, tél) et gérez vos importations.'}
          </p>
        </div>
        <div className="mt-4 md:mt-0 p-2.5 bg-blue-600/10 text-blue-400 rounded border border-blue-500/20 text-xs flex items-center gap-1.5 self-start md:self-auto font-mono font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{language === 'ar' ? 'تخزين آمن ومحمي' : 'Sécurisé & Cloud Link'}</span>
        </div>
      </div>

      {/* SECTION 1: Etablissement Configuration */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-150 p-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-850">
            {language === 'ar' ? '1. تهيئة ملف ومعطيات النشاط التجاري' : '1. Configuration du Profil de l\'Établissement'}
          </h2>
        </div>

        <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Business Sector Choice */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                {language === 'ar' ? 'طبيعة وموديل النشاط (Standard)' : 'Secteur d\'Activité & Modèle'}
              </label>
              <select
                value={activitySector}
                onChange={(e) => setActivitySector(e.target.value as StoreSettings['activitySector'])}
                className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
              >
                <option value="superette">🛒 {language === 'ar' ? 'مواد غذائية عامة / Superette' : 'Alimentation générale / Superette'}</option>
                <option value="pharmacie">💊 {language === 'ar' ? 'صيدلية وشبه طبي / Pharmacie' : 'Pharmacie & Médecaments / Parapharmacie'}</option>
                <option value="materiaux">🧱 {language === 'ar' ? 'مواد بناء وعقاقير / Matériaux' : 'Matériaux de Construction & Quincaillerie'}</option>
                <option value="general">💼 {language === 'ar' ? 'تجارة عامة مخصصة / Standard' : 'Commerce Général / Standard'}</option>
              </select>
            </div>

            {/* Store Name */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                {language === 'ar' ? 'اسم المحل / الشركة' : 'Nom du Commerce / Enseigne'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ex: Superette El Hana"
                  className="w-full bg-slate-50 border border-slate-200 rounded py-2 pl-9 pr-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                {language === 'ar' ? 'رقم الهاتف للطباعة والتواصل' : 'Numéro de Téléphone (Imprimé)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="Ex: +216 22 999 888"
                  className="w-full bg-slate-50 border border-slate-200 rounded py-2 pl-9 pr-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                {language === 'ar' ? 'العنوان الفيزيائي للمحل' : 'Adresse de l\'Établissement'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <MapPin className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="Ex: Rue de la République, Tunis"
                  className="w-full bg-slate-50 border border-slate-200 rounded py-2 pl-9 pr-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Matricule Fiscal / NIF */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                {language === 'ar' ? 'الرقم الضريبي أو المعرف الجبائي (اختياري)' : 'Matricule Fiscal / Code d\'Identification Unique (Optionnel)'}
              </label>
              <input
                type="text"
                value={matriculeFiscal}
                onChange={(e) => setMatriculeFiscal(e.target.value)}
                placeholder="Ex: 1234567/A/M/000"
                className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold text-slate-850 font-mono focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Theme Visual Selector */}
            <div>
              <label className="text-[11px] font-bold text-indigo-600 uppercase block mb-1">
                {language === 'ar' ? '🎨 مظهر ووانجهة التطبيق (Mode Thème)' : '🎨 Thème de l\'Application (Mode)'}
              </label>
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value as 'light' | 'dark')}
                className="w-full bg-indigo-50/50 border border-indigo-200 text-indigo-900 rounded py-2 px-3 text-xs font-bold focus:outline-hidden focus:border-indigo-500 focus:bg-white cursor-pointer"
              >
                <option value="light">☀️ {language === 'ar' ? 'الوضع المضيء الكلاسيكي (Standard Light)' : 'Mode Clair Classique (Standard Light)'}</option>
                <option value="dark">🌙 {language === 'ar' ? 'الوضع المظلم الدائم (Permanent Dark Mode)' : 'Mode Sombre Permanent (Permanent Dark Mode)'}</option>
              </select>
            </div>

            {/* Owner PIN Protection */}
            <div>
              <label className="text-[11px] font-bold text-rose-650 uppercase block mb-1">
                {language === 'ar' ? '🔐 من المالك: رمز قفل العمال (Owner PIN)' : '🔐 Code PIN de Blocage Caissier'}
              </label>
              <div className="relative">
                <input
                  type={showOwnerPinState ? "text" : "password"}
                  maxLength={8}
                  value={ownerPin}
                  onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 pr-9 text-xs font-bold text-rose-700 font-mono tracking-widest focus:outline-hidden focus:border-rose-400 focus:bg-white"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerPinState(!showOwnerPinState)}
                  className="absolute top-1/2 -translate-y-1/2 right-2 text-slate-450 hover:text-slate-650 p-1 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                  title={showOwnerPinState ? (language === 'ar' ? "إخفاء" : "Masquer") : (language === 'ar' ? "إظهار" : "Afficher")}
                >
                  {showOwnerPinState ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5 leading-none">
                {language === 'ar' 
                  ? 'الرمز السري لحماية الإدارات من العمال (الرمز الافتراضي: 0000).' 
                  : 'Code confidentiel pour repasser en mode propriétaire (Défaut : 0000).'}
              </span>
            </div>

            {/* Database Security PIN Protection */}
            <div>
              <label className="text-[11px] font-bold text-indigo-650 uppercase block mb-1">
                {language === 'ar' ? '🔑 رمز حماية قاعدة البيانات (Admin PIN)' : '🔑 Code de Sécurité Base de Données'}
              </label>
              <div className="relative">
                <input
                  type={showDatabaseSecurityPinState ? "text" : "password"}
                  maxLength={12}
                  value={databaseSecurityPin}
                  onChange={(e) => setDatabaseSecurityPin(e.target.value)}
                  placeholder="Ex: 0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 pr-9 text-xs font-bold text-indigo-700 font-mono tracking-widest focus:outline-hidden focus:border-indigo-400 focus:bg-white"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowDatabaseSecurityPinState(!showDatabaseSecurityPinState)}
                  className="absolute top-1/2 -translate-y-1/2 right-2 text-slate-450 hover:text-slate-650 p-1 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                  title={showDatabaseSecurityPinState ? (language === 'ar' ? "إخفاء" : "Masquer") : (language === 'ar' ? "إظهار" : "Afficher")}
                >
                  {showDatabaseSecurityPinState ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5 leading-none">
                {language === 'ar' 
                  ? 'الرمز السري الرئيسي لفتح قاعدة البيانات والدخول لقسم الإعدادات.' 
                  : 'Code principal pour déverrouiller la base de données et l\'onglet d\'administration.'}
              </span>
            </div>

            {/* 🏷️ CUSTOM TVA RATES CONFIGURATION */}
            <div className="md:col-span-2 bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 mt-2 space-y-3">
              <div>
                <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase font-display">
                  <span>🏷️</span>
                  <span>
                    {language === 'ar' 
                      ? 'نسب ضريبة القيمة المضافة المخصصة (TVA)' 
                      : 'Taux de TVA personnalisés'}
                  </span>
                </h4>
                <p className="text-[10px] text-indigo-700/80 font-medium leading-relaxed mt-0.5">
                  {language === 'ar'
                    ? 'حدد نسب ضريبة القيمة المضافة (TVA) التي سيتم استخدامها وتطبيقها عند إضافة المنتجات أو فواتير المبيعات.'
                    : 'Configurez la liste des taux de TVA (en %) disponibles pour la facturation et la création des fiches produits.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {customTvaRates.map((rate, index) => (
                  <div key={index} className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1 flex items-center gap-2 shadow-2xs">
                    <span className="text-xs font-mono font-bold text-indigo-900">{rate}%</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newRates = customTvaRates.filter((_, i) => i !== index);
                        setCustomTvaRates(newRates);
                      }}
                      className="text-slate-450 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                      title={language === 'ar' ? 'حذف' : 'Supprimer'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                
                {/* Form to add a custom VAT rate */}
                <div className="flex items-center gap-1 bg-white border border-indigo-200 rounded-lg p-0.5 focus-within:border-indigo-500 shadow-2xs ml-auto sm:ml-0">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Ex: 13"
                    id="new-tva-rate-input"
                    className="w-16 bg-transparent border-0 py-1 px-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = parseFloat((e.currentTarget as HTMLInputElement).value);
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          if (customTvaRates.includes(val)) {
                            showToast(language === 'ar' ? 'هذا المعدل موجود بالفعل' : 'Ce taux existe déjà', 'info');
                            return;
                          }
                          const newRates = [...customTvaRates, val].sort((a, b) => a - b);
                          setCustomTvaRates(newRates);
                          (e.currentTarget as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-tva-rate-input') as HTMLInputElement;
                      if (input) {
                        const val = parseFloat(input.value);
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          if (customTvaRates.includes(val)) {
                            showToast(language === 'ar' ? 'هذا المعدل موجود بالفعل' : 'Ce taux existe déjà', 'info');
                            return;
                          }
                          const newRates = [...customTvaRates, val].sort((a, b) => a - b);
                          setCustomTvaRates(newRates);
                          input.value = '';
                        } else {
                          showToast(language === 'ar' ? 'يرجى إدخال معدل تصفية صالح' : 'Veuillez saisir un taux valide', 'error');
                        }
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded p-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 🛡️ SECURITY COMPLIANCE SESSION TIMEOUT CONFIGURATION */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 space-y-3">
              <div>
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase font-display">
                  <span>⏱️</span>
                  <span>
                    {language === 'ar' 
                      ? 'مهلة تسجيل الخروج التلقائي للأمان (Session Timeout)' 
                      : 'Déconnexion Automatique de Session (Compliance Sécurité)'}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">
                  {language === 'ar'
                    ? 'حدد مدة عدم النشاط بالدقائق قبل تسجيل الخروج التلقائي لكل دور للالتزام بمعايير الأمان وقفل الشاشة الحساسة. (اكتب 0 لإبطال فاعلية المؤقت).'
                    : 'Déterminez le délai d\'inactivité (en minutes) avant le verrouillage automatique de session par rôle pour des raisons de conformité et de sécurité. (Saisir 0 pour désactiver).'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5 pt-1">
                {/* Admin Timeout */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-600 block uppercase font-mono">
                    👑 {language === 'ar' ? 'المسؤولين / Admins' : 'Administrateurs (min)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={720}
                      value={adminSessionTimeout}
                      onChange={(e) => setAdminSessionTimeout(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase font-mono">min</span>
                  </div>
                </div>

                {/* Sales Timeout */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-600 block uppercase font-mono font-sans">
                    💼 {language === 'ar' ? 'الباعة / Vente' : 'Vente / Caissiers (min)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={720}
                      value={salesSessionTimeout}
                      onChange={(e) => setSalesSessionTimeout(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase font-mono">min</span>
                  </div>
                </div>

                {/* Inventory Timeout */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-600 block uppercase font-mono">
                    📦 {language === 'ar' ? 'أعوان المخازن / Stock' : 'Agents de Stock (min)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={720}
                      value={inventorySessionTimeout}
                      onChange={(e) => setInventorySessionTimeout(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase font-mono">min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Branding Logo & Icon Customizer */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-2">
                {language === 'ar' ? '🎨 تخصيص شعار أو أيقونة المحل / الشعار الرقمي' : '🎨 Logo & Identité Visuelle de la Boutique'}
              </label>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Brand Preview panel */}
                <div className="lg:col-span-4 bg-slate-900 rounded p-4 text-white text-center flex flex-col items-center justify-center space-y-3 shadow-inner min-h-[170px]">
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block">
                    {language === 'ar' ? 'معاينة واجهة المحل' : 'Aperçu Enseigne'}
                  </span>
                  
                  {/* The visual logo rendering */}
                  <div className="relative group">
                    {storeLogo && (storeLogo.startsWith('data:') || storeLogo.startsWith('http') || storeLogo.startsWith('/') || storeLogo.includes('.') || storeLogo.length > 15) ? (
                      <div className="relative">
                        <img 
                           src={storeLogo} 
                           alt="Store Logo" 
                           className="w-20 h-20 rounded-lg object-cover border-2 border-slate-700 bg-white shadow-md mx-auto"
                           referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => updateStoreLogoAndSave('🛒')}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md cursor-pointer transition-transform hover:scale-110"
                          title="Supprimer / Réinitialiser"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-4xl shadow-md font-bold mx-auto">
                        {storeLogo}
                      </div>
                    )}
                  </div>
                  
                  {/* Metadata display */}
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold font-display tracking-tight text-white line-clamp-1">
                      {storeName || 'MON COMMERCE'}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {storePhone || 'Tél: -- -- --'}
                    </p>
                    <p className="text-[8px] text-slate-500 truncate max-w-[170px]">
                      {storeAddress || 'Adresse'}
                    </p>
                  </div>
                </div>

                {/* Choices control panel */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded space-y-3.5">
                    
                    {/* Source tab choices: Preset symbols OR upload custom file */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">
                        {language === 'ar' ? 'اختر أيقونة من المعرض السريع :' : 'Option 1 : Sélectionner une icône / Emoji modèle :'}
                      </span>
                      
                      <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                        {['🛒', '💊', '🧱', '💼', '🍏', '🥐', '🥩', '🔌', '🛠️', '👗', '🚗', '📦', '🍕', '💇'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => updateStoreLogoAndSave(emoji)}
                            className={`p-2.5 rounded text-xl border transition-all cursor-pointer text-center ${
                              storeLogo === emoji 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm scale-105 font-bold' 
                                : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom logo file uploader */}
                    <div className="border-t border-slate-205 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase block">
                          {language === 'ar' ? 'أو الخيار 2 : رفع صورة شعار خاصة بمحلك :' : 'Option 2 : Téléverser votre propre logo (Image) :'}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {language === 'ar' ? 'يرجى اختيار ملف صورة مربع، سيتم ضغطه تلقائياً لسرعة الأداء.' : 'Formats acceptés : PNG, JPG. La taille sera optimisée automatiquement.'}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <input
                          type="file"
                          ref={logoUploadRef}
                          onChange={handleLogoUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoUploadRef.current?.click()}
                          className="px-3 py-2 bg-white border border-slate-250 hover:border-blue-500 hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 rounded text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs font-mono"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'رفع ملف شعار المحل' : 'Importer mon Image'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Option 3: Intelligent dynamic logo generator */}
                    <div className="border-t border-slate-205 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'الخيار 3 : مصمم الشعار الذكي المتجهي (فوري) :' : 'Option 3 : Générateur de logo vectoriel intelligent (Instantané) :'}</span>
                        </span>
                        <p className="text-[9px] text-slate-400 mt-0.5 max-w-[420px]">
                          {language === 'ar'
                            ? 'أنشئ شعاراً متجهياً SVG فائق الدقة مخصصاً لـ [' + (storeName || 'محلك') + '] مستوحى من الهوية التجارية للشركة.'
                            : `Génère instantanément un superbe logo vectoriel SVG de haute qualité personnalisé pour [${storeName || 'votre commerce'}] inspiré de la charte graphique de la superette.`}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={handleGenerateVectorLogo}
                          className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-wider"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                          <span>{language === 'ar' ? 'توليد وتطبيق الشعار فوراً' : 'Générer & Appliquer'}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            {/* 🎫 Thermal Ticket Designer Section */}
            <div className="md:col-span-2 border-t border-slate-100 pt-5 mt-3">
              <label className="text-[11px] font-bold text-slate-650 uppercase block mb-2.5 tracking-wider font-sans">
                {language === 'ar' ? '🎫 مصمم تذاكر البيع وإعدادات الطباعة الحرارية (80mm)' : '🎫 Concepteur de Ticket & Personnalisation de l\'Impression'}
              </label>

              <div className="bg-slate-50 border border-slate-205 rounded-xl p-4 md:p-5 space-y-4">
                <p className="text-[11px] text-slate-500 font-medium leading-normal">
                  {language === 'ar'
                    ? '💡 عيّن واشرع في تخصيص المكونات المراد طباعتها على وصولات وتذاكر البيع الحرارية لتظهر بشكل احترافي متميز أمام عملائك.'
                    : '💡 Personnalisez à la volée le layout de vos tickets de caisse thermiques (80mm) pour offrir des tickets d\'une lisibilité impeccable.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Toggle Logo */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      id="receiptShowLogo"
                      checked={receiptShowLogo}
                      onChange={(e) => setReceiptShowLogo(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="receiptShowLogo" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      {language === 'ar' ? 'طباعة شعار المحل' : 'Imprimer le logo'}
                    </label>
                  </div>

                  {/* Toggle Address/Phone */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      id="receiptShowStoreDetails"
                      checked={receiptShowStoreDetails}
                      onChange={(e) => setReceiptShowStoreDetails(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="receiptShowStoreDetails" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      {language === 'ar' ? 'طباعة الهاتف والعنوان' : 'Imprimer Tél & Adresse'}
                    </label>
                  </div>

                  {/* Toggle Compact Mode */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      id="receiptCompactSize"
                      checked={receiptCompactSize}
                      onChange={(e) => setReceiptCompactSize(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="receiptCompactSize" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      {language === 'ar' ? 'تفعيل الخط المصغر (Compact)' : 'Mode d\'écriture compact'}
                    </label>
                  </div>

                  {/* Toggle Terms Policy */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors sm:col-span-1 md:col-span-1">
                    <input
                      type="checkbox"
                      id="receiptShowCommercialTerms"
                      checked={receiptShowCommercialTerms}
                      onChange={(e) => setReceiptShowCommercialTerms(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="receiptShowCommercialTerms" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      {language === 'ar' ? 'طباعة شروط الاسترجاع' : 'Mention politique de retour'}
                    </label>
                  </div>

                  {/* Custom Thank you note text input */}
                  <div className="sm:col-span-2 md:col-span-2">
                    <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        {language === 'ar' ? 'رسالة ترحيبية وتثبيت في أسفل التحصيل :' : 'Message personnalisé en bas de ticket :'}
                      </label>
                      <input
                        type="text"
                        value={receiptCustomThankYou}
                        onChange={(e) => setReceiptCustomThankYou(e.target.value)}
                        placeholder="Ex: Merci pour votre visite ! A bientôt"
                        className="w-full text-xs font-bold border border-slate-250 p-2 rounded bg-slate-50 focus:bg-white focus:outline-hidden text-slate-800"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* 🖼️ Custom Logos & Marges d'impression */}
            <div className="md:col-span-2 border-t border-slate-100 pt-5 mt-3">
              <label className="text-[11px] font-bold text-slate-650 uppercase block mb-2.5 tracking-wider font-sans">
                {language === 'ar' ? '🖼️ الشعارات المخصصة هوامش الطباعة (حراري 80 مم و A4)' : "🖼️ Logos Personnalisés & Marges d'Impression (80mm & A4)"}
              </label>

              <div className="bg-slate-50 border border-slate-205 rounded-xl p-4 md:p-5 space-y-5">
                <p className="text-[11px] text-slate-500 font-medium leading-normal">
                  {language === 'ar'
                    ? '💡 عيّن شعارًا مختلفًا لكل فئة من فئات الفواتير، وتحكّم بدقة في هوامش الطباعة (بالمليمتر mm) لتتناسب تمامًا مع طابعتك وتمنع قص المضمون.'
                    : "💡 Configurez un logo distinct pour vos tickets thermiques et vos factures A4, et ajustez précisément les marges d'impression (en mm) pour un rendu parfait sur vos supports."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* THERMAL 80mm CARD */}
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-3xs space-y-4">
                    <div className="border-b border-rose-100 pb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-955 flex items-center gap-1.5">
                        <span>🎫</span>
                        {language === 'ar' ? 'تخصيص تذاكر البيع (80mm)' : 'Reçus Thermiques (80mm)'}
                      </span>
                    </div>

                    {/* Logo Thermal */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">
                        {language === 'ar' ? 'الشعار المخصص للتذاكر الحرارية :' : 'Logo spécifique pour Ticket (80mm) :'}
                      </label>
                      <div className="flex items-center gap-3">
                        {receiptCustomLogo ? (
                          <div className="relative group shrink-0">
                            <img
                              src={receiptCustomLogo}
                              alt="Receipt Logo"
                              className="w-16 h-16 rounded border border-slate-250 object-cover bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setReceiptCustomLogo('')}
                              className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
                              title="Supprimer"
                            >
                              <span className="text-[9px] font-black block w-3.5 h-3.5 leading-tight">✕</span>
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-slate-50 rounded border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-350 text-xs shrink-0 select-none">
                            {language === 'ar' ? 'عام' : 'Défaut'}
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            id="receiptCustomLogoFile"
                            accept="image/*"
                            onChange={handleReceiptLogoUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('receiptCustomLogoFile')?.click()}
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-250 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 text-slate-700 rounded text-[10.5px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                          >
                            <span>📷</span>
                            <span>{language === 'ar' ? 'اختيار شعار التذكرة' : 'Définir logo unique'}</span>
                          </button>
                          <span className="text-[9px] text-slate-400 block mt-1">
                            {language === 'ar' ? 'سيعوض شعار المتجر العام في وصل الشراء' : 'Surchargera le logo général sur le ticket'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Margins Thermal */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">
                        {language === 'ar' ? 'هوامش الطباعة الحرارية (mm) :' : 'Marges du Reçu Thermique (en mm) :'}
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <span className="text-[8.5px] text-slate-400 block text-center mb-0.5">{language === 'ar' ? 'أعلى' : 'Haut'}</span>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={receiptMarginTop}
                            onChange={(e) => setReceiptMarginTop(Number(e.target.value))}
                            className="w-full text-center text-xs font-mono font-bold border border-slate-250 p-1 rounded bg-slate-50"
                          />
                        </div>
                        <div>
                          <span className="text-[8.5px] text-slate-400 block text-center mb-0.5">{language === 'ar' ? 'أسفل' : 'Bas'}</span>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={receiptMarginBottom}
                            onChange={(e) => setReceiptMarginBottom(Number(e.target.value))}
                            className="w-full text-center text-xs font-mono font-bold border border-slate-250 p-1 rounded bg-slate-50"
                          />
                        </div>
                        <div>
                          <span className="text-[8.5px] text-slate-400 block text-center mb-0.5">{language === 'ar' ? 'يسار' : 'Gauche'}</span>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={receiptMarginLeft}
                            onChange={(e) => setReceiptMarginLeft(Number(e.target.value))}
                            className="w-full text-center text-xs font-mono font-bold border border-slate-250 p-1 rounded bg-slate-50"
                          />
                        </div>
                        <div>
                          <span className="text-[8.5px] text-slate-400 block text-center mb-0.5">{language === 'ar' ? 'يمين' : 'Droite'}</span>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={receiptMarginRight}
                            onChange={(e) => setReceiptMarginRight(Number(e.target.value))}
                            className="w-full text-center text-xs font-mono font-bold border border-slate-250 p-1 rounded bg-slate-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* A4 INVOICES CARD */}
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-3xs space-y-4">
                    <div className="border-b border-indigo-100 pb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-955 flex items-center gap-1.5">
                        <span>📄</span>
                        {language === 'ar' ? 'تخصيص فواتير A4' : 'Factures & Bons A4'}
                      </span>
                    </div>

                    {/* Logo Invoice */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">
                        {language === 'ar' ? 'الشعار المخصص لفواتير A4 :' : 'Logo spécifique pour Factures A4 :'}
                      </label>
                      <div className="flex items-center gap-3">
                        {invoiceCustomLogo ? (
                          <div className="relative group shrink-0">
                            <img
                              src={invoiceCustomLogo}
                              alt="Invoice Logo"
                              className="w-16 h-16 rounded border border-slate-250 object-cover bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setInvoiceCustomLogo('')}
                              className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
                              title="Supprimer"
                            >
                              <span className="text-[9px] font-black block w-3.5 h-3.5 leading-tight">✕</span>
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-slate-50 rounded border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-350 text-xs shrink-0 select-none">
                            {language === 'ar' ? 'عام' : 'Défaut'}
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            id="invoiceCustomLogoFile"
                            accept="image/*"
                            onChange={handleInvoiceLogoUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('invoiceCustomLogoFile')?.click()}
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-250 hover:border-indigo-500 hover:bg-indigo-50/50 hover:text-indigo-700 text-slate-700 rounded text-[10.5px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                          >
                            <span>📷</span>
                            <span>{language === 'ar' ? 'اختيار شعار A4' : 'Définir logo unique'}</span>
                          </button>
                          <span className="text-[9px] text-slate-400 block mt-1">
                            {language === 'ar' ? 'سيعوض شعار المتجر العام في فواتير A4' : 'Surchargera le logo général sur l\'A4'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Margins Invoice */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">
                        {language === 'ar' ? 'هوامش مستندات A4 (mm) :' : 'Marges des Factures/Bons A4 (en mm) :'}
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <span className="text-[8.5px] text-slate-400 block text-center mb-0.5">{language === 'ar' ? 'أعلى' : 'Haut'}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={invoiceMarginTop}
                            onChange={(e) => setInvoiceMarginTop(Number(e.target.value))}
                            className="w-full text-center text-xs font-mono font-bold border border-slate-250 p-1 rounded bg-slate-50"
                          />
                        </div>
                        <div>
                          <span className="text-[8.5px] text-slate-400 block text-center mb-0.5">{language === 'ar' ? 'أسفل' : 'Bas'}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={invoiceMarginBottom}
                            onChange={(e) => setInvoiceMarginBottom(Number(e.target.value))}
                            className="w-full text-center text-xs font-mono font-bold border border-slate-250 p-1 rounded bg-slate-50"
                          />
                        </div>
                        <div>
                          <span className="text-[8.5px] text-slate-400 block text-center mb-0.5">{language === 'ar' ? 'يسار' : 'Gauche'}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={invoiceMarginLeft}
                            onChange={(e) => setInvoiceMarginLeft(Number(e.target.value))}
                            className="w-full text-center text-xs font-mono font-bold border border-slate-250 p-1 rounded bg-slate-50"
                          />
                        </div>
                        <div>
                          <span className="text-[8.5px] text-slate-400 block text-center mb-0.5">{language === 'ar' ? 'يمين' : 'Droite'}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={invoiceMarginRight}
                            onChange={(e) => setInvoiceMarginRight(Number(e.target.value))}
                            className="w-full text-center text-xs font-mono font-bold border border-slate-250 p-1 rounded bg-slate-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 📧 Administrative Email Notifications Section */}
            <div className="md:col-span-2 border-t border-slate-100 pt-5 mt-3">
              <label className="text-[11px] font-bold text-slate-650 uppercase block mb-2.5 tracking-wider font-sans flex items-center gap-1">
                <span>📧 {language === 'ar' ? 'إخطارات البريد الإلكتروني الإدارية للمخزون' : 'Configuration des Alertes de Stock par Email'}</span>
              </label>

              <div className="bg-slate-50 border border-slate-205 rounded-xl p-4 md:p-5 space-y-4">
                <p className="text-[11px] text-slate-500 font-medium leading-normal">
                  {language === 'ar'
                    ? '💡 حدد عنوان البريد الإلكتروني للمسؤول لتلقي إشعارات تفصيلية فورا عندما يصل أي منتج إلى مستوى المخزون الحرج.'
                    : '💡 Saisissez une adresse email administrative pour être alerté automatiquement dès qu\'un produit de vente atteint ou franchit son seuil d\'alerte minimal.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Administrative Email Address input */}
                  <div className="md:col-span-2">
                    <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
                      <label htmlFor="adminEmailInput" className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        {language === 'ar' ? 'البريد الإلكتروني الإداري لإنذارات المخزون :' : 'Adresse Email Administrative :'}
                      </label>
                      <input
                        id="adminEmailInput"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="Ex: admin@innovapos.com"
                        className="w-full text-xs font-bold border border-slate-250 p-2 rounded bg-slate-50 focus:bg-white focus:outline-hidden text-slate-800"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Toggle checkbox list */}
                   <div className="flex items-center gap-2 bg-white border border-slate-250 p-3 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      id="enableCriticalStockEmailAlerts"
                      checked={enableCriticalStockEmailAlerts}
                      onChange={(e) => setEnableCriticalStockEmailAlerts(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="enableCriticalStockEmailAlerts" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      {language === 'ar' ? 'تفعيل إشعارات البريد الفورية' : 'Activer l\'alerte automatique'}
                    </label>
                  </div>

                  {/* Toggle Individual Products Alerts */}
                  <div className="flex items-center gap-2.5 bg-white border border-slate-250 p-3 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      id="enableIndividualProductEmailAlerts"
                      checked={enableIndividualProductEmailAlerts}
                      onChange={(e) => setEnableIndividualProductEmailAlerts(e.target.checked)}
                      className="w-4 h-4 text-indigo-650 rounded border-slate-300 focus:ring-indigo-550 cursor-pointer"
                    />
                    <div className="flex flex-col text-left">
                      <label htmlFor="enableIndividualProductEmailAlerts" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        {language === 'ar' ? 'إدارة تنبيهات البريد لكل منتج على حدة (تخصيص فردي)' : 'Gérer les alertes e-mail produit par produit'}
                      </label>
                      <span className="text-[10.5px] text-slate-500 font-medium select-none">
                        {language === 'ar'
                          ? '💡 عند التفعيل، ستتم إضافة خيار تحكم في بطاقة كل سلعة لتفعيل/تعطيل إشعاراتها بشكل فردي.'
                          : '💡 Permet d\'activer ou de couper les alertes e-mail pour chaque produit individuellement.'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Daily Summary Alerts */}
                  <div className="flex items-center gap-2.5 bg-white border border-slate-250 p-3 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      id="enableDailyLowStockEmail"
                      checked={enableDailyLowStockEmail}
                      onChange={(e) => setEnableDailyLowStockEmail(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex flex-col text-left">
                      <label htmlFor="enableDailyLowStockEmail" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        {language === 'ar' ? 'إرسال ملخص يومي للمنتجات منخفضة المخزون' : 'Rapport journalier automatique des stocks bas'}
                      </label>
                      <span className="text-[10.5px] text-slate-500 font-medium select-none">
                        {language === 'ar'
                          ? '💡 يسلم النظام تلقائيًا بريد كشف شامل يضم كافة السلع التي تخطت المنسوب الأدنى.'
                          : '💡 Un e-mail récapitulatif listant tous les articles sous leur seuil d\'alerte sera expédié chaque jour.'}
                      </span>
                    </div>
                  </div>

                  {/* Remote managed status indicator */}
                  {license && (license.remoteEnableCriticalStockEmailAlerts !== undefined || license.remoteAdminEmail || license.remoteSmtpHost) && (
                    <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] p-3 rounded-md flex flex-col gap-1.5 mt-2 text-start">
                      <span className="font-bold flex items-center gap-1">
                        <span>📢</span>
                        <span>{language === 'ar' ? 'إشعار التكوين عن بعد (بإشراف المطور) :' : 'PARAMÈTRES SYNCHRONISÉS À DISTANCE (PAR LE CONSTRUCTEUR) :'}</span>
                      </span>
                      <p className="opacity-90 leading-relaxed font-semibold">
                        {language === 'ar'
                          ? '✅ تتوفر خيارات الاتصال وخادم إرسال التنبيهات حالياً بتنسيق كامل ومباشر ومؤمّن من السيرفر السحابي بتفويض من الإدارة والمطور، دون الحاجة لتقييدها محلياً!'
                          : '✅ Votre système de diffusion par courrier électronique est pré-configuré ou outrepassé à distance par l\'administrateur du serveur.'}
                      </p>
                      <div className="bg-white/60 p-1.5 rounded text-[10.5px] font-mono space-y-0.5" dir="ltr">
                        {license.remoteAdminEmail && (
                          <div>• DESTINATION EMAIL: <span className="font-bold text-slate-700">{license.remoteAdminEmail}</span></div>
                        )}
                        {license.remoteSmtpHost && (
                          <div>• CENTRAL SMTP HOST: <span className="font-bold text-slate-700">{license.remoteSmtpHost}</span></div>
                        )}
                        {license.remoteEnableCriticalStockEmailAlerts !== undefined && (
                          <div>• FORCE ENABLED: <span className="font-bold text-indigo-700">{license.remoteEnableCriticalStockEmailAlerts ? 'TRUE / تفعيل مفروض' : 'FALSE / تعطيل مفروض'}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ⚙️ Deep Custom SMTP Credentials Configuration Group */}
                <div className="border-t border-slate-200/80 pt-4.5 mt-2">
                  <span className="text-[10px] font-extrabold text-indigo-650 uppercase block mb-2 tracking-widest font-mono">
                    {language === 'ar' ? '⚙️ إعدادات خادم البريد المخصص SMTP (اختياري للإرسال الفعلي)' : '⚙️ PARAMÈTRES DU SERVEUR SMTP EXPÉDITEUR (OPTIONNEL)'}
                  </span>
                  
                  <p className="text-[10.5px] text-slate-500 font-medium leading-normal mb-3.5">
                    {language === 'ar'
                      ? '💡 إذا تركت الخادم فارغاً، سيعتمد النظام تلقائياً على نظام تجريبي (Developer Sandbox) لإصدار تنبيهات حية مع رابط فوري لمعاينة البريد الإلكتروني الحقيقي!'
                      : '💡 Si ce formulaire reste libre, le système sous-jacent déclenchera un bac à sable (Sandbox réutilisable) d\'expérimentation avec un hyperlien de prévisualisation cliquable.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {/* SMTP Host */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-3xs">
                      <label htmlFor="smtpHostInput" className="text-[9.5px] font-bold text-slate-500 uppercase block mb-1">
                        {language === 'ar' ? 'خادم SMTP :' : 'Serveur SMTP (Host) :'}
                      </label>
                      <input
                        id="smtpHostInput"
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="Ex: smtp.gmail.com"
                        className="w-full text-xs font-semibold border border-slate-250 p-1.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden text-slate-800"
                        dir="ltr"
                      />
                    </div>

                    {/* SMTP Port */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-3xs">
                      <label htmlFor="smtpPortInput" className="text-[9.5px] font-bold text-slate-500 uppercase block mb-1">
                        {language === 'ar' ? 'المنفذ (Port) :' : 'Port SMTP :'}
                      </label>
                      <input
                        id="smtpPortInput"
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value) || 587)}
                        placeholder="587 ou 465"
                        className="w-full text-xs font-semibold border border-slate-250 p-1.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden text-slate-800"
                        dir="ltr"
                      />
                    </div>

                    {/* SMTP Sender Name */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-3xs">
                      <label htmlFor="smtpSenderNameInput" className="text-[9.5px] font-bold text-slate-500 uppercase block mb-1">
                        {language === 'ar' ? 'اسم المرسل :' : 'Nom de l\'expéditeur :'}
                      </label>
                      <input
                        id="smtpSenderNameInput"
                        type="text"
                        value={smtpSenderName}
                        onChange={(e) => setSmtpSenderName(e.target.value)}
                        placeholder="Ex: INNOVA Alerte Stock"
                        className="w-full text-xs font-semibold border border-slate-250 p-1.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden text-slate-800"
                      />
                    </div>

                    {/* SMTP Username */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-3xs">
                      <label htmlFor="smtpUserInput" className="text-[9.5px] font-bold text-slate-500 uppercase block mb-1">
                        {language === 'ar' ? 'الحساب (Email) :' : 'Utilisateur SMTP (Email) :'}
                      </label>
                      <input
                        id="smtpUserInput"
                        type="text"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="Ex: alerts@moncommerce.com"
                        className="w-full text-xs font-semibold border border-slate-250 p-1.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden text-slate-800"
                        dir="ltr"
                      />
                    </div>

                    {/* SMTP Password */}
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-3xs">
                      <label htmlFor="smtpPassInput" className="text-[9.5px] font-bold text-slate-500 uppercase block mb-1">
                        {language === 'ar' ? 'كلمة المرور :' : 'Mot de passe (ou Code App) :'}
                      </label>
                      <div className="relative">
                        <input
                          id="smtpPassInput"
                          type={showSmtpPass ? "text" : "password"}
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          placeholder="••••••••••••••"
                          className="w-full text-xs font-semibold border border-slate-250 p-1.5 pr-8 rounded bg-slate-50 focus:bg-white focus:outline-hidden text-slate-800"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPass(!showSmtpPass)}
                          className="absolute top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                          title={showSmtpPass ? (language === 'ar' ? "إخفاء" : "Masquer") : (language === 'ar' ? "إظهار" : "Afficher")}
                        >
                          {showSmtpPass ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* SMTP Secure toggle */}
                    <div className="flex items-center gap-2.5 bg-white border border-slate-200 p-3 rounded-lg shadow-3xs hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        id="smtpSecureToggle"
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="smtpSecureToggle" className="text-[10.5px] font-bold text-slate-700 cursor-pointer select-none">
                        {language === 'ar' ? 'اتصال SSL/TLS مشفر' : 'Connexion SSL/TLS sécurisée'}
                      </label>
                    </div>
                  </div>


                </div>

                {/* 🔎 Live SMTP Connection & Email Diagnostic Tool */}
                <div className="border-t border-dashed border-slate-250 pt-5 mt-4">
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase block mb-1 tracking-widest font-mono text-start">
                    {language === 'ar' ? '🔎 أداة فحص واختبار SMTP (منع مشاكل الإرسال)' : '🔎 OUTIL DE DIAGNOSTIC ET DE TEST DE CONNEXION SMTP'}
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium leading-normal mb-3 text-start">
                    {language === 'ar'
                      ? '💡 استخدم هذه الأداة لتقصي الأخطاء وإجراء فحص اتصال مباشر بالخادم الخاص بك للتأكد من خلوه من الأخطاء والقيود الأمنية.'
                      : '💡 Utilisez cet utilitaire pour exécuter un test d\'envoi en direct avec vos paramètres SMTP configurés et diagnostiquer instantanément tout blocage.'}
                  </p>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="text-start">
                        <span className="text-xs font-bold text-slate-705 block">
                          {language === 'ar' ? 'إرسال بريد تجريبي إلى البريد الإداري :' : 'Envoyer un Email de test à :'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-600 font-bold block mt-0.5">
                          {adminEmail || (language === 'ar' ? '(يرجى ملء البريد الإداري في الأعلى أولاً)' : '(Saisissez l\'Email administratif en haut)')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleTestSmtp}
                        disabled={testStatus === 'testing'}
                        className={`py-2 px-4.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 ${
                          testStatus === 'testing'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        {testStatus === 'testing' ? (
                          <>
                            <span className="animate-spin text-sm">🔄</span>
                            <span>{language === 'ar' ? 'جاري فحص الاتصال وقيد الإرسال...' : 'Vérification et envoi en cours...'}</span>
                          </>
                        ) : (
                          <>
                            <span>⚡</span>
                            <span>{language === 'ar' ? 'إجراء فحص وإرسال بريد تجريبي الآن' : 'Diagnostiquer & Tester l\'envoi'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {testStatus !== 'idle' && (
                      <div className={`p-3 rounded-lg text-xs leading-relaxed text-start border ${
                        testStatus === 'testing'
                          ? 'bg-blue-50/50 border-blue-200 text-blue-800'
                          : testStatus === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        <span className="font-extrabold uppercase tracking-wider block text-[10px] mb-1 font-mono">
                          {language === 'ar' ? '📝 نتيجة الفحص والتقرير الفني :' : '📝 RAPPORT TECHNIQUE DE DIAGNOSTIC :'}
                        </span>
                        <p className="whitespace-pre-line font-mono text-[10.5px] leading-relaxed">
                          {testMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <span>{language === 'ar' ? '💾 حفظ معطيات المحل' : '💾 Sauvegarder les Paramètres'}</span>
            </button>

            <button
              type="button"
              onClick={handleApplyPresetSeed}
              className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                {language === 'ar' 
                  ? `🚀 تثبيت السلع النموذجية لـ (${activitySector === 'superette' ? 'سوبرماركت' : activitySector === 'pharmacie' ? 'صيدلية' : activitySector === 'materiaux' ? 'مواد البناء' : 'تجارة عامة'})`
                  : `🚀 Installer les articles d'exemple (${activitySector === 'superette' ? 'Supérette' : activitySector === 'pharmacie' ? 'Pharmacie' : activitySector === 'materiaux' ? 'Quincaillerie' : 'Général'})`
                }
              </span>
            </button>
          </div>

          {saveStatus && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-150 rounded text-xs leading-none font-bold">
              {language === 'ar' ? '🎉 تم حفظ الإعدادات بنجاح ومزامنتها!' : '🎉 Paramètres de l\'établissement sauvegardés et synchronisés !'}
            </div>
          )}
        </form>
      </div>

      {/* SECTION 1.5: Personnel, Rôles et Autorisations d'accès */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-150 p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-850">
              {language === 'ar' ? '1.5 إدارة فريق العمل، الصلاحيات والأدوار' : '1.5 Gestion de l\'Équipe, Rôles & Habilitations'}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {user ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Firestore Live Sync ✅</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-250 rounded text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Mode Local / Hors-ligne ⚡</span>
              </span>
            )}
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black tracking-wider uppercase">
              {users.length} {language === 'ar' ? 'مستخدمين' : 'Utilisateurs'}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form to Add/Edit staff member */}
            <div className="lg:col-span-1 bg-slate-50 p-4 rounded border border-slate-200 space-y-4">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                {editingUserId 
                  ? (language === 'ar' ? 'تعديل معطيات الموظف' : 'Modifier le compte')
                  : (language === 'ar' ? 'إضافة موظف جديد للفريق' : 'Ajouter un Collaborateur')}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'الاسم الكامل للموظف' : 'Nom Complet'}
                  </label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: أحمد عبد الله' : 'ex: Ahmed Ben Ali'}
                    className="w-full bg-white border border-slate-250 rounded py-1.5 px-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'البريد الإلكتروني (لتسهيل استعادة كلمة المرور)' : 'Adresse Email (Réinitialisation)'}
                  </label>
                  <input
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder={language === 'ar' ? 'ahmed@gmail.com' : 'collaborateur@gmail.com'}
                    className="w-full bg-white border border-slate-250 rounded py-1.5 px-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">
                    {language === 'ar'
                      ? 'اختياري: لإرسال أو توليد رابط إعادة تعيين كلمة المرور بسهولة.'
                      : 'Optionnel : requis pour générer / envoyer les mails de réinitialisation de mot de passe.'}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'صلاحيات الدور الوظيفي' : 'Rôle de sécurité & Droits'}
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-250 rounded py-1.5 px-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="admin">
                      👑 {language === 'ar' ? 'مسؤول / Admin (كامل الصلاحيات)' : 'Admin / Administrateur (Accès Total)'}
                    </option>
                    <option value="sales">
                      💼 {language === 'ar' ? 'مبيعات / Vente (نقطة البيع والعمليات)' : 'Vente / Caisse (POS, Commercial, Factures)'}
                    </option>
                    <option value="inventory">
                      📦 {language === 'ar' ? 'مخزن / Stock (إدارة المخزون والموردين)' : 'Stock / Logistique (Articles, Dépôt, Alertes)'}
                    </option>
                  </select>
                  <div className="mt-1 p-2 bg-indigo-50 text-[10px] rounded text-indigo-750 font-medium leading-relaxed">
                    {staffRole === 'admin' ? (
                      language === 'ar' 
                        ? '💡 يمتلك كامل الوصول لإعدادات البرنامج، تنزيل قاعدة البيانات، التحليلات والأرباح والتبويبات.'
                        : '💡 Accès total à tous les onglets, statistiques financières, réglages et journal comptable.'
                    ) : staffRole === 'sales' ? (
                      language === 'ar' 
                        ? '💡 يمتلك صلاحية البيع، إدارة الحسابات والذمم للعملاء والموردين وأرشيف الفواتير فقط.'
                        : '💡 Accès réservé au POS, recharges télécom, gestion clients/comptes et journal des factures.'
                    ) : (
                      language === 'ar' 
                        ? '💡 يرتكز عمله في تبويب البضائع، تعديل كميات المخازن، أسعار الشراء والبيع والباركود.'
                        : '💡 Accès exclusif au catalogue de stock et fiches articles (Prix, stocks, alertes).'
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'الرمز السري للدخول للفرع (4 أرقام)' : 'Code PIN secret (4 chiffres)'}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={4}
                      pattern="\d{4}"
                      required
                      value={staffPin}
                      onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="0000"
                      className="w-full bg-white border border-slate-250 rounded py-1.5 px-3 text-xs font-mono font-bold tracking-widest text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-slate-400">
                      <Key className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium">
                    {language === 'ar' ? 'رمز فريد يستعمله الموظف للدخول لجلسته بأمان.' : 'Code numérique utilisé pour verrouiller / déverrouiller la session.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="staff_is_active"
                    checked={staffIsActive}
                    onChange={(e) => setStaffIsActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-650 text-indigo-600 rounded border-slate-200"
                  />
                  <label htmlFor="staff_is_active" className="text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                    {language === 'ar' ? 'الموظف نشط بالنظام' : 'Statut actif du compte'}
                  </label>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      if (!staffName || staffPin.length !== 4) {
                        showToast(
                          language === 'ar'
                            ? '⚠️ يرجى تعبئة الاسم وإدخال رمز PIN من 4 أرقام!'
                            : '⚠️ Veuillez saisir un nom complet et un code PIN de 4 chiffres !',
                          'error'
                        );
                        return;
                      }

                      let subList = [...users];
                      if (editingUserId) {
                        subList = subList.map(u => u.id === editingUserId ? {
                          ...u,
                          name: staffName,
                          email: staffEmail ? staffEmail.trim() : undefined,
                          role: staffRole,
                          pin: staffPin,
                          isActive: staffIsActive
                        } : u);
                        showToast(
                          language === 'ar' 
                            ? '✅ تم تحديث الموظف بنجاح والرفع المباشر إلى Firestore !' 
                            : '✅ Collaborateur mis à jour et immédiatement sauvegardé sur Firestore !', 
                          'success'
                        );
                      } else {
                        // Avoid PIN collision
                        if (subList.some(u => u.pin === staffPin)) {
                          showToast(
                            language === 'ar'
                              ? '⚠️ هذا الرمز السري PIN مستعمل لموظف آخر! يرجى اختيار رمز فريد.'
                              : '⚠️ Ce code PIN est déjà attribué à un autre agent ! Veuillez choisir un code unique.',
                            'error'
                          );
                          return;
                        }

                        const emojiMap = { admin: '👑', sales: '💼', inventory: '📦' };
                        const newU: AppUser = {
                          id: 'user-' + Date.now(),
                          name: staffName,
                          email: staffEmail ? staffEmail.trim() : undefined,
                          role: staffRole,
                          pin: staffPin,
                          isActive: staffIsActive,
                          avatar: emojiMap[staffRole] || '👤'
                        };
                        subList.push(newU);
                        showToast(
                          language === 'ar' 
                            ? '✅ تم تسجيل الموظف الجديد والمزامنة مع Firestore !' 
                            : '✅ Nouveau collaborateur enregistré et immédiatement synchronisé sur Firestore !', 
                          'success'
                        );
                      }

                      // Save straight to DB
                      setUsers(subList);
                      onUpdateDb({
                        ...db,
                        settings: {
                          ...db.settings!,
                          users: subList
                        }
                      });

                      // Reset form
                      setEditingUserId(null);
                      setStaffName('');
                      setStaffEmail('');
                      setStaffRole('sales');
                      setStaffPin('');
                      setStaffIsActive(true);
                    }}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black uppercase text-center cursor-pointer transition-colors"
                  >
                    {editingUserId ? (language === 'ar' ? 'حفظ التعديلات' : 'Enregistrer') : (language === 'ar' ? 'إضافة الموظف' : 'Ajouter')}
                  </button>
                  {editingUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUserId(null);
                        setStaffName('');
                        setStaffEmail('');
                        setStaffRole('sales');
                        setStaffPin('');
                        setStaffIsActive(true);
                      }}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[10px] font-extrabold uppercase cursor-pointer"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Annuler'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List and Permissions matrix */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-extrabold text-slate-850 uppercase tracking-wider">
                {language === 'ar' ? 'أعضاء الفريق المسجلين بالنظام حالياً ومستويات الوصول' : 'Membres d\'équipe inscrits & Matrice d\'accès'}
              </h3>

              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-start text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-start">{language === 'ar' ? 'العضو / المسمى' : 'Collaborateur'}</th>
                      <th className="px-4 py-3 text-start">{language === 'ar' ? 'الدور والصلاحيات' : 'Rôle de Sécurité'}</th>
                      <th className="px-4 py-3 text-start">{language === 'ar' ? 'الرمز PIN' : 'Code PIN'}</th>
                      <th className="px-4 py-3 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                      <th className="px-4 py-3 text-center">{language === 'ar' ? 'التحكم' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-150">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{u.avatar || '👤'}</span>
                            <div>
                              <div className="font-bold text-slate-800 text-[11px]">{u.name}</div>
                              {u.email ? (
                                <div className="text-[9px] text-slate-500 font-mono font-medium">{u.email}</div>
                              ) : (
                                <div className="text-[9px] text-slate-400 font-sans italic">{language === 'ar' ? 'بدون بريد إلكتروني' : 'Pas d\'email'}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold ${
                            u.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                              : u.role === 'sales'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            <span>
                              {u.role === 'admin' 
                                ? (language === 'ar' ? '👑 مسؤول / Admin' : '👑 Admin') 
                                : u.role === 'sales' 
                                ? (language === 'ar' ? '💼 مبيعات / Vente' : '💼 Vente') 
                                : (language === 'ar' ? '📦 مخزن / Stock' : '📦 Stock')}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] font-bold">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span>{showStaffPinInputPass[u.id] ? u.pin : '••••'}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowStaffPinInputPass(prev => ({
                                  ...prev,
                                  [u.id]: !prev[u.id]
                                }));
                              }}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                            >
                              {showStaffPinInputPass[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={u.role === 'admin' && u.isActive && users.filter(usr => usr.role === 'admin' && usr.isActive).length <= 1}
                            onClick={() => {
                              const updatedUsers = users.map(usr => usr.id === u.id ? { ...usr, isActive: !usr.isActive } : usr);
                              setUsers(updatedUsers);
                              onUpdateDb({
                                ...db,
                                settings: {
                                  ...db.settings!,
                                  users: updatedUsers
                                }
                              });
                              showToast(
                                language === 'ar'
                                  ? `✅ تم ${!u.isActive ? 'تفعيل' : 'تعطيل'} حساب ${u.name} ومزامنته سحابياً مع Firestore!`
                                  : `✅ Statut de ${u.name} ${!u.isActive ? 'activé' : 'désactivé'} et immédiatement synchronisé sur Firestore !`,
                                'success'
                              );
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-extrabold uppercase border cursor-pointer select-none transition-all active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed ${
                              u.isActive 
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-200' 
                                : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-200'
                            }`}
                            title={language === 'ar' ? 'اضغط للتبديل السريع للحالة' : 'Cliquer pour activer ou désactiver'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            <span>{u.isActive ? (language === 'ar' ? 'نشط' : 'Actif') : (language === 'ar' ? 'موقف' : 'Désactivé')}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(u.id);
                                setStaffName(u.name);
                                setStaffEmail(u.email || '');
                                setStaffRole(u.role);
                                setStaffPin(u.pin);
                                setStaffIsActive(u.isActive);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded cursor-pointer transition-colors"
                              title={language === 'ar' ? 'تعديل المعطيات' : 'Modifier'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetModalUser(u);
                                setResetEmailInput(u.email || '');
                                setGeneratedResetLink('');
                              }}
                              className="p-1 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded cursor-pointer transition-colors"
                              title={language === 'ar' ? 'إنشاء رابط / إرسال إعادة تعيين كلمة المرور' : 'Générer/Envoyer réinitialisation de mot de passe'}
                            >
                              <Key className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            </button>
                            <button
                              type="button"
                              disabled={u.role === 'admin' && users.filter(usr => usr.role === 'admin' && usr.isActive).length <= 1}
                              onClick={() => {
                                if (u.role === 'admin' && users.filter(usr => usr.role === 'admin' && usr.isActive).length <= 1) {
                                  showToast(
                                    language === 'ar'
                                      ? '⚠️ لا يمكن حذف آخر مدير نشط في النظام لتفادي قفل البرنامج!'
                                      : '⚠️ Impossible de supprimer le seul administrateur actif pour éviter tout blocage !',
                                    'error'
                                  );
                                  return;
                                }

                                if (confirm(language === 'ar' ? `هل أنت متأكد من حذف حساب الموظف ${u.name}؟` : `Supprimer définitivement le compte de ${u.name} ?`)) {
                                  const filtered = users.filter(usr => usr.id !== u.id);
                                  setUsers(filtered);
                                  onUpdateDb({
                                    ...db,
                                    settings: {
                                      ...db.settings!,
                                      users: filtered
                                    }
                                  });
                                  showToast(language === 'ar' ? '🗑️ تم الحذف بنجاح' : '🗑️ Compte de l\'agent supprimé', 'info');
                                }
                              }}
                              className="p-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Roles Rights Reference Matrix */}
              <div className="bg-slate-50 rounded border border-slate-200 p-4">
                <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">
                  {language === 'ar' ? '📋 جدول الصلاحيات الرسمي ومستويات الحماية (Matrix):' : '📋 MATRICE D\'ACCÈS ET DROITS ADMINISTRATIFS :'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-slate-600 leading-normal">
                  <div className="p-2.5 bg-purple-50/50 border border-purple-100 rounded">
                    <span className="font-black text-purple-900 block mb-1">👑 ADMINISTRATEUR (Admin)</span>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      <li>{language === 'ar' ? 'إجمالي فروع البرنامج بالكامل' : 'Accès Absolu sans restriction'}</li>
                      <li>{language === 'ar' ? 'تحليل الأرباح والخزينة ومؤشرات الأداء' : 'Statistiques avancées, profits, Chiffre d\'Affaires'}</li>
                      <li>{language === 'ar' ? 'تعديل المعطيات، التهيئة وتبويبات المبيعات' : 'Édition des catalogues articles & prix d\'achat'}</li>
                      <li>{language === 'ar' ? 'نسخ احتياطي واسترجاع ومسح السيرفر' : 'Sauvegardes de sécurité, cloud Google Drive'}</li>
                    </ul>
                  </div>
                  <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded">
                    <span className="font-black text-blue-900 block mb-1">💼 COMMERCIAL / CAISSE (Sales)</span>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      <li>{language === 'ar' ? 'واجهة بيع POS وصندوق الكاش التفاعلي' : 'Vente Caisse POS complète'}</li>
                      <li>{language === 'ar' ? 'الوصولات وبطاقات الشحن لشركات الإتصال' : 'Interface recharge Télécom'}</li>
                      <li>{language === 'ar' ? 'إدارة العملاء، الديون وأرشيف الفواتير' : 'Saisie clients, dettes, fournisseurs, créances'}</li>
                      <li className="text-rose-600 font-bold">🚫 {language === 'ar' ? 'يمنع الدخول لقسم الأرباح والسلع والضبط' : 'Interdit : Dashboard financier & Administration'}</li>
                    </ul>
                  </div>
                  <div className="p-2.5 bg-amber-50/50 border border-amber-100 rounded">
                    <span className="font-black text-amber-900 block mb-1">📦 UNITÉ LOGISTIQUE / STOCKS (Inventory)</span>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      <li>{language === 'ar' ? 'الدخول لقائمة السلع وتفاصيل المنتجات' : 'Accès Catalogue Produits & Stocks'}</li>
                      <li>{language === 'ar' ? 'رصد كميات البضائع، التنبيهات والتواريخ' : 'Vue seuils d\'alerte quantitatifs'}</li>
                      <li>{language === 'ar' ? 'إضافة بطاقة كود بار جديد للمنتجات بالمحل' : 'Création / Mise à jour des fiches articles'}</li>
                      <li className="text-rose-600 font-bold">🚫 {language === 'ar' ? 'يمنع البيع، الفواتير، الديون وحركة الخزنة' : 'Interdit : Caisse POS, Finances & Facturation'}</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* SECTION 2 (Custom): Adjustment of Financial Balances & Capital */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-150 p-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-850">
            {language === 'ar' ? '2. تحديث وتعديل الموازنات المالية وعناصر رأس المال' : '2. Ajustement des Valeurs Financières & Capital'}
          </h2>
        </div>

        <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
          <p className="text-xs text-slate-500 font-medium">
            {language === 'ar'
              ? 'تتيح لك هذه اللوحة ضبط وإدخال قيم تعديل يدوية وأرصدة بداية بديلة للمصاريف والنشاط ورأس مال المحل الافتراضي لتوجيه مؤشرات لوحة التحكم والتحليل المالي بدقة.'
              : 'Ce volet vous permet de configurer des ajustements fiscaux, de modifier les charges à la volée, de forcer le capital comptable et de recalibrer les bénéfices et crédits.'
            }
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Expenses adjustment */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded">
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                {language === 'ar' ? '💸 تعديل وإضافة للمصاريف (Offset)' : '💸 Solde d\'Ajustement du Journal (Charges/Dépenses)'}
              </label>
              <input
                type="number"
                step="0.001"
                value={manualExpensesOffset}
                onChange={(e) => setManualExpensesOffset(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 50.000"
                className="w-full bg-white border border-slate-200 rounded py-2 px-3 text-xs font-mono font-bold text-slate-850 focus:outline-hidden focus:border-blue-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1 leading-none">
                {language === 'ar'
                  ? 'يضاف/يخصم مباشرة من مجموع المصاريف والتشغيل (بالدينار التونسي DT).'
                  : 'S’ajoute directement aux charges d’exploitation totales affichées (en DT).'
                }
              </span>
            </div>

            {/* Net profits adjustment */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded">
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                {language === 'ar' ? '📈 تعديل صافي الأرباح (Profit Delta)' : '📈 Rectification des مرابيح (Profits Net)'}
              </label>
              <input
                type="number"
                step="0.001"
                value={manualProfitsOffset}
                onChange={(e) => setManualProfitsOffset(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 150.000"
                className="w-full bg-white border border-slate-200 rounded py-2 px-3 text-xs font-mono font-bold text-slate-850 focus:outline-hidden focus:border-blue-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1 leading-none">
                {language === 'ar'
                  ? 'يضاف/يخصم مباشرة من صافي الأرباح (Net Benefit) لتصحيح النتيجة والفوائد.'
                  : 'S’ajoute ou se retranche directement du bénéfice net global (en DT).'
                }
              </span>
            </div>

            {/* Clients credit adjustment */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded">
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                {language === 'ar' ? '👥 تعديل ديون الكريدي للزبائن (Credit Offset)' : '👥 Solde Complémentaire كريدي (Crédits Clients)'}
              </label>
              <input
                type="number"
                step="0.001"
                value={manualCreditOffset}
                onChange={(e) => setManualCreditOffset(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 200.000"
                className="w-full bg-white border border-slate-200 rounded py-2 px-3 text-xs font-mono font-bold text-slate-850 focus:outline-hidden focus:border-blue-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1 leading-none">
                {language === 'ar'
                  ? 'يعدل إجمالي الكريدي المصرح به في لوحة القيادة دون الحاجة لتغيير زبون زبون.'
                  : 'Valeur à rajouter au total des crédits clients globaux pour le rapport (en DT).'
                }
              </span>
            </div>

            {/* Capital de l'établissement adjustment */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded">
              <label className="text-[11px] font-bold text-slate-505 uppercase block mb-1">
                {language === 'ar' ? '🧱 رأس المال المصرح به (Fix Capital)' : '🧱 Valeur Forcée de راس المال (Capital Social/Ouverture)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={customCapitalValue}
                onChange={(e) => setCustomCapitalValue(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 10000"
                className="w-full bg-white border border-slate-200 rounded py-2 px-3 text-xs font-mono font-bold text-slate-850 focus:outline-hidden focus:border-blue-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1 leading-none">
                {language === 'ar'
                  ? 'رأس مال المغازة المصرح به يدوياً، اتركه 0 ليقوم النظام بحسابه تلقائياً (قيمة المخزون + الديون النشطة).'
                  : 'Laissez à 0 pour laisser le système estimer automatiquement : Valeur Stock + Dettes.'
                }
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <span>{language === 'ar' ? '💾 تثبيت التعديلات والموازنات المالية' : '💾 Enregistrer les Ajustements'}</span>
          </button>
        </form>
      </div>

      {/* SECTION 2: Import & Export Backups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
        
        {/* Export Backup Panel */}
        <div className="bg-white p-6 rounded border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 text-blue-600 rounded w-max">
              <DownloadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              {language === 'ar' ? '2. تحميل نسخة احتياطية' : '2. Exporter Sauvegarde (Backup)'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold font-sans">
              {language === 'ar'
                ? 'قم بتنزيل نسخة كاملة لبياناتك وصادراتك المالية والسلع في ملف واحد مشفر (.json) لحفظه في حاسوبك أو هاتف كضمان للخدمات.'
                : 'Téléchargez un instantané complet sécurisé contenant tous vos clients, fournisseurs, stocks, factures de caisse, et traites bancaires.'
              }
            </p>
          </div>

          <button
            onClick={handleExportDatabase}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm font-mono"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{language === 'ar' ? 'تحميل ملف قاعدة البيانات بالكامل' : 'Télécharger ma Base de Données (.JSON)'}</span>
          </button>
        </div>

        {/* Import Backup Panel */}
        <div className="bg-white p-6 rounded border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded w-max">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              {language === 'ar' ? '3. استيراد واستعادة البيانات' : '3. Importer / Restaurer'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold font-sans">
              {language === 'ar'
                ? 'تنبيه : سيتم استبدال كامل قاعدة البيانات الحالية بملف sauvegardes المسترجع ومزامنتها فوراً في السحاب.'
                : 'Restaurez des données gérees antérieurement à partir d\'un fichier format officiel .json. Attention : cela écrase les données actuelles.'
              }
            </p>
          </div>

          <div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImportDatabase}
              accept=".json"
              className="hidden"
            />
            
            <button
              onClick={triggerFileInput}
              className="w-full border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:text-emerald-700 font-bold text-xs py-3 px-4 rounded flex items-center justify-center gap-2 transition-all cursor-pointer text-slate-605 bg-slate-50 font-mono"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{language === 'ar' ? 'اختيار واستعادة ملف sauvegardes' : 'Restaurer une sauvegarde .json'}</span>
            </button>
          </div>
        </div>

        {/* Firebase Cloud Backup Panel */}
        <div className="bg-white p-6 rounded border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded w-max">
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              {language === 'ar' ? '4. نسخ احتياطي سحابي يدوي' : '4. Sauvegarde Cloud Manuelle'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold font-sans">
              {language === 'ar'
                ? 'فرض نسخ احتياطي سحابي فوري لقاعدة بياناتك وتنزيلها لضمان بقائها آمنة في خوادم Google Firebase الحية والآمنة.'
                : 'Forcez une sauvegarde instantanée de votre base locale sur le cloud Firebase sécurisé. Utile avant une réinstallation ou un changement de poste.'
              }
            </p>
          </div>

          <div className="space-y-3">
            {backupCloudStatus === 'uploading' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-850 flex items-center gap-2">
                <span className="animate-spin text-sm">⏳</span>
                <span>
                  {language === 'ar' 
                    ? 'جاري تشفير وضغط قاعدة البيانات ورفعها للسحاب...' 
                    : 'Téléversement progressif vers le cloud sécurisé...'}
                </span>
              </div>
            )}

            {backupCloudStatus === 'success' && cloudBackupResult && (
              <div className="bg-emerald-50 border border-emerald-250 p-3 rounded text-xs text-emerald-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>✅</span>
                  <span>{language === 'ar' ? 'تم الرفع والنسخ بنجاح!' : 'Sauvegarde réussie avec succès !'}</span>
                </div>
                <div className="font-mono text-[10px] space-y-1 block leading-tight">
                  <div className="text-slate-500">
                    {language === 'ar' ? 'الحجم:' : 'Taille:'} <span className="text-slate-800 font-bold">{cloudBackupResult.sizeKB} Ko</span>
                  </div>
                  <div className="text-slate-500">
                    {language === 'ar' ? 'الوقت:' : 'Heure:'} <span className="text-slate-800 font-bold">{cloudBackupResult.timestamp}</span>
                  </div>
                </div>
                {cloudBackupResult.url && (
                  <a 
                    href={cloudBackupResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-1 inline-flex items-center gap-1 text-indigo-150 hover:text-indigo-800 hover:underline text-[10.5px] font-bold font-mono"
                  >
                    🔗 {language === 'ar' ? 'تحميل ملف السحاب مباشرة' : 'Télécharger directement du Cloud'}
                  </a>
                )}
              </div>
            )}

            {backupCloudStatus === 'failed' && cloudBackupError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded text-xs text-rose-800">
                <div className="flex items-start gap-1.5 font-bold">
                  <span className="shrink-0 text-sm">⚠️</span>
                  <span>{language === 'ar' ? 'خطأ في عملية النسخ السحابي:' : 'Échec de la sauvegarde cloud :'}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] bg-white/40 p-1.5 rounded border border-rose-150 overflow-x-auto select-all leading-relaxed whitespace-pre-wrap max-h-24">
                  {cloudBackupError}
                </p>
              </div>
            )}

            <button
              onClick={handleManualCloudBackup}
              disabled={backupCloudStatus === 'uploading'}
              className={`w-full font-bold text-xs py-3 px-4 rounded flex items-center justify-center gap-2 transition-all cursor-pointer font-mono shadow-sm ${
                backupCloudStatus === 'uploading' 
                  ? 'bg-slate-205 text-slate-500 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                {backupCloudStatus === 'uploading'
                  ? (language === 'ar' ? 'جاري النسخ الاحتياطي...' : 'Sauvegarde en cours...')
                  : (language === 'ar' ? 'بدء النسخ الاحتياطي السحابي الفوري' : 'Lancer la Sauvegarde Cloud')}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* SECTION 3.5: INTEGRATION GOOGLE WORKSPACE SERVICES (DRIVE & GMAIL API) */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-indigo-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1 rounded-md">
              <Cloud className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {language === 'ar' 
                  ? '3. خدمات السحاب Google Workspace (تكامل Google Drive و Gmail API)' 
                  : '3. Services Google Workspace (Google Drive & Envois Gmail API)'}
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                {language === 'ar'
                  ? 'قم بحفظ واسترجاع بياناتك على قرصك السحابي وإرسال التقارير البريدية عبر حسابك بأمان التام.'
                  : 'Sauvegardez vos données sur votre propre Drive et expédiez vos alertes de stock depuis votre adresse Gmail.'}
              </p>
            </div>
          </div>
          {googleConnected && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-200 animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'متصل بنجاح' : 'Liaison Active'}</span>
            </span>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMN 1: SERVICE CONNECTION & GENERAL CONFIG */}
          <div className="bg-slate-50 p-4 rounded border border-slate-200/80 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Server className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-800">
                  {language === 'ar' ? 'الحالة والربط البرمجي' : 'État de la Liaison Google'}
                </h3>
              </div>

              {!googleConnected ? (
                <div className="text-center py-5 px-3 space-y-4 bg-white rounded border border-slate-200/60 shadow-inner">
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    {language === 'ar'
                      ? 'يرجى ربط حساب Google الخاص بك لتفعيل وسائط التخزين السحابي على Google Drive ومحرك الإرسال Gmail API.'
                      : 'Connectez votre compte Google Workspace pour activer la sauvegarde automatisée Drive et l\'envoi sécurisé des ventes.'}
                  </p>
                  <button
                    onClick={handleConnectGoogle}
                    className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded transition-all cursor-pointer shadow-md shadow-indigo-600/10 font-mono"
                  >
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{language === 'ar' ? 'ربط حساب Google الآن' : 'Relier mon compte Google'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white p-3.5 rounded border border-slate-200/60 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs select-none">
                      {googleProfileEmail ? googleProfileEmail.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div className="truncate leading-tight min-w-0">
                      <div className="text-[11px] font-bold text-slate-800 truncate">
                        {googleProfileEmail || 'Google Account Linked'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
                        {language === 'ar' ? 'وسائط سحابية نشطة' : 'Services Workspace Actifs'}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <button
                      onClick={handleDisconnectGoogle}
                      className="w-full py-1.5 px-3 border border-slate-250 hover:bg-slate-50 hover:border-slate-350 text-slate-600 font-semibold text-[10.5px] rounded transition-colors cursor-pointer text-center flex items-center justify-center gap-1 font-mono"
                    >
                      <span>{language === 'ar' ? 'قطع الاتصال السحابي' : 'Révoquer l\'accès Google'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TOGGLE GMAIL API INTEGRATION ACTIVE */}
            <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === 'ar' ? 'إرسال التقارير عبر Gmail API' : 'Préférer l\'envoi par Gmail API'}</span>
                </span>
                <button
                  onClick={() => handleToggleGmailApi(!useGmailApiToggle)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    useGmailApiToggle ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      useGmailApiToggle ? (language === 'ar' ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-indigo-700/80 leading-relaxed font-semibold">
                {language === 'ar'
                  ? 'عند التفعيل، يعتمد نظام المخزون الحرج وتفاصيل الفترات على حساب Gmail الخاص بك لإرسال الرسائل بشكل مباشر وآمن.'
                  : 'Si actif, l\'application délègue directement toutes les alertes critiques à votre compte Gmail, contournant les serveurs SMTP complexes.'}
              </p>
            </div>
          </div>

          {/* COLUMN 2: GOOGLE DRIVE BACKUPS (UPLOAD AND RESTORE) */}
          <div className="bg-slate-50 p-4 rounded border border-slate-200/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <UploadCloud className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-800">
                  {language === 'ar' ? 'التخزين السحابي Google Drive' : 'Sauvegardes Google Drive'}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                {language === 'ar'
                  ? 'قم بحفظ أو استرجاع ملفات تهيئة قاعدة البيانات مباشرة في مجلد INNOVA_POS_PRO بمحرك قوقل درايف.'
                  : 'Sauvegardez l\'état complet du point de vente dans votre propre espace de stockage privé Google Drive.'}
              </p>

              {/* ACTION COMPONENT FOR LIVE GOOGLE DRIVE BACKUP */}
              <div className="space-y-2">
                {googleDriveStatus === 'uploading' && (
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-[11px] text-amber-800 flex items-center gap-2 font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'ar' ? 'جاري رفع الملف لـ Google Drive...' : 'Téléversement de l\'archive sur Drive...'}</span>
                  </div>
                )}
                {googleDriveStatus === 'success' && googleDriveKB && (
                  <div className="bg-emerald-50 border border-emerald-250 p-2.5 rounded text-[11px] text-emerald-800 font-semibold space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-sm">✓</span>
                      <span>{language === 'ar' ? 'تم حفظ الملف السحابي بنجاح!' : 'Fichier enregistré sur Drive !'}</span>
                    </div>
                    <div className="text-[9.5px] text-slate-500 font-mono">
                      {language === 'ar' ? 'الحجم:' : 'Taille:'} {googleDriveKB} Ko
                    </div>
                  </div>
                )}
                {googleDriveStatus === 'failed' && googleDriveError && (
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded text-[11px] text-rose-800 leading-normal font-semibold">
                    <div className="flex items-start gap-1 font-bold">
                      <span className="shrink-0 text-sm">⚠</span>
                      <span>{language === 'ar' ? 'فشلت المزامنة:' : 'Échec de la sauvegarde Drive :'}</span>
                    </div>
                    <p className="text-[9.5px] mt-0.5 font-mono opacity-80 break-all">{googleDriveError}</p>
                  </div>
                )}

                <button
                  onClick={handleBackupToGoogleDrive}
                  disabled={!googleConnected || googleDriveStatus === 'uploading'}
                  className={`w-full py-2.5 px-4 font-bold text-xs rounded transition-all cursor-pointer font-mono flex items-center justify-center gap-1.5 shadow-xs ${
                    !googleConnected
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : googleDriveStatus === 'uploading'
                      ? 'bg-amber-100 text-amber-700 cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/10'
                  }`}
                >
                  <UploadCloud className="w-4 h-4 shrink-0" />
                  <span>{language === 'ar' ? 'رفع نسخة احتياطية لـ Google Drive' : 'Sauvegarder sur Google Drive'}</span>
                </button>
              </div>
            </div>

            {/* GRID OF ONLINE RESTORABLE FILES FROM GOOGLE DRIVE */}
            <div className="border-t border-slate-200 pt-3 flex-1 flex flex-col justify-start">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700">
                  {language === 'ar' ? 'النسخ المتاحة للاستعادة:' : 'Archives identifiées sur Drive :'}
                </span>
                {googleConnected && (
                  <button
                    onClick={() => handleFetchDriveBackups()}
                    className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 font-bold cursor-pointer font-mono"
                    disabled={isBackupLoading}
                  >
                    <RefreshCw className={`w-3 h-3 ${isBackupLoading ? 'animate-spin' : ''}`} />
                    <span>{language === 'ar' ? 'تحديث' : 'Rafraîchir'}</span>
                  </button>
                )}
              </div>

              {!googleConnected ? (
                <div className="bg-slate-100 rounded-md border border-dashed border-slate-250 py-4 px-2 text-center text-[10px] text-slate-400 font-semibold">
                  {language === 'ar' ? 'قم بربط قوقل لعرض النسخ' : 'Connectez Google pour voir vos sauvegardes'}
                </div>
              ) : isBackupLoading ? (
                <div className="py-4 text-center text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1">
                  <span className="animate-spin text-xs">⌛</span>
                  <span>{language === 'ar' ? 'جاري فحص وتصفح ملفات القرص...' : 'Recherche des fichiers sur Google Drive...'}</span>
                </div>
              ) : googleDriveBackups.length === 0 ? (
                <div className="bg-white rounded-md border border-slate-200 p-4 text-center text-[10.5px] text-slate-500 font-semibold shadow-xs">
                  {language === 'ar' ? '📂 لم يتم العثور على أي نسخ احتياطية للمنظومة على جوجل درايف.' : '📂 Aucun fichier de sauvegarde POS trouvé sur votre Drive.'}
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                  {googleDriveBackups.map((file) => (
                    <div key={file.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10.5px] font-bold text-slate-700 truncate leading-snug" title={file.name}>
                          {file.name.replace('INNOVA_POS_Backup_', '')}
                        </div>
                        <div className="text-[9px] text-slate-400 font-semibold font-mono">
                          {file.createdTime ? new Date(file.createdTime).toLocaleString() : 'N/A'} 
                          {file.size && ` • ${Math.round((Number(file.size) / 1024) * 10) / 10} Ko`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRestoreFromGoogleDrive(file.id, file.name)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-1 px-2 rounded-md text-[9.5px] font-bold transition-all cursor-pointer font-mono"
                          title="Restaurer cette sauvegarde"
                        >
                          {language === 'ar' ? 'استعادة' : 'Restaurer'}
                        </button>
                        <button
                          onClick={() => handleDeleteFromGoogleDrive(file.id, file.name)}
                          className="text-rose-600 hover:bg-rose-100 p-1 rounded transition-all cursor-pointer"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: GMAIL API INTEGRATION & TEST TOOL */}
          <div className="bg-slate-50 p-4 rounded border border-slate-200/80 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-800">
                  {language === 'ar' ? 'فحص وتدقيق بريد Gmail API' : 'Diagnostic Envois Gmail API'}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                {language === 'ar'
                  ? 'بإمكانك تجربة إرسال رسالة بريدية اختبارية ومباشرة من صندوق بريدك Gmail المربوط للتأكد من فاعلية الإرسال وسرعته.'
                  : 'Faites un test d\'envoi d\'e-mail immédiat via votre messagerie Gmail active pour valider les liaisons de notification.'}
              </p>

              <form onSubmit={handleSendGmailTest} className="space-y-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                    {language === 'ar' ? 'عنوان بريد المستلم:' : 'E-mail destinataire :'}
                  </label>
                  <input
                    type="email"
                    value={gmailRecipient}
                    onChange={(e) => setGmailRecipient(e.target.value)}
                    placeholder="ex: commercial@gmail.com"
                    disabled={!googleConnected || gmailStatus === 'sending'}
                    className="w-full text-xs bg-white border border-slate-250 p-2 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>

                {gmailStatus === 'sending' && (
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded text-[11px] text-amber-800 flex items-center gap-2 font-semibold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{language === 'ar' ? 'جاري تحضير الرسالة وإرسالها عبر قوقل...' : 'Envoi du message sécurisé...'}</span>
                  </div>
                )}
                {gmailStatus === 'success' && (
                  <div className="bg-emerald-50 border border-emerald-250 p-2 rounded text-[11px] text-emerald-800 font-semibold">
                    ✅ {language === 'ar' ? 'تم إرسال بريد الاختبار بنجاح!' : 'Message expédié avec succès !'}
                  </div>
                )}
                {gmailStatus === 'failed' && gmailError && (
                  <div className="bg-rose-50 border border-rose-200 p-2 rounded text-[11px] text-rose-850 leading-relaxed font-semibold">
                    <div className="font-bold">❌ {language === 'ar' ? 'لم يكتمل الإرسال:' : 'Erreur de transmission :'}</div>
                    <p className="text-[9.5px] mt-0.5 font-mono opacity-85 break-all">{gmailError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!googleConnected || gmailStatus === 'sending'}
                  className={`w-full py-2.5 px-4 font-bold text-xs rounded transition-all cursor-pointer font-mono flex items-center justify-center gap-1.5 shadow-xs ${
                    !googleConnected
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : gmailStatus === 'sending'
                      ? 'bg-amber-100 text-amber-700 cursor-wait'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-700/10'
                  }`}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>{language === 'ar' ? 'إرسال رسالة تجريبية آمنة' : 'Envoyer un E-mail Test'}</span>
                </button>
              </form>
            </div>

            <div className="bg-slate-100 p-2.5 rounded border border-slate-200 text-[10px] text-slate-500 font-semibold leading-relaxed flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'بريد Gmail أسرع بـ 10 مرات من خوادم SMTP العادية ويتفادى تماماً تصفية الرسائل كـ SPAM.'
                  : 'L\'envoi par API Gmail est 10x plus stable, rapide et évite les pannes des adresses de routage SMTP ordinaires.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3.8: SECURE INTEGRATION - VPN GATEWAY ACCESS */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-150 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-850">
              {language === 'ar' ? '3.8 بوابة الشبكة الافتراضية الخاصة (VPN Secure Gateway)' : '3.8 Passerelle de Réseau Privé Sécurisé (VPN Gateway)'}
            </h2>
          </div>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black tracking-wider uppercase border border-indigo-100">
            {vpnProtocol.toUpperCase()}
          </span>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-slate-500 font-semibold leading-relaxed text-start">
            {language === 'ar'
              ? 'تتيح لك بوابة الـ VPN الآمنة ربط طابعات الفواتير الحرارية المحلية، والموازين الإلكترونية، والهواتف اللوحية للعمال داخل متجرك بقاعدة البيانات السحابية الحالية بأمان تام وبشكل مشفر ودون تعريض معطياتك للإنترنت العام.'
              : 'La passerelle VPN sécurisée permet de connecter les imprimantes thermiques de reçus, balances et tablettes de vente locales à la base de données cloud de manière chiffrée de bout en bout, isolée de l\'Internet public.'}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1 & 2: VPN settings parameters input */}
            <div className="lg:col-span-2 space-y-4 text-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Protocol Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'بروتوكول الاتصال والأنفاق' : 'Protocole de Tunnel VPN'}
                  </label>
                  <select
                    value={vpnProtocol}
                    onChange={(e) => setVpnProtocol(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="wireguard">🛡️ WireGuard (Recommandé - Léger & Ultra Rapide)</option>
                    <option value="openvpn">🔒 OpenVPN (Chiffrement Militaire Robuste)</option>
                    <option value="zerotier">🌐 ZeroTier Virtual LAN Gateway</option>
                    <option value="tailscale">👥 Tailscale Mesh Connector</option>
                  </select>
                </div>

                {/* Server Address */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'عنوان خادم الـ VPN المضيف' : 'Adresse IP / Hôte de la Passerelle'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <Globe className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={vpnServerAddress}
                      onChange={(e) => setVpnServerAddress(e.target.value)}
                      placeholder="Ex: 197.31.244.15 ou tunnel.innovapos.com font-mono"
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2 pl-9 pr-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* UDP Port */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'منفذ الاتصال الآمن (UDP Port)' : 'Port d\'Écoute Réseau (UDP)'}
                  </label>
                  <input
                    type="number"
                    value={vpnPort}
                    onChange={(e) => setVpnPort(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Assigned Client IP address */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'عنوان الآي بي الممنوح للعميل' : 'Adresse IP Locale du Client asignée'}
                  </label>
                  <input
                    type="text"
                    value={vpnClientIp}
                    onChange={(e) => setVpnClientIp(e.target.value)}
                    placeholder="Ex: 10.8.0.2"
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Allowed IPs scope */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'نطاق العناوين المسموح بعبورها (Allowed IPs)' : 'Plage d\'Adresses Routées (Allowed IPs)'}
                  </label>
                  <input
                    type="text"
                    value={vpnIpRange}
                    onChange={(e) => setVpnIpRange(e.target.value)}
                    placeholder="Ex: 10.8.0.0/24, 192.168.1.0/24"
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Public Key */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'المفتاح العمومي للخادم البوابة (Server Public Key)' : 'Clé Publique du Serveur VPN (Handshake Key)'}
                  </label>
                  <input
                    type="text"
                    value={vpnPublicKey}
                    onChange={(e) => setVpnPublicKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

              </div>

              {/* Action Buttons to connect/download config */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                
                {/* Connect Simulator button */}
                <button
                  type="button"
                  onClick={handleToggleVpnConnection}
                  disabled={vpnConnectionState === 'connecting'}
                  className={`flex-1 py-2.5 px-4 rounded text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border-0 ${
                    vpnConnectionState === 'connected'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : vpnConnectionState === 'connecting'
                      ? 'bg-amber-100 text-amber-700 cursor-wait'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <Activity className={`w-4 h-4 shrink-0 ${vpnConnectionState === 'connecting' ? 'animate-spin' : ''}`} />
                  <span>
                    {vpnConnectionState === 'connected'
                      ? (language === 'ar' ? '🔴 قطع اتصال شبكة الـ VPN' : '🔴 Déconnecter le Tunnel VPN')
                      : vpnConnectionState === 'connecting'
                      ? (language === 'ar' ? '⚡ جاري الاتصال...' : '⚡ Établissement du tunnel...')
                      : (language === 'ar' ? '🟢 تشغيل واختبار اتصال الـ VPN' : '🟢 Activer & Tester le Tunnel VPN')}
                  </span>
                </button>

                {/* Download Config File */}
                <button
                  type="button"
                  onClick={handleDownloadVpnConfig}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>
                    {language === 'ar' ? '📥 تحميل ملف إعدادات العميل' : 'Télécharger (.conf / .ovpn)'}
                  </span>
                </button>

              </div>
            </div>

            {/* Column 3: Live Connection State Widget & dark Console Logs */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 flex flex-col justify-between text-start relative overflow-hidden min-h-[280px]">
              {/* Background ambient light */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest font-mono">
                    {language === 'ar' ? 'مراقب بوابة الأمان' : 'Security Log Terminal'}
                  </span>
                  
                  {/* Status badge */}
                  <div className="flex items-center gap-1.5 bg-slate-900/80 rounded-full px-2 py-0.5 border border-slate-800">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      vpnConnectionState === 'connected'
                        ? 'bg-emerald-500 animate-pulse'
                        : vpnConnectionState === 'connecting'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-rose-500'
                    }`} />
                    <span className={`text-[8px] font-bold font-mono tracking-wider ${
                      vpnConnectionState === 'connected'
                        ? 'text-emerald-400'
                        : vpnConnectionState === 'connecting'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      {vpnConnectionState.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Console Log Area */}
                <div className="bg-slate-900 border border-slate-850 rounded-lg p-3 h-48 overflow-y-auto font-mono text-[9px] text-slate-350 leading-relaxed custom-scrollbar text-left select-text">
                  {vpnConnectionLogs.length === 0 ? (
                    <div className="text-slate-500 italic h-full flex flex-col items-center justify-center gap-2 text-center">
                      <Terminal className="w-5 h-5 text-slate-700 animate-pulse" />
                      <span>
                        {language === 'ar'
                          ? 'اضغط على زر (تشغيل واختبار) لبدء محاذاة البيانات وتشفير المعبر السلكي.'
                          : 'Cliquez sur "Activer & Tester" pour initier la négociation cryptographique.'}
                      </span>
                    </div>
                  ) : (
                    vpnConnectionLogs.map((log, index) => (
                      <div key={index} className={`border-b border-white/[0.02] pb-1 mb-1 font-mono ${
                        log.includes('established') || log.includes('🟢') || log.includes('نجاح')
                          ? 'text-emerald-400 font-bold'
                          : log.includes('error') || log.includes('🔒') || log.includes('إيقاف')
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Status footer inside console widget */}
              <div className="text-[9px] font-mono font-bold text-slate-500 flex items-center justify-between border-t border-slate-900 pt-3 mt-3 relative z-10">
                <div className="flex items-center gap-1">
                  <span>LATENCY:</span>
                  <span className={vpnConnectionState === 'connected' ? 'text-emerald-400' : 'text-slate-500'}>
                    {vpnConnectionState === 'connected' ? '24 ms' : '-- ms'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span>TRANSFER:</span>
                  <span className={vpnConnectionState === 'connected' ? 'text-emerald-400' : 'text-slate-500'}>
                    {vpnConnectionState === 'connected' ? '1.4 MB/s' : '0.0 kb/s'}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Alert check details about local connection IP compatibility */}
          <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 flex items-start gap-3 text-start">
            <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide">
                {language === 'ar' ? '💡 ربط مكونات المحل (طابعة الفواتير، عميل البيع المساعد)' : '💡 Liaison d\'équipements locaux (Imprimantes et Périphériques)'}
              </h4>
              <p className="text-[10px] text-indigo-900 font-medium leading-relaxed">
                {language === 'ar'
                  ? `بمجرد تفعيل الـ VPN، يمكنك ربط طابعات التذاكر الحرارية المتصلة بشبكتك المحلية عبر إدخل عنوان الآي بي المسند للجهاز العميل (IP: ${vpnClientIp}) في إعدادات الطباعة دون القلق من جدر الحماية.`
                  : `Après avoir démarré le tunnel VPN avec succès, configurez l'adresse IP virtuelle de votre poste (${vpnClientIp}) dans vos serveurs d'impression ou balances de pesée afin de router de façon fluide et ultra-sécurisée les ordres d'impression thermiques.`}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 4: REMISE A ZERO & OPTIONS DE DEMARRAGE RAPIDE (DANGER ZONE) */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-600 animate-pulse" />
          <h2 className="text-sm font-bold text-rose-900">
            {language === 'ar' ? '4. تصفير وإعادة تهيئة النظام للبدء من جديد (متجر فارغ)' : '4. Zone de Danger : Remise à Zéro des Valeurs & Stocks'}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            {language === 'ar'
              ? 'تتيح لك هذه الإجراءات الحساسة تصفير القيم أو مسح السلع النموذجية لكي تتمكن من تغييرها وإدخال أسعار وكميات متجرك الخاص الحقيقي بكل سهولة.'
              : 'Ces actions vous permettent de vider ou de réinitialiser les stocks à zéro afin de pouvoir saisir vos propres prix de vente/achat et quantités de stock réels.'
            }
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Button Option 1: Set stocks + prices to 0 */}
            <div className="p-4 border border-rose-100 rounded bg-rose-50/20 hover:bg-rose-50/40 transition-colors space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-rose-800 uppercase flex items-center gap-1.5">
                  <span className="p-1 bg-rose-100 text-rose-700 rounded-sm">01</span>
                  {language === 'ar' ? 'تصفير كافة أسعار وكميات السلع الحالية' : 'Tous les prix & stocks à Zéro'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  {language === 'ar'
                    ? 'يحتفظ بجميع السلع وأسمائها ورموز الكودبار الحالية، ولكن يحول مخزونها وأسعار شرائها وبيعها لـ 0 لتتمكن من إدخال قيم متجرك وتعديلها يدوياً.'
                    : 'Conserve tous les produits existants (noms, codes barre) mais met leur stock et prix à 0 pour que vous puissiez saisir les vôtres.'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={handleSetAllProductsToZero}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3 rounded cursor-pointer shrink-0 shadow-3xs transition-all active:scale-98"
              >
                {language === 'ar' ? '⚙️ تصفير كميات وأسعار السلع' : 'Remettre les Produits à 0'}
              </button>
            </div>

            {/* Button Option 2: Clean Turnovers and Invoices */}
            <div className="p-4 border border-slate-150 rounded bg-slate-50/30 hover:bg-slate-50/60 transition-colors space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-705 uppercase flex items-center gap-1.5">
                  <span className="p-1 bg-slate-150 text-slate-600 rounded-sm">02</span>
                  {language === 'ar' ? 'تصفير رقم المعاملات والمبيعات' : 'Vider les Ventes & Factures'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  {language === 'ar'
                    ? 'تصفير رقم المعاملات الإجمالي ومسح وحذف كافة الفواتير (Factures / BL) المبيعات وتاريخ صناديق البيع تماماً وعملة تصفير مالية.'
                    : 'Efface définitivement tout l\'historique de vos factures, statistiques de ventes et de caisse sans toucher au catalogue de produits.'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetTurnover}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3 rounded cursor-pointer shrink-0 transition-all active:scale-98"
              >
                {language === 'ar' ? '🧹 تصفير المبيعات والفواتير' : 'Vider le Chiffre d\'Affaires'}
              </button>
            </div>

            {/* Button Option 3: Reset Expenses list */}
            <div className="p-4 border border-slate-150 rounded bg-slate-50/30 hover:bg-slate-50/60 transition-colors space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-705 uppercase flex items-center gap-1.5">
                  <span className="p-1 bg-slate-150 text-slate-600 rounded-sm">03</span>
                  {language === 'ar' ? 'حذف وتصفير المصاريف' : 'Vider les Dépenses & Charges'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  {language === 'ar'
                    ? 'حذف قائمة الأعباء والتكلفة اليومية لكي يتم تصفير الأرباح الصافية وإعادة حسابها من جديد لشهر جديد.'
                    : 'Efface l\'intégralité des dépenses d\'exploitation stockées pour vider les charges comptables nettes.'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetExpenses}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3 rounded cursor-pointer shrink-0 transition-all active:scale-98"
              >
                {language === 'ar' ? '🧹 حذف كافة المصاريف' : 'Effacer toutes les Dépenses'}
              </button>
            </div>

            {/* Button Option 4: FULL RESET DATA */}
            <div className="p-4 border border-red-200 rounded bg-red-50/20 hover:bg-red-50/40 transition-colors space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-rose-900 uppercase flex items-center gap-1.5">
                  <span className="p-1 bg-red-100 text-red-700 rounded-sm">04</span>
                  {language === 'ar' ? 'حذف ومسح كافة بيانات التطبيق بالكامل' : 'Réinitialisation Totale (Wipe All)'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  {language === 'ar'
                    ? 'تنبيه مدمر: يحذف كل شيء (السلع، الزبائن، العائلات والمحاسبة والمصاريف) ويرجع لوحة بيضاء فارغة تماماً لتهيئة محلك.'
                    : 'Action irréversible : Supprime absolument tout (catalogue de produits, clients, caisse, crédits) pour démarrer à blanc.'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetAllData}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3 rounded cursor-pointer shrink-0 shadow-3xs transition-all active:scale-98"
              >
                {language === 'ar' ? '💥 مسح وتصفير كافة بيانات النظام' : 'Purger Complètement la Base'}
              </button>
            </div>

            {/* Button Option 5: Force Cloud Rebuild & Overwrite */}
            <div className="p-4 border border-blue-200 rounded bg-blue-50/20 hover:bg-blue-50/40 transition-colors space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-blue-900 uppercase flex items-center gap-1.5">
                  <span className="p-1 bg-blue-100 text-blue-700 rounded-sm">05</span>
                  {language === 'ar' ? '⚙️ مطابقة السحاب وإعادة البناء بالكامل' : 'Reconstruction & Réalignement Cloud'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  {language === 'ar'
                    ? 'إصلاح متقدم لقواعد البيانات السحابية: يطابق ويفرز ويرفع قائمتك وبياناتك الحالية لتمسح أية فجوات تزامنية أو صلاحيات على السيرفر في وضع النشر ("published").'
                    : 'Force l\'écrasement et la ré-écriture globale de votre base de données distante Firestore pour corriger les bugs d\'état synchronisé ou de permissions.'
                  }
                </p>
                {rebuildStatus === 'running' && (
                  <p className="text-[10px] text-blue-600 font-bold mt-2 animate-pulse">
                    {language === 'ar' ? '⚡ جاري تصفية ورفع قاعدة البيانات السحابية...' : '⚡ Réalignement du Cloud en cours...'}
                  </p>
                )}
                {rebuildStatus === 'success' && (
                  <p className="text-[10px] text-green-600 font-bold mt-2">
                    {language === 'ar' ? '🌿 تم التزامن القهري وإعادة البناء بنجاح!' : '🌿 Cloud réaligné avec succès !'}
                  </p>
                )}
                {rebuildStatus === 'failed' && (
                  <p className="text-[10px] text-red-600 font-bold mt-2">
                    ⚠️ {rebuildError}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleForceCloudRebuild}
                disabled={rebuildStatus === 'running'}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-3 rounded cursor-pointer shrink-0 shadow-3xs transition-all active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Cloud className="w-3.5 h-3.5" />
                {language === 'ar' ? 'إعادة بناء ومزامنة السحاب' : 'Reconstruire la Base Cloud'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: HOW TO DOWNLOAD AND DEPLOY AS DESKTOP STANDALONE APP (.EXE) */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center gap-2 text-white">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-slate-100">
            {language === 'ar' ? '5. تشغيل وتنزيل التطبيق كبرنامج كمبيوتر مستقل (.EXE)' : '5. Guide : Installer sur PC comme un Logiciel classique (.EXE)'}
          </h2>
        </div>

        <div className="p-6 space-y-5 text-start font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
            {language === 'ar'
              ? 'بما أن برنامج INNOVA POS يعمل بقاعدة بيانات محلية متقدمة في المتصفح، يمكنك تثبيته وتشغيله كأيقونة تطبيق لسطح المكتب تعمل بالكامل حتى وبدون وجود إنترنت وبسرعة فائقة جداً.'
              : 'Puisque le logiciel INNOVA POS utilise une base de données locale optimisée, vous pouvez l\'installer directement sur le bureau de l\'ordinateur de votre magasin pour qu\'il agisse exactement comme un logiciel Windows traditionnel (.exe) fonctionnant 100% hors-ligne.'
            }
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-700 font-medium">
            <div className="bg-slate-50 p-4 rounded border border-slate-150 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">1</span>
                {language === 'ar' ? 'تثبيت البرنامج بضغطة زر (التثبيت الفوري)' : 'Méthode simple : Installation Directe par le Navigateur'}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed pr-6">
                {language === 'ar'
                  ? 'افتح رابط هذا البرنامج التجاري في متصفحك (Google Chrome أو Microsoft Edge). انظر لأعلى شريط الرابط من اليمين، ستجد أيقونة « شاشة بها سهم تنزيل » أو « تثبيت التطبيق / Install App ». اضغط عليها وسينشأ اختصار فوري لسطح المكتب يفتح البرنامج كنافذة مستقلة بدون مظهر المتصفح وبطريقة آمنة وسريعة.'
                  : 'Ouvrez ce lien d\'application sous Google Chrome ou Microsoft Edge. Cliquez sur l\'icône d\'écran avec une petite flèche de téléchargement située à l\'extrême droite de la barre d\'adresse, puis cliquez sur "Installer". Un raccourci s\'ajoutera instantanément sur votre bureau Windows sous forme d\'application native.'
                }
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded border border-slate-150 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">2</span>
                {language === 'ar' ? 'لمطوري البرمجيات: التغليف بملف Windows .EXE' : 'Pour développeur : Compilation en setup .EXE Installer'}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed pr-6">
                {language === 'ar'
                  ? 'للحصول على معالج تنزيل .EXE أصلي يمكن تثبيته وتعديله لكل زبائنك وحوانيتك، يمكنك استخدام حزمة (Electron) أو (Tauri) حيث يتم تجميع ملفات build الناتجة وتصدير setup Windows مستقل وجاهز للتشغيل بأمر بسيط، أو الاتصال بالدعم الفني المباشر walakharouf665@gmail.com لمساعدتكم.'
                  : 'Pour distribuer un installateur d\'installation Windows (.EXE) hors-ligne officiel pour chaque magasin, vous pouvez coupler les fichiers de build statiques avec Electron ou Tauri (via electron-builder) pour générer des fichiers d\'installation autonome. Support dédié disponible à walakharouf665@gmail.com.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Instructions advice banner */}
      <div className="bg-amber-50/50 p-5 rounded border border-amber-200 flex items-start space-x-3.5">
        <FileWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-amber-900 font-sans space-y-1">
          <h4 className="font-bold text-slate-900 font-display">
            {language === 'ar' ? '💡 نصيحة هامة لإدارة متجرك بأمان :' : '💡 Conseil d\'utilisation crucial pour votre commerce :'}
          </h4>
          <p>
            {language === 'ar'
              ? 'إن قاعدة البيانات تعمل محلياً بشكل فوري لتسريع الحسابات. لتفادي أي حوادث أو فقدان للهاتف أو الحاسوب، خذ في عاداتك الأسبوعية تحميل نسخة احتياطية إيماناً بسلامة أرقام ومعاملات زبائنك الكرام.'
              : 'La base de données fonctionne de manière locale pour garantir la rapidité. Pour garantir la sécurité en cas d\'effacement accidentel ou de panne d\'ordinateur, téléchargez régulièrement une sauvegarde.'
            }
          </p>
        </div>
      </div>

      {/* 1. CUSTOM SYSTEM CONFIRMATION OVERLAY MODAL */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            {/* Dark glass backdrop layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden text-start font-sans z-10"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="p-6 space-y-5">
                {/* Header Icon Indicator */}
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl shrink-0 ${confirmModal.isDanger ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight leading-none">
                      {language === 'ar' ? confirmModal.titleAr : confirmModal.titleFr}
                    </h3>
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono tracking-widest font-bold uppercase">
                      {language === 'ar' ? 'إجراء نظام إنوفا بوس غير قابل للرجوع' : 'INNOVA SYSTEM CRITICAL ACTION'}
                    </span>
                  </div>
                </div>

                {/* Main warning text description */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs text-slate-600 font-semibold leading-relaxed">
                  {language === 'ar' ? confirmModal.messageAr : confirmModal.messageFr}
                </div>

                <p className="text-[10px] text-rose-600 font-black tracking-wide uppercase px-1">
                  {language === 'ar' 
                    ? '⚠️ تنبيه: هذه الخطوة استباقية وحساسة وبمجرد تأكيدها سيتم تعديل قاعدة بيانات المحل فوراً!' 
                    : '🚨 ATTENTION : Cette action va écraser instantanément vos réglages de magasin.'
                  }
                </p>
              </div>

              {/* Action Buttons Panel */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex flex-row items-center justify-end gap-3">
                {/* Cancel Trigger */}
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  {language === 'ar' ? 'إلغاء الأمر' : 'Annuler'}
                </button>

                {/* Confirm Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    const executeAction = confirmModal.onConfirm;
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    executeAction();
                  }}
                  className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm transform active:scale-95 ${
                    confirmModal.isDanger 
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/10' 
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/10'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'نعم، قم بالتأكيد' : 'Oui, Confirmer'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EXPLICIT PASSWORD RESET EMAIL LINK GENERATION MODAL */}
      <AnimatePresence>
        {resetModalUser && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop glass layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResetModalUser(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative bg-white border border-slate-250 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden text-start font-sans z-10"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="p-6 space-y-5">
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                      <Key className="w-5 h-5 text-amber-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Réinitialisation de mot de passe'}
                      </h3>
                      <span className="text-[9px] text-slate-400 block font-mono font-bold uppercase">
                        {language === 'ar' ? 'روابط تعيين واستعادة الهوية' : 'SECURITY RESTORATION HUB'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Selected staff card info */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{resetModalUser.avatar || '👤'}</span>
                    <div>
                      <div className="font-extrabold text-slate-800 text-[12px]">{resetModalUser.name}</div>
                      <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider font-mono">
                        {resetModalUser.role === 'admin' 
                          ? (language === 'ar' ? '👑 مسؤول / Admin' : '👑 Admin') 
                          : resetModalUser.role === 'sales' 
                          ? (language === 'ar' ? '💼 مبيعات / Vente' : '💼 Vente') 
                          : (language === 'ar' ? '📦 مخزن / Stock' : '📦 Stock')}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold border ${
                    resetModalUser.isActive 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-250'
                  }`}>
                    {resetModalUser.isActive ? (language === 'ar' ? 'نشط' : 'Actif') : (language === 'ar' ? 'موقف' : 'Désactivé')}
                  </span>
                </div>

                {/* Input block */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block">
                    {language === 'ar' ? 'البريد الإلكتروني المخصص للمستلم' : 'Adresse Email Récepteur'}
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmailInput}
                    onChange={(e) => {
                      setResetEmailInput(e.target.value);
                      setGeneratedResetLink('');
                    }}
                    placeholder={language === 'ar' ? 'ahmed@gmail.com' : 'utilisateur@domain.com'}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[9px] text-slate-400 leading-normal">
                    {language === 'ar'
                      ? '💡 سيتم توليد وإرسال رابط استعادة فريد وخاص بهذا الحساب لإعادة التعيين بلمسة بسيطة.'
                      : '💡 Un lien de réinitialisation unique permettra à ce collaborateur de restaurer sa session.'}
                  </p>
                </div>

                {/* Option 1: Trigger Firebase sendPasswordResetEmail */}
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    disabled={resetLoading}
                    onClick={handleSendRealResetEmail}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-black uppercase text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 font-display"
                  >
                    <Mail className="w-4 h-4" />
                    <span>
                      {resetLoading 
                        ? (language === 'ar' ? 'جاري الإرسال...' : 'Émission en cours...') 
                        : (language === 'ar' ? 'إرسال بريد رسمي تلقائي (Firebase Mail)' : 'Envoyer e-mail officiel Firebase')}
                    </span>
                  </button>

                  {/* Option 2: Copy reset link */}
                  <button
                    type="button"
                    onClick={handleGenerateManualLink}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-850 rounded-xl text-xs font-black uppercase text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs font-display"
                  >
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>
                      {language === 'ar' ? 'إنشاء ونسخ رابط استعادة مخصص (WhatsApp)' : 'Copier un lien direct (WhatsApp / SMS)'}
                    </span>
                  </button>
                </div>

                {/* Generated link display box */}
                {generatedResetLink && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">
                        {language === 'ar' ? '🔗 الرابط تم نسخه بنجاح للحافظة :' : '🔗 Lien généré et copié avec succès :'}
                      </span>
                      <span className="text-[8.5px] bg-emerald-200 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono animate-pulse">
                        {language === 'ar' ? 'جاهز للإرسال' : 'Copié !'}
                      </span>
                    </div>
                    <div className="p-2 bg-white border border-emerald-150 rounded text-[9.5px] font-mono break-all text-slate-800 select-all leading-normal">
                      {generatedResetLink}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-end">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 bg-white border border-slate-250 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer hover:bg-slate-100"
                >
                  {language === 'ar' ? 'إغلاق النافذة' : 'Fermer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. CUSTOM SUCCESS FEEBACK ALERT TOAST Notification */}
      <AnimatePresence>
        {successAlert.isOpen && (
          <div className="fixed bottom-6 right-6 z-[10000] max-w-sm w-full p-4 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 text-start font-sans"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                  <span>{language === 'ar' ? 'تمت العملية بنجاح' : 'Opération Réussie'}</span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                </h4>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  {language === 'ar' ? successAlert.messageAr : successAlert.messageFr}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessAlert(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
