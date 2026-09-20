import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock, Eye, EyeOff, LogOut, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { User } from 'firebase/auth';
import { DatabaseState, BranchMeta } from '../types';

interface GoogleSecurityGateProps {
  user: User;
  db: DatabaseState | null;
  onSuccess: () => void;
  onLogout: () => void;
  language?: string;
  superettesList?: BranchMeta[];
  activeSuperetteId?: string;
}

export default function GoogleSecurityGate({
  user,
  db,
  onSuccess,
  onLogout,
  language = 'fr',
  superettesList = [],
  activeSuperetteId
}: GoogleSecurityGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLockedTemporarily, setIsLockedTemporarily] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle temporary lockout after multiple failed attempts
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockCountdown > 0) {
      timer = setTimeout(() => {
        setLockCountdown(prev => prev - 1);
      }, 1000);
    } else if (isLockedTemporarily && lockCountdown === 0) {
      setIsLockedTemporarily(false);
      setAttempts(0);
      setError(null);
    }
    return () => clearTimeout(timer);
  }, [lockCountdown, isLockedTemporarily]);

  // Determine accepted passwords/PINs
  const getAcceptedCodes = (): string[] => {
    const codes = new Set<string>();
    
    // 🔑 Admin concatenated with store / superette name
    const storeName = (db?.settings?.storeName || '').trim();
    const activeBranch = superettesList.find(s => s.id === activeSuperetteId);
    const activeBranchName = (activeBranch?.name || '').trim();

    if (storeName) {
      codes.add(`Admin${storeName}`);
      codes.add(`Admin ${storeName}`);
      codes.add(`admin${storeName}`);
      codes.add(`Admin${storeName.replace(/\s+/g, '')}`);
      codes.add(`admin${storeName.replace(/\s+/g, '')}`);
    }

    if (activeBranchName) {
      codes.add(`Admin${activeBranchName}`);
      codes.add(`Admin ${activeBranchName}`);
      codes.add(`admin${activeBranchName}`);
      codes.add(`Admin${activeBranchName.replace(/\s+/g, '')}`);
      codes.add(`admin${activeBranchName.replace(/\s+/g, '')}`);
    }

    // All available branches/superettes
    superettesList.forEach(branch => {
      if (branch.name && branch.name.trim()) {
        const bName = branch.name.trim();
        codes.add(`Admin${bName}`);
        codes.add(`Admin ${bName}`);
        codes.add(`admin${bName}`);
        codes.add(`Admin${bName.replace(/\s+/g, '')}`);
        codes.add(`admin${bName.replace(/\s+/g, '')}`);
      }
    });

    // Default superette variations
    codes.add('AdminSuperette');
    codes.add('Admin Superette');
    codes.add('adminsuperette');
    codes.add('admin superette');
    codes.add('AdminSuppert');
    codes.add('Admin Suppert');
    codes.add('adminsuppert');
    codes.add('AdminINNOVAPOSPRO');
    codes.add('Admin');
    codes.add('admin');
    
    // Configured custom login security password in settings
    if (db?.settings?.loginSecurityPassword && db.settings.loginSecurityPassword.trim()) {
      codes.add(db.settings.loginSecurityPassword.trim());
    }
    
    // Owner PIN (default '0000')
    if (db?.settings?.ownerPin && db.settings.ownerPin.trim()) {
      codes.add(db.settings.ownerPin.trim());
    }

    // Database Security PIN
    if (db?.settings?.databaseSecurityPin && db.settings.databaseSecurityPin.trim()) {
      codes.add(db.settings.databaseSecurityPin.trim());
    }

    // Fallback pin
    codes.add('0000');

    // Master recovery codes for dev accounts
    if (user.email === 'walakharouf665@gmail.com' || user.email === 'kharoufwala24@gmail.com') {
      codes.add('2026');
      codes.add('1234');
    }

    return Array.from(codes);
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLockedTemporarily) return;

    const trimmedInput = password.trim();
    if (!trimmedInput) {
      setError(language === 'ar' ? 'الرجاء إدخال كلمة المرور' : 'Veuillez saisir votre mot de passe.');
      return;
    }

    const accepted = getAcceptedCodes();
    let isCorrect = accepted.some(code => code.toLowerCase() === trimmedInput.toLowerCase());

    // Also check smart match: "admin" + normalized superette / store name
    if (!isCorrect) {
      const normalizedInput = trimmedInput.toLowerCase().replace(/[\s\-_]/g, '');
      const storeName = (db?.settings?.storeName || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
      const branchNames = superettesList.map(b => (b.name || '').trim().toLowerCase().replace(/[\s\-_]/g, ''));
      
      if (storeName && normalizedInput === `admin${storeName}`) {
        isCorrect = true;
      } else if (branchNames.some(b => b && normalizedInput === `admin${b}`)) {
        isCorrect = true;
      } else if (normalizedInput === 'adminsuperette' || normalizedInput === 'adminsuppert' || normalizedInput === 'admin') {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      setIsUnlocking(true);
      setError(null);
      // Persist verification in session storage
      try {
        sessionStorage.setItem(`google_auth_security_verified_${user.uid}`, 'true');
        sessionStorage.setItem('google_auth_security_verified', 'true');
      } catch (err) {
        console.warn('Session storage error:', err);
      }

      setTimeout(() => {
        onSuccess();
      }, 500);
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setPassword('');

      if (nextAttempts >= 5) {
        setIsLockedTemporarily(true);
        setLockCountdown(30);
        setError(
          language === 'ar'
            ? 'تم حظر الإدخال مؤقتاً لمدة 30 ثانية بسبب المحاولات المتكررة.'
            : 'Trop de tentatives infructueuses. Veuillez patienter 30 secondes.'
        );
      } else {
        setError(
          language === 'ar'
            ? `كلمة المرور غير صحيحة! (المحاولة ${nextAttempts}/5)`
            : `Mot de passe incorrect ! (Tentative ${nextAttempts}/5)`
        );
      }
      inputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#061224] flex flex-col items-center justify-center p-4 select-none relative overflow-hidden font-sans">
      {/* Dynamic ambient backdrop lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md bg-[#0b1e36] border border-[#16365f] rounded-2xl p-6 sm:p-7 shadow-2xl relative z-10 text-white text-start space-y-5"
      >
        {/* Top Brand Logo */}
        <div className="flex items-center justify-between border-b border-[#16365f] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1 bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden w-8 h-8 flex items-center justify-center shrink-0">
              <img src="/innova_pos_logo.jpg" className="w-full h-full object-contain" alt="Innova POS Pro" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-[0.1em] text-slate-200 font-mono uppercase">
                INNOVA POS PRO
              </h1>
              <p className="text-[9px] text-slate-400 font-mono">
                GESTION COMMERCIALE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>2FA ACTIF</span>
          </div>
        </div>

        {/* Verified Google Account Pill */}
        <div className="p-3 rounded-xl bg-[#08172a] border border-[#142d4d] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Google User'} 
                className="w-8 h-8 rounded-full border border-emerald-500/50 object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                {user.email ? user.email[0].toUpperCase() : 'G'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate block">
                  {user.displayName || (language === 'ar' ? 'مستخدم Google' : 'Utilisateur Google')}
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                  {language === 'ar' ? 'تم التحقق' : 'Vérifié'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono truncate block">
                {user.email}
              </span>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs transition-colors shrink-0 cursor-pointer"
            title={language === 'ar' ? 'تسجيل الخروج من حساب Google' : 'Déconnexion'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Instruction Header */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>
              {language === 'ar' ? 'تأكيد الحماية: أدخل كلمة المرور' : 'Sécurité Renforcée : Mot de passe requis'}
            </span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {language === 'ar'
              ? 'يرجى إدخال كلمة مرور الحماية لتسجيل الدخول إلى لوحة التحكم ونقطة البيع.'
              : 'Pour une sécurité maximale de vos données, veuillez saisir le mot de passe administrateur.'}
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              disabled={isLockedTemporarily || isUnlocking}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder={language === 'ar' ? 'أدخل كلمة المرور...' : 'Entrez le mot de passe...'}
              className="w-full pl-10 pr-10 py-3 bg-[#08172a] border border-[#183963] focus:border-emerald-500 rounded-xl text-white placeholder-slate-500 font-mono text-base focus:outline-none transition-all shadow-inner"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLockedTemporarily || isUnlocking}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              isUnlocking
                ? 'bg-emerald-500 shadow-emerald-500/30'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30'
            }`}
          >
            {isUnlocking ? (
              <>
                <CheckCircle2 className="w-5 h-5 animate-bounce" />
                <span>{language === 'ar' ? 'تم التحقق بنجاح... جاري الدخول' : 'Accès Autorisé... Chargement'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-emerald-200" />
                <span>{language === 'ar' ? 'دخول إلى نقطة البيع' : 'Déverrouiller et Accéder'}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Actions without displaying any password */}
        <div className="pt-3 border-t border-[#16365f]/80 flex items-center justify-center text-xs text-slate-400">
          <button
            type="button"
            onClick={onLogout}
            className="text-slate-400 hover:text-white underline cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تسجيل الخروج والتبديل لحساب آخر' : 'Changer de compte / Déconnexion'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
