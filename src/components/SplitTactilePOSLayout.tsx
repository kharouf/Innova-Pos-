import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, DatabaseState, HeldTicket, Partner } from '../types';
import { getActiveProductPrice, getProductVisual } from '../utils/db';
import { normalizeCategoryName } from '../utils/categories';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  Clock,
  CreditCard,
  Banknote,
  CheckSquare,
  MoreHorizontal,
  Calendar,
  Keyboard,
  Grid,
  ChevronRight,
  Menu,
  Check,
  FileSpreadsheet,
  Receipt,
  AlertTriangle,
  Gift,
  Zap,
  Camera
} from 'lucide-react';

interface SplitTactilePOSLayoutProps {
  language: string;
  formatCurrency: (amount: number) => string;
  cart: { product: Product; qty: number; customPrice: number }[];
  selectedCartIdx: number;
  setSelectedCartIdx: (idx: number) => void;
  finalTotal: number;
  subTotal?: number;
  cartHTAmount?: number;
  finalTaxAmount?: number;
  db: DatabaseState;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleRapidBarcodeSubmit: (e: React.FormEvent) => void;
  handleUpdateQty: (productId: string, newQty: number) => void;
  handleCheckoutClick: () => void;
  isReturnMode: boolean;
  setIsReturnMode?: React.Dispatch<React.SetStateAction<boolean>>;
  isFullscreen: boolean;
  playScanBeep: (type?: 'success' | 'error') => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setCart: React.Dispatch<React.SetStateAction<{ product: Product; qty: number; customPrice: number }[]>>;
  selectedPartnerId: string;
  setSelectedPartnerId: (id: string) => void;
  activePartner?: Partner;
  clients?: Partner[];
  clientDiscount?: number;
  creditLimitWarning?: {
    currentBalance: number;
    creditLimit: number;
    projectedBalance: number;
    exceededAmount: number;
  } | null;
  loyaltyDiscount?: number;
  maxPointsRedeemable?: number;
  redeemedPoints?: number;
  setRedeemedPoints?: (pts: number) => void;
  cashRegisterType?: 'bl' | 'facture';
  setCashRegisterType?: (type: 'bl' | 'facture') => void;
  globalDiscount?: number;
  setGlobalDiscount?: (val: number) => void;
  taxRate?: number;
  setTaxRate?: (rate: number) => void;
  onOpenNewClientModal?: () => void;
  heldTickets?: HeldTicket[];
  onOpenHeldTickets?: () => void;
  onHoldCurrentCart?: () => void;
  onToggleCamera?: () => void;
  isCameraActive?: boolean;
  isInfraredMode?: boolean;
  setIsInfraredMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  autoFocusScanField?: boolean;
  setAutoFocusScanField?: (val: boolean | ((prev: boolean) => boolean)) => void;
  rapidScanValue?: string;
  setRapidScanValue?: (val: string) => void;
  isRapidScanFocused?: boolean;
  setIsRapidScanFocused?: (val: boolean) => void;
  rapidScanInputRef?: React.RefObject<HTMLInputElement | null>;
  handleResolveAndAddProduct?: (barcode: string) => { success: boolean; productName?: string; qty?: number };
  paymentMethod?: 'especes' | 'carte' | 'virement' | 'cheque' | 'ticket_cadeau';
  setPaymentMethod?: (val: 'especes' | 'carte' | 'virement' | 'cheque' | 'ticket_cadeau') => void;
  paidAmount?: string;
  setPaidAmount?: (val: string) => void;
}

export default function SplitTactilePOSLayout({
  language,
  formatCurrency,
  cart,
  selectedCartIdx,
  setSelectedCartIdx,
  finalTotal,
  subTotal,
  finalTaxAmount,
  db,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  handleRapidBarcodeSubmit,
  handleUpdateQty,
  handleCheckoutClick,
  isReturnMode,
  setIsReturnMode,
  playScanBeep,
  showToast,
  setCart,
  selectedPartnerId,
  setSelectedPartnerId,
  activePartner,
  clients,
  clientDiscount = 0,
  creditLimitWarning,
  loyaltyDiscount = 0,
  maxPointsRedeemable = 0,
  redeemedPoints = 0,
  setRedeemedPoints,
  cashRegisterType = 'bl',
  setCashRegisterType,
  globalDiscount = 0,
  setGlobalDiscount,
  taxRate = -1,
  setTaxRate,
  onOpenNewClientModal,
  heldTickets = [],
  onOpenHeldTickets,
  onHoldCurrentCart,
  onToggleCamera,
  isCameraActive = false,
  isInfraredMode = false,
  setIsInfraredMode,
  autoFocusScanField = true,
  setAutoFocusScanField,
  rapidScanValue = '',
  setRapidScanValue,
  isRapidScanFocused = false,
  setIsRapidScanFocused,
  rapidScanInputRef,
  handleResolveAndAddProduct,
  paymentMethod = 'especes',
  setPaymentMethod,
  paidAmount = '',
  setPaidAmount
}: SplitTactilePOSLayoutProps) {
  // Payment method selection in right column
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'especes' | 'carte' | 'cheque' | 'autre'>('especes');

  // Customer modal
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Virtual Keypad / Numpad modal
  const [showNumpadDrawer, setShowNumpadDrawer] = useState<boolean>(false);
  const [numpadValue, setNumpadValue] = useState<string>('');
  const [numpadTarget, setNumpadTarget] = useState<'qty' | 'barcode' | 'discount'>('barcode');

  // Quick add / Barcode modal
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const [quickBarcodeInput, setQuickBarcodeInput] = useState<string>('');

  // Full catalog view modal
  const [showFullCatalogModal, setShowFullCatalogModal] = useState<boolean>(false);

  // Live Date and Time
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Dedicated Barcode Scanner state from Caisse 2
  const barcodeLocalInputRef = useRef<HTMLInputElement | null>(null);
  const activeScannerRef = rapidScanInputRef || barcodeLocalInputRef;
  const [localBarcodeInput, setLocalBarcodeInput] = useState('');
  const [localIsInfrared, setLocalIsInfrared] = useState(isInfraredMode);
  const [localAutoFocus, setLocalAutoFocus] = useState(autoFocusScanField);
  const [localIsFocused, setLocalIsFocused] = useState(false);

  useEffect(() => {
    setLocalIsInfrared(isInfraredMode);
  }, [isInfraredMode]);

  useEffect(() => {
    setLocalAutoFocus(autoFocusScanField);
  }, [autoFocusScanField]);

  // Continuous Autofocus scan field on mount and after cart updates if enabled
  useEffect(() => {
    if (!localAutoFocus) return;
    const timer = setTimeout(() => {
      if (activeScannerRef.current && document.activeElement !== activeScannerRef.current) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select') {
          activeScannerRef.current.focus();
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [localAutoFocus, cart.length]);

  const toggleInfrared = () => {
    const next = !localIsInfrared;
    setLocalIsInfrared(next);
    if (setIsInfraredMode) setIsInfraredMode(next);
    try {
      localStorage.setItem('pos_infrared_mode', String(next));
    } catch (e) {}
    if (next) {
      showToast(
        language === 'ar'
          ? '⚡ تم تفعيل وضع الماسح الضوئي بالأشعة تحت الحمراء (PDA / Laser) بدون لوحة مفاتيح شاشة'
          : '⚡ Mode Scanner Infrarouge & Laser PDA Actif (Clavier virtuel masqué)',
        'success'
      );
    }
  };

  const toggleAutoFocus = (checked: boolean) => {
    setLocalAutoFocus(checked);
    if (setAutoFocusScanField) setAutoFocusScanField(checked);
    try {
      localStorage.setItem('pos_autofocus_scan_field', String(checked));
    } catch (e) {}
  };

  const handleBarcodeSubmitInternal = (e: React.FormEvent) => {
    e.preventDefault();
    const code = (setRapidScanValue ? rapidScanValue : localBarcodeInput).trim();
    if (!code) return;

    if (handleRapidBarcodeSubmit) {
      handleRapidBarcodeSubmit(e);
      setLocalBarcodeInput('');
    } else if (handleResolveAndAddProduct) {
      const res = handleResolveAndAddProduct(code);
      if (res.success) {
        playScanBeep('success');
        showToast(language === 'ar' ? `🛒 تمت إضافة "${res.productName}"` : `🛒 "${res.productName}" ajouté au panier !`, 'success');
      } else {
        playScanBeep('error');
        showToast(language === 'ar' ? `⚠️ لم يتم العثور على رمز: ${code}` : `⚠️ Aucun produit trouvé pour le code : ${code}`, 'error');
      }
      if (setRapidScanValue) setRapidScanValue('');
      setLocalBarcodeInput('');
    }

    if (localAutoFocus) {
      setTimeout(() => {
        activeScannerRef.current?.focus();
      }, 50);
    }
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowQuickAddModal(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (setIsReturnMode) setIsReturnMode(prev => !prev);
      } else if (e.key === 'F3') {
        e.preventDefault();
        setShowCustomerModal(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleCheckoutClick();
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (onHoldCurrentCart && cart.length > 0) {
          onHoldCurrentCart();
        } else if (onOpenHeldTickets) {
          onOpenHeldTickets();
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        setShowNumpadDrawer(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, onHoldCurrentCart, onOpenHeldTickets, setIsReturnMode, handleCheckoutClick]);

  // Categories list
  const categoryPills = useMemo(() => {
    const defaultPills = ['Toutes', 'Boissons', 'Snacks', 'Biscuiterie', 'Épicerie', 'Laitiers', 'Entretien', 'Divers'];
    const extracted = new Set<string>();
    (db.products || []).forEach(p => {
      const c = normalizeCategoryName(p.category || '');
      if (c && c !== 'Tous') extracted.add(c);
    });
    const combined = ['Toutes', ...defaultPills.filter(p => p !== 'Toutes')];
    extracted.forEach(c => {
      if (!combined.some(x => x.toLowerCase() === c.toLowerCase())) {
        combined.push(c);
      }
    });
    return combined;
  }, [db.products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    let prods = db.products || [];
    if (selectedCategory && selectedCategory !== 'Toutes' && selectedCategory !== 'Tous') {
      const normSel = selectedCategory.toLowerCase();
      prods = prods.filter(p => {
        const normP = normalizeCategoryName(p.category || '').toLowerCase();
        return normP === normSel || (p.category || '').toLowerCase().includes(normSel);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      prods = prods.filter(p => p.name.toLowerCase().includes(q) || (p.code || '').includes(q));
    }
    return prods;
  }, [db.products, selectedCategory, searchQuery]);

  // Clients
  const allClients = useMemo(() => {
    return clients || (db.partners || []).filter(p => p.type === 'client');
  }, [clients, db.partners]);

  const activeClient = useMemo(() => {
    return activePartner || allClients.find(c => c.id === selectedPartnerId);
  }, [activePartner, allClients, selectedPartnerId]);

  const filteredClients = useMemo(() => {
    if (!customerSearch.trim()) return allClients;
    const q = customerSearch.toLowerCase().trim();
    return allClients.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
  }, [allClients, customerSearch]);

  // Financial calculations
  const effectiveSubTotal = subTotal !== undefined ? subTotal : cart.reduce((sum, item) => sum + (item.qty * item.customPrice), 0);
  const effectiveClientDiscount = clientDiscount;
  const effectiveLoyaltyDiscount = loyaltyDiscount;
  const effectiveGlobalDiscount = globalDiscount;
  const effectiveFinalTaxAmount = finalTaxAmount !== undefined ? finalTaxAmount : 0;
  const effectiveBLType = cashRegisterType;
  const effectiveTaxRate = taxRate;

  // Add product to cart helper
  const handleProductClick = (product: Product) => {
    if (!isReturnMode && product.stock <= 0) {
      showToast(`⚠️ Attention: Le produit "${product.name}" est en rupture de stock !`, 'info');
    }
    const qtyToAdd = isReturnMode ? -1 : 1;
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
    playScanBeep();
  };

  // Numpad key input
  const handleNumpadKey = (val: string) => {
    playScanBeep();
    if (val === 'C') {
      setNumpadValue('');
    } else if (val === '⌫') {
      setNumpadValue(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!numpadValue.includes('.')) setNumpadValue(prev => (prev || '0') + '.');
    } else {
      setNumpadValue(prev => (prev === '0' ? val : prev + val));
    }
  };

  const handleApplyNumpad = () => {
    if (numpadTarget === 'qty' && cart.length > 0) {
      const targetIdx = selectedCartIdx >= 0 && selectedCartIdx < cart.length ? selectedCartIdx : cart.length - 1;
      const targetItem = cart[targetIdx];
      const q = parseFloat(numpadValue);
      if (!isNaN(q) && q > 0) {
        handleUpdateQty(targetItem.product.id, isReturnMode ? -q : q);
        showToast(`Quantité mise à jour : ${q}`, 'success');
      }
    } else if (numpadTarget === 'barcode') {
      const p = (db.products || []).find(x => x.code === numpadValue || x.code.endsWith(numpadValue));
      if (p) {
        handleProductClick(p);
        showToast(`Ajouté : ${p.name}`, 'success');
      } else {
        showToast(`Produit avec code [${numpadValue}] non trouvé`, 'error');
      }
    } else if (numpadTarget === 'discount' && setGlobalDiscount) {
      const d = parseFloat(numpadValue) || 0;
      setGlobalDiscount(Math.max(0, d));
      showToast(`Remise définie : ${d} DT`, 'info');
    }
    setNumpadValue('');
    setShowNumpadDrawer(false);
  };

  // Format date helper: "Jeudi, 22 octobre 2026"
  const formattedDate = useMemo(() => {
    try {
      return currentTime.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Jeudi, 22 octobre 2026';
    }
  }, [currentTime]);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  return (
    <div className="w-full flex flex-col gap-3 font-sans select-none text-slate-800">
      
      {/* ========================================================
          TOP HEADER BAR
          ======================================================== */}
      <header className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Side: Menu + Nouveau Client + En attente + Caisse Principale */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Nouveau Client Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenNewClientModal) onOpenNewClientModal();
              else setShowCustomerModal(true);
            }}
            className="bg-white hover:bg-blue-50/60 border border-blue-200 text-blue-600 font-black text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>{activeClient ? activeClient.name : 'Nouveau Client'}</span>
          </button>

          {/* En attente (Orange Button) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenHeldTickets) onOpenHeldTickets();
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="File d'attente (F6)"
          >
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs">||||</span>
              <span>En attente</span>
            </div>
            <Clock className="w-4 h-4" />
            {heldTickets.length > 0 && (
              <span className="bg-white text-amber-700 font-mono text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {heldTickets.length}
              </span>
            )}
          </button>

          {/* Status: Caisse Principale */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 pl-2">
            <span>Caisse Principale</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
        </div>

        {/* Center-Right Shortcuts Strip */}
        <div className="hidden xl:flex items-center gap-4 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              if (onHoldCurrentCart && cart.length > 0) onHoldCurrentCart();
              else if (onOpenHeldTickets) onOpenHeldTickets();
            }}
            className="hover:text-blue-600 cursor-pointer"
          >
            <span className="text-blue-600 font-black mr-1">F6</span> Attente
          </button>
          <button
            type="button"
            onClick={handleCheckoutClick}
            className="hover:text-blue-600 cursor-pointer"
          >
            <span className="text-blue-600 font-black mr-1">F4</span> Encaisser
          </button>
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="hover:text-blue-600 cursor-pointer"
          >
            <span className="text-blue-600 font-black mr-1">F8</span> Recherche
          </button>
          <button
            type="button"
            onClick={onToggleCamera}
            className="hover:text-blue-600 cursor-pointer"
          >
            <span className="text-blue-600 font-black mr-1">F2</span> Vidéo
          </button>
        </div>

        {/* Right Side: Date/Time + Title */}
        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <p className="font-bold text-slate-800 capitalize">{formattedDate}</p>
            <p className="font-mono text-slate-500 flex items-center justify-end gap-1 font-semibold">
              <span>{formattedTime}</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400 inline" />
            </p>
          </div>

          <div className="flex items-center gap-2 text-slate-900 border-l border-slate-200 pl-4">
            <span className="font-black text-base tracking-tight font-sans">
              POS <span className="text-slate-700 font-bold">قاطع البيع</span>
            </span>
            <ShoppingCart className="w-5 h-5 text-blue-600 stroke-[2.5]" />
          </div>
        </div>

      </header>


      {/* ========================================================
          SUB-HEADER ACTIONS BAR
          ======================================================== */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {/* F2 مطرح (Return / Exchange mode) */}
          <button
            type="button"
            onClick={() => {
              if (setIsReturnMode) {
                setIsReturnMode(prev => !prev);
                showToast(
                  !isReturnMode
                    ? (language === 'ar' ? '↩ تم تفعيل وضع الإرجاع' : '↩ Mode Retour Activé')
                    : (language === 'ar' ? '🛒 تم العودة للوضع العادي' : '🛒 Mode Vente Normal'),
                  'info'
                );
              }
            }}
            className={`font-black text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 ${
              isReturnMode
                ? 'bg-rose-700 hover:bg-rose-800 text-white ring-2 ring-rose-400'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
            title="Mode Retour / Échange (F2)"
          >
            <span className="font-mono text-slate-300">F2</span>
            <span>{language === 'ar' ? 'مطرح ⇄+' : 'Retour ⇄+'}</span>
          </button>

          {/* F3 خدمة (Service / Client) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenNewClientModal) onOpenNewClientModal();
              else setShowCustomerModal(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
            title="Service & Client (F3)"
          >
            <span className="font-mono text-slate-300">F3</span>
            <span>{language === 'ar' ? 'خدمة 👤' : 'Client 👤'}</span>
          </button>
        </div>

        {/* Small screen shortcuts reminder */}
        <div className="xl:hidden flex items-center gap-2 text-[11px] font-bold text-slate-500">
          <span>F4: Encaisser</span>
          <span>•</span>
          <span>F6: Attente</span>
        </div>
      </div>


      {/* ========================================================
          THE 3 MAIN COLUMNS
          ======================================================== */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-[680px] xl:min-h-[740px]">
        
        {/* ========================================================
            COLUMN 1: PRODUITS (CATALOG) - col-span-4
            ======================================================== */}
        <section className="lg:col-span-4 xl:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          
          <div className="space-y-3">
            {/* Title: 🛒 Produits */}
            <div className="flex items-center gap-2 text-blue-600 font-black text-base">
              <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
              <h2 className="text-slate-900 tracking-tight">Produits</h2>
            </div>

            {/* Dedicated continuous barcode scanner entry block (from Caisse 2) */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2.5 relative overflow-hidden transition-all duration-200 hover:border-emerald-300 hover:shadow-2xs">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pl-1">
                <div className="flex items-center gap-1.5 text-emerald-850 text-xs font-black uppercase tracking-wider font-sans select-none">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${(isRapidScanFocused || localIsFocused) ? 'bg-emerald-400 opacity-75' : 'bg-slate-300'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${(isRapidScanFocused || localIsFocused) ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  </span>
                  <span>{language === 'ar' ? 'سحب سريع للباركود و QR' : 'Saisie Code-barres / QR'}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Hardware Infrared Laser Scanner Mode Toggle button */}
                  <button
                    type="button"
                    onClick={toggleInfrared}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 transition-all cursor-pointer ${
                      localIsInfrared
                        ? 'bg-rose-600 text-white shadow-xs border border-rose-500 animate-pulse'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-250 shadow-3xs'
                    }`}
                    title={language === 'ar' ? 'وضع ماسح الإنفراروج للموبايل و PDA' : 'Mode Scanner Infrarouge / Laser PDA'}
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>{localIsInfrared ? (language === 'ar' ? 'إنفراروج نشط ⚡' : 'IR Actif ⚡') : (language === 'ar' ? 'إنفراروج/PDA' : 'Scanner IR')}</span>
                  </button>

                  {/* Camera Scanner Trigger */}
                  {onToggleCamera && (
                    <button
                      type="button"
                      onClick={onToggleCamera}
                      title={language === 'ar' ? 'تشغيل الكاميرا للمسح التلقائي المستمر' : 'Scanner continu via Caméra'}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all select-none cursor-pointer ${
                        isCameraActive
                          ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      <Camera className="w-3 h-3" />
                      <span>{isCameraActive ? (language === 'ar' ? 'الكاميرا' : 'Stop Cam') : (language === 'ar' ? 'كاميرا' : 'Cam')}</span>
                    </button>
                  )}

                  {/* Active scan indicator */}
                  <div 
                    onClick={() => activeScannerRef.current?.focus()}
                    className="flex items-center gap-1 cursor-pointer bg-white px-1.5 py-0.5 rounded border border-slate-200 select-none hover:bg-slate-50 transition-all text-[9.5px]"
                  >
                    <span className="font-bold text-slate-500">
                      {(isRapidScanFocused || localIsFocused) 
                        ? (language === 'ar' ? 'جاهز' : 'PRÊT') 
                        : (language === 'ar' ? 'تفعيل' : 'ACTIVER')
                      }
                    </span>
                  </div>

                  <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200">
                    <input
                      type="checkbox"
                      id="autoFocusScanFieldCaisse3"
                      checked={localAutoFocus}
                      onChange={(e) => toggleAutoFocus(e.target.checked)}
                      className="w-3 h-3 rounded text-emerald-600 focus:ring-emerald-550 border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="autoFocusScanFieldCaisse3" className="text-[9.5px] font-black text-slate-600 cursor-pointer select-none">
                      {language === 'ar' ? 'تركيز تلقائي' : 'Autofocus'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Infrared Mode Status Banner */}
              {localIsInfrared && (
                <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white p-2 rounded-lg text-[10px] font-bold flex items-center justify-between shadow-inner border border-rose-700/50">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                    <p>
                      {language === 'ar'
                        ? '⚡ وضع الإنفراروج و PDA شغّال: يقرأ الباركود و QR بدون ظهور لوحة المفاتيح على الشاشة.'
                        : '⚡ Mode Infrarouge & PDA Actif : Scannez avec la douchette sans ouvrir le clavier tactile !'}
                    </p>
                  </div>
                  <span className="text-[8.5px] font-mono bg-rose-950/80 px-1.5 py-0.2 rounded text-rose-200 border border-rose-800">
                    Hardware Wedge
                  </span>
                </div>
              )}

              <form onSubmit={handleBarcodeSubmitInternal} className="flex gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2.5 text-xs select-none">📟</span>
                  <input
                    ref={activeScannerRef}
                    type="text"
                    inputMode={localIsInfrared ? 'none' : undefined}
                    placeholder={
                      localIsInfrared
                        ? (language === 'ar' ? 'وجه ليزر PDA / الإنفراروج للمسح الضوئي المباشر...' : 'Scannez avec la douchette infrarouge PDA...')
                        : (language === 'ar' ? 'امسح باركود أو QR السلعة هنا لإضافتها فوراً...' : 'Scannez un code-barres ou QR Code ici...')
                    }
                    value={setRapidScanValue ? rapidScanValue : localBarcodeInput}
                    onChange={(e) => {
                      if (setRapidScanValue) setRapidScanValue(e.target.value);
                      setLocalBarcodeInput(e.target.value);
                    }}
                    onFocus={() => {
                      if (setIsRapidScanFocused) setIsRapidScanFocused(true);
                      setLocalIsFocused(true);
                    }}
                    onBlur={() => {
                      if (setIsRapidScanFocused) setIsRapidScanFocused(false);
                      setLocalIsFocused(false);
                    }}
                    className={`w-full pl-8 pr-3 py-2 text-xs font-semibold font-mono bg-white border rounded-lg shadow-inner focus:outline-hidden transition-all placeholder:text-slate-400 ${
                      (isRapidScanFocused || localIsFocused)
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10 text-emerald-950'
                        : 'border-slate-250 text-slate-700'
                    }`}
                    autoComplete="off"
                  />
                  {(setRapidScanValue ? rapidScanValue : localBarcodeInput) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (setRapidScanValue) setRapidScanValue('');
                        setLocalBarcodeInput('');
                      }}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wider uppercase px-3 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap active:scale-98 shadow-xs"
                >
                  <span>⚡</span>
                  <span>{language === 'ar' ? 'إضافة' : 'Ajouter'}</span>
                </button>
              </form>
              <p className="text-[9px] text-slate-500 font-mono">
                💡 {language === 'ar' 
                  ? 'ملاحظة: هذا الحقل مخصص للمسح السريع المتكرر للسلع التي تملك رمز باركود.' 
                  : 'Astuce : Gardez l\'Autofocus activé pour scanner à la chaîne sans toucher la souris !'}
              </p>
            </div>

            {/* Search Input: 🔍 Rechercher un produit... */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRapidBarcodeSubmit(e);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills (Horizontal scrollable) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categoryPills.map((cat) => {
                const isSelected = (selectedCategory === cat) || (cat === 'Toutes' && (selectedCategory === 'Tous' || selectedCategory === 'Toutes'));
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat === 'Toutes' ? 'Tous' : cat);
                      playScanBeep();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-black shrink-0 transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 2-Column Product Cards Grid */}
            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[460px] xl:max-h-[520px] pr-0.5 custom-scrollbar">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-400 text-xs font-bold">
                  Aucun produit trouvé dans cette catégorie.
                </div>
              ) : (
                filteredProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleProductClick(prod)}
                    className="bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-blue-400 rounded-xl p-2.5 flex items-center gap-2.5 transition-all cursor-pointer active:scale-95 group text-left shadow-3xs"
                  >
                    {/* Image / Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform p-0.5">
                      {getProductVisual(prod).type === 'image' ? (
                        <img src={getProductVisual(prod).value} alt={prod.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xl">{getProductVisual(prod).value}</span>
                      )}
                    </div>

                    {/* Info: Name & Blue Price */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] font-black text-slate-800 line-clamp-2 leading-tight">
                        {prod.name}
                      </p>
                      <p className="text-xs font-black text-blue-600 font-mono mt-0.5">
                        {formatCurrency(getActiveProductPrice(prod))} DT
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Bottom Button: ▦ Plus de produits › */}
          <button
            type="button"
            onClick={() => setShowFullCatalogModal(true)}
            className="w-full mt-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2.5 px-4 font-black text-xs text-slate-700 flex items-center justify-between cursor-pointer transition-colors shadow-3xs"
          >
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-slate-500" />
              <span>Plus de produits</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

        </section>


        {/* ========================================================
            COLUMN 2: PANIER (CENTER) - col-span-5
            ======================================================== */}
        <section className="lg:col-span-5 xl:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          
          <div className="space-y-3 flex-1 flex flex-col">
            {/* Header: 🧺 Panier (X articles) + 🗑️ Vider */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-150">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-lg">🧺</span>
                <h2 className="text-slate-900 font-black text-base tracking-tight">Panier</h2>
                <span className="bg-emerald-100 text-emerald-800 font-black text-xs px-2.5 py-0.5 rounded-full font-mono">
                  {cart.reduce((sum, i) => sum + i.qty, 0)} articles
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (cart.length > 0) {
                    setCart([]);
                    playScanBeep();
                    showToast('Panier vidé', 'info');
                  }
                }}
                disabled={cart.length === 0}
                className="text-slate-500 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vider</span>
              </button>
            </div>

            {/* Table Header: Produit | Qté | Prix unitaire | Total */}
            <div className="grid grid-cols-12 gap-2 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider px-2 py-1">
              <span className="col-span-5">Produit</span>
              <span className="col-span-3 text-center">Qté</span>
              <span className="col-span-2 text-right">Prix unit.</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            {/* Items Listing Rows */}
            <div className="flex-1 overflow-y-auto max-h-[440px] xl:max-h-[500px] divide-y divide-slate-100 pr-1 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="py-24 text-center text-slate-300 font-bold text-sm">
                  <p className="text-3xl mb-2">🛒</p>
                  <p>Votre panier est vide</p>
                  <p className="text-[11px] text-slate-400 mt-1">Sélectionnez des articles à gauche ou scannez un code-barres</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const lineTotal = item.qty * (item.customPrice || item.product.sellingPrice);
                  const isSelected = selectedCartIdx === idx;
                  return (
                    <div
                      key={item.product.id}
                      onClick={() => setSelectedCartIdx(idx)}
                      className={`py-2.5 px-2 rounded-xl grid grid-cols-12 gap-2 items-center transition-colors cursor-pointer select-none ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Product Thumbnail + Title + Subtitle */}
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                          {getProductVisual(item.product).type === 'image' ? (
                            <img src={getProductVisual(item.product).value} alt={item.product.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-base">{getProductVisual(item.product).value}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate leading-tight">
                            {item.product.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">
                            ({item.product.category || 'مادة غذائية'})
                          </p>
                        </div>
                      </div>

                      {/* Quantity Stepper (− 1 +) */}
                      <div className="col-span-3 flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateQty(item.product.id, item.qty - 1);
                          }}
                          className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 cursor-pointer active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-black text-xs text-slate-900 w-5 text-center">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateQty(item.product.id, item.qty + 1);
                          }}
                          className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 cursor-pointer active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2 text-right font-mono text-xs text-slate-700 font-bold">
                        {formatCurrency(item.customPrice || item.product.sellingPrice)}
                      </div>

                      {/* Total + Delete */}
                      <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                        <span className="font-mono font-black text-xs text-slate-900">
                          {formatCurrency(lineTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateQty(item.product.id, 0);
                          }}
                          className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer text-xs p-0.5"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Actions Bar: + Ajouter un produit (F1) & ⌨ Clavier (F7) */}
          <div className="mt-3 bg-blue-50/50 border border-blue-100/80 rounded-xl p-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowQuickAddModal(true)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-black text-xs cursor-pointer active:scale-95 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                +
              </div>
              <span>Ajouter un produit (F1)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNumpadDrawer(true)}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer active:scale-95 transition-all bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-3xs"
            >
              <Keyboard className="w-4 h-4 text-slate-500" />
              <span>Clavier (F7)</span>
            </button>
          </div>

        </section>


        {/* ========================================================
            COLUMN 3: RÈGLEMENT (RIGHT) - col-span-3
            Integrated with:
            1. Client Bénéficiaire (from Caisse 2)
            2. Bon de Livraison vs Facture (from Caisse 2)
            3. Detailed Financial Summary
            4. Payment Methods 2x2
            5. Encaisser Button
            ======================================================== */}
        <section className="lg:col-span-3 xl:col-span-3 bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs">
          
          <div className="flex-1 flex flex-col min-h-0">
            {/* Solid Royal Blue Header Bar: 💳 Règlement 💳 */}
            <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between font-black shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 stroke-[2.5]" />
                <h2 className="text-base tracking-tight">Règlement</h2>
              </div>
              <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                {effectiveBLType === 'bl' ? 'B.L' : 'Facture'}
              </span>
            </div>

            {/* Scrollable controls body */}
            <div className="p-3.5 space-y-3 overflow-y-auto flex-1 custom-scrollbar max-h-[580px] xl:max-h-[640px]">
              
              {/* ----------------------------------------------------
                  PARTIE 1: CLIENT BÉNÉFICIAIRE (De Caisse 2)
                  ---------------------------------------------------- */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3 space-y-2 relative overflow-hidden shadow-3xs">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                
                <div className="flex items-center justify-between pl-1">
                  <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 select-none">
                    <span>👤</span>
                    <span>{language === 'ar' ? 'العميل المستفيد' : 'Client bénéficiaire'}</span>
                  </span>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      if (onOpenNewClientModal) onOpenNewClientModal();
                      else setShowCustomerModal(true);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer transition-all hover:translate-x-0.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Nouveau</span>
                  </button>
                </div>

                {/* Dropdown select for clients */}
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-semibold focus:outline-hidden focus:border-blue-500 cursor-pointer transition-colors text-slate-800"
                >
                  <option value="">⚙️ {language === 'ar' ? 'زبون عادي (غير مسجل - نقدي)' : 'Client Comptoir (Anonyme/Espèces)'}</option>
                  {allClients.map(cl => (
                    <option key={cl.id} value={cl.id}>
                      👤 {cl.name} {cl.discountRate !== undefined && cl.discountRate > 0 ? `(-${cl.discountRate}%)` : ''} {cl.currentBalance > 0 ? `(Crédit: ${formatCurrency(cl.currentBalance)} DT)` : ''}
                    </option>
                  ))}
                </select>

                {/* Active client discount banner */}
                {activeClient && activeClient.discountRate !== undefined && activeClient.discountRate > 0 && (
                  <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 rounded-lg px-2 py-1 select-none">
                    <span>🏷️</span>
                    <span>
                      {language === 'ar' 
                        ? `خصم تلقائي نشط: ${activeClient.discountRate}% على السلة` 
                        : `Remise automatique active : ${activeClient.discountRate}%`}
                    </span>
                  </div>
                )}

                {/* Credit Limit Exceeded Warning */}
                {creditLimitWarning && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-[10px] space-y-1 select-none animate-pulse">
                    <div className="flex items-center gap-1 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{language === 'ar' ? 'تجاوز سقف الائتمان المسموح به!' : 'Limite de Crédit Dépassée !'}</span>
                    </div>
                    <p className="leading-tight text-[9.5px]">
                      {language === 'ar'
                        ? `رصيد العميل الحالي (${formatCurrency(creditLimitWarning.currentBalance)} DT) يتجاوز السقف (${formatCurrency(creditLimitWarning.creditLimit)} DT).`
                        : `Solde actuel (${formatCurrency(creditLimitWarning.currentBalance)} DT) dépasse le plafond (${formatCurrency(creditLimitWarning.creditLimit)} DT).`}
                    </p>
                  </div>
                )}

                {/* Integrated Loyalty Slider */}
                {activeClient && db.settings?.enableLoyaltyPoints && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-indigo-700 flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Points Fidélité :</span>
                      </span>
                      <span className="font-black text-indigo-900 font-mono bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
                        {activeClient.loyaltyPoints || 0} pts
                      </span>
                    </div>
                    
                    {maxPointsRedeemable > 0 ? (
                      <div className="bg-indigo-50/60 border border-indigo-100 p-2 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-indigo-700 font-bold font-mono">
                          <span>Convertis:</span>
                          <span>{redeemedPoints} pts = -{formatCurrency(effectiveLoyaltyDiscount)} DT</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range"
                            min="0"
                            max={maxPointsRedeemable}
                            value={redeemedPoints}
                            onChange={(e) => setRedeemedPoints && setRedeemedPoints(Number(e.target.value))}
                            className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <button 
                            type="button"
                            onClick={() => setRedeemedPoints && setRedeemedPoints(maxPointsRedeemable)}
                            className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-black transition-colors shrink-0 cursor-pointer"
                          >
                            Max
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>


              {/* ----------------------------------------------------
                  PARTIE 2: BON DE LIVRAISON VS FACTURE (De Caisse 2)
                  ---------------------------------------------------- */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-3xs">
                
                {/* Segmented Switch BL vs Facture */}
                <div className="bg-slate-200/80 p-0.5 rounded-xl grid grid-cols-2 gap-1 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (setCashRegisterType) setCashRegisterType('bl');
                      if (setTaxRate) setTaxRate(0);
                      playScanBeep();
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      effectiveBLType === 'bl'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bon de Livraison</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (setCashRegisterType) setCashRegisterType('facture');
                      if (setTaxRate) setTaxRate(19);
                      playScanBeep();
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      effectiveBLType === 'facture'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Facture Officielle</span>
                  </button>
                </div>

                {/* Adjustments: Remise Globale & TVA */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                      {language === 'ar' ? 'تخفيض إجمالي (د.ت)' : 'Remise Globale (DT)'}
                    </label>
                    <input
                      type="number"
                      value={effectiveGlobalDiscount || ''}
                      placeholder="0 DT"
                      onChange={(e) => setGlobalDiscount && setGlobalDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs text-slate-800 font-mono font-bold focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">TVA (%)</label>
                    <select
                      value={effectiveTaxRate}
                      onChange={(e) => setTaxRate && setTaxRate(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs text-slate-800 font-mono font-bold focus:border-blue-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value={-1}>{language === 'ar' ? "حسب السلعة" : "TVA par article"}</option>
                      {(db.settings?.customTvaRates || [0, 7, 13, 19]).map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}% {rate === 0 ? (language === 'ar' ? "(معفى)" : "(Nulle)") : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>


              {/* ----------------------------------------------------
                  PARTIE 3: RÉSUMÉ FINANCIER & TOTAL TTC
                  ---------------------------------------------------- */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-600 font-medium">
                  <span>Sous-total HT :</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(effectiveSubTotal)} DT</span>
                </div>

                {effectiveClientDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 font-semibold text-[11.5px]">
                    <span>Remise Client ({activeClient?.discountRate}%) :</span>
                    <span className="font-mono font-black">- {formatCurrency(effectiveClientDiscount)} DT</span>
                  </div>
                )}

                {effectiveLoyaltyDiscount > 0 && (
                  <div className="flex justify-between items-center text-indigo-600 font-semibold text-[11.5px]">
                    <span>Remise Fidélité ({redeemedPoints} pts) :</span>
                    <span className="font-mono font-black">- {formatCurrency(effectiveLoyaltyDiscount)} DT</span>
                  </div>
                )}

                {effectiveGlobalDiscount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-semibold text-[11.5px]">
                    <span>Remise Ajoutée :</span>
                    <span className="font-mono font-black">- {formatCurrency(effectiveGlobalDiscount)} DT</span>
                  </div>
                )}

                {effectiveFinalTaxAmount > 0 && (
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>TVA :</span>
                    <span className="font-mono font-bold text-slate-800">{formatCurrency(effectiveFinalTaxAmount)} DT</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">
                    {effectiveBLType === 'bl' ? 'Total Net (BL)' : 'Total TTC'}
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-black text-2xl xl:text-3xl text-blue-600 tracking-tight">
                      {formatCurrency(finalTotal)}
                    </span>
                    <span className="font-black text-xs text-slate-800 ml-1">DT</span>
                  </div>
                </div>
              </div>


              {/* ----------------------------------------------------
                  PARTIE 4: MODES DE PAIEMENT (2x2 Grid)
                  ---------------------------------------------------- */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod('especes');
                    playScanBeep();
                  }}
                  className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer font-black text-xs active:scale-95 ${
                    selectedPaymentMethod === 'especes'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Espèces</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod('carte');
                    playScanBeep();
                  }}
                  className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer font-black text-xs active:scale-95 ${
                    selectedPaymentMethod === 'carte'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Carte Bancaire</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod('cheque');
                    playScanBeep();
                  }}
                  className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer font-black text-xs active:scale-95 ${
                    selectedPaymentMethod === 'cheque'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Chèque</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod('autre');
                    playScanBeep();
                  }}
                  className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer font-black text-xs active:scale-95 ${
                    selectedPaymentMethod === 'autre'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>Autre</span>
                </button>
              </div>

              {/* Quick Cash Presets if Espèces selected */}
              {selectedPaymentMethod === 'especes' && (
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-600">
                    <span>💵 Espèces Reçues</span>
                    {paidAmount && Number(paidAmount) > finalTotal && (
                      <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
                        Rendre: {formatCurrency(Number(paidAmount) - finalTotal)} DT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10.5px] font-mono font-black">
                    <button
                      type="button"
                      onClick={() => {
                        if (setPaidAmount) setPaidAmount(String(finalTotal));
                        playScanBeep();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95 shadow-3xs"
                    >
                      ⚡ Exact
                    </button>
                    {[10, 20, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          if (setPaidAmount) setPaidAmount(String(amt));
                          playScanBeep();
                        }}
                        className={`px-2 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer active:scale-95 ${
                          Number(paidAmount) === amt
                            ? 'bg-blue-600 text-white border-blue-700 shadow-3xs'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {amt} DT
                      </button>
                    ))}
                    {paidAmount && (
                      <button
                        type="button"
                        onClick={() => setPaidAmount && setPaidAmount('')}
                        className="px-1.5 py-1 text-slate-400 hover:text-rose-600 text-[10px] font-bold"
                        title="Effacer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Bottom Encaisser Button */}
          <div className="p-3.5 border-t border-slate-150 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (setPaymentMethod) {
                  setPaymentMethod(selectedPaymentMethod);
                }
                handleCheckoutClick();
              }}
              disabled={cart.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black py-3.5 px-4 rounded-xl text-base flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <CreditCard className="w-5 h-5" />
              <span>Encaisser {formatCurrency(finalTotal)} DT</span>
            </button>
          </div>

        </section>

      </div>


      {/* ========================================================
          MODALS & DRAWERS
          ======================================================== */}

      {/* 1. QUICK CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-start space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">👤</span>
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

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Rechercher par nom ou téléphone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-150 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedPartnerId('');
                  setShowCustomerModal(false);
                }}
                className={`w-full p-3 text-xs text-start flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                  !selectedPartnerId ? 'bg-blue-50 font-black text-blue-900' : 'text-slate-700'
                }`}
              >
                <span>👤 Client Comptoir (Anonyme)</span>
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
                      showToast(`Client sélectionné : ${client.name}`, 'success');
                    }}
                    className={`w-full p-3 text-xs text-start flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                      isSelected ? 'bg-blue-50 font-black text-blue-900' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold">{client.name}</p>
                      {client.phone && <p className="text-[10px] text-slate-400 font-mono">{client.phone}</p>}
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
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. NUMPAD / CLAVIER (F7) MODAL */}
      {showNumpadDrawer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 text-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-cyan-400" />
                <h3 className="font-black text-sm">Clavier Tactile & Numpad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNumpadDrawer(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Target Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setNumpadTarget('barcode')}
                className={`py-1.5 rounded-lg transition-all ${
                  numpadTarget === 'barcode' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Code-barres
              </button>
              <button
                type="button"
                onClick={() => setNumpadTarget('qty')}
                className={`py-1.5 rounded-lg transition-all ${
                  numpadTarget === 'qty' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Quantité
              </button>
            </div>

            {/* Display screen */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-right font-mono font-black text-2xl text-cyan-400 shadow-inner">
              {numpadValue || '0'}
            </div>

            {/* Numpad Keys */}
            <div className="grid grid-cols-3 gap-2">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpadKey(k)}
                  className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-3 text-xl font-black rounded-xl text-white transition-all cursor-pointer border border-slate-750"
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleNumpadKey('C')}
                className="bg-rose-600 hover:bg-rose-700 active:scale-95 py-3 text-base font-black rounded-xl text-white cursor-pointer"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('0')}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-3 text-xl font-black rounded-xl text-white cursor-pointer border border-slate-750"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('.')}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-3 text-xl font-black rounded-xl text-white cursor-pointer border border-slate-750"
              >
                .
              </button>
            </div>

            <button
              type="button"
              onClick={handleApplyNumpad}
              className="w-full bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white font-black py-3 rounded-xl text-sm shadow-md transition-all cursor-pointer"
            >
              Valider (Entrée)
            </button>
          </div>
        </div>
      )}

      {/* 3. QUICK ADD (F1) MODAL */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-start space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">+</span>
                <span>Ajouter un produit (F1)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (quickBarcodeInput.trim()) {
                  const p = (db.products || []).find(x => x.code === quickBarcodeInput.trim() || x.code.endsWith(quickBarcodeInput.trim()));
                  if (p) {
                    handleProductClick(p);
                    showToast(`Ajouté : ${p.name}`, 'success');
                    setQuickBarcodeInput('');
                    setShowQuickAddModal(false);
                  } else {
                    showToast(`Code-barres [${quickBarcodeInput}] non reconnu`, 'error');
                  }
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Code-barres ou référence
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Scannez ou tapez le code..."
                  value={quickBarcodeInput}
                  onChange={(e) => setQuickBarcodeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono font-bold text-sm focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. FULL CATALOG MODAL */}
      {showFullCatalogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Grid className="w-5 h-5 text-blue-600" />
                <span>Tous les Produits du Catalogue</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowFullCatalogModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pr-1 custom-scrollbar">
              {(db.products || []).map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => {
                    handleProductClick(prod);
                    setShowFullCatalogModal(false);
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl p-3 flex flex-col items-center justify-between text-center cursor-pointer transition-all active:scale-95 min-h-[130px]"
                >
                  <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-center overflow-hidden p-1">
                    {getProductVisual(prod).type === 'image' ? (
                      <img src={getProductVisual(prod).value} alt={prod.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl">{getProductVisual(prod).value}</span>
                    )}
                  </div>
                  <p className="text-xs font-black text-slate-800 line-clamp-2 mt-2">
                    {prod.name}
                  </p>
                  <p className="text-xs font-black text-blue-600 font-mono mt-1">
                    {formatCurrency(getActiveProductPrice(prod))} DT
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
