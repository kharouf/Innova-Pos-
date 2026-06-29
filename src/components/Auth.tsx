import React, { useState, useMemo } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, setCachedAccessToken } from '../utils/firebase';
import { useLanguage } from '../utils/LanguageContext';
import { safeLocalStorage } from '../utils/storage';
import { getDatabase } from '../utils/db';
import { DatabaseState } from '../types';
import { 
  LogIn, Globe, Shield, Sparkles, Store, Phone, MapPin, BadgeCheck, Settings, Database, Sparkle, HelpCircle, Save, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
const defaultPosLogo = "/innova_pos_logo.jpg";

// Extractor helper to parse both Web app JSON config and pasted raw JavaScript code declarations
const extractFirebaseConfig = (rawText: string) => {
  try {
    const trimmed = rawText.trim();
    if (!trimmed) return null;
    // Attempt standard JSON parsing
    return JSON.parse(trimmed);
  } catch (e) {
    // Regex extractor for single/double quoted JS properties
    const config: Record<string, string> = {};
    const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
    let found = false;
    keys.forEach(key => {
      const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, 'i');
      const match = rawText.match(regex);
      if (match && match[1]) {
        config[key] = match[1].trim();
        found = true;
      }
    });

    if (found && config.projectId && config.apiKey) {
      return config;
    }
  }
  return null;
};

export default function Auth({ 
  onEnterDemo, 
  isLockedState = false, 
  user, 
  db,
  lockError = null,
  clearLockError
}: { 
  onEnterDemo: () => void, 
  isLockedState?: boolean, 
  user?: any, 
  db?: DatabaseState,
  lockError?: string | null,
  clearLockError?: () => void
}) {
  const { language, toggleLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string; isDomainError?: boolean } | null>(null);

  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [configText, setConfigText] = useState(() => {
    const saved = safeLocalStorage.getItem('CUSTOM_FIREBASE_CONFIG');
    if (!saved) return '';
    try {
      return JSON.stringify(JSON.parse(saved), null, 2);
    } catch {
      return saved;
    }
  });
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Dynamically pull store settings from local database (for branding at login)
  const localDb = useMemo(() => {
    try {
      return getDatabase();
    } catch (e) {
      console.warn('Could not read logo settings in login', e);
      return null;
    }
  }, []);

  const currentDb = db || localDb;

  // When logged out, are we back to standard defaults? Yes: use default brand name/logo as a pristine greeting.
  const storeName = isLockedState && currentDb?.settings?.storeName ? currentDb.settings.storeName : 'INNOVA POS PRO';
  const storeLogo = isLockedState && currentDb?.settings?.storeLogo ? currentDb.settings.storeLogo : defaultPosLogo;
  const storePhone = isLockedState && currentDb?.settings?.storePhone ? currentDb.settings.storePhone : '+216 24260711';
  const storeAddress = isLockedState && currentDb?.settings?.storeAddress ? currentDb.settings.storeAddress : 'AVENU HABIB BORGIBA GHANNOUCHE GABES';

  // Handle auto-login block if dispatched from App.tsx onAuthStateChanged
  React.useEffect(() => {
    if (lockError) {
      let errorMsg = language === 'ar'
        ? `⚠️ تم رفض الدخول السحابي التلقائي.`
        : `⚠️ Accès Cloud automatique refusé.`;
      setError({ message: errorMsg });
    }
  }, [lockError, language]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    if (clearLockError) clearLockError();

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
      }
    } catch (err: any) {
      console.warn('Core Auth Error handled:', err);
      const errCode = err?.code || '';
      const isDomainError = errCode === 'auth/unauthorized-domain' || (err?.message && err.message.includes('unauthorized-domain'));
      const isPopupClosed = errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request';
      const isPopupBlocked = errCode === 'auth/popup-blocked';
      
      let msg = language === 'ar'
        ? 'فشل تسجيل الدخول. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.'
        : 'Le login a échoué. Veuillez vérifier votre connexion internet et réessayer.';

      if (isDomainError) {
        msg = language === 'ar'
          ? `النطاق الحالي غير مصرح به في إعدادات Firebase Auth. يرجى إضافة النطاق الحالي للعمل بشكل صحيح.`
          : `Le domaine actif n'est pas autorisé dans votre console Firebase Authentication.`;
      } else if (isPopupClosed) {
        msg = language === 'ar'
          ? 'تم إلغاء عملية الدخول بسبب إغلاق نافذة Google. يرجى إعادة المحاولة من جديد.'
          : 'Opération annulée : la fenêtre de connexion Google a été fermée. Veuillez réessayer.';
      } else if (isPopupBlocked) {
        msg = language === 'ar'
          ? 'تم حظر النافذة البارزة بواسطة المتصفح. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.'
          : 'La fenêtre contextuelle de connexion a été bloquée par votre navigateur. Veuillez autoriser les popups.';
      }

      setError({
        message: msg,
        code: errCode || undefined,
        isDomainError
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    setConfigError(null);
    setConfigSuccess(false);

    if (!configText.trim()) {
      setConfigError(language === 'ar' ? 'الرجاء إدخال نص الإعدادات أولاً.' : 'Veuillez saisir votre configuration.');
      return;
    }

    const parsedConfig = extractFirebaseConfig(configText);
    if (!parsedConfig) {
      setConfigError(
        language === 'ar'
          ? 'صيغة الإعدادات غير صالحة. يرجى لصق كود Firebase Web App (JSON أو كائن JavaScript).'
          : 'Configuration invalide. Veuillez coller le code d\'application Web Firebase ou un JSON valide.'
      );
      return;
    }

    // Verify critical attributes
    if (!parsedConfig.apiKey || !parsedConfig.projectId || !parsedConfig.authDomain) {
      setConfigError(
        language === 'ar'
          ? 'البيانات المدخلة تفتقد إلى حقول أساسية مثل apiKey أو projectId أو authDomain.'
          : 'Champs critiques manquants (apiKey, projectId ou authDomain).'
      );
      return;
    }

    safeLocalStorage.setItem('CUSTOM_FIREBASE_CONFIG', JSON.stringify(parsedConfig));
    setConfigSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleResetConfig = () => {
    safeLocalStorage.removeItem('CUSTOM_FIREBASE_CONFIG');
    setConfigSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Generate initials for fallback logo
  const initials = useMemo(() => {
    if (!storeName) return 'GP';
    return storeName
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [storeName]);

  return (
    <div 
      className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 md:p-8 relative overflow-hidden font-sans select-none text-slate-100"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Visual background grid and fine light beams */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-slate-950 to-slate-950" />
      <div className="absolute inset-y-0 right-1/4 w-[1px] bg-gradient-to-b from-transparent via-blue-500/10 to-transparent blur-xs" />
      <div className="absolute inset-y-0 left-1/4 w-[1px] bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent blur-xs" />
      
      {/* Glowing light source behind the card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-gradient-to-tr from-blue-600/10 to-emerald-500/10 rounded-full blur-[110px] pointer-events-none" />

      {/* TOP BAR / LANGUAGE TOGGLE */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto z-10 relative">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-950/80 border border-slate-850 rounded-lg overflow-hidden w-9 h-9 flex items-center justify-center shrink-0">
            <img src={defaultPosLogo} className="w-full h-full object-contain" alt="Innova POS Pro" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-[0.1em] text-slate-300 font-mono uppercase">
              {isLockedState 
                ? (language === 'ar' ? '🔐 جلسة مـغــلــقــة - نظام الأمان' : '🔐 SESSION VERROUILLÉE')
                : (language === 'ar' ? 'بوابة تسجيل الدخول الذكية للبيانات' : 'SECURE DATABASE GATEWAY')}
            </h1>
            <span className="text-[10px] text-blue-400 font-bold block mt-0.5 tracking-wider font-mono">
              {isLockedState
                ? (language === 'ar' ? 'قم بإلغاء القفل للمتابعة' : 'DÉVERROUILLAGE REQUIS')
                : 'v1.5.0 • INNOVA POS GLOBAL'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Custom Firebase Setup Trigger */}
          {!isLockedState && (
            <button
              onClick={() => setShowFirebaseModal(true)}
              title={language === 'ar' ? 'تهيئة قاعدة بيانات سحابية مخصصة' : 'Configurer votre Cloud Firebase'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-md shadow-black/20 ${
                safeLocalStorage.getItem('CUSTOM_FIREBASE_CONFIG')
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80 hover:text-white'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className={`w-3.5 h-3.5 ${safeLocalStorage.getItem('CUSTOM_FIREBASE_CONFIG') ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">
                {safeLocalStorage.getItem('CUSTOM_FIREBASE_CONFIG')
                  ? (language === 'ar' ? 'سحابة نشطة' : 'Cloud custom active')
                  : (language === 'ar' ? 'سحابتي الخاصة' : 'Firebase custom')}
              </span>
            </button>
          )}

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-md shadow-black/20"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'ar' ? 'Français' : 'العربية'}</span>
          </button>
        </div>
      </header>

      {/* CENTER GLASS CARD BRANDING */}
      <main className="flex-1 flex flex-col items-center justify-center my-6 z-10 w-full max-w-xl mx-auto relative px-2">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl px-6 py-8 md:p-9 shadow-2xl w-full max-w-md space-y-6 flex flex-col justify-between relative overflow-hidden">
          
          {/* Subtle line indicator top */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400" />

          {/* BRANDING: LOGO IMAGE WITH COMPANY NAME */}
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center rounded-2xl overflow-hidden bg-slate-950/80 border-2 border-slate-800 shadow-xl group transition-all duration-300 hover:border-blue-500/50">
              {storeLogo ? (
                (typeof storeLogo === 'string' && (storeLogo.includes('/') || storeLogo.startsWith('data:image') || storeLogo.length > 15)) ? (
                  <img 
                    src={storeLogo} 
                    alt={storeName} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-5xl select-none group-hover:scale-110 transition-transform duration-300">{storeLogo}</span>
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-emerald-500 flex flex-col items-center justify-center text-white font-mono font-black text-2xl tracking-tight shadow-inner">
                  <span>{initials}</span>
                </div>
              )}

              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-slate-900 shadow-sm">
                <BadgeCheck className="w-3.5 h-3.5 fill-emerald-500 text-slate-900" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-blue-400 font-extrabold tracking-widest uppercase font-mono block animate-pulse">
                {isLockedState
                  ? (language === 'ar' ? '⚠️ الجلسة محمية بقفل نشط' : '⚠️ VERROUILLAGE SÉCURISÉ')
                  : (language === 'ar' ? 'بوابة النظام السحابية التجريبية والمزامنة' : 'ACCÈS DE SESSSION & SYNCHRONISATION')}
              </span>
              <h2 className="text-lg md:text-xl font-black text-white tracking-tight leading-snug font-sans max-w-xs mx-auto text-ellipsis overflow-hidden">
                {storeName}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-2 text-[10.5px] text-slate-400 font-medium">
                {storePhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{storePhone}</span>
                  </span>
                )}
                {storePhone && storeAddress && <span className="text-slate-650">•</span>}
                {storeAddress && (
                  <span className="flex items-center gap-1 max-w-[180px] truncate" title={storeAddress}>
                    <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>{storeAddress}</span>
                  </span>
                )}
              </div>

              {isLockedState && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-850/60 mt-2">
                  <img src={defaultPosLogo} className="h-[18px] w-auto object-contain" alt="Innova POS Pro Logo" referrerPolicy="no-referrer" />
                  <span className="text-[9px] font-black tracking-widest text-slate-400 font-mono">POWERED BY INNOVA POS PRO</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-950/80 border border-rose-500/30 text-rose-200 rounded-xl text-xs space-y-3.5 text-start font-sans shadow-lg shadow-rose-950/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>
              
              <div className="flex items-center gap-2 font-black text-rose-300 border-b border-rose-900/30 pb-2">
                <span className="text-sm">❌</span>
                <span>
                  {language === 'ar' ? 'فشل تسجيل الدخول' : 'Échec de connexion'}
                </span>
                {error.code && (
                  <span className="text-[9px] font-mono bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded ml-auto uppercase border border-rose-800/40 font-bold">
                    {error.code}
                  </span>
                )}
              </div>

              <p className="font-semibold leading-relaxed bg-rose-950/30 p-2 rounded border border-rose-900/20 text-[11px]">
                {error.message}
              </p>

              {error.isDomainError && (
                <div className="text-[11px] text-slate-350 space-y-2.5">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-amber-200 flex items-start gap-2">
                    <span className="text-xs">⚠️</span>
                    <span className="font-semibold text-[10.5px] leading-relaxed">
                      {language === 'ar' 
                        ? 'تنبيه: إذا قمت بإضافة النطاق بالفعل وما زال لا يعمل، تحقق من النقاط التالية:' 
                        : 'Si vous avez déjà ajouté le domaine et que cela ne marche toujours pas, vérifiez ces points critiques :'}
                    </span>
                  </div>

                  <ul className="space-y-2 rounded-xl bg-slate-950/90 p-3.5 border border-slate-850 font-sans leading-relaxed text-slate-300 text-[10.5px] list-disc list-inside">
                    {language === 'ar' ? (
                      <>
                        <li>
                          <span className="font-black text-white">اسم المشروع المحدّد :</span> يجب إضافة النطاق داخل المشروع ذو المعرّف <strong className="text-emerald-400 font-mono">{auth.app.options.projectId || 'innovapos'}</strong> حصراً في لوحة Firebase.
                        </li>
                        <li>
                          <span className="font-black text-white">الصيغة الدقيقة للمجال :</span> أدخل النطاق المفتوح حالياً بالضبط كالتالي <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-400 text-xs font-bold select-all">{typeof window !== 'undefined' ? window.location.hostname : 'innova-pos.vercel.app'}</code> (بدون <code className="text-slate-400">https://</code> وبدون أي شرطة مائلة <code className="text-slate-400">/</code>).
                        </li>
                        {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') && (
                          <li>
                            <span className="font-black text-white">إضافة نطاق الـ WWW :</span> إذا كنت تتصفح من خلال الرابط المزود بـ www، فيجب إضافة نطاق إضافي آخر وهو: <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-400 text-xs font-bold select-all">www.{window.location.hostname}</code>
                          </li>
                        )}
                        <li>
                          <span className="font-black text-white">تأخر انتشار التحديث :</span> يستغرق تحديث Firebase المعتمد من <strong className="text-amber-400">2 إلى 10 دقائق</strong> للانتشار الفعلي. يرجى تجربة فتح المتصفح بوضع التصفح الخفي (Incognito Mode) أو مسح الذاكرة ممتلئة.
                        </li>
                        <li>
                          <span className="font-black text-white">المكان الصحيح بالإعدادات :</span> يتم تفعيل هذا من منصة <strong className="text-white">Firebase Console</strong> وتحديداً في <strong className="text-white">Authentication &gt; Settings &gt; Authorized domains</strong> وليس فقط في Google Cloud.
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          <strong className="text-white">Identifiant Firebase correct :</strong> Assurez-vous d'ajouter le domaine dans le projet avec l'ID exact <strong className="text-emerald-400 font-mono">{auth.app.options.projectId || 'innovapos'}</strong> sur votre console Firebase.
                        </li>
                        <li>
                          <strong className="text-white">Format d'hôte strict :</strong> Saisissez l'hôte ouvert actuellement sans aucun préfixe ni suffixe, soit uniquement : <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-400 text-xs font-bold select-all">{typeof window !== 'undefined' ? window.location.hostname : 'innova-pos.vercel.app'}</code> (sans <code className="text-slate-400">https://</code> et sans barre oblique <code className="text-slate-400">/</code>).
                        </li>
                        {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') && (
                          <li>
                            <strong className="text-white">Ajouter les sous-domaines (WWW) :</strong> Si vous accédez à votre application via www, vous devez également ajouter une ligne pour : <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-400 text-xs font-bold select-all">www.{window.location.hostname}</code>
                          </li>
                        )}
                        <li>
                          <strong className="text-white">Délai de propagation :</strong> Les mises à jour de domaines autorisés Firebase prennent généralement entre <strong className="text-amber-400">2 et 10 minutes</strong> pour être propagées. Testez en Ouvrant une fenêtre de <strong className="text-white">navigation privée (Incognito)</strong> ou videz le cache.
                        </li>
                        <li>
                          <strong className="text-white">Emplacement exact :</strong> Cela doit être configuré dans votre console <strong className="text-white">Firebase Console</strong> dans l'onglet <strong className="text-white">Authentication &gt; Settings &gt; Authorized domains</strong> (et non uniquement sur Google Cloud Console).
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE CONTENT ZONE - SECURE GOOGLE LOGIN AND OFFLINE ACCESS */}
          <div className="space-y-5">
            {/* Action Button 1: Google Cloud Sync Connection */}
            <div className="space-y-2 text-center">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest font-mono block">
                {language === 'ar' ? '☁️ دخول سحابي لحساب المبيعات المشترك' : '☁️ SYNCHRONISER VOS DONNÉES EN LIGNE'}
              </span>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 hover:text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-inner transform active:scale-98"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-blue-400" />
                    <span>{language === 'ar' ? 'مزامنة سحابية بحساب Google' : 'Connexion Cloud Google'}</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-500 leading-normal font-sans pt-1">
                {language === 'ar'
                  ? 'يربط النظام بالإنترنت لمزامنة المبيعات ومخازن السلع تلقائياً.'
                  : 'Associe votre compte pour charger et sécuriser vos données de vente.'}
              </p>
              <div className="mt-2.5 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9.5px] font-mono text-emerald-300 flex items-center justify-center gap-1.5 select-text">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span>
                  {language === 'ar'
                    ? '👥 دعم كامل للمستخدمين المتعددين: لكل مستخدم حسابه وبياناته السحابية المستقلة تماماً والآمنة.'
                    : '👥 Support Multi-tenant actif : chaque utilisateur accède de façon sécurisée à ses propres bases de données.'}
                </span>
              </div>
            </div>

            {/* Elegant Divider */}
            <div className="relative flex items-center justify-center py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-slate-900 px-3 font-bold text-slate-500 font-mono">
                  {language === 'ar' ? 'أو' : 'OU'}
                </span>
              </div>
            </div>

            {/* Action Button 2: Offline Local Mode Bypass */}
            <div className="space-y-2 text-center">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest font-mono block">
                {language === 'ar' ? '💻 استخدام محلي سريع (عرض تجريبي)' : '💻 UTILISATION DIRECTE EN LOCAL'}
              </span>
              <button
                onClick={onEnterDemo}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-blue-900/20 transform active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{language === 'ar' ? 'دخول محلي (سريع دون إنترنت)' : 'Accéder en local (Hors-ligne / Démo)'}</span>
              </button>
              <p className="text-[10px] text-slate-500 leading-normal font-sans pt-1">
                {language === 'ar'
                  ? 'يفتح النظام فوراً عبر الذاكرة المحلية لجهازك دون الحاجة لحساب.'
                  : 'Ouvre instantanément l\'application via la mémoire locale de votre appareil.'}
              </p>
            </div>
          </div>

          {/* Secure details status footer */}
          <div className="pt-4 border-t border-slate-800/50 flex items-center justify-center gap-2 text-[9.5px] text-slate-500 font-bold tracking-widest uppercase font-mono">
            <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{language === 'ar' ? 'نظام محمي متكامل للعمليات والبيانات' : 'SÉCURITÉ MATRICIELLE ACTIVE'}</span>
          </div>

        </div>
      </main>

      {/* FOOTER COOPERATIVE */}
      <footer className="w-full text-center text-[10px] text-slate-600 font-mono z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 border-t border-slate-900 pt-5">
        <div>
          © 2026 INNOVA SOFTWARE. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'Tous droits réservés.'}
        </div>
        <div className="flex items-center gap-3.5 text-slate-500 flex-wrap justify-center">
          <span className="bg-slate-900 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-slate-400 border border-slate-800">
            {t('stable_version') || 'INNOVA SOLID'}
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <span>{t('tech_support') || 'Support email'} : walakharouf665@gmail.com</span>
        </div>
      </footer>

      {/* ⚙️ CUSTOM FIREBASE CONFIGURATION PORTAL */}
      <AnimatePresence>
        {showFirebaseModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto" style={{ zIndex: 99999 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl space-y-4 text-start font-sans max-h-[88vh] overflow-y-auto no-print"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h3 className="text-base font-black text-white font-display">
                    {language === 'ar' ? 'ربط سحابة Firebase الخاصة بك' : 'Lier votre Firebase Privé'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowFirebaseModal(false);
                    setConfigError(null);
                    setConfigSuccess(false);
                  }}
                  className="p-1 px-2.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* ACTIVE DB STATUS DISPLAY */}
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">
                    {language === 'ar' ? 'مشروع قاعدة البيانات النشط :' : 'Projet Firebase Actif :'}
                  </span>
                  {safeLocalStorage.getItem('CUSTOM_FIREBASE_CONFIG') ? (
                    <span className="font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/30 font-sans flex items-center gap-1 leading-none text-[10px] uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      {language === 'ar' ? 'سحابة خاصة نشطة' : 'Cloud Privé'}
                    </span>
                  ) : (
                    <span className="font-extrabold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/30 font-sans leading-none text-[10px] uppercase">
                      {language === 'ar' ? 'السحابة الافتراضية للتطبيق' : 'Cloud par défaut'}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{language === 'ar' ? 'مُعرف المشروع (ProjectId) :' : 'Identifiant unique (Project ID) :'}</span>
                  <span className="font-mono text-slate-350 bg-slate-900 px-1.5 py-0.5 rounded font-black max-w-[200px] truncate">
                    {auth.app.options.projectId}
                  </span>
                </div>
              </div>

              {/* CONTEXT DIRECTIVE */}
              <div className="bg-blue-950/30 border border-blue-900/20 text-blue-300 rounded-lg p-3 text-[11px] leading-relaxed space-y-1">
                <p className="font-black text-sky-400 uppercase tracking-widest flex items-center gap-1 text-[10px]">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  {language === 'ar' ? 'أين تجد كود الإعدادات؟' : 'OÙ TROUVER CETTE CONFIGURATION ?'}
                </p>
                <p>
                  {language === 'ar' ? (
                    <>
                      اذهب للوحة <strong className="text-white">Firebase Console</strong> لمشروعك الخاص (مثل <span className="text-amber-400">InnovaPos</span>) &gt; <strong className="text-white">Project Settings</strong> &gt; في الأسفل تحت تبويب <strong className="text-white">Your Apps</strong> ستجد كائن <strong className="text-amber-400">Firebase configuration</strong>. قم بنسخه ولصقه كاملاً في الحقل أدناه.
                    </>
                  ) : (
                    <>
                      Allez sur votre <strong className="text-white">Firebase Console</strong> pour votre projet (ex: <span className="text-amber-400">InnovaPos</span>) &gt; <strong className="text-white">Paramètres du projet</strong> &gt; faites défiler vers le bas jusqu'à la section <strong className="text-white">Vos applications</strong> et copiez l'objet de <strong className="text-amber-400">Firebase configuration</strong>.
                    </>
                  )}
                </p>
              </div>

              {/* INPUT AREA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  {language === 'ar' ? 'كائن إعدادات الويب (JSON / JavaScript Object) :' : 'Collez le code de configuration (JSON ou JavaScript Object) :'}
                </label>
                <textarea
                  value={configText}
                  onChange={(e) => setConfigText(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? '{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "...",\n  ...\n}'
                      : '{\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "...",\n  ...\n}'
                  }
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500/50 text-emerald-400 font-mono text-xs leading-relaxed"
                />
              </div>

              {/* ERROR/SUCCESS STATUS */}
              {configError && (
                <p className="p-2.5 bg-rose-950/50 border border-rose-905/30 text-rose-300 rounded-lg text-xs leading-relaxed">
                  ⚠️ {configError}
                </p>
              )}
              {configSuccess && (
                <p className="p-2.5 bg-emerald-950/70 border border-emerald-900/30 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {language === 'ar'
                      ? 'تم حفظ الإعدادات بنجاح! جاري إعادة تحميل الصفحة لتطبيق التغييرات...'
                      : 'Configuration enregistrée avec succès ! Redémarrage en cours...'}
                  </span>
                </p>
              )}

              {/* ACTIONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                {safeLocalStorage.getItem('CUSTOM_FIREBASE_CONFIG') ? (
                  <button
                    type="button"
                    onClick={handleResetConfig}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-900/20 text-rose-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إعادة التعيين للافتراضي' : 'Restaurer défaut'}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFirebaseModal(false);
                      setConfigError(null);
                      setConfigSuccess(false);
                    }}
                    className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={configSuccess}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-black rounded-lg cursor-pointer shadow-md shadow-orange-950/10 transition-all font-sans transform active:scale-98 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'حفظ وتفعيل' : 'Enregistrer & Activer'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
