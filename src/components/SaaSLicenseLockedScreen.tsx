import React, { useState } from 'react';
import { useLanguage } from '../utils/LanguageContext';
import { UserLicenseData, verifyLicenseKey } from '../utils/licensing';
import { saveUserLicense } from '../utils/firebaseSync';
import { 
  Lock, 
  KeyRound, 
  Mail, 
  HelpCircle, 
  AlertOctagon, 
  Copy, 
  CheckCircle2, 
  Globe, 
  LogOut, 
  ShieldAlert,
  Building2 
} from 'lucide-react';

export default function SaaSLicenseLockedScreen({ 
  license, 
  onUnlockSuccess, 
  onLogout 
}: { 
  license: UserLicenseData; 
  onUnlockSuccess: (updatedLicense: UserLicenseData) => void;
  onLogout: () => void;
}) {
  const { language, toggleLanguage } = useLanguage();
  const [activationKeyInput, setActivationKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isSuspended = license.licenseStatus === 'suspended';
  
  // Clean dates for presentation
  const today = new Date();
  const expiryDate = new Date(license.licenseExpiry);
  const isExpired = today > expiryDate || license.licenseStatus === 'expired';

  const copyUidToClipboard = () => {
    navigator.clipboard.writeText(license.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const inputKey = activationKeyInput.trim();
    if (!inputKey) {
      setErrorMsg(
        language === 'ar' 
          ? 'يرجى إدخال رمز تفعيل صالح أولاً!' 
          : 'Veuillez saisir une clé d\'activation !'
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Locally decrypt/verify the key against the expiry date decoded or custom structure
      // Wait, how do we know the expiry date from a standalone key?
      // A license key generated is in format: GP-[Hash]-[YYYYMMDD]
      // We can grab the date from the key suffix! Let's decode it:
      const parts = inputKey.split('-');
      if (parts.length !== 3 || parts[0] !== 'GP' || parts[2].length !== 8) {
        setErrorMsg(
          language === 'ar' 
            ? 'خطأ: تركيبة رمز التفعيل غير صالحة. يرجى التثبت من الرمز.' 
            : 'Format de clé invalide. Veuillez vérifier le code.'
        );
        setLoading(false);
        return;
      }

      const dateStr = parts[2]; // e.g. "20270524" -> "2027-05-24"
      const parsedExpiry = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
      
      const isValid = verifyLicenseKey(license.uid, parsedExpiry, inputKey);

      if (!isValid) {
        setErrorMsg(
          language === 'ar' 
            ? 'رمز التفعيل غير مطابق للمعرف الخاص بك أو أن صلاحيته قد انتهت.' 
            : 'Clé invalide pour cet identifiant ou date d\'expiration dépassée.'
        );
        setLoading(false);
        return;
      }

      // 2. Save/Write valid status and key to Firestore under /users/{uid}
      const updatedLicense: UserLicenseData = {
        ...license,
        licenseExpiry: parsedExpiry,
        licenseStatus: 'active',
        licenseKey: inputKey,
        remoteAnnouncement: language === 'ar' ? 'تم تنشيط رخصتك بنجاح شكراً لثقتكم!' : 'Licence activée avec succès ! Mercis.'
      };

      await saveUserLicense(license.uid, {
        licenseExpiry: parsedExpiry,
        licenseStatus: 'active',
        licenseKey: inputKey,
        remoteAnnouncement: updatedLicense.remoteAnnouncement
      });

      setSuccessMsg(
        language === 'ar' 
          ? 'تم تفعيل حسابك بنجاح! جاري فتح نظام تسيير المغازة...' 
          : 'Félicitations ! Votre licence est activée. Redirection...'
      );
      
      setTimeout(() => {
        onUnlockSuccess(updatedLicense);
      }, 2000);

    } catch (err) {
      console.error(err);
      setErrorMsg(
        language === 'ar' 
          ? 'حدث خطأ غير متوقع أثناء الاتصال بخادم التراخيص.' 
          : 'Erreur inattendue de connexion au serveur de licence.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 relative overflow-hidden font-sans select-none"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Decorative ambient subtle background glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-sm">
            <Building2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white font-display">
              {language === 'ar' ? 'نظام تسيير المغازة برو' : 'MOUAD GHIDAIYA PRO'}
            </h1>
            <span className="text-[10px] text-rose-400 tracking-wider">
              {language === 'ar' ? 'حماية الملكية الإلكترونية' : 'Contrôle anti-copie & SaaS Protection'}
            </span>
          </div>
        </div>

        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
        >
          <Globe className="w-4 h-4 text-rose-400" />
          <span>{language === 'ar' ? 'Français' : 'العربية'}</span>
        </button>
      </header>

      {/* CENTRAL CARD SYSTEM */}
      <main className="flex-1 flex items-center justify-center my-8 z-10 w-full max-w-lg mx-auto">
        <div className="bg-slate-900/90 border border-slate-800 rounded px-6 py-8 md:p-10 shadow-2xl w-full space-y-6 text-center">
          
          {/* Locked Icon visual representation */}
          <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center text-rose-500 shadow-inner">
            <Lock className="w-8 h-8 animate-wiggle" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-black font-display text-white">
              {isSuspended 
                ? (language === 'ar' ? 'تم تعليق حسابك مؤقتاً 🛑' : 'Accès au magasin suspendu 🛑')
                : (language === 'ar' ? 'انتهت صلاحية ترخيص نظامك ⏳' : 'Votre licence a expiré ⏳')}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
              {isSuspended
                ? (language === 'ar' 
                    ? 'تم حظر دخول هذا المتجر بطلب من الموزع الفني للنظام. الرجاء تسوية الوضعية المعلقة للمواصلة.' 
                    : 'L\'accès de cette boutique est suspendu par l\'intégrateur. Veuillez régler tout impayé.')
                : (language === 'ar' 
                    ? `وصل نظام تسبير المغازة لآجال صلاحياته التجريبية أو السنوية في ${license.licenseExpiry}.` 
                    : `Votre période d'essai ou contrat annuel s'est achevé le ${license.licenseExpiry}.`)}
            </p>
          </div>

          {/* UID Box for Copy/Paste */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded text-start space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
              {language === 'ar' ? 'المعرف الفريد الخاص بمتجرك (UID) :' : 'Identifiant Unique d\'installation (UID) :'}
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-300 font-bold block truncate max-w-[280px] uppercase select-all">
                {license.uid}
              </span>
              <button
                type="button"
                onClick={copyUidToClipboard}
                className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 cursor-pointer transition-all self-center shrink-0"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{language === 'ar' ? 'نسخ' : 'Copié'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-rose-400" />
                    <span>{language === 'ar' ? 'نسخ' : 'Copier'}</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-amber-500 font-bold mt-1 max-w-sm leading-tight text-center sm:text-start" dir="ltr">
              💡 {language === 'ar' ? 'انسخ هذا المعرف وأرسله للمطور kharoufwala24 للحصول على مفتاح التنشيط' : 'Envoyez cet identifiant à kharoufwala24@gmail.com pour activation'}
            </p>
          </div>

          {/* Feedback states */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-xs text-center font-bold flex items-center justify-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-xs text-center font-bold flex items-center justify-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Activation Key Form Input fields */}
          <form onSubmit={handleManualActivate} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 text-start">
                {language === 'ar' ? 'أدخل كود تفعيل الترخيص الجديد (Activation Code) :' : 'Code d\'activation (Clé de Licence) :'}
              </label>
              <div className="relative">
                <KeyRound className="absolute top-3.5 left-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={activationKeyInput}
                  onChange={(e) => setActivationKeyInput(e.target.value)}
                  className="w-full text-xs font-mono font-bold border border-slate-800 p-3 pl-9 rounded bg-slate-950 focus:outline-hidden focus:border-rose-500 transition-colors text-rose-400 placeholder:text-slate-600 uppercase text-center tracking-widest-sm"
                  placeholder="GP-XXXX-YYYY"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white py-3 px-4 rounded font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/10"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تنشيط وإطلاق النظام الفوري 🚀' : 'Activer le système 🚀'}</span>
                </>
              )}
            </button>
          </form>

          {/* Back to signin / demo bypass option */}
          <div className="flex gap-2.5">
            <button
              onClick={onLogout}
              className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white py-2.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'الخروج والتسجيل بحساب آخر' : 'Se déconnecter'}</span>
            </button>
          </div>

        </div>
      </main>

      {/* FOOTER ACCREDITATION CONTACT INFO */}
      <footer className="w-full text-center text-[10px] text-slate-600 font-display z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 border-t border-slate-900 pt-5">
        <div>
          © 2026 INNOVA POS. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'Tous droits réservés.'}
        </div>
        <div className="flex items-center gap-4 text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3 text-slate-500" />
            <span>Mél: kharoufwala24@gmail.com</span>
          </span>
          <span>•</span>
          <span>Support Technique Tunisie</span>
        </div>
      </footer>
    </div>
  );
}
