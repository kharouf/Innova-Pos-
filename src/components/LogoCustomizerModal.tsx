import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Check, Trash2, Sparkles, Image as ImageIcon, Shield, Layers, RefreshCw } from 'lucide-react';
import InnovaLogo, { InnovaLogoStyle } from './InnovaLogo';
import { DatabaseState } from '../types';

interface LogoCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: DatabaseState | null;
  onUpdateDb: (updatedDb: DatabaseState) => void;
  language?: string;
}

export default function LogoCustomizerModal({
  isOpen,
  onClose,
  db,
  onUpdateDb,
  language = 'fr'
}: LogoCustomizerModalProps) {
  const currentLogoStyle = (db?.settings?.innovaLogoStyle as InnovaLogoStyle) || 'shield';
  const currentCustomLogo = db?.settings?.innovaCustomLogo || '';
  const currentBrandTitle = db?.settings?.storeName !== 'Innova POS' && db?.settings?.storeName !== 'INNOVA POS PRO' ? db?.settings?.storeName : '';

  const [selectedStyle, setSelectedStyle] = useState<InnovaLogoStyle>(currentLogoStyle);
  const [customLogoData, setCustomLogoData] = useState<string>(currentCustomLogo);
  const [brandTitleInput, setBrandTitleInput] = useState<string>(currentBrandTitle || '');
  const [activeTab, setActiveTab] = useState<'presets' | 'upload'>('presets');
  const [isSavedToast, setIsSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (under 3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert(language === 'ar' ? 'حجم الصورة كبير جداً، يرجى اختيار ملف أصغر من 3 ميغابايت' : 'Le fichier est trop volumineux (Max 3 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize canvas compression
        const canvas = document.createElement('canvas');
        const MAX_DIM = 240;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', 0.9);
          setCustomLogoData(compressedDataUrl);
          setSelectedStyle('custom');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!db) return;
    const updatedDb: DatabaseState = {
      ...db,
      settings: {
        ...db.settings,
        innovaLogoStyle: selectedStyle,
        innovaCustomLogo: customLogoData,
        // Also update storeLogo if using custom logo
        ...(customLogoData ? { storeLogo: customLogoData } : {})
      }
    };
    onUpdateDb(updatedDb);

    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 900);
  };

  const handleResetToDefault = () => {
    if (!db) return;
    setCustomLogoData('');
    setSelectedStyle('shield');
    const updatedDb: DatabaseState = {
      ...db,
      settings: {
        ...db.settings,
        innovaLogoStyle: 'shield',
        innovaCustomLogo: ''
      }
    };
    onUpdateDb(updatedDb);
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 700);
  };

  const PRESETS: { id: InnovaLogoStyle; nameFr: string; nameAr: string; descFr: string; descAr: string }[] = [
    {
      id: 'shield',
      nameFr: 'Bouclier & Engrenage Émeraude',
      nameAr: 'الدرع وترس الزمرد الاحترافي',
      descFr: 'Le logo emblématique haute précision sans mot ADMIN avec monogramme analytique.',
      descAr: 'الشعار الأيقوني عالي الدقة دون كلمة أدمن مع رسم بياني متكامل.'
    },
    {
      id: 'hexagon',
      nameFr: 'Fintech Hexagone Futuriste',
      nameAr: 'سداسي التكنولوجيا المالية الحديثة',
      descFr: 'Lignes émeraude néon géométriques et circuits connectés pour caisses modernes.',
      descAr: 'خطوط زمردية هندسية ودوائر إلكترونية ذكية لنقاط البيع الحديثة.'
    },
    {
      id: 'orbit',
      nameFr: 'Orbite Dynamique Retail',
      nameAr: 'المدار الديناميكي السريع',
      descFr: 'Deux arcs orbitaux avec étincelle centrale pour commerces rapides et superettes.',
      descAr: 'مداران سريعان مع وميض انطلاقة لمحلات التجزئة والسوبر ماركت.'
    },
    {
      id: 'monogram',
      nameFr: 'Monogramme Minimaliste IP',
      nameAr: 'المونوغرام المختصر الأنيق',
      descFr: 'Typographie épurée haute lisibilité idéale pour les écrans tactiles denses.',
      descAr: 'أيقونة مونوغرام مضغوطة وفائقة الوضوح مناسبة للشاشات المدمجة.'
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl text-start font-sans text-white max-h-[90vh] overflow-y-auto custom-scrollbar relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {language === 'ar' ? 'تغيير وتخصيص شعار INNOVA POS' : 'Changer le Logo INNOVA POS'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'اختر من التصاميم الاحترافية الحديثة أو ارفع شعاراً خاصاً بمحلك'
                  : 'Personnalisez le logo de la barre latérale, de l\'en-tête et du système'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="my-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
            {language === 'ar' ? 'معاينة حية على الواجهة الداكنة' : 'Aperçu en direct (Thème Sombre)'}
          </span>
          <div className="p-4 rounded-xl bg-[#0b1e36] border border-[#122b4d] shadow-lg flex items-center justify-center min-w-[240px]">
            <InnovaLogo
              variant="full"
              size="md"
              textColor="light"
              logoStyle={selectedStyle}
              customLogo={customLogoData}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {language === 'ar' ? 'بدون كلمة ADMIN (نظيف وعصري)' : 'Sans mot ADMIN • 100% vectoriel & net'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'التصاميم الجاهزة (4 موديلات)' : 'Modèles Prédéfinis (4 Styles)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'رفع صورة خاصة' : 'Téléverser un Logo (Image)'}</span>
          </button>
        </div>

        {/* Tab 1: Presets Selection */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {PRESETS.map((preset) => {
              const isSelected = selectedStyle === preset.id && !customLogoData;
              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    setSelectedStyle(preset.id);
                    setCustomLogoData(''); // Clear custom upload when choosing preset
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 relative ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-[#0b1e36] border border-[#122b4d] shrink-0">
                    <InnovaLogo variant="shield" size="xs" logoStyle={preset.id} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white truncate">
                        {language === 'ar' ? preset.nameAr : preset.nameFr}
                      </h4>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                      {language === 'ar' ? preset.descAr : preset.descFr}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Custom Logo Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-4 mb-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileUpload}
              className="hidden"
            />

            {customLogoData ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                    <img
                      src={customLogoData}
                      alt="Custom logo"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {language === 'ar' ? 'صورة الشعار مفعّلة حالياً' : 'Logo personnalisé actif'}
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Check className="w-3 h-3" />
                      {language === 'ar' ? 'جاهز للاستخدام الفوري' : 'Prêt et optimisé pour le système'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition-colors"
                    title={language === 'ar' ? 'استبدال الصورة' : 'Remplacer'}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomLogoData('');
                      setSelectedStyle('shield');
                    }}
                    className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-rose-100 text-xs font-bold cursor-pointer transition-colors"
                    title={language === 'ar' ? 'حذف الشعار' : 'Supprimer'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/50 hover:bg-slate-950/80 cursor-pointer text-center transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center mx-auto mb-3 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-white mb-1">
                  {language === 'ar' ? 'اضغط لاختيار صورة الشعار من جهازك' : 'Cliquez pour sélectionner un fichier image'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {language === 'ar'
                    ? 'يدعم صيغ PNG, JPG, SVG و WebP (يتم ضغطها وتعديل مقاسها تلقائياً)'
                    : 'Formats : PNG, JPG, SVG, WebP. Compression automatique pour vitesse maximale.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'استعادة الافتراضي' : 'Réinitialiser'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSavedToast ? (language === 'ar' ? 'تم الحفظ ✔️' : 'Enregistré ✔️') : (language === 'ar' ? 'تطبيق وحفظ الشعار' : 'Appliquer & Enregistrer')}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
