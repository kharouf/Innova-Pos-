import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../utils/LanguageContext';
import { saveUserLicense } from '../utils/firebaseSync';
import { UserLicenseData } from '../utils/licensing';
import { 
  Store, 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  Lock, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft,
  ArrowRight,
  LogOut
} from 'lucide-react';

interface SaaSOnboardingScreenProps {
  user: any;
  license: UserLicenseData;
  onOnboardingComplete: (updatedLicense: UserLicenseData, selectedSector: 'superette' | 'pharmacie' | 'materiaux' | 'general') => void;
  onLogout: () => void;
}

export default function SaaSOnboardingScreen({ user, license, onOnboardingComplete, onLogout }: SaaSOnboardingScreenProps) {
  const { language } = useLanguage();
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [sector, setSector] = useState<'superette' | 'pharmacie' | 'materiaux' | 'general'>('superette');
  const [ownerPin, setOwnerPin] = useState('0000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !ownerName.trim() || !phone.trim() || !address.trim()) {
      setError(language === 'ar' ? 'يرجى مراجعة وتعبئة جميع الحقول المطلوبة' : 'Veuillez remplir tous les champs requis');
      return;
    }

    if (ownerPin.length !== 4 || isNaN(Number(ownerPin))) {
      setError(language === 'ar' ? 'الرمز السري الخاص بالمدير يجب أن يتكون من 4 أرقام' : 'Le code PIN doit comporter exactement 4 chiffres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedLicense: UserLicenseData = {
        ...license,
        businessName: storeName.trim(),
        location: address.trim(),
        phone: phone.trim(),
        isOnboarded: true,
        // Save the manager pin in adminNotes for record recovery
        adminNotes: `Gérant: ${ownerName.trim()}, Pin: ${ownerPin}`
      };

      // Save locally first to make sure safety fallbacks know we are onboarded
      if (typeof window !== 'undefined') {
        localStorage.setItem(`innova_pos_onboarded_${user.uid}`, 'true');
      }

      // 1. Save license details securely to Firestore (with 2.5s safe timeout fallback)
      try {
        await Promise.race([
          saveUserLicense(user.uid, {
            businessName: storeName.trim(),
            location: address.trim(),
            phone: phone.trim(),
            isOnboarded: true,
            adminNotes: `Gérant: ${ownerName.trim()}, Pin: ${ownerPin}`
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
        ]).catch(err => {
          console.warn("[ONBOARDING SAFETY] Cloud save took too long or failed. Proceeding with local onboarding activation.", err);
        });
      } catch (cloudErr) {
        console.warn("[ONBOARDING SAFETY] Error during cloud save, proceeding anyway", cloudErr);
      }

      // 2. Trigger parent completed callback (updates database on client/remote)
      const licenseWithPin = { ...updatedLicense, ownerPin };
      onOnboardingComplete(licenseWithPin, sector);
    } catch (err) {
      console.error("Onboarding saving error:", err);
      setError(language === 'ar' ? 'فشل إتمام عملية التسجيل، يرجى المحاولة لاحقاً' : 'Erreur de configuration, veuillez réessayer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-white font-sans overflow-y-auto select-none">
      
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06)_0s,transparent_60%)] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative z-10 my-8"
      >
        {/* Banner with logo & greeting */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-800/50 to-transparent border-b border-slate-800/50 text-center relative">
          <div className="mx-auto w-12 h-12 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-4 text-xl">
            👑
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2 leading-tight">
            {language === 'ar' ? 'تجهيز وتفعيل حساب السوبر ماركت الخاص بك' : 'Configuration initiale de votre point de vente'}
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {language === 'ar' 
              ? 'مرحباً بك في عائلة INNOVA POS. يرجى توفير تفاصيل نشاطك لعزل وتجهيز بياناتك فوراً.'
              : 'Bienvenue chez INNOVA POS. Veuillez configurer vos informations de base pour démarrer.'}
          </p>
          
          <button
            onClick={onLogout}
            className="absolute top-4 right-4 p-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-[10px] sm:text-xs font-bold rounded-lg border border-slate-700/50 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تسجيل الخروج' : 'Déconnexion'}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-rose-950/40 border border-rose-800/30 text-rose-300 text-xs font-semibold rounded-xl text-center"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-start">
            
            {/* Store Name input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'ar' ? 'اسم المحل التجاري / الشركة *' : 'Nom de la Boutique *'}</span>
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: سوبرماركت الياسمين' : 'Ex: Superette El Hana'}
                className="w-full text-xs font-semibold border border-slate-800 bg-slate-950/80 p-3 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Owner Manager Name input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'ar' ? 'اسم المدير / صاحب المحل *' : 'Nom du Propriétaire *'}</span>
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: محمد علي' : 'Ex: Mohamed Ben Ali'}
                className="w-full text-xs font-semibold border border-slate-800 bg-slate-950/80 p-3 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Phone number input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'ar' ? 'رقم الهاتف والاتصال *' : 'Numéro de Téléphone *'}</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+216 ..."
                className="w-full text-xs font-semibold border border-slate-800 bg-slate-950/80 p-3 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors text-left"
              />
            </div>

            {/* Address input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'ar' ? 'العنوان والولاية *' : 'Adresse / Gouvernorat *'}</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: شارع الحبيب بورقيبة، قابس' : 'Ex: Rue Habib Bourguiba, Gabès'}
                className="w-full text-xs font-semibold border border-slate-800 bg-slate-950/80 p-3 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

          </div>

          {/* Activity sector selection card grids */}
          <div className="space-y-2.5 text-start">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-455 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'ar' ? 'اختر تخصص المتجر لتجهيز المخزون الأولي المتوافق *' : 'Secteur d’Activité (Générer catalogue initial) *'}</span>
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Superette */}
              <div 
                onClick={() => setSector('superette')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  sector === 'superette' 
                    ? 'border-blue-600 bg-blue-600/10 text-white' 
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xl">🍎</span>
                <div className="text-start">
                  <div className="text-xs font-extrabold">{language === 'ar' ? 'مواد غذائية وبقالة' : 'Épicerie / Supérette'}</div>
                  <div className="text-[9px] text-slate-450 font-bold">{language === 'ar' ? 'كسكسي، حليب، عصائر، مصبرات' : 'Produits alimentaires'}</div>
                </div>
              </div>

              {/* Option 2: Pharmacie */}
              <div 
                onClick={() => setSector('pharmacie')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  sector === 'pharmacie' 
                    ? 'border-blue-600 bg-blue-600/10 text-white' 
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xl">💊</span>
                <div className="text-start">
                  <div className="text-xs font-extrabold">{language === 'ar' ? 'صيدلية وشبه طبية' : 'Pharmacie / Soins'}</div>
                  <div className="text-[9px] text-slate-450 font-bold">{language === 'ar' ? 'أدوية، فيتامينات، مستحضرات طبية' : 'Produits médicaux'}</div>
                </div>
              </div>

              {/* Option 3: Materiaux */}
              <div 
                onClick={() => setSector('materiaux')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  sector === 'materiaux' 
                    ? 'border-blue-600 bg-blue-600/10 text-white' 
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xl">🧱</span>
                <div className="text-start">
                  <div className="text-xs font-extrabold">{language === 'ar' ? 'مواد بناء وحديد' : 'Quincaillerie / Matériaux'}</div>
                  <div className="text-[9px] text-slate-450 font-bold">{language === 'ar' ? 'إسمنت، ياجور، حديد بناء' : 'Matériaux de construction'}</div>
                </div>
              </div>

              {/* Option 4: General retail */}
              <div 
                onClick={() => setSector('general')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  sector === 'general' 
                    ? 'border-blue-600 bg-blue-600/10 text-white' 
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xl">📦</span>
                <div className="text-start">
                  <div className="text-xs font-extrabold">{language === 'ar' ? 'مكتبات وتجارة عامة' : 'Commerce Général'}</div>
                  <div className="text-[9px] text-slate-450 font-bold">{language === 'ar' ? 'إلكترونيات، حقائب، مستلزمات' : 'Articles généraux'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Master PIN settings */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3 text-start">
            <h3 className="text-xs font-black uppercase text-blue-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'رقم السري الخاص بالمدير (Owner PIN)' : 'Code PIN Sécurisé Admin'}</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              {language === 'ar' 
                ? 'الرمز السري الافتراضي هو 0000. ستحتاجه لقفل شاشة الكاشير، إلغاء العمليات المالية أو الولوج إلى الإعدادات الإدارية المتقدمة. يرجى توثيق رمزك الجديد.'
                : 'Le code PIN admin par défaut est 0000. Il protégera votre accès aux paramètres avancés et déblocages caissier.'}
            </p>
            
            <div className="flex items-center gap-3">
              <input
                type="text"
                maxLength={4}
                required
                value={ownerPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 4) setOwnerPin(val);
                }}
                className="text-center text-lg font-black font-mono tracking-widest border border-slate-800 bg-slate-950 p-2 rounded-xl focus:outline-none focus:border-blue-500 w-28 text-white"
                placeholder="0000"
              />
              <span className="text-xs text-slate-500 font-bold">
                {language === 'ar' ? 'أدخل 4 أرقام عددية متتالية' : 'Exactement 4 chiffres requis'}
              </span>
            </div>
          </div>

          {/* Bottom actions submit */}
          <div className="pt-4 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold leading-none select-none">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{language === 'ar' ? 'حساب آمن بنسبة 100٪ بالتشفير السحابي' : 'Sécurité de chiffrement Firestore active'}</span>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <span>{loading ? '...' : (language === 'ar' ? 'إكمال تفعيل حسابي والتشغيل 🚀' : 'Activer l’établissement & Lancer 🚀')}</span>
              {!loading && <ArrowRight className="w-4 h-4 shrink-0" />}
            </button>
          </div>
        </form>

      </motion.div>
    </div>
  );
}
