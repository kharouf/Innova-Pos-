import React, { useState, useMemo } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, setCachedAccessToken } from '../utils/firebase';
import { useLanguage } from '../utils/LanguageContext';
import { getDatabase } from '../utils/db';
import { DatabaseState } from '../types';
import { 
  LogIn, Globe, Shield, Sparkles, Store, Phone, MapPin, BadgeCheck
} from 'lucide-react';
import defaultPosLogo from '../assets/images/innova_pos_logo_1779782745745.png';

export default function Auth({ onEnterDemo, isLockedState = false, user, db }: { onEnterDemo: () => void, isLockedState?: boolean, user?: any, db?: DatabaseState }) {
  const { language, toggleLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string; isDomainError?: boolean } | null>(null);

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

  const storeName = currentDb?.settings?.storeName || 'INNOVA POS PRO';
  const storeLogo = currentDb?.settings?.storeLogo || defaultPosLogo;
  const storePhone = currentDb?.settings?.storePhone || '+216 24260711';
  const storeAddress = currentDb?.settings?.storeAddress || 'AVENU HABIB BORGIBA GHANNOUCHE GABES';

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
      }
    } catch (err: any) {
      console.error('Core Auth Error:', err);
      const errCode = err?.code || '';
      const isDomainError = errCode === 'auth/unauthorized-domain' || (err?.message && err.message.includes('unauthorized-domain'));
      
      let msg = language === 'ar'
        ? 'فشل تسجيل الدخول. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.'
        : 'Le login a échoué. Veuillez vérifier votre connexion internet et réessayer.';

      if (isDomainError) {
        msg = language === 'ar'
          ? `النطاق الحالي غير مصرح به في إعدادات Firebase Auth. يرجى إضافة النطاق الحالي للعمل بشكل صحيح.`
          : `Le domaine actif n'est pas autorisé dans votre console Firebase Authentication.`;
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
          <div className="p-2 bg-gradient-to-tr from-blue-600/20 to-emerald-500/20 text-blue-400 rounded-lg border border-blue-500/15">
            <Store className="w-5 h-5" />
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

        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-md shadow-black/20"
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>{language === 'ar' ? 'Français' : 'العربية'}</span>
        </button>
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
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-950/80 border border-rose-500/30 text-rose-200 rounded-xl text-xs space-y-2.5 text-start font-sans shadow-lg shadow-rose-950/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>
              
              <div className="flex items-center gap-2 font-black text-rose-300">
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
                <div className="mt-2 text-[11px] text-slate-300 space-y-2">
                  <p className="font-black text-amber-400 uppercase tracking-wide text-[9.5px]">
                    {language === 'ar' ? '🛠️ خطوات الحل السريع :' : '🛠️ SOLUTION RAPIDE :'}
                  </p>
                  <ol className="list-decimal list-inside space-y-1 rounded bg-slate-950/85 p-2.5 border border-slate-850 font-sans leading-relaxed text-slate-300">
                    {language === 'ar' ? (
                      <>
                        <li>افتح منصة <strong className="text-white">Firebase Console</strong> لمشروعك.</li>
                        <li>انتقل إلى <strong className="text-white">Authentication</strong> &gt; تبويب <strong className="text-white">Settings</strong>.</li>
                        <li>في <strong className="text-white">Authorized domains</strong>، انقر على "إضافة".</li>
                        <li>أدخل اسم النطاق التالي بدقة: <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-400 text-xs select-all font-bold">{window.location.hostname}</code></li>
                      </>
                    ) : (
                      <>
                        <li>Allez sur votre <strong className="text-white">Firebase Console</strong>.</li>
                        <li>Accédez à <strong className="text-white">Authentication</strong> &gt; onglet <strong className="text-white">Settings</strong>.</li>
                        <li>Dans <strong className="text-white">Authorized domains</strong>, cliquez sur "Ajouter".</li>
                        <li>Saisissez l'hôte suivant : <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-400 text-xs select-all font-bold">{window.location.hostname}</code></li>
                      </>
                    )}
                  </ol>
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
          <span>{t('tech_support') || 'Support email'} : kharoufwala24@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}
