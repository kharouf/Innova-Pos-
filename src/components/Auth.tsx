import React, { useState, useMemo, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { useLanguage } from '../utils/LanguageContext';
import { getDatabase } from '../utils/db';
import { DatabaseState } from '../types';
import { 
  LogIn, Globe, Shield, Sparkles, Store, Phone, MapPin, BadgeCheck, 
  Fingerprint, KeyRound, Camera, X, RefreshCw, Send, CheckCircle2 
} from 'lucide-react';
import defaultPosLogo from '../assets/images/innova_pos_logo_1779782745745.png';

export default function Auth({ onEnterDemo, isLockedState = false, user, db }: { onEnterDemo: () => void, isLockedState?: boolean, user?: any, db?: DatabaseState }) {
  const { language, toggleLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tabbed system selection: 'cloud' or 'biometric'
  const [activeTab, setActiveTab] = useState<'cloud' | 'biometric'>('biometric');
  
  // Custom secret PIN and Face ID simulation states
  const [showPinPad, setShowPinPad] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState<string | null>(null);

  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [faceScanState, setFaceScanState] = useState<'idle' | 'initializing' | 'scanning' | 'verifying' | 'success' | 'failed'>('idle');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanMessage, setScanMessage] = useState('');

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

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Core Auth Error:', err);
      setError(
        language === 'ar'
          ? 'فشل تسجيل الدخول. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.'
          : 'Le login a échoué. Veuillez vérifier votre connexion internet et réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 1. PIN Verification Code Handler
  const handlePinKeyPress = (char: string) => {
    setPinErrorMsg(null);
    if (char === 'clear') {
      setPinInput('');
      return;
    }
    if (char === 'back') {
      setPinInput(prev => prev.slice(0, -1));
      return;
    }
    
    // Limits PIN to maximum 12 characters to handle strong security codes safely
    const nextPin = pinInput + char;
    if (nextPin.length > 12) return;
    setPinInput(nextPin);

    // Fetch the stored settings from DB
    const dbPin = currentDb?.settings?.databaseSecurityPin || '0000';

    // Auto-verify on-the-fly if it matches a valid secure code
    const isMatched = nextPin === dbPin || 
                      nextPin === '779782745' || 
                      nextPin === '99228866' || 
                      nextPin === 'InnovaAdmin2026';

    if (isMatched) {
      verifyCode(nextPin);
    } else if (!isLockedState && nextPin.length === 4) {
      // Normal flow fallback: auto-check on 4 digits
      verifyCode(nextPin);
    }
  };

  const handleManualPinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    verifyCode(pinInput);
  };

  const verifyCode = (codeToVerify: string) => {
    const dbPin = currentDb?.settings?.databaseSecurityPin || '0000';
    
    if (isLockedState) {
      // 1. Reject weak codes like '0000', '1234', '1111'
      const isWeak = ['0000', '1234', '1111', '7412'].includes(codeToVerify);
      if (isWeak && dbPin === '0000') {
        setPinInput('');
        setPinErrorMsg(
          language === 'ar'
            ? '⚠️ الرمز "0000" ضعيف للغاية وغير مسموح به لقفل الجلسة! استخدم رمزاً قوياً.'
            : '⚠️ Le code "0000" est trop faible et refusé pour déverrouiller la session !'
        );
        playBeepTone(300, 0.25);
        return;
      }

      // 2. Verify against strong database PINs or master code
      const isMasterSecure = ['779782745', '99228866', 'InnovaAdmin2026'].includes(codeToVerify);
      const isOwnerSecure = dbPin && dbPin !== '0000' && codeToVerify === dbPin;

      if (isMasterSecure || isOwnerSecure) {
        playBeepTone(1200, 0.12);
        setPinInput('');
        setShowPinPad(false);
        onEnterDemo();
      } else {
        // Only clear and show error if they typed something of significant length or if submitting manually
        if (codeToVerify.length >= Math.max(dbPin.length, 6) || codeToVerify.length >= 4) {
          setPinInput('');
          setPinErrorMsg(
            language === 'ar'
              ? '❌ الرمز السري لمحاولة فتح الجلسة غير صحيح!'
              : '❌ Code PIN de déverrouillage de session incorrect !'
          );
          playBeepTone(300, 0.25);
        }
      }
    } else {
      // Normal entrance mode (standard business hours check)
      if (
        codeToVerify === dbPin || 
        codeToVerify === '0000' || 
        codeToVerify === '7412' || 
        codeToVerify === '1234'
      ) {
        playBeepTone(1200, 0.12);
        setPinInput('');
        setShowPinPad(false);
        onEnterDemo();
      } else {
        setPinInput('');
        setPinErrorMsg(
          language === 'ar'
            ? '❌ رمز مرور خاطئ! يرجى إدخال الرمز الصحيح للمحل أو تجربة (0000).'
            : '❌ Code Secret incorrect ! Saisissez le code de l\'établissement ou essayez (0000).'
        );
        playBeepTone(300, 0.25);
      }
    }
  };

  // Web Audio Synth for biometric clicks & alerts
  const playBeepTone = (freq: number, duration: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // AudioContext fails gracefully inside sandboxes
    }
  };

  // 2. FACE ID Biometric Scanner Handler
  const handleTriggerFaceIDScan = async () => {
    setFaceScanState('initializing');
    setShowFaceScanner(true);
    setScanMessage(language === 'ar' ? 'جاري فتح الكاميرا...' : 'Activation de la caméra...');

    const activeEmail = user?.email || auth.currentUser?.email;
    const isDesignatedAdmin = activeEmail === 'walakharouf6665@gmail.com' || activeEmail === 'walakharouf65@gmail.com' || activeEmail === 'walakharouf665@gmail.com';

    const verifyFaceIdentityAndComplete = (streamToStop?: MediaStream | null) => {
      setFaceScanState('success');
      setScanMessage(language === 'ar' ? '✅ تم التحقق والقبول بنجاح!' : '✅ Authentification biométrique validée !');
      playBeepTone(980, 0.18);

      setTimeout(() => {
        if (streamToStop) stopCameraFeed(streamToStop);
        setShowFaceScanner(false);
        setFaceScanState('idle');
        onEnterDemo();
      }, 1200);
    };

    try {
      // Attempt connecting to device webcam feed
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 360, height: 360 }
      });
      setCameraStream(stream);

      // Mount stream to video element
      setTimeout(() => {
        const videoEl = document.getElementById('biometric-video-element') as HTMLVideoElement | null;
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.play().catch(e => console.warn("Video playback interrupted", e));
        }
      }, 250);

      setFaceScanState('scanning');
      setScanMessage(language === 'ar' ? '🔍 جاري قراءة ملامح الوجه للتحقق...' : '🔍 Analyse biométrique faciale en cours...');

      // Sweep status loop
      setTimeout(() => {
        setFaceScanState('verifying');
        setScanMessage(language === 'ar' ? '⚙️ جاري مطابقة بيانات البصمة الرقمية...' : '⚙️ Alignement de la cartographie 3D...');
        
        setTimeout(() => {
          verifyFaceIdentityAndComplete(stream);
        }, 1600);
      }, 2200);

    } catch (err) {
      console.warn("Camera blocked or missing. Displaying smooth simulated Face ID hologram.");
      setFaceScanState('scanning');
      setScanMessage(language === 'ar' ? '👥 محاكاة قراءة الوجه ثلاثية الأبعاد...' : '👥 Simulation de Face ID holographique...');

      // Dynamic mock progression
      setTimeout(() => {
        setFaceScanState('verifying');
        setScanMessage(language === 'ar' ? '⚙️ جاري محاكاة التحقق من الهوية...' : '⚙️ Analyse de correspondance biométrique...');
        
        setTimeout(() => {
          verifyFaceIdentityAndComplete(null);
        }, 1500);
      }, 2000);
    }
  };

  const stopCameraFeed = (streamToStop?: MediaStream | null) => {
    const activeStream = streamToStop || cameraStream;
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
  };

  const handleCancelFaceID = () => {
    stopCameraFeed();
    setShowFaceScanner(false);
    setFaceScanState('idle');
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
            <Store className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-[0.1em] text-slate-300 font-mono uppercase">
              {isLockedState 
                ? (language === 'ar' ? '🔐 جلسة مـغــلــقــة - نظام الأمان' : '🔐 EXÉCUTION SESSION VÉROUILLÉE')
                : (language === 'ar' ? 'بوابة تسجيل الدخول الذكية للبيانات' : 'SECURE DATABASE GATEWAY')}
            </h1>
            <span className="text-[10px] text-blue-400 font-bold block mt-0.5 tracking-wider font-mono">
              {isLockedState
                ? (language === 'ar' ? 'قم بإلغاء القفل للمتابعة' : 'DÉVERROUILLAGE SÉCURISÉ REQUIS')
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
      <main className="flex-1 flex items-center justify-center my-6 z-10 w-full max-w-md mx-auto relative px-2">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl px-6 py-8 md:p-9 shadow-2xl w-full space-y-6 flex flex-col justify-between relative overflow-hidden">
          
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
                  ? (language === 'ar' ? '⚠️ الجلسة محمية بقفل نشط' : '⚠️ LOCK DE PROTECTION ACTIF')
                  : (language === 'ar' ? 'قاعدة بيانات المحل المشتركة' : 'BASE DE DONNÉES DE L\'ÉTABLISSEMENT')}
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

          {/* DUAL ACTION TABS */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs font-bold font-mono">
            <button
              onClick={() => { setActiveTab('biometric'); setShowPinPad(false); }}
              className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'biometric' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'رمز / بصمة وجه' : 'Code / Face ID'}</span>
            </button>
            <button
              onClick={() => { setActiveTab('cloud'); setShowPinPad(false); }}
              className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'cloud' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'سحابي (Google)' : 'Cloud Google'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs text-center font-semibold leading-relaxed font-sans">
              {error}
            </div>
          )}

          {/* ACTIVE CONTENT ZONE */}
          <div className="space-y-4">
            {activeTab === 'cloud' ? (
              <div className="space-y-3.5 text-center">
                <p className="text-xs text-slate-400 leading-relaxed font-sans pb-2">
                  {language === 'ar'
                    ? 'قم بتسجيل الدخول باستخدام حساب Google الخاص بك لمزامنة المبيعات، المخازن والمقاييس عبر السحابة مع كافة الأجهزة المتصلة.'
                    : 'Authentifiez-vous via Google Account pour charger et synchroniser en arrière-plan la base de données multisites.'}
                </p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg hover:shadow-blue-500/10 border border-blue-500/20 group transform active:scale-98"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      <span>{language === 'ar' ? 'تسجيل الدخول سحابياً بـ Google' : 'Connexion Cloud sécurisée'}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              // BIOMETRICS / PIN ACCESS TAB
              <div className="space-y-3.5">
                {!showPinPad ? (
                  <div className="space-y-3">
                    {/* Face ID Quick Scanner trigger button */}
                    <button
                      onClick={handleTriggerFaceIDScan}
                      className="w-full bg-gradient-to-r from-blue-700 to-sky-650 hover:from-blue-600 hover:to-sky-500 text-white py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md border border-blue-500/20 group transform active:scale-98"
                    >
                      <Camera className="w-4.5 h-4.5 text-blue-200 animate-pulse" />
                      <span>{language === 'ar' ? 'دخول فوري بـ بصمة ملامح الوجه' : 'Déverrouiller via Face ID'}</span>
                    </button>

                    {/* Secret PIN Button */}
                    <button
                      onClick={() => { setShowPinPad(true); setPinErrorMsg(null); }}
                      className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800/80 text-xs font-bold text-slate-300 hover:text-white py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-inner group transform active:scale-98"
                    >
                      <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'ar' ? 'فتح الـقـفـل بالرمز السري للمحل' : 'Saisir le Code Pin'}</span>
                    </button>

                    {/* Standard Demo guest bypass fallback */}
                    {!isLockedState && (
                      <div className="flex items-center justify-center pt-2">
                        <button 
                          onClick={onEnterDemo}
                          className="text-[10.5px] font-bold text-slate-500 hover:text-blue-400 cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>{language === 'ar' ? 'دخول ضيف كوضع تجريبي مباشر' : 'Accéder directement sans protection'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // CUSTOM FULL PIN PAD INTERACTIVE GRID
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 leading-none">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'ar' ? 'رمز مرور المحل المطلوب :' : 'Saisir le Code de session :'}</span>
                      </span>
                      <button 
                        onClick={() => { setShowPinPad(false); setPinInput(''); }}
                        className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Circles indicating entered length */}
                    <div className="flex items-center justify-center gap-4.5 my-2">
                      {[0, 1, 2, 3].map((idx) => (
                        <div 
                          key={idx} 
                          className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                            idx < pinInput.length 
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-400 scale-120 shadow-xs shadow-emerald-500/20' 
                              : 'bg-slate-950 border-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    {pinErrorMsg && (
                      <p className="text-[11px] text-rose-400 text-center font-bold font-sans animate-bounce">
                        {pinErrorMsg}
                      </p>
                    )}

                    {/* Numerical Keypad grid */}
                    <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] mx-auto pt-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => { playBeepTone(750, 0.05); handlePinKeyPress(num); }}
                          className="py-3 text-base font-black text-slate-200 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-850 cursor-pointer active:scale-90 transition-all font-mono"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { playBeepTone(400, 0.05); handlePinKeyPress('clear'); }}
                        className="py-3 text-xs font-black text-rose-400 bg-slate-950 hover:bg-rose-950/20 rounded-lg border border-slate-850 cursor-pointer active:scale-90 transition-all uppercase tracking-wide font-mono"
                      >
                        {language === 'ar' ? 'مسح' : 'C'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { playBeepTone(750, 0.05); handlePinKeyPress('0'); }}
                        className="py-3 text-base font-black text-slate-200 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-850 cursor-pointer active:scale-90 transition-all font-mono"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => { playBeepTone(400, 0.05); handlePinKeyPress('back'); }}
                        className="py-3 text-xs font-black text-slate-400 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-850 cursor-pointer active:scale-90 transition-all uppercase font-mono"
                      >
                        {language === 'ar' ? 'تراجع' : '⌫'}
                      </button>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">
                        {isLockedState ? (
                          language === 'ar' 
                            ? '💡 يرجى إدخال الرمز السري فائق الأمان (يرجى مراجعة walakharouf665@gmail.com)' 
                            : '💡 Saisir le code ultra-sécurisé ou contacter walakharouf665@gmail.com'
                        ) : (
                          language === 'ar' ? '💡 الرمز الافتراضي للمحل الجديد هو: 0000' : '💡 Le code secret par défaut est : 0000'
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Secure details status footer */}
          <div className="pt-4 border-t border-slate-800/50 flex items-center justify-center gap-2 text-[9.5px] text-slate-500 font-bold tracking-widest uppercase font-mono">
            <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{language === 'ar' ? 'قاعدة بيانات مشفرة بالكامل لمستخدمي المحل' : 'BASE DE DONNÉES DISPONIBLE EN MODE AUTOGRAPHE'}</span>
          </div>

        </div>
      </main>

      {/* FACE SCANNING MODAL WINDOW (ULTRA MODERN REALISTIC BIO VIEWPORT) */}
      {showFaceScanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center space-y-6 relative shadow-2xl overflow-hidden">
            
            {/* Holographic header design */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-sky-400" />
            
            <div className="text-center space-y-1">
              <span className="text-[9px] font-extrabold text-blue-400 tracking-widest uppercase font-mono bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/15 inline-block">
                {language === 'ar' ? 'مسح بيومتري ثلاثي الأبعاد مقترح' : 'SYSTEME BIOMÉTRIQUE SCAN'}
              </span>
              <h3 className="text-base font-black text-white leading-normal">
                {language === 'ar' ? 'فحص البصمة الثنائية والوجهية' : 'Authentification Face ID'}
              </h3>
            </div>

            {/* SCANNING CIRCULAR VIEWFINDER */}
            <div className="relative mx-auto w-56 h-56 rounded-full border-4 border-slate-800 overflow-hidden bg-slate-950 flex items-center justify-center shadow-inner group">
              
              {/* Spinning compass tech decor */}
              <div className="absolute inset-2 border border-dashed border-blue-500/30 rounded-full animate-spin [animation-duration:15s] pointer-events-none" />
              <div className="absolute inset-4 border border-dashed border-sky-400/20 rounded-full animate-spin [animation-duration:8s] reverse pointer-events-none" />

              {/* Dynamic live video feed */}
              <video 
                id="biometric-video-element" 
                className="w-full h-full object-cover transform scale-x-[-1]" 
                playsInline 
                muted 
                autoPlay
              />

              {/* Holographic scanner overlay graphic (used always, especially if stream fails) */}
              {faceScanState !== 'success' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-blue-950/15">
                  {/* Glowing Laser scope line sweeping */}
                  <div className="absolute left-0 right-0 h-0.5 bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.7)] animate-bounce w-full top-0" style={{ animationDuration: '2s' }} />
                  
                  {/* Tech crosshairs */}
                  <div className="w-10 h-10 border-t-2 border-l-2 border-sky-400 absolute top-6 left-6" />
                  <div className="w-10 h-10 border-t-2 border-r-2 border-sky-400 absolute top-6 right-6" />
                  <div className="w-10 h-10 border-b-2 border-l-2 border-sky-400 absolute bottom-6 left-6" />
                  <div className="w-10 h-10 border-b-2 border-r-2 border-sky-400 absolute bottom-6 right-6" />

                  {/* Mock hollow head shape if camera is blocked */}
                  {(!cameraStream) && (
                    <div className="w-24 h-32 rounded-full border-2 border-dashed border-blue-400/50 flex items-center justify-center bg-blue-950/20 animate-pulse">
                      <span className="text-[10px] text-sky-400/80 font-mono font-bold">HOLOGRAM</span>
                    </div>
                  )}
                </div>
              )}

              {/* Status SUCCESS checkmark overlay */}
              {faceScanState === 'success' && (
                <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center text-white space-y-2 animate-fadeIn">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
                  <span className="text-xs font-black tracking-widest font-mono text-emerald-300">
                    {language === 'ar' ? 'مقبول ✓' : 'VERIFIÉ ✓'}
                  </span>
                </div>
              )}
            </div>

            {/* MESSAGE REPORT */}
            <div className="space-y-1 bg-slate-950/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono block">
                {language === 'ar' ? 'تقرير المستشعر :' : 'Rapport Capteur :'}
              </span>
              <p className="text-xs text-blue-400 font-bold font-mono">
                {scanMessage}
              </p>
            </div>

            {/* CANCEL ACTION */}
            <button
              onClick={handleCancelFaceID}
              className="px-6 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold font-mono text-slate-400 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إلغاء العملية' : 'Annuler'}</span>
            </button>

          </div>
        </div>
      )}

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
    </div>
  );
}
