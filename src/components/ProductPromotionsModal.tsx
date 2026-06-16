import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseState, Product } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { showToast } from '../utils/toast';
import { 
  X, 
  Search, 
  Tag, 
  Calendar, 
  Percent, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  Clock,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { getProductVisual } from '../utils/db';

interface ProductPromotionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: DatabaseState;
  onUpdateDb: (updatedDb: DatabaseState) => void;
}

export default function ProductPromotionsModal({ isOpen, onClose, db, onUpdateDb }: ProductPromotionsModalProps) {
  const { language, formatCurrency } = useLanguage();
  
  // State for adding / editing a promotion
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [promoPriceInput, setPromoPriceInput] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize dates defaults
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const formatD = (d: Date) => {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      };

      setStartDate(formatD(today));
      setEndDate(formatD(nextWeek));
    }
  }, [isOpen]);

  // Click outside listener for search autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter products for dropdown search
  const searchedProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const query = productSearch.toLowerCase();
    return db.products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.code.includes(query) || 
      p.category.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to top 5 results for sleek UI
  }, [productSearch, db.products]);

  // All products with any promotion stored (Active, Scheduled, or Expired)
  const promoProducts = useMemo(() => {
    return db.products.filter(p => p.promoPrice !== undefined && p.promoPrice !== null);
  }, [db.products]);

  // Calculate promotion statuses
  const promotionSummary = useMemo(() => {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    
    let active = 0;
    let pending = 0;
    let expired = 0;

    promoProducts.forEach(p => {
      if (!p.promoStartDate || !p.promoEndDate) return;
      if (todayStr >= p.promoStartDate && todayStr <= p.promoEndDate) {
        active++;
      } else if (todayStr < p.promoStartDate) {
        pending++;
      } else if (todayStr > p.promoEndDate) {
        expired++;
      }
    });

    return { active, pending, expired, total: promoProducts.length };
  }, [promoProducts]);

  // Apply visual preset duration shortcuts
  const applyDurationDays = (days: number) => {
    const today = new Date();
    const newEnd = new Date();
    newEnd.setDate(today.getDate() + days);

    const formatD = (d: Date) => {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    setStartDate(formatD(today));
    setEndDate(formatD(newEnd));
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setProductSearch(prod.name);
    setPromoPriceInput(String(prod.sellingPrice * 0.9)); // Default to 10% discount
    setShowDropdown(false);
  };

  const handleCancelForm = () => {
    setSelectedProduct(null);
    setProductSearch('');
    setPromoPriceInput('');
    setEditingPromoId(null);
    
    // Reset dates to defaults
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const formatD = (d: Date) => {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    setStartDate(formatD(today));
    setEndDate(formatD(nextWeek));
  };

  const handleSavePromotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast(
        language === 'ar' ? 'الرجاء اختيار منتج أولاً' : 'Veuillez sélectionner un produit d\'abord',
        'error'
      );
      return;
    }

    const price = parseFloat(promoPriceInput);
    if (isNaN(price) || price <= 0) {
      showToast(
        language === 'ar' ? 'سعر العرض يجب أن يكون أكبر من 0' : 'Le prix promotionnel doit être supérieur à 0',
        'error'
      );
      return;
    }

    if (price >= selectedProduct.sellingPrice) {
      showToast(
        language === 'ar' 
          ? 'تنبيه: سعر الترويج أعلى أو يساوي السعر العادي !' 
          : 'Alerte: Le prix promotionnel est supérieur ou égal au prix de vente normal !',
        'info'
      );
    }

    if (!startDate || !endDate) {
      showToast(
        language === 'ar' ? 'الرجاء تحديد تاريخ البداية والنهاية' : 'Veuillez spécifier la date de début et de fin',
        'error'
      );
      return;
    }

    if (startDate > endDate) {
      showToast(
        language === 'ar' ? 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' : 'La date de début doit précéder la date de fin',
        'error'
      );
      return;
    }

    // Process Update
    const updatedProducts = db.products.map(p => {
      if (p.id === selectedProduct.id) {
        return {
          ...p,
          promoPrice: price,
          promoStartDate: startDate,
          promoEndDate: endDate
        };
      }
      return p;
    });

    onUpdateDb({ ...db, products: updatedProducts });
    showToast(
      language === 'ar' ? 'تم حفظ العرض الترويجي بنجاح' : 'Promotion de produit enregistrée avec succès',
      'success'
    );
    handleCancelForm();
  };

  const handleEditPromotion = (prod: Product) => {
    setSelectedProduct(prod);
    setProductSearch(prod.name);
    setPromoPriceInput(String(prod.promoPrice || prod.sellingPrice));
    setStartDate(prod.promoStartDate || '');
    setEndDate(prod.promoEndDate || '');
    setEditingPromoId(prod.id);
  };

  const handleDeletePromotion = (prodId: string) => {
    const updatedProducts = db.products.map(p => {
      if (p.id === prodId) {
        const copy = { ...p };
        delete copy.promoPrice;
        delete copy.promoStartDate;
        delete copy.promoEndDate;
        return copy;
      }
      return p;
    });

    onUpdateDb({ ...db, products: updatedProducts });
    showToast(
      language === 'ar' ? 'تم حذف العرض بنجاح وسيتم العودة للسعر القديم' : 'Promotion supprimée, retour au prix normal',
      'info'
    );
    if (selectedProduct?.id === prodId) {
      handleCancelForm();
    }
  };

  // Determine actual status text and color
  const getPromoStatusDetails = (prod: Product) => {
    if (!prod.promoStartDate || !prod.promoEndDate) return { label: 'Inconnu', color: 'bg-slate-100 text-slate-700' };
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    if (todayStr >= prod.promoStartDate && todayStr <= prod.promoEndDate) {
      return {
        label: language === 'ar' ? 'نشط حالياً' : 'Actif',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-100'
      };
    } else if (todayStr < prod.promoStartDate) {
      return {
        label: language === 'ar' ? 'في الانتظار' : 'Planifié',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-100'
      };
    } else {
      return {
        label: language === 'ar' ? 'منتهي الصلاحية' : 'Expiré',
        color: 'bg-rose-50 text-rose-600 border-rose-100'
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto" style={{ zIndex: 9999 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-50 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 text-start font-sans"
      >
        {/* Header Modal */}
        <div className="bg-white border-b border-slate-150 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                {language === 'ar' ? 'إدارة العروض الترويجية والتخفيضات' : 'Fiche Promotion Produit (Séparée)'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'ar' 
                  ? 'قم بتعيين أسعار ترويجية محددة بفترات زمنية للمنتجات. سيقوم نظام الكاشير (POS) بتطبيق السعر تلقائياً.'
                  : 'Configurez des prix promotionnels temporaires. La caisse (POS) adoptera automatiquement le prix réduit.'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick summary line */}
        <div className="bg-slate-100/80 px-6 py-2.5 border-b border-slate-150 flex flex-wrap gap-4 text-xs font-semibold text-slate-600 shrink-0">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            <span>{language === 'ar' ? `المجموع: ${promotionSummary.total}` : `Total : ${promotionSummary.total}`}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>{language === 'ar' ? `نشطة حالياً: ${promotionSummary.active}` : `En Cours : ${promotionSummary.active}`}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>{language === 'ar' ? `مجدولة: ${promotionSummary.pending}` : `Planifiées : ${promotionSummary.pending}`}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>{language === 'ar' ? `منتهية: ${promotionSummary.expired}` : `Expirées : ${promotionSummary.expired}`}</span>
          </div>
        </div>

        {/* Modal Body: Two Column Form & Catalog Table */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* Left Side: Create/Edit Promotion Form (Column Span: 5) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>
                {editingPromoId 
                  ? (language === 'ar' ? 'تعديل عرض ترويجي' : 'Modifier la Promotion') 
                  : (language === 'ar' ? 'عرض ترويجي جديد' : 'Créer une Promotion')}
              </span>
            </h3>

            <form onSubmit={handleSavePromotion} className="space-y-4">
              {/* Product Autocomplete Lookup */}
              <div ref={containerRef} className="relative space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">
                  {language === 'ar' ? 'ابحث واختر المنتج المقيد للتطبيق:' : 'Sélectionner le produit à promotioner :'}
                </label>
                
                {selectedProduct ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg">
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="text-lg shrink-0">{getProductVisual(selectedProduct).value}</span>
                      <div className="truncate">
                        <p className="text-xs font-extrabold text-indigo-900 truncate">{selectedProduct.name}</p>
                        <p className="font-mono text-[10px] text-indigo-600 font-bold">{selectedProduct.code}</p>
                      </div>
                    </div>
                    {!editingPromoId && (
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="p-1 hover:bg-slate-200 bg-white/70 rounded-full text-indigo-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 font-bold"
                      placeholder={language === 'ar' ? 'اكتب اسم المنتج أو الباركود...' : 'Entrez le nom de l\'article ou code...'}
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />

                    {/* Autocomplete Droplist Dropdown */}
                    <AnimatePresence>
                      {showDropdown && searchedProducts.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto z-30 divide-y divide-slate-100"
                        >
                          {searchedProducts.map(prod => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleSelectProduct(prod)}
                              className="w-full p-2.5 hover:bg-slate-50 transition-all flex items-center justify-between text-start font-sans"
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <span className="text-base shrink-0">{getProductVisual(prod).value}</span>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-slate-800 truncate">{prod.name}</p>
                                  <p className="font-mono text-[9px] text-slate-500 truncate">{prod.code}</p>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-bold text-slate-905 bg-slate-100 px-1.5 py-0.5 rounded leading-none shrink-0">
                                {formatCurrency(prod.sellingPrice)}
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Normal Price Display if product is chosen */}
              {selectedProduct && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3 border border-slate-150">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Prix Public Normal</span>
                    <span className="font-mono text-xs font-extrabold text-slate-800">
                      {formatCurrency(selectedProduct.sellingPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Prix d'Achat (Marge)</span>
                    <span className="font-mono text-xs font-medium text-slate-550">
                      {formatCurrency(selectedProduct.purchasePrice)}
                    </span>
                  </div>
                </div>
              )}

              {/* Promo Price Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">
                  {language === 'ar' ? 'سعر المقترح للترويج (الجديد):' : 'Nouveau Prix de Promotion :'}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-extrabold text-slate-400">
                    TND
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    className="w-full pl-12 pr-3 py-2 text-xs bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 font-mono font-extrabold"
                    placeholder="0.000"
                    value={promoPriceInput}
                    onChange={(e) => setPromoPriceInput(e.target.value)}
                    required
                  />
                  
                  {/* Dynamic percentage savings indicator */}
                  {selectedProduct && parseFloat(promoPriceInput) > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 font-mono text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      <Percent className="w-3 h-3 shrink-0" />
                      <span>
                        -{(
                          ((selectedProduct.sellingPrice - parseFloat(promoPriceInput)) / selectedProduct.sellingPrice) * 100
                        ).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Start & End Dates configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{language === 'ar' ? 'تاريخ البدء:' : 'Date de Début :'}</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-250 rounded-lg focus:outline-hidden font-bold"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{language === 'ar' ? 'تاريخ الانتهاء:' : 'Date de Fin :'}</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-250 rounded-lg focus:outline-hidden font-bold"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Quick Duration Shortcuts */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  {language === 'ar' ? 'مدة جاهزة للتطبيق السريع:' : 'Régler la durée (Raccourcis) :'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyDurationDays(7)}
                    className="flex-1 py-1 px-2 border border-slate-250 hover:bg-slate-50 text-[10px] font-extrabold text-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    1 {language === 'ar' ? 'أسبوع' : 'Semaine'}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDurationDays(14)}
                    className="flex-1 py-1 px-2 border border-slate-250 hover:bg-slate-50 text-[10px] font-extrabold text-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    2 {language === 'ar' ? 'أسبوعين' : 'Semaines'}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDurationDays(30)}
                    className="flex-1 py-1 px-2 border border-slate-250 hover:bg-slate-50 text-[10px] font-extrabold text-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    1 {language === 'ar' ? 'شهر' : 'Mois'}
                  </button>
                </div>
              </div>

              {/* Buttons: Submit or Cancel */}
              <div className="flex space-x-2 pt-2 gap-2">
                {editingPromoId && (
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="flex-1 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء التعديل' : 'Annuler'}
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={!selectedProduct}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Tag className="w-4 h-4 shrink-0" />
                  <span>
                    {editingPromoId 
                      ? (language === 'ar' ? 'حفظ التعديلات' : 'Enregistrer la Modification') 
                      : (language === 'ar' ? 'تطبيق العرض' : 'Lancer la Promotion')}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Side: Active Promotions Table List (Column Span: 7) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col min-h-[350px]">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 leading-tight flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>
                {language === 'ar' ? 'قائمة المنتجات الترويجية النشطة والجدولة' : 'Moniteur des Promotions en cours'}
              </span>
            </h3>

            {promoProducts.length === 0 ? (
              <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-indigo-50 text-indigo-500 rounded-full mb-3">
                  <Tag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">
                  {language === 'ar' ? 'لا توجد عروض ترويجية نشطة حالياً' : 'Aucune promotion programmée'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  {language === 'ar' 
                    ? 'كل المنتجات معروضة بأسعارها المعتادة. استخدم النموذج لإنشاء أول عرض ترويجي.'
                    : 'Tous les produits appliquent leurs tarifs publics normaux. Remplissez le formulaire de gauche.'}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-450 uppercase text-[10px] font-black tracking-wider text-left bg-slate-50">
                      <th className="p-3 font-semibold">{language === 'ar' ? 'السلعة / الباركود' : 'Produit & Code'}</th>
                      <th className="p-3 text-right font-semibold">{language === 'ar' ? 'السعر العادي' : 'Prix Initial'}</th>
                      <th className="p-3 text-right font-semibold text-indigo-650">{language === 'ar' ? 'سعر العرض' : 'Prix Promo'}</th>
                      <th className="p-3 text-center font-semibold">{language === 'ar' ? 'فترة التخفيض' : 'Période'}</th>
                      <th className="p-3 text-center font-semibold">{language === 'ar' ? 'الحالة' : 'État'}</th>
                      <th className="p-3 text-right font-semibold">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {promoProducts.map(prod => {
                      const status = getPromoStatusDetails(prod);
                      const originalPrice = prod.sellingPrice || 1;
                      const savings = originalPrice - (prod.promoPrice || 0);
                      const discountPercentage = Math.round((savings / originalPrice) * 100);

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Product Info */}
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-base shrink-0">{getProductVisual(prod).value}</span>
                              <div className="max-w-[150px]">
                                <p className="font-extrabold text-slate-800 truncate" title={prod.name}>
                                  {prod.name}
                                </p>
                                <p className="font-mono text-[9px] text-slate-400 font-bold">
                                  {prod.code}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Original Selling Price */}
                          <td className="p-3 text-right font-mono text-slate-500 font-semibold line-through">
                            {formatCurrency(prod.sellingPrice)}
                          </td>

                          {/* Promotional Price */}
                          <td className="p-3 text-right">
                            <div className="font-mono text-indigo-800 font-extrabold">
                              {formatCurrency(prod.promoPrice || 0)}
                            </div>
                            <div className="text-[9px] font-bold text-emerald-600">
                              -{discountPercentage}%
                            </div>
                          </td>

                          {/* Date range */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-500">
                              <span className="font-mono font-semibold bg-slate-100 px-1 rounded">{prod.promoStartDate}</span>
                              <ArrowRight className="w-3 h-3 mx-0.5 text-slate-400" />
                              <span className="font-mono font-semibold bg-indigo-50 text-indigo-700 px-1 rounded">{prod.promoEndDate}</span>
                            </div>
                          </td>

                          {/* Promotion Status Badge */}
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border ${status.color}`}>
                              {status.label}
                            </span>
                          </td>

                          {/* Edit / Cancel Actions */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5 gap-1">
                              <button
                                onClick={() => handleEditPromotion(prod)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                                title={language === 'ar' ? 'تعديل السعر المروج' : 'Modifier les dates ou prix'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePromotion(prod.id)}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title={language === 'ar' ? 'إلغاء التخفيض الترويجي' : 'Annuler la promotion'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      </motion.div>
    </div>
  );
}
