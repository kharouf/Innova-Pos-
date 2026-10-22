import React, { useState, useMemo } from 'react';
import { Product, DatabaseState } from '../types';
import { getActiveProductPrice } from '../utils/db';
import { normalizeCategoryName } from '../utils/categories';
import { Search, X, Check, UserPlus } from 'lucide-react';

interface SplitTactilePOSLayoutProps {
  language: string;
  formatCurrency: (amount: number) => string;
  cart: { product: Product; qty: number; customPrice: number }[];
  selectedCartIdx: number;
  setSelectedCartIdx: (idx: number) => void;
  finalTotal: number;
  db: DatabaseState;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleRapidBarcodeSubmit: (e: React.FormEvent) => void;
  handleUpdateQty: (productId: string, newQty: number) => void;
  handleCheckoutClick: () => void;
  isReturnMode: boolean;
  isFullscreen: boolean;
  playScanBeep: (type?: 'success' | 'error') => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setCart: React.Dispatch<React.SetStateAction<{ product: Product; qty: number; customPrice: number }[]>>;
  selectedPartnerId: string;
  setSelectedPartnerId: (id: string) => void;
}

export default function SplitTactilePOSLayout({
  language,
  formatCurrency,
  cart,
  selectedCartIdx,
  setSelectedCartIdx,
  finalTotal,
  db,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  handleRapidBarcodeSubmit,
  handleUpdateQty,
  handleCheckoutClick,
  isReturnMode,
  isFullscreen,
  playScanBeep,
  showToast,
  setCart,
  selectedPartnerId,
  setSelectedPartnerId
}: SplitTactilePOSLayoutProps) {
  // Category tabs: 'categories' vs 'favorites'
  const [activeCategoryTab, setActiveCategoryTab] = useState<'categories' | 'favorites'>('categories');
  const [categoryPage, setCategoryPage] = useState<number>(0);

  // Keypad & display state
  const [numpadValue, setNumpadValue] = useState<string>('');
  const [pendingQty, setPendingQty] = useState<number>(0);

  // Quick customer selection modal state
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // 1. Categories for the left sidebar
  const categoriesList = useMemo(() => {
    const defaultCats = [
      { id: 'Tous', nameFr: 'Tous', nameAr: 'الكل', icon: '🛒' },
      { id: 'DIVERS', nameFr: 'DIVERS', nameAr: 'عام / متنوع', icon: '📦' },
      { id: 'Carte téléphonique', nameFr: 'Carte téléphonique', nameAr: 'كروت شحن', icon: '📱' },
      { id: 'PAIN', nameFr: 'PAIN', nameAr: 'خبز', icon: '🥖' },
      { id: 'Pizza', nameFr: 'Pizza', nameAr: 'بيتزا', icon: '🍕' },
      { id: 'Fruits sec', nameFr: 'Fruits sec', nameAr: 'فواكه جافة', icon: '🥜' },
      { id: 'Chocolat', nameFr: 'Chocolat', nameAr: 'شكلاطة', icon: '🍫' },
      { id: 'Boissons', nameFr: 'Boissons & Eaux', nameAr: 'مشروبات', icon: '🥤' },
      { id: 'Produits Laitiers', nameFr: 'Produits Laitiers', nameAr: 'ألبان', icon: '🥛' },
      { id: 'Céréales & Pâtes', nameFr: 'Céréales & Pâtes', nameAr: 'عجائن', icon: '🍝' },
      { id: 'Conserves', nameFr: 'Conserves', nameAr: 'مصبرات', icon: '🥫' },
      { id: 'Biscuits', nameFr: 'Biscuits & Gâteaux', nameAr: 'بسكويت', icon: '🍪' },
      { id: 'Café & Thé', nameFr: 'Café & Thé', nameAr: 'قهوة وشاي', icon: '☕' },
      { id: 'Nettoyage & Entretien', nameFr: 'Entretien', nameAr: 'تنظيف', icon: '🧼' },
      { id: 'Hygiène & Soins', nameFr: 'Hygiène', nameAr: 'عناية', icon: '🧴' },
    ];

    const existingNames = new Set(defaultCats.map(c => c.nameFr.toLowerCase()));
    const dynamicCats: { id: string; nameFr: string; nameAr: string; icon: string }[] = [];

    (db.products || []).forEach(p => {
      const rawCat = (p.category || '').trim();
      if (rawCat && !existingNames.has(rawCat.toLowerCase())) {
        existingNames.add(rawCat.toLowerCase());
        const norm = rawCat.toLowerCase();
        let icon = '🏷️';
        if (norm.includes('pain') || norm.includes('خبز')) icon = '🥖';
        else if (norm.includes('piz') || norm.includes('بيتز')) icon = '🍕';
        else if (norm.includes('fruit') || norm.includes('sec') || norm.includes('جاف')) icon = '🥜';
        else if (norm.includes('choc') || norm.includes('شكلاط')) icon = '🍫';
        else if (norm.includes('lait') || norm.includes('حليب')) icon = '🥛';
        else if (norm.includes('bois') || norm.includes('مشروب') || norm.includes('eau')) icon = '🥤';
        else if (norm.includes('oeuf') || norm.includes('بيض')) icon = '🥚';
        else if (norm.includes('tel') || norm.includes('carte') || norm.includes('شحن')) icon = '📱';
        dynamicCats.push({
          id: rawCat,
          nameFr: rawCat,
          nameAr: rawCat,
          icon
        });
      }
    });

    return [...defaultCats, ...dynamicCats];
  }, [db.products]);

  // Categories Pagination: 10 per page
  const categoriesPerPage = 10;
  const totalCategoryPages = Math.ceil(categoriesList.length / categoriesPerPage) || 1;
  const displayedCategories = useMemo(() => {
    const start = categoryPage * categoriesPerPage;
    return categoriesList.slice(start, start + categoriesPerPage);
  }, [categoriesList, categoryPage]);

  // 2. Filtered products for center catalog
  const filteredProducts = useMemo(() => {
    let prods = db.products || [];

    if (activeCategoryTab === 'favorites') {
      prods = prods.filter(p => (p as any).isFavorite || p.stock > 0);
      if (prods.length === 0) prods = db.products || [];
    } else if (selectedCategory !== 'Tous') {
      prods = prods.filter(p => {
        const normP = normalizeCategoryName(p.category).toLowerCase();
        const normSel = selectedCategory.toLowerCase();
        return normP === normSel || (p.category || '').toLowerCase().includes(normSel);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      prods = prods.filter(p => p.name.toLowerCase().includes(q) || (p.code || '').includes(q));
    }

    return prods;
  }, [db.products, activeCategoryTab, selectedCategory, searchQuery]);

  // 3. Handlers
  const handleNumberPress = (digit: string) => {
    playScanBeep();
    setNumpadValue(prev => {
      if (prev === '0' && digit !== '.') return digit;
      if (digit === '.' && prev.includes('.')) return prev;
      return prev + digit;
    });
  };

  const handleClearEntry = () => {
    playScanBeep();
    setNumpadValue('');
    setPendingQty(0);
  };

  const handleQtyClick = () => {
    playScanBeep();
    const qtyVal = parseFloat(numpadValue);
    if (cart.length > 0) {
      const targetIdx = selectedCartIdx >= 0 && selectedCartIdx < cart.length ? selectedCartIdx : cart.length - 1;
      const targetItem = cart[targetIdx];
      const newQty = !isNaN(qtyVal) && qtyVal > 0 ? qtyVal : targetItem.qty + 1;
      handleUpdateQty(targetItem.product.id, isReturnMode ? -newQty : newQty);
      setNumpadValue('');
      showToast(language === 'ar' ? `الكمية: ${newQty}` : `Quantité définie à ${newQty}`, 'success');
    } else {
      if (!isNaN(qtyVal) && qtyVal > 0) {
        setPendingQty(qtyVal);
        setNumpadValue('');
        showToast(language === 'ar' ? `الكمية المحضرة: ${qtyVal}` : `Quantité préparée : ${qtyVal}`, 'info');
      }
    }
  };

  const handlePriceSellClick = () => {
    playScanBeep();
    const priceVal = parseFloat(numpadValue);
    if (cart.length > 0 && !isNaN(priceVal) && priceVal >= 0) {
      const targetIdx = selectedCartIdx >= 0 && selectedCartIdx < cart.length ? selectedCartIdx : cart.length - 1;
      const targetItem = cart[targetIdx];
      const updated = cart.map((c, i) => i === targetIdx ? { ...c, customPrice: priceVal } : c);
      setCart(updated);
      setNumpadValue('');
      showToast(language === 'ar' ? `تم تعديل السعر إلى ${formatCurrency(priceVal)} TND` : `Prix de vente modifié : ${formatCurrency(priceVal)} TND`, 'success');
    } else {
      showToast(language === 'ar' ? 'حدد سلعة واكتب السعر المطلوب' : 'Sélectionnez un article et entrez le nouveau prix', 'error');
    }
  };

  const handlePriceBuyClick = () => {
    playScanBeep();
    if (cart.length > 0) {
      const targetIdx = selectedCartIdx >= 0 && selectedCartIdx < cart.length ? selectedCartIdx : cart.length - 1;
      const targetItem = cart[targetIdx];
      showToast(
        language === 'ar'
          ? `سعر الشراء لـ "${targetItem.product.name}": ${formatCurrency(targetItem.product.purchasePrice)} TND`
          : `Prix d'achat pour "${targetItem.product.name}" : ${formatCurrency(targetItem.product.purchasePrice)} TND`,
        'info'
      );
    }
  };

  const handleCancelClick = () => {
    playScanBeep();
    if (cart.length > 0) {
      setCart([]);
      setSelectedCartIdx(-1);
      setNumpadValue('');
      setPendingQty(0);
      showToast(language === 'ar' ? 'تم إلغاء وإفراغ السلة' : 'Panier annulé et vidé', 'info');
    }
  };

  const handleProductCardClick = (product: Product) => {
    const mult = pendingQty > 0 ? pendingQty : (parseFloat(numpadValue) > 0 ? parseFloat(numpadValue) : 1);
    if (!isReturnMode && product.stock <= 0) {
      showToast(`⚠️ Attention: Le produit "${product.name}" est en rupture de stock !`, 'info');
    }
    const qtyToAdd = isReturnMode ? -mult : mult;
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const newCart = [...cart];
      const newQty = newCart[existingIndex].qty + qtyToAdd;
      if (newQty === 0) {
        setCart(cart.filter(item => item.product.id !== product.id));
      } else {
        newCart[existingIndex].qty = newQty;
        setCart(newCart);
      }
      setSelectedCartIdx(existingIndex);
    } else {
      setCart([...cart, { product, qty: qtyToAdd, customPrice: getActiveProductPrice(product) }]);
      setSelectedCartIdx(cart.length);
    }
    setPendingQty(0);
    setNumpadValue('');
    playScanBeep();
  };

  // Customers list
  const clientList = useMemo(() => {
    return (db.partners || []).filter(p => p.type === 'client');
  }, [db.partners]);

  const filteredClients = useMemo(() => {
    if (!customerSearch.trim()) return clientList;
    const q = customerSearch.toLowerCase().trim();
    return clientList.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
  }, [clientList, customerSearch]);

  const selectedClient = useMemo(() => {
    return clientList.find(c => c.id === selectedPartnerId);
  }, [clientList, selectedPartnerId]);

  return (
    <div className={`w-full flex flex-col lg:flex-row items-stretch gap-4 select-none no-print font-sans ${isFullscreen ? 'flex-1 min-h-0' : 'min-h-[750px] xl:min-h-[820px]'}`}>
      
      {/* ========================================================
          COLUMN 1: CATEGORIES & NAVIGATION (Left, ~250px)
          ======================================================== */}
      <div className="w-full lg:w-[250px] xl:w-[280px] bg-slate-100/80 border border-slate-250 rounded-2xl p-3 flex flex-col justify-between shrink-0 shadow-xs">
        
        {/* Top Segmented Tabs: Catégorie / Favoris ⭐ */}
        <div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-3xs mb-3">
            <button
              type="button"
              onClick={() => {
                setActiveCategoryTab('categories');
                playScanBeep();
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeCategoryTab === 'categories'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{language === 'ar' ? 'الأصناف' : 'Catégorie'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategoryTab('favorites');
                playScanBeep();
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeCategoryTab === 'favorites'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>⭐</span>
              <span>{language === 'ar' ? 'المفضلة' : 'Favoris'}</span>
            </button>
          </div>

          {/* Categories Grid (2 Columns, tiles with visual icon + name) */}
          <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[600px] xl:max-h-[660px] pr-0.5 custom-scrollbar">
            {displayedCategories.map((cat) => {
              const isSelected = selectedCategory === cat.nameFr;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.nameFr);
                    setActiveCategoryTab('categories');
                    playScanBeep();
                  }}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 min-h-[84px] border ${
                    isSelected
                      ? 'bg-amber-500/15 border-2 border-amber-500 text-amber-950 font-black shadow-xs ring-2 ring-amber-400/25'
                      : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-800 font-bold'
                  }`}
                >
                  <span className="text-2xl mb-1">{cat.icon}</span>
                  <span className="text-[10px] uppercase font-black line-clamp-2 leading-tight">
                    {language === 'ar' ? cat.nameAr : cat.nameFr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paging controls (< and >) */}
        {categoriesList.length > categoriesPerPage && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-2">
            <button
              type="button"
              disabled={categoryPage === 0}
              onClick={() => setCategoryPage(p => Math.max(0, p - 1))}
              className="p-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-slate-700 font-black text-xs"
              title="Page précédente"
            >
              ◀
            </button>
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              {categoryPage + 1} / {totalCategoryPages}
            </span>
            <button
              type="button"
              disabled={categoryPage >= totalCategoryPages - 1}
              onClick={() => setCategoryPage(p => Math.min(totalCategoryPages - 1, p + 1))}
              className="p-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-slate-700 font-black text-xs"
              title="Page suivante"
            >
              ▶
            </button>
          </div>
        )}
      </div>


      {/* ========================================================
          COLUMN 2: PRODUCTS CATALOG GRID (Center, flex-1)
          ======================================================== */}
      <div className="flex-1 min-w-0 bg-white border border-slate-250 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
        
        {/* Category banner / current selection header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-850 flex items-center gap-1.5">
              {activeCategoryTab === 'favorites' ? (
                <>⭐ {language === 'ar' ? 'المنتجات الأكثر مبيعاً والمفضلة' : 'Articles Favoris & Fréquents'}</>
              ) : (
                <>📦 {selectedCategory === 'Tous' ? (language === 'ar' ? 'جميع المنتجات' : 'Tous les articles') : selectedCategory}</>
              )}
            </span>
            <span className="text-[10.5px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
              {filteredProducts.length} {language === 'ar' ? 'منتج' : 'articles'}
            </span>
          </div>

          {/* Pending QTY multiplier indicator */}
          {pendingQty > 0 && (
            <div className="bg-purple-100 text-purple-800 border border-purple-300 font-mono text-xs font-black px-2.5 py-1 rounded-lg animate-pulse flex items-center gap-1">
              <span>⚡ Multiplicateur: x{pendingQty}</span>
              <button type="button" onClick={() => setPendingQty(0)} className="text-purple-600 hover:text-purple-900 ml-1">✕</button>
            </div>
          )}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto max-h-[660px] xl:max-h-[740px] pr-1 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <span className="text-4xl mb-2">🔍</span>
              <p className="font-bold text-sm">{language === 'ar' ? 'لا توجد منتجات مسجلة في هذا الصنف' : 'Aucun produit trouvé dans cette catégorie.'}</p>
              <button
                type="button"
                onClick={() => setSelectedCategory('Tous')}
                className="mt-3 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs"
              >
                {language === 'ar' ? 'عرض جميع المنتجات' : 'Afficher tous les articles'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => {
                const isOut = prod.stock <= 0;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleProductCardClick(prod)}
                    className={`border rounded-xl bg-white p-2.5 flex flex-col items-center justify-between min-h-[125px] transition-all cursor-pointer active:scale-95 group text-start select-none relative ${
                      isOut
                        ? 'border-slate-250 bg-slate-50/60 opacity-80 hover:border-slate-400'
                        : 'border-slate-200 hover:border-amber-400 hover:shadow-md'
                    }`}
                  >
                    {/* Visual IMG or Photo */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform relative">
                      {prod.photoUrl ? (
                        <img src={prod.photoUrl} alt={prod.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <span className="text-base leading-none">🖼️</span>
                          <span className="text-[9px] font-black tracking-wider uppercase font-mono mt-0.5">IMG</span>
                        </div>
                      )}
                      {isOut && (
                        <span className="absolute inset-0 bg-rose-900/60 backdrop-blur-2xs text-white text-[8px] font-black uppercase flex items-center justify-center">
                          Rupture
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <span className="text-xs font-black text-slate-800 text-center line-clamp-2 mt-1 leading-tight w-full">
                      {prod.name}
                    </span>

                    {/* Price in TND */}
                    <span className="text-xs font-black text-amber-600 font-mono mt-0.5 tracking-tight">
                      {formatCurrency(getActiveProductPrice(prod))} TND
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {/* ========================================================
          COLUMN 3: TICKET / CART + NUMPAD + ACTIONS (Right, ~340px)
          ======================================================== */}
      <div className="w-full lg:w-[330px] xl:w-[365px] bg-white border border-slate-250 rounded-2xl flex flex-col justify-between overflow-hidden shrink-0 shadow-xs">
        
        {/* Top Header: Big Total + Close Button */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border-b border-slate-200">
          <div className="text-2xl xl:text-3xl font-black font-mono text-amber-600 tracking-tight">
            {formatCurrency(finalTotal)} <span className="text-xs font-bold text-slate-500 uppercase">TND</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (cart.length > 0) {
                handleCancelClick();
              }
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold shadow-xs"
            title={language === 'ar' ? 'مسح السلة' : 'Effacer le panier'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Customer banner (if assigned) */}
        {selectedClient && (
          <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between text-xs text-blue-900">
            <span className="font-extrabold truncate flex items-center gap-1">
              👤 {selectedClient.name}
            </span>
            <button
              type="button"
              onClick={() => setSelectedPartnerId('')}
              className="text-blue-500 hover:text-rose-600 text-xs font-bold"
              title="Détacher le client"
            >
              ✕
            </button>
          </div>
        )}

        {/* Ticket / Cart Scrollable Listing */}
        <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto divide-y divide-slate-100 p-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-4 text-slate-300 select-none">
              <p className="text-xs font-bold text-slate-400 mb-2">{language === 'ar' ? 'السلة فارغة' : 'Panier vide'}</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                  <Search className="w-5 h-5 stroke-[1.5]" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="w-11 h-11 rounded-full border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                  title={language === 'ar' ? 'اختيار عميل' : 'Sélectionner un client'}
                >
                  <span className="text-xl">👤</span>
                </button>
              </div>
            </div>
          ) : (
            cart.map((item, idx) => {
              const isSelected = selectedCartIdx === idx;
              const lineTotal = item.qty * (item.customPrice || item.product.sellingPrice);
              return (
                <div
                  key={item.product.id}
                  onClick={() => setSelectedCartIdx(idx)}
                  className={`p-2 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer select-none ${
                    isSelected ? 'bg-amber-50 border border-amber-300 text-slate-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold truncate">{item.product.name}</p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <span>{item.qty} x {formatCurrency(item.customPrice || item.product.sellingPrice)}</span>
                    </div>
                  </div>
                  <div className="text-end font-mono font-black text-amber-700 shrink-0">
                    {formatCurrency(lineTotal)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateQty(item.product.id, 0);
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded font-bold"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Search Bar: Recherche (code ou nom) */}
        <div className="px-3 pt-2 pb-1 border-t border-slate-150 bg-slate-50/40 space-y-1">
          <label className="text-[10.5px] font-extrabold text-slate-600 block">
            {language === 'ar' ? 'بحث (الباركود أو الاسم)' : 'Recherche (code ou nom)'}
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={language === 'ar' ? 'الباركود أو اسم السلعة...' : 'Code à barre ou nom du produit...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRapidBarcodeSubmit(e);
                }
              }}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-semibold focus:outline-hidden focus:border-amber-400 text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Keypad Display Box */}
        <div className="px-3 py-1 bg-slate-50/40">
          <div className="w-full bg-amber-50/20 border-2 border-amber-300 rounded-lg py-1.5 px-3 text-end font-mono font-black text-xl text-slate-900 shadow-inner">
            {numpadValue || '0'}
          </div>
        </div>

        {/* Tactile Keypad */}
        <div className="p-3 pt-1 space-y-2 bg-slate-50/40">
          {/* Numbers Grid: 7,8,9, 4,5,6, 1,2,3, CE, 0, . */}
          <div className="grid grid-cols-3 gap-1.5">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleNumberPress(n)}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xl py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center select-none"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearEntry}
              className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black text-base py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center select-none"
            >
              CE
            </button>
            <button
              type="button"
              onClick={() => handleNumberPress('0')}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xl py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleNumberPress('.')}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xl py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center select-none"
            >
              .
            </button>
          </div>

          {/* Function Buttons Row: QTE, P.Achat, P.Vente */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={handleQtyClick}
              className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-xs py-2 rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center select-none"
            >
              QTE
            </button>
            <button
              type="button"
              onClick={handlePriceBuyClick}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs py-2 rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center select-none"
            >
              P.Achat
            </button>
            <button
              type="button"
              onClick={handlePriceSellClick}
              className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-black text-xs py-2 rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center select-none"
            >
              P.Vente
            </button>
          </div>

          {/* Big Action Buttons: Annuler, Valider */}
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={handleCancelClick}
              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black py-2.5 rounded-xl text-sm shadow-md transition-all cursor-pointer select-none"
            >
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              type="button"
              onClick={handleCheckoutClick}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black py-3 rounded-xl text-base shadow-md transition-all cursor-pointer select-none"
            >
              {language === 'ar' ? 'تأكيد ودفع' : 'Valider'}
            </button>
          </div>
        </div>

      </div>

      {/* QUICK CUSTOMER SELECTION MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-start space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>👤</span>
                <span>{language === 'ar' ? 'اختيار العميل المستفيد' : 'Sélectionner un Client'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Search client */}
            <div className="relative">
              <input
                type="text"
                placeholder={language === 'ar' ? 'ابحث باسم الحريف أو رقم الهاتف...' : 'Recherche par nom ou téléphone...'}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Client list */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-150 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedPartnerId('');
                  setShowCustomerModal(false);
                }}
                className={`w-full p-2.5 text-xs text-start flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                  !selectedPartnerId ? 'bg-blue-50 font-black text-blue-900' : 'text-slate-700'
                }`}
              >
                <span>👤 {language === 'ar' ? 'عميل عابر (بدون حساب)' : 'Client Comptoir (Anonyme)'}</span>
                {!selectedPartnerId && <Check className="w-4 h-4 text-blue-600" />}
              </button>

              {filteredClients.map((client) => {
                const isSelected = selectedPartnerId === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartnerId(client.id);
                      setShowCustomerModal(false);
                      showToast(
                        language === 'ar' ? `تم تعيين العميل: ${client.name}` : `Client sélectionné : ${client.name}`,
                        'success'
                      );
                    }}
                    className={`w-full p-2.5 text-xs text-start flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                      isSelected ? 'bg-blue-50 font-black text-blue-900' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold">{client.name}</p>
                      {client.phone && <p className="text-[10px] text-slate-400">{client.phone}</p>}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
