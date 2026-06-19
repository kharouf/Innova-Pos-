import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseState, Product, Partner, Invoice, InvoiceItem } from '../types';
import { getProductVisual, isProductInPromo, getActiveProductPrice } from '../utils/db';
import { useLanguage } from '../utils/LanguageContext';
import { safeLocalStorage, checkIsIframe } from '../utils/storage';
import { Html5Qrcode } from 'html5-qrcode';
import { showToast } from '../utils/toast';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  UserPlus, 
  CheckCircle,
  Receipt,
  FileSpreadsheet,
  Coins,
  Printer,
  Camera,
  X,
  ScanLine,
  Volume2,
  VolumeX,
  ShieldCheck,
  Smartphone,
  Send,
  Key,
  AlertCircle,
  Phone,
  RefreshCw,
  Download,
  Maximize,
  Minimize,
  Lock,
  Unlock,
  History
} from 'lucide-react';
import { downloadInvoicePDF } from '../utils/pdfGenerator';

interface POSProps {
  db: DatabaseState;
  onUpdateDb: (updatedDb: DatabaseState) => void;
  onNavigate: (tab: string) => void;
}

export default function POS({ db, onUpdateDb, onNavigate }: POSProps) {
  const { language, t, formatCurrency } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn(`Error exiting fullscreen: ${err.message}`);
        });
      }
    }
  };
  const [cart, setCart] = useState<{ product: Product; qty: number; customPrice: number }[]>([]);
  const [addedParticles, setAddedParticles] = useState<{ id: string; productId: string; text: string }[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [isReturnMode, setIsReturnMode] = useState<boolean>(false);
  
  // Custom rapid price item addition (Vente libre)
  const [customItemPrice, setCustomItemPrice] = useState<string>('');
  const [customItemName, setCustomItemName] = useState<string>('');
  
  // Dedicated rapid barcode scan input state & ref
  const [rapidScanValue, setRapidScanValue] = useState<string>('');
  const [autoFocusScanField, setAutoFocusScanField] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('pos_autofocus_scan_field');
    return saved === null ? true : saved === 'true'; // Default to true so users scan automatically out of the box
  });
  const [isRapidScanFocused, setIsRapidScanFocused] = useState<boolean>(false);
  const rapidScanInputRef = useRef<HTMLInputElement | null>(null);
  
  // Loyalty redemption state
  const [redeemedPoints, setRedeemedPoints] = useState<number>(0);

  // Monitor total item counts for addition animation
  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const prevTotalItemsRef = useRef(totalItemsCount);
  const [triggerPulse, setTriggerPulse] = useState(false);

  useEffect(() => {
    if (totalItemsCount > prevTotalItemsRef.current) {
      setTriggerPulse(true);
      const timer = setTimeout(() => setTriggerPulse(false), 500);
      prevTotalItemsRef.current = totalItemsCount;
      return () => clearTimeout(timer);
    }
    prevTotalItemsRef.current = totalItemsCount;
  }, [totalItemsCount]);

  useEffect(() => {
    setRedeemedPoints(0);
  }, [selectedPartnerId]);

  // Checkout adjustments
  const [cashRegisterType, setCashRegisterType] = useState<'bl' | 'facture'>('bl');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(-1); // -1: Itemized TVA par article, >=0: Global flat taxrate
  const [paidAmount, setPaidAmount] = useState<string>('');

  // Virtual keypad configuration states
  const [activeNumpadTarget, setActiveNumpadTarget] = useState<'rapidScan' | 'search' | 'paidAmount' | 'discount' | 'customPrice' | 'lastItemQty'>('rapidScan');
  const [keyboardLayout, setKeyboardLayout] = useState<'numeric' | 'alphabetic'>('numeric');
  const [alphabeticType, setAlphabeticType] = useState<'azerty' | 'qwerty'>('azerty');
  const [isNumpadExpanded, setIsNumpadExpanded] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('pos_numpad_expanded');
    return saved === 'true'; // Default to false (closed by default)
  });

  // 💵 Cash Drawer (Tiroir Caisse) State Management
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState<boolean>(false);
  const [showCashDrawerPanel, setShowCashDrawerPanel] = useState<boolean>(false);
  const [cashDrawerLogs, setCashDrawerLogs] = useState<Array<{ id: string; time: string; action: string; user: string; amount?: number }>>(() => {
    try {
      const saved = safeLocalStorage.getItem('pos_cash_drawer_logs');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      { id: '1', time: new Date(Date.now() - 3600000).toLocaleTimeString(), action: 'Fonds de caisse initial configuré', user: 'Administrateur', amount: 150.0 }
    ];
  });

  const [drawerCashComposition, setDrawerCashComposition] = useState<Record<string, number>>(() => {
    try {
      const saved = safeLocalStorage.getItem('pos_cash_drawer_composition');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      '50DT': 1,
      '20DT': 3,
      '10DT': 4,
      '5DT': 5,
      '1DT': 15,
      '0.5DT': 20,
      '0.2DT': 25,
      '0.1DT': 30
    };
  });

  // Calculate total cash inside the drawer based on banknote composition
  const totalDrawerCash = useMemo(() => {
    const values: Record<string, number> = {
      '50DT': 50,
      '20DT': 20,
      '10DT': 10,
      '5DT': 5,
      '1DT': 1,
      '0.5DT': 0.5,
      '0.2DT': 0.2,
      '0.1DT': 0.1
    };
    return Object.entries(drawerCashComposition).reduce((sum: number, [denom, qty]) => {
      return sum + ((values[denom] || 0) * Number(qty || 0));
    }, 0);
  }, [drawerCashComposition]);

  const expectedCashAmount = useMemo(() => {
    const initialFund = 150.0;
    const cashIn = (db.payments || [])
      .filter((p: any) => p.type === 'payment_received')
      .reduce((sum, current) => sum + current.amount, 0);
    const cashOut = (db.payments || [])
      .filter((p: any) => p.type === 'payment_sent')
      .reduce((sum, current) => sum + current.amount, 0);
    return initialFund + cashIn - cashOut;
  }, [db]);

  const cashDrawerDiscrepancy = totalDrawerCash - expectedCashAmount;

  // Unified audio trigger for satisfying coin/drawer ringing sound
  const playCashRegisterSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1480, audioCtx.currentTime); 
      osc1.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.35); 
      
      gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2400, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.18);
      
      gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.4);
      osc2.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("AudioContext tone blocked or unsupported", e);
    }
  };

  const handleManualDrawerEject = () => {
    let activeName = 'Administrateur';
    try {
      const savedUser = safeLocalStorage.getItem('pos_active_user');
      if (savedUser) {
        activeName = JSON.parse(savedUser).name || activeName;
      }
    } catch (_) {}

    setIsCashDrawerOpen(true);
    playCashRegisterSound();

    const newLog = {
      id: String(Date.now()),
      time: new Date().toLocaleTimeString(),
      action: language === 'ar' ? 'فتح يدوي لدرج النقود' : 'Ouverture manuelle du tiroir',
      user: activeName
    };

    const nextLogs = [newLog, ...cashDrawerLogs];
    setCashDrawerLogs(nextLogs);
    safeLocalStorage.setItem('pos_cash_drawer_logs', JSON.stringify(nextLogs));

    showToast(
      language === 'ar' ? '🔓 تم فتح درج الكاشير بنجاح!' : '🔓 Tiroir caisse éjecté avec succès !',
      'success'
    );

    // Auto close visual slider back in 4 seconds
    setTimeout(() => {
      setIsCashDrawerOpen(false);
    }, 4500);
  };

  const toggleNumpadExpanded = () => {
    setIsNumpadExpanded(prev => {
      const next = !prev;
      safeLocalStorage.setItem('pos_numpad_expanded', String(next));
      return next;
    });
  };

  const handleNumpadKeyPress = (key: string) => {
    // Play scan tone
    playScanBeep();

    if (activeNumpadTarget === 'lastItemQty') {
      if (cart.length === 0) {
        showToast(language === 'ar' ? 'السلة فارغة' : 'Le panier est vide', 'error');
        return;
      }
      const lastItemIndex = cart.length - 1;
      const lastItem = cart[lastItemIndex];
      let currentValStr = String(Math.abs(lastItem.qty));

      if (key === 'C') {
        handleUpdateQty(lastItem.product.id, 0);
      } else if (key === '⌫') {
        const newValStr = currentValStr.slice(0, -1);
        const val = newValStr ? Number(newValStr) : 1;
        handleUpdateQty(lastItem.product.id, lastItem.qty < 0 ? -val : val);
      } else if (key === ' ') {
        // Space doesn't affect qty
        return;
      } else {
        const newValStr = currentValStr === '0' || currentValStr === '1' && currentValStr.length === 1 ? key : currentValStr + key;
        const val = Number(newValStr);
        handleUpdateQty(lastItem.product.id, lastItem.qty < 0 ? -val : val);
      }
      return;
    }

    let currentVal = '';
    let setter: (val: string) => void = () => {};

    if (activeNumpadTarget === 'search') {
      currentVal = searchQuery;
      setter = setSearchQuery;
    } else if (activeNumpadTarget === 'rapidScan') {
      currentVal = rapidScanValue;
      setter = setRapidScanValue;
    } else if (activeNumpadTarget === 'paidAmount') {
      currentVal = paidAmount;
      setter = setPaidAmount;
    } else if (activeNumpadTarget === 'customPrice') {
      currentVal = customItemPrice;
      setter = setCustomItemPrice;
    } else if (activeNumpadTarget === 'discount') {
      currentVal = String(globalDiscount || '');
      setter = (val) => setGlobalDiscount(Math.max(0, Number(val) || 0));
    }

    if (key === 'C') {
      setter('');
    } else if (key === '⌫') {
      setter(currentVal.slice(0, -1));
    } else if (key === ' ') {
      setter(currentVal + ' ');
    } else if (key === '.') {
      if (!currentVal.includes('.')) {
        setter((currentVal || '0') + '.');
      }
    } else {
      const isNumericTarget = ['paidAmount', 'discount', 'customPrice'].includes(activeNumpadTarget);
      if (isNumericTarget && currentVal === '0') {
        setter(key);
      } else {
        setter(currentVal + key);
      }
    }
  };
  
  // Quick Client Creation
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientDiscountRate, setNewClientDiscountRate] = useState('');

  // Active Checkout Printable Preview
  const [printedInvoice, setPrintedInvoice] = useState<Invoice | null>(null);
  const [printFormat, setPrintFormat] = useState<'a4' | 'ticket'>(() => {
    const saved = safeLocalStorage.getItem('pos_print_format');
    if (saved === 'a4' || saved === 'ticket') return saved;
    return db.settings?.activitySector === 'superette' ? 'ticket' : 'a4';
  });
  const [autoPrint, setAutoPrint] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('pos_auto_print');
    // Default of autoPrint set to false to prevent blocking / freezing OS print dialogues during checkout validation
    return saved === null ? false : saved === 'true';
  });

  const isMounted = useRef(true);
  const closeTimeoutRef = useRef<any>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const closePrintModal = () => {
    if (!isMounted.current) return;
    setPrintedInvoice(null);
    setSelectedPartnerId('');
    setSearchQuery('');
    setCart([]);
    setPaidAmount('');
    setGlobalDiscount(0);
    setRedeemedPoints(0);
    setIsReturnMode(false);
    onNavigate('pos');
  };

  // Ensure print-portal div exists in document.body
  useEffect(() => {
    let portalDiv = document.getElementById('print-portal');
    if (!portalDiv) {
      portalDiv = document.createElement('div');
      portalDiv.id = 'print-portal';
      document.body.appendChild(portalDiv);
    }
    return () => {
      const exist = document.getElementById('print-portal');
      if (exist) {
        exist.remove();
      }
    };
  }, []);

  // Camera Barcode Scanner State and Refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedText, setLastScannedText] = useState<string>('');
  const [scanToast, setScanToast] = useState<{ id: string; nameAr: string; nameFr: string; qty: number } | null>(null);
  const [isBeepEnabled, setIsBeepEnabled] = useState<boolean>(() => {
    return safeLocalStorage.getItem('pos_scan_beep') !== 'false';
  });
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimesRef = useRef<Record<string, number>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const paidAmountInputRef = useRef<HTMLInputElement | null>(null);

  const [isScanHistoryOpen, setIsScanHistoryOpen] = useState(false);
  const [scanHistory, setScanHistory] = useState<{ code: string; timestamp: string; productName?: string; success: boolean }[]>(() => {
    const saved = safeLocalStorage.getItem('pos_scan_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isFlashActive, setIsFlashActive] = useState(false);

  // States for confirming sale using simulated SMS OTP
  const [useOtpVerification, setUseOtpVerification] = useState<boolean>(false);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpPhoneNumber, setOtpPhoneNumber] = useState<string>('');
  const [otpCodeGenerated, setOtpCodeGenerated] = useState<string>('');
  const [otpCodeEntered, setOtpCodeEntered] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState<boolean>(false);

  // Sync scan history to localStorage to survive page reloads
  useEffect(() => {
    safeLocalStorage.setItem('pos_scan_history', JSON.stringify(scanHistory));
  }, [scanHistory]);

  // Clean Web Audio API scanner beep indicator sound generator
  const playScanBeep = () => {
    if (!isBeepEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Standard POS beep frequency (800Hz)
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12); // Fast decay
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (err) {
      console.warn('AudioContext scanner beep failed:', err);
    }
  };

  // Resolves standard barcode matches and EAN-13 weight/price embedded balance barcodes
  const handleResolveAndAddProduct = (barcodeRaw: string): { success: boolean; productName?: string; qty?: number } => {
    const cleaned = barcodeRaw.trim();
    if (!cleaned) return { success: false };

    // 1) First check for an exact match for the whole barcode in db
    let matched = db.products.find(
      p => p.code === cleaned || p.code.toLowerCase() === cleaned.toLowerCase()
    );

    if (matched) {
      if (!isReturnMode && matched.stock <= 0) {
        showToast(language === 'ar' 
          ? `⚠️ تحذير: السلعة "${matched.name}" نفدت من المخزون !` 
          : `⚠️ Attention: Le produit "${matched.name}" est en rupture de stock !`,
          'info'
        );
      }
      const qtyToAdd = isReturnMode ? -1 : 1;
      // Add exact match to cart
      setCart(prevCart => {
        const existingIdx = prevCart.findIndex(item => item.product.id === matched!.id);
        if (existingIdx > -1) {
          const updated = [...prevCart];
          const newQty = updated[existingIdx].qty + qtyToAdd;
          if (newQty === 0) {
            return prevCart.filter(item => item.product.id !== matched!.id);
          }
          updated[existingIdx] = {
            ...updated[existingIdx],
            qty: newQty
          };
          return updated;
        }
        return [...prevCart, { product: matched!, qty: qtyToAdd, customPrice: getActiveProductPrice(matched!) }];
      });
      return { success: true, productName: matched.name, qty: qtyToAdd };
    }

    // 2) If not matched exactly, check if it's a scale barcode (13 digits starting with 20-29)
    if (cleaned.length === 13 && cleaned.startsWith('2') && /^\d+$/.test(cleaned)) {
      const prefix = cleaned.substring(0, 2);
      const prefixNum = parseInt(prefix, 10);
      if (prefixNum >= 20 && prefixNum <= 29) {
        const sku = cleaned.substring(2, 7); // 5 digits, e.g. "12345"
        const priceStr = cleaned.substring(7, 12); // 5 digits, e.g. "02500" -> 2.500
        const totalVal = parseFloat(priceStr) / 1000; // e.g. 2.500

        // Find product by SKU or PREFIX + SKU
        matched = db.products.find(
          p => p.code === sku || 
               p.code === (prefix + sku) || 
               p.code.toLowerCase() === sku.toLowerCase() ||
               p.code.replace(/^0+/, '') === sku.replace(/^0+/, '')
        );

        if (matched) {
          if (!isReturnMode && matched.stock <= 0) {
            showToast(language === 'ar' 
              ? `⚠️ تحذير: السلعة "${matched.name}" نفدت من المخزون !` 
              : `⚠️ Attention: Le produit "${matched.name}" est en rupture de stock !`,
              'info'
            );
          }

          const unitPrice = getActiveProductPrice(matched);
          let calculatedQty = 1;
          let customPriceToUse = getActiveProductPrice(matched);

          // Check if product unit represents weight (e.g., Kg, kg, g, Grammes, etc.)
          const isWeightUnit = matched.unit && (
            matched.unit.toLowerCase().includes('k') || 
            matched.unit.toLowerCase().includes('g') || 
            matched.unit.includes('كيلو') || 
            matched.unit.includes('كغ') ||
            matched.unit.includes('وزن')
          );

          if (isWeightUnit) {
            // It's a weight-embedded scale barcode (e.g. 01500 represents 1.500 Kg)
            calculatedQty = totalVal;
            customPriceToUse = getActiveProductPrice(matched);
          } else {
            // It's a price-embedded scale barcode (e.g. 02500 represents 2.500 DT total price)
            if (unitPrice > 0) {
              calculatedQty = Math.round((totalVal / unitPrice) * 1000) / 1000;
              customPriceToUse = getActiveProductPrice(matched);
            } else {
              // Unit price is 0, fall back to setting custom price directly
              customPriceToUse = totalVal;
              calculatedQty = 1;
            }
          }

          const finalCalculatedQty = isReturnMode ? -calculatedQty : calculatedQty;

          setCart(prevCart => {
            const existingIdx = prevCart.findIndex(item => item.product.id === matched!.id);
            if (existingIdx > -1) {
              const updated = [...prevCart];
              const newQty = Math.round((updated[existingIdx].qty + finalCalculatedQty) * 1000) / 1000;
              if (newQty === 0) {
                return prevCart.filter(item => item.product.id !== matched!.id);
              }
              updated[existingIdx] = {
                ...updated[existingIdx],
                qty: newQty
              };
              return updated;
            }
            return [...prevCart, { product: matched!, qty: finalCalculatedQty, customPrice: customPriceToUse }];
          });

          return { success: true, productName: matched.name, qty: finalCalculatedQty };
        }
      }
    }

    return { success: false };
  };

  // Modern success scanner matcher helper to add product to the cart continuously
  const handleBarcodeScanSuccess = (rawCode: string) => {
    const cleaned = rawCode.trim();
    if (!cleaned) return;

    // Throttle duplicate reads of the exact same code to 1600ms
    const now = Date.now();
    const lastTime = lastScanTimesRef.current[cleaned] || 0;
    if (now - lastTime < 1600) {
      return; 
    }
    lastScanTimesRef.current[cleaned] = now;

    // Resolve and add the barcode product safely (Handles standard & Scale barcodes)
    const result = handleResolveAndAddProduct(cleaned);

    // Trigger visual scan flash animation
    setIsFlashActive(true);
    setTimeout(() => {
      setIsFlashActive(false);
    }, 200);

    // Play successful scan beep
    playScanBeep();

    // Capture to recent scan history log (capped to last 5 entries)
    setScanHistory(prev => {
      const newEntry = {
        code: cleaned,
        timestamp: new Date().toLocaleTimeString(undefined, { hour12: false }),
        productName: result.success ? result.productName : undefined,
        success: result.success
      };
      return [newEntry, ...prev].slice(0, 5);
    });

    if (!result.success) {
      // Unrecognized barcode feedback or logs, skip or display feedback to help identify new product code
      console.log(`Scanned unknown barcode: ${cleaned}`);
      return;
    }

    setLastScannedText(cleaned);
    setScanToast({
      id: `toast-${Date.now()}`,
      nameAr: result.productName || '',
      nameFr: result.productName || '',
      qty: result.qty || 1
    });
  };

  // Dismiss scan toast after timeout
  useEffect(() => {
    if (scanToast) {
      const timer = setTimeout(() => {
        setScanToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scanToast]);

  // Manage camera barcode capture flow
  useEffect(() => {
    if (isCameraActive) {
      setCameraError(null);
      
      // Brief timer to guarantee browser rendering of video parent placeholder
      const startTimer = setTimeout(() => {
        try {
          const scannerInstance = new Html5Qrcode('pos-camera-scanner-view');
          html5QrCodeRef.current = scannerInstance;

          scannerInstance.start(
            { facingMode: 'environment' },
            {
              fps: 15,
              // Design responsive search rectangular box overlay centered and optimized for scanning labels
              qrbox: (w, h) => {
                const len = Math.min(w, h);
                return {
                  width: Math.floor(w * 0.82),
                  height: Math.floor(len * 0.45)
                };
              },
              aspectRatio: 1.777778
            },
            (decodedText) => {
              handleBarcodeScanSuccess(decodedText);
            },
            () => {
              // Frame scan failure handles are ignored to prevent noise in browser console log
            }
          ).catch((err) => {
            console.error('Camera startup exception:', err);
            setCameraError(
              language === 'ar'
                ? '❌ تعذر تشغيل الكاميرا! يرجى السماح بالوصول للكاميرا في المتصفح.'
                : '❌ Impossible d\'accéder à la caméra. Autorisez l\'accès s\'il vous plaît.'
            );
            setIsCameraActive(false);
          });
        } catch (err) {
          console.error('Html5Qrcode instance creation exception:', err);
          setCameraError(
            language === 'ar'
              ? '❌ جهاز الكاميرا غير مهيأ أو غير مدعوم في متصفحك.'
              : '❌ La caméra n\'est pas supportée sur ce navigateur.'
          );
          setIsCameraActive(false);
        }
      }, 300);

      return () => {
        clearTimeout(startTimer);
        if (html5QrCodeRef.current) {
          const instance = html5QrCodeRef.current;
          html5QrCodeRef.current = null;
          if (instance.isScanning) {
            instance.stop().catch(err => console.warn('Clean up camera stop failed:', err));
          }
        }
      };
    } else {
      if (html5QrCodeRef.current) {
        const instance = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        if (instance.isScanning) {
          instance.stop().catch(err => console.warn('Stop active camera stream failed:', err));
        }
      }
    }
  }, [isCameraActive]);

  // Always show ticket preview modal first so the user can see it before printing.
  // There is no automatic, silent printing or immediate popup closing, honoring the user's workflow.

  // Global keyboard shortcuts: F2 (clear/empty cart), F3 (focus search input), F4 (initiate checkout)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const typingInInput = activeEl && (
        activeEl.tagName.toLowerCase() === 'input' ||
        activeEl.tagName.toLowerCase() === 'textarea'
      );

      if (e.key === 'F2') {
        e.preventDefault();
        setCart([]);
      } else if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setActiveNumpadTarget('search');
        setKeyboardLayout('alphabetic');
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          paidAmountInputRef.current?.focus();
          paidAmountInputRef.current?.select();
          setActiveNumpadTarget('paidAmount');
          setKeyboardLayout('numeric');
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsReturnMode(prev => !prev);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setShowNewClientModal(true);
      } else if (e.key === '+') {
        if (!typingInInput && cart.length > 0) {
          e.preventDefault();
          const lastItem = cart[cart.length - 1];
          handleUpdateQty(lastItem.product.id, lastItem.qty + 1);
          playScanBeep();
        }
      } else if (e.key === '-') {
        if (!typingInInput && cart.length > 0) {
          e.preventDefault();
          const lastItem = cart[cart.length - 1];
          handleUpdateQty(lastItem.product.id, lastItem.qty - 1);
          playScanBeep();
        }
      } else if (e.key === '*') {
        if (!typingInInput) {
          e.preventDefault();
          const el = document.querySelector('input[placeholder*="Prix libre"]');
          if (el) {
            (el as HTMLInputElement).focus();
            (el as HTMLInputElement).select();
            setActiveNumpadTarget('customPrice');
            setKeyboardLayout('numeric');
          }
        }
      } else if (e.key === '/') {
        if (!typingInInput) {
          e.preventDefault();
          rapidScanInputRef.current?.focus();
          rapidScanInputRef.current?.select();
          setActiveNumpadTarget('rapidScan');
          setKeyboardLayout('numeric');
        }
      } else if (e.key === 'Escape') {
        setPrintedInvoice(null);
        setShowNewClientModal(false);
        setShowOtpModal(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [cart]);

  // Extract all categories
  const categories = useMemo(() => {
    return ['Tous', ...Array.from(new Set((db.products || []).map(p => p.category)))];
  }, [db.products]);

  // Filtered list of products for catalog grid
  const filteredProducts = useMemo(() => {
    return (db.products || []).filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.includes(searchQuery);
      const matchCategory = selectedCategory === 'Tous' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [db.products, searchQuery, selectedCategory]);

  const clients = useMemo(() => {
    return (db.partners || []).filter(p => p.type === 'client');
  }, [db.partners]);

  // Quick Action: Add item or increment
  const handleAddToCart = (product: Product) => {
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
    } else {
      setCart([...cart, { product, qty: qtyToAdd, customPrice: getActiveProductPrice(product) }]);
    }
    
    // Spawn a beautiful flying particle on cart addition
    const particleId = `${product.id}-${Date.now()}-${Math.random()}`;
    const text = isReturnMode ? '-1' : '+1';
    setAddedParticles(prev => [...prev, { id: particleId, productId: product.id, text }]);
    setTimeout(() => {
      setAddedParticles(prev => prev.filter(p => p.id !== particleId));
    }, 1000);
    
    // Play the barcode scanner beep sound for audio confirmation
    playScanBeep();
  };

  // Add a custom unregistered product by price directly (Vente Libre / Saisie Rapide)
  const handleAddCustomItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const price = parseFloat(customItemPrice);
    if (isNaN(price) || price <= 0) {
      showToast(language === 'ar' ? '⚠️ الرجاء إدخال سعر صحيح أكبر من الصفر' : '⚠️ Veuillez entrer un prix valide supérieur à zéro.', 'error');
      return;
    }

    const timestamp = Date.now();
    const customProduct: Product = {
      id: `custom-${timestamp}`,
      code: `VLIBRE-${timestamp}`,
      name: customItemName.trim() || (language === 'ar' ? 'مبلغ مباشر / Vente Libre' : 'Vente Libre (Saisie directe)'),
      category: 'Général',
      purchasePrice: 0,
      sellingPrice: price,
      stock: 99999,
      minAlertQty: 0,
      unit: 'U',
    };

    const qtyToAdd = isReturnMode ? -1 : 1;
    setCart([...cart, { product: customProduct, qty: qtyToAdd, customPrice: price }]);
    setCustomItemPrice('');
    setCustomItemName('');
    
    // Play scan sound
    playScanBeep();
  };

  // Maintain focus on the rapid barcode scanner field if enabled
  useEffect(() => {
    if (!autoFocusScanField) return;

    // Disable global physical focus-stealing click handler on touch/mobile devices to prevent 
    // the virtual/on-screen keyboard from popping up unexpectedly when tapping around the POS.
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      console.log("[INNOVA FOCUS] Touch/mobile device detected. Bypassing global click focus stealer.");
      return;
    }

    // Focus immediately on mount / state activate
    const triggerFocus = () => {
      if (rapidScanInputRef.current && document.activeElement !== rapidScanInputRef.current) {
        rapidScanInputRef.current.focus();
      }
    };
    
    // Tiny delay to ensure DOM is fully ready
    const initTimer = setTimeout(triggerFocus, 150);

    const handleGlobalClick = (e: MouseEvent) => {
      const activeElement = document.activeElement;
      const clickedTagName = (e.target as HTMLElement)?.tagName?.toLowerCase();
      
      // If clicking inside another interactive input/button/select/dialog, don't steal focus
      if (
        clickedTagName === 'input' ||
        clickedTagName === 'select' ||
        clickedTagName === 'textarea' ||
        clickedTagName === 'button' ||
        (e.target as HTMLElement)?.closest('button') ||
        (e.target as HTMLElement)?.closest('form') ||
        (e.target as HTMLElement)?.closest('[role="dialog"]') ||
        (activeElement && (
          activeElement.tagName.toLowerCase() === 'input' || 
          activeElement.tagName.toLowerCase() === 'textarea' ||
          activeElement.tagName.toLowerCase() === 'select'
        ))
      ) {
        // Allow standard interaction with other inputs
        return;
      }
      
      // Delay slightly to allow any active click event or tab change to complete
      setTimeout(() => {
        if (rapidScanInputRef.current && document.activeElement !== rapidScanInputRef.current) {
          rapidScanInputRef.current.focus();
        }
      }, 100);
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      clearTimeout(initTimer);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [autoFocusScanField]);

  // Global Keyboard listener for physical barcode scanner guns
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      
      // If user typing is already focused on any text input/select/textarea, do NOT steal focus.
      if (
        activeEl && (
          activeEl.tagName.toLowerCase() === 'input' ||
          activeEl.tagName.toLowerCase() === 'textarea' ||
          activeEl.tagName.toLowerCase() === 'select' ||
          activeEl.closest('[role="dialog"]') ||
          activeEl.closest('.modal') ||
          activeEl.closest('[id^="radix-"]')
        )
      ) {
        return;
      }

      // Ignore common modifier key operations like copy/paste, reload, etc.
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // We only handle single key presses (alphanumeric digits / symbols sent by mechanical barcode laser gun)
      if (e.key && e.key.length === 1) {
        if (rapidScanInputRef.current) {
          e.preventDefault();
          rapidScanInputRef.current.focus();
          setRapidScanValue(e.key);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Handler for instant barcode resolution and addition to cart
  const handleRapidBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = rapidScanValue.trim();
    if (!barcode) return;

    // Resolve and add standard or scale barcodes
    const result = handleResolveAndAddProduct(barcode);

    if (result.success) {
      // Log to history
      setScanHistory(prev => {
        const newEntry = {
          code: barcode,
          timestamp: new Date().toLocaleTimeString(undefined, { hour12: false }),
          productName: result.productName,
          success: true,
        };
        return [newEntry, ...prev].slice(0, 5);
      });

      // Show screen flash impact
      setIsFlashActive(true);
      setTimeout(() => setIsFlashActive(false), 200);

      // Play scanner beep
      playScanBeep();

      // Clear the input instantly so the cashier can scan again immediately
      setRapidScanValue('');

      // Show toast
      setScanToast({
        id: `toast-${Date.now()}`,
        nameAr: result.productName || '',
        nameFr: result.productName || '',
        qty: result.qty || 1
      });
      setTimeout(() => setScanToast(null), 2500);

    } else {
      // Not registered in system
      // Log failed scan to audit trail
      setScanHistory(prev => {
        const newEntry = {
          code: barcode,
          timestamp: new Date().toLocaleTimeString(undefined, { hour12: false }),
          productName: language === 'ar' ? '⚠️ سلعة غير معرّفة' : '⚠️ Article non enregistré',
          success: false,
        };
        return [newEntry, ...prev].slice(0, 5);
      });

      showToast(
        language === 'ar'
          ? `⚠️ الرمز [${barcode}] غير مسجل بالمنظومة. الرجاء إضافته أو التثبت منه.`
          : `⚠️ Le code-barres [${barcode}] n'est pas enregistré. Veuillez d'abord l'ajouter aux produits.`,
        'error'
      );
      setRapidScanValue('');
    }

    // Refocus scan box on submits
    if (rapidScanInputRef.current) {
      rapidScanInputRef.current.focus();
    }
  };

  // Modify cart quantity
  const handleUpdateQty = (productId: string, qty: number) => {
    if (qty === 0) {
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, qty };
      }
      return item;
    }));
  };

  // Modify Custom selling price
  const handleUpdatePrice = (productId: string, price: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, customPrice: Math.max(0, price) };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Computed Values
  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.qty * item.customPrice), 0);
  }, [cart]);

  const activePartner = useMemo(() => {
    return db.partners.find(p => p.id === selectedPartnerId);
  }, [db.partners, selectedPartnerId]);

  const clientDiscount = useMemo(() => {
    if (!activePartner || activePartner.discountRate === undefined || activePartner.discountRate <= 0) {
      return 0;
    }
    return (subTotal * activePartner.discountRate) / 100;
  }, [activePartner, subTotal]);

  const loyaltyDiscount = useMemo(() => {
    if (!db.settings?.enableLoyaltyPoints || !activePartner) {
      return 0;
    }
    const rate = db.settings?.loyaltyPointValue ?? 0.1;
    return redeemedPoints * rate;
  }, [redeemedPoints, activePartner, db.settings]);

  const maxPointsRedeemable = useMemo(() => {
    if (!activePartner || !db.settings?.enableLoyaltyPoints) return 0;
    const clientPoints = activePartner.loyaltyPoints || 0;
    const val = db.settings?.loyaltyPointValue ?? 0.1;
    const remainingToDiscount = Math.max(0, subTotal - clientDiscount - globalDiscount);
    const costInPoints = Math.floor(remainingToDiscount / val);
    return Math.min(clientPoints, costInPoints);
  }, [activePartner, subTotal, clientDiscount, globalDiscount, db.settings]);

  const totalDiscount = useMemo(() => {
    return globalDiscount + clientDiscount + loyaltyDiscount;
  }, [globalDiscount, clientDiscount, loyaltyDiscount]);

  // Dynamically calculate cumulative itemized VAT and Hors Taxes (HT)
  const cartHTAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const rate = item.product.tvaRate !== undefined ? item.product.tvaRate : 19;
      const itemTTC = item.qty * item.customPrice;
      return sum + (itemTTC / (1 + rate / 100));
    }, 0);
  }, [cart]);

  const cartTVAAmount = useMemo(() => {
    return subTotal - cartHTAmount;
  }, [subTotal, cartHTAmount]);

  const finalTaxAmount = useMemo(() => {
    if (taxRate === -1) {
      // Itemized VAT proportional to discount
      const ratio = subTotal !== 0 ? ((subTotal - totalDiscount) / subTotal) : 1;
      const tva = cartTVAAmount * ratio;
      return subTotal < 0 ? tva : Math.max(0, tva);
    } else {
      // Global flat VAT
      const discounted = subTotal - totalDiscount;
      const tva = discounted * (taxRate / 100);
      return subTotal < 0 ? tva : Math.max(0, tva);
    }
  }, [subTotal, totalDiscount, taxRate, cartTVAAmount]);

  const finalTotal = useMemo(() => {
    if (taxRate === -1) {
      // For itemized VAT, item prices are already TTC, so Net total is simply discounted subtotal
      const val = subTotal - totalDiscount;
      return subTotal < 0 ? val : Math.max(0, val);
    } else {
      // Global flat VAT adds on top
      const discounted = subTotal - totalDiscount;
      const val = discounted + finalTaxAmount;
      return subTotal < 0 ? val : Math.max(0, val);
    }
  }, [subTotal, totalDiscount, taxRate, finalTaxAmount]);

  // Set paid amount automatically to match overall total or partial
  const handleQuickPayFull = () => {
    setPaidAmount(finalTotal.toString());
  };

  const currentPay = Number(paidAmount) || 0;
  const remainingDebt = Math.max(0, finalTotal - currentPay);
  const changeDue = Math.max(0, currentPay - finalTotal);

  // Quick Client Creation onSubmit
  const handleCreateQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const discRate = newClientDiscountRate.trim() ? parseFloat(newClientDiscountRate) : undefined;

    const newClient: Partner = {
      id: `part-${Date.now()}`,
      type: 'client',
      name: newClientName,
      phone: newClientPhone,
      address: newClientAddress,
      currentBalance: 0,
      discountRate: discRate,
      loyaltyPoints: 0
    };

    const updatedDb = {
      ...db,
      partners: [newClient, ...(db.partners || [])]
    };

    onUpdateDb(updatedDb);
    setSelectedPartnerId(newClient.id);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientAddress('');
    setNewClientDiscountRate('');
    setShowNewClientModal(false);
    showToast(language === 'ar' ? 'تم إنشاء العميل بنجاح' : 'Client créé avec succès');
  };

  // Final confirmation of POS Sale
  const handleConfirmCheckout = () => {
    if (cart.length === 0) {
      showToast(language === 'ar' ? "⚠️ السلة فارغة." : "⚠️ Votre panier est vide.", 'error');
      return;
    }

    // Determine invoice numbering
    const prefix = isReturnMode ? 'RET' : (cashRegisterType === 'facture' ? 'FAC' : 'BL');
    const year = new Date().getFullYear();
    const countThisType = (db.invoices || []).filter(i => isReturnMode ? i.isReturn : (i.type === cashRegisterType && !i.isReturn)).length + 1;
    const paddingNumber = String(countThisType).padStart(4, '0');
    const invoiceNumber = `${prefix}-${year}-${paddingNumber}`;

    const invoiceItems: InvoiceItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      qty: item.qty,
      purchasePrice: item.product.purchasePrice,
      sellingPrice: item.customPrice,
      total: item.qty * item.customPrice
    }));

    const discountValue = totalDiscount;
    const taxAmount = finalTaxAmount;

    const clientName = activePartner ? activePartner.name : 'Client Comptoir (Anonyme)';

    const enableLoyalty = db.settings?.enableLoyaltyPoints ?? false;
    const loyaltyX = db.settings?.loyaltyXSpent ?? 10;
    const loyaltyY = db.settings?.loyaltyYPoints ?? 1;
    const pointsGained = enableLoyalty && selectedPartnerId && !isReturnMode ? Math.floor(finalTotal / loyaltyX) * loyaltyY : 0;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      number: invoiceNumber,
      date: new Date().toISOString(),
      partnerId: selectedPartnerId || undefined,
      partnerName: clientName,
      type: cashRegisterType,
      isReturn: isReturnMode ? true : undefined,
      items: invoiceItems,
      subTotal,
      discount: discountValue,
      taxRate,
      taxAmount,
      total: finalTotal,
      paidAmount: currentPay,
      balance: remainingDebt,
      dueDate: remainingDebt > 0 && !isReturnMode ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
      notes: isReturnMode 
        ? (language === 'ar' ? 'عملية إسترجاع سلع للزبون (تذكرة إرجاع)' : 'Retour de marchandise (Avoir client)')
        : paymentMethodNotes(),
      loyaltyPointsEarned: enableLoyalty && selectedPartnerId && !isReturnMode ? pointsGained : undefined,
      loyaltyPointsRedeemed: enableLoyalty && selectedPartnerId && redeemedPoints > 0 ? redeemedPoints : undefined,
    };

    // 1. Subtract products from stock levels (for return mode, subtracting negative cartItem.qty increases stock!)
    const updatedProducts = (db.products || []).map(p => {
      const cartItem = cart.find(item => item.product.id === p.id);
      if (cartItem) {
        return {
          ...p,
          stock: Math.max(0, p.stock - cartItem.qty)
        };
      }
      return p;
    });

    // 2. If client had debt (remainingDebt > 0), add to client balance account.
    // In Return Mode, if paidAmount is 0 (direct credit), deduct from the outstanding debt of the client.
    const updatedPartners = (db.partners || []).map(p => {
      if (p.id === selectedPartnerId) {
        const originalPoints = p.loyaltyPoints || 0;
        const netPoints = originalPoints - redeemedPoints + pointsGained;
        
        let balanceAdjustment = 0;
        if (isReturnMode) {
          if (currentPay === 0) {
            balanceAdjustment = finalTotal; // this is negative, so p.currentBalance + balanceAdjustment decreases debt
          }
        } else {
          balanceAdjustment = remainingDebt > 0 ? remainingDebt : 0;
        }

        return {
          ...p,
          currentBalance: Math.max(-999999, p.currentBalance + balanceAdjustment),
          loyaltyPoints: enableLoyalty ? Math.max(0, netPoints) : p.loyaltyPoints
        };
      }
      return p;
    });

    // 3. Register payment transactional ledger
    const newPayments = [...(db.payments || [])];
    if (currentPay !== 0) {
      newPayments.unshift({
        id: `pay-${Date.now()}`,
        date: new Date().toISOString(),
        partnerId: selectedPartnerId || 'anonymous',
        partnerName: clientName,
        partnerType: 'client',
        type: isReturnMode ? 'payment_sent' : 'payment_received',
        amount: Math.abs(currentPay),
        notes: isReturnMode 
          ? `Remboursement espèces pour retour ${invoiceNumber}`
          : `Espèces/Chèque comptant pour ${invoiceNumber}`,
        invoiceId: newInvoice.id
      });
    } else if (isReturnMode && currentPay === 0 && selectedPartnerId) {
      // Direct client account credit deduction for returned/exchanged goods
      newPayments.unshift({
        id: `pay-${Date.now()}`,
        date: new Date().toISOString(),
        partnerId: selectedPartnerId,
        partnerName: clientName,
        partnerType: 'client',
        type: 'credit_adjust',
        amount: Math.abs(finalTotal),
        notes: `Déduction de crédit pour retour ${invoiceNumber}`,
        invoiceId: newInvoice.id
      });
    }

    const updatedDb: DatabaseState = {
      ...db,
      products: updatedProducts,
      partners: updatedPartners,
      invoices: [newInvoice, ...(db.invoices || [])],
      payments: newPayments
    };

    onUpdateDb(updatedDb);

    // 💵 Auto Open Cash Drawer (Tiroir Caisse) during Cash checkout
    if (currentPay >= 0) {
      setIsCashDrawerOpen(true);
      playCashRegisterSound();

      let activeName = 'Administrateur';
      try {
        const savedUser = safeLocalStorage.getItem('pos_active_user');
        if (savedUser) {
          activeName = JSON.parse(savedUser).name || activeName;
        }
      } catch (_) {}

      const newLog = {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        action: language === 'ar' 
          ? `فتح تلقائي عند بيع ${invoiceNumber}` 
          : `Ouverture automatique (Vente ${invoiceNumber})`,
        user: activeName,
        amount: currentPay
      };

      setCashDrawerLogs(prev => {
        const next = [newLog, ...prev];
        safeLocalStorage.setItem('pos_cash_drawer_logs', JSON.stringify(next));
        return next;
      });

      // Automatically slide the visual drawer back in 4.5 seconds
      setTimeout(() => {
        setIsCashDrawerOpen(false);
      }, 4500);
    }

    setPrintedInvoice(newInvoice); // Mount invoice in print preview template trigger
    setCart([]); // Clear Cart
    setPaidAmount('');
    setGlobalDiscount(0);
    setRedeemedPoints(0); // Reset points state
    setIsReturnMode(false); // Reset Return Mode to normal on successful checkout
    showToast(language === 'ar' ? `تم إنشاء الوثيقة ${invoiceNumber}` : `Document ${invoiceNumber} créé avec succès`);
  };

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      showToast(language === 'ar' ? "⚠️ السلة فارغة." : "⚠️ Votre panier est vide.", 'error');
      return;
    }
    
    if (!selectedPartnerId && remainingDebt > 0) {
      showToast(language === 'ar' ? "⚠️ العميل مجهول: لا يمكن تسجيل دين." : "⚠️ Client anonyme: impossible de reporter un crédit.", 'error');
      return;
    }

    if (useOtpVerification) {
      const activePartner = db.partners.find(p => p.id === selectedPartnerId);
      const targetPhone = activePartner?.phone || db.settings?.storePhone || '+213 (0) 550 12 34 56';
      setOtpPhoneNumber(targetPhone);
      setOtpCodeEntered('');
      setOtpCodeGenerated('');
      setIsOtpSent(false);
      setOtpError(null);
      setShowOtpModal(true);
    } else {
      handleConfirmCheckout();
    }
  };

  const paymentMethodNotes = () => {
    if (remainingDebt === 0) return 'Payé comptant';
    if (currentPay === 0) return 'À crédit (30 jours)';
    return `Payé partiel: ${formatCurrency(currentPay)} - Reste à crédit: ${formatCurrency(remainingDebt)}`;
  };

  const handlePrint = () => {
    try {
      const isIframe = checkIsIframe();
      if (!isIframe) {
        window.print();
      } else {
        console.log("[INNOVA PRINT ] Manual print triggered inside sandboxed preview.");
      }
    } catch (err) {
      console.warn("Robust print failed", err);
    }
  };

  const handleDownloadPDF = () => {
    if (!printedInvoice) return;
    try {
      downloadInvoicePDF({
        invoice: printedInvoice,
        settings: db.settings,
        language,
        formatCurrency,
        format: printFormat
      });

      // Keep the print window/modal open so the user can verify details or perform other actions before closing manually.
    } catch (error) {
      console.error("POS Invoice PDF download error: ", error);
      showToast(language === 'ar' ? "⚠️ حدث خطأ أثناء تحميل ملف الـ PDF" : "⚠️ Échec du téléchargement du fichier PDF.", 'error');
    }
  };

  // Automatic printing effect when checkout succeeds and an invoice is generated
  useEffect(() => {
    if (printedInvoice && autoPrint) {
      console.log("[INNOVA AUTO PRINT] Detected printedInvoice. Waiting for DOM to render...");
      let checkTimer: any;
      let attemptCount = 0;
      
      const checkAndTriggerPrint = () => {
        const printContent = document.getElementById('print-area');
        const portal = document.getElementById('print-portal');
        
        if (printContent && portal) {
          console.log("[INNOVA AUTO PRINT] DOM Elements found! Initiating auto-print...");
          handlePrint();
        } else if (attemptCount < 10) {
          attemptCount++;
          checkTimer = setTimeout(checkAndTriggerPrint, 100);
        } else {
          console.warn("[INNOVA AUTO PRINT] Unable to find print-area DOM after several retries.");
        }
      };

      // Initial buffer to let React build/mount the overlay
      checkTimer = setTimeout(checkAndTriggerPrint, 250);

      return () => {
        if (checkTimer) clearTimeout(checkTimer);
      };
    }
  }, [printedInvoice, autoPrint]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = searchQuery.trim();
      if (!query) return;
      e.preventDefault();

      // Resolve and add product supporting standard & scale barcodes smoothly
      const result = handleResolveAndAddProduct(query);
      if (result.success) {
        // Log to history
        setScanHistory(prev => {
          const newEntry = {
            code: query,
            timestamp: new Date().toLocaleTimeString(undefined, { hour12: false }),
            productName: result.productName,
            success: true,
          };
          return [newEntry, ...prev].slice(0, 5);
        });
        
        // Trigger flash
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 200);

        playScanBeep();
        setSearchQuery('');
        return;
      }

      // If exactly one filtered product matches search, add it
      if (filteredProducts.length === 1) {
        const singleProd = filteredProducts[0];
        handleAddToCart(singleProd);
        setSearchQuery('');
      }
    }
  };

  const handlePaidAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const isClientSatisfied = selectedPartnerId || remainingDebt <= 0;
      if (cart.length > 0 && isClientSatisfied) {
        e.preventDefault();
        handleCheckoutClick();
      }
    }
  };

  return (
    <div className="space-y-6 relative">

      {/* POS Screen Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 no-print shadow-3xs">
        <div className="flex items-center gap-3">
          <motion.div 
            animate={triggerPulse ? {
              scale: [1, 1.3, 0.9, 1.15, 1],
              y: [0, -6, 2, -0.5, 0]
            } : { scale: 1 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"
          >
            <ShoppingCart className="w-5 h-5 text-indigo-700" />
          </motion.div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {language === 'ar' ? 'نقطة البيع (POS الكاشير)' : 'Caisse Tactile Point de Vente (POS)'}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              {language === 'ar' ? 'تاريخ اليوم:' : 'Session de caisse active :'} <span className="font-mono font-bold text-slate-700">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </p>
          </div>
        </div>

        {/* Global Shortcuts Indicator Block & scan drawer toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-[10px] text-slate-600 font-mono">
            <span><kbd className="bg-white px-1.5 py-0.5 border border-slate-300 rounded shadow-3xs font-bold text-slate-900 select-all">F2</kbd> Vider</span>
            <span className="text-slate-300">|</span>
            <span><kbd className="bg-white px-1.5 py-0.5 border border-slate-300 rounded shadow-3xs font-bold text-slate-900 select-all">F3</kbd> Recherche</span>
            <span className="text-slate-300">|</span>
            <span><kbd className="bg-white px-1.5 py-0.5 border border-slate-300 rounded shadow-3xs font-bold text-slate-900 select-all">F4</kbd> Encaisser</span>
          </div>

          {/* Quick Scanner Launch Button in Header */}
          <button
            type="button"
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`px-3 py-1.5 rounded text-xs font-black transition-all shadow-3xs flex items-center gap-2 cursor-pointer border ${
              isCameraActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 animate-pulse'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
            title={language === 'ar' ? 'تشغيل / إيقاف الكاميرا لقراءة الباركود فوراً' : 'Déclencher instantanément le scanner de code-barres'}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'مسح الكاميرا 📷' : 'Scanner Caméra 📷'}</span>
          </button>

          {/* Toggle Scan History Button */}
          <button
            type="button"
            onClick={() => setIsScanHistoryOpen(!isScanHistoryOpen)}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all shadow-3xs flex items-center gap-2 cursor-pointer border ${
              isScanHistoryOpen
                ? 'bg-slate-800 text-white border-slate-850'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-250'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 ${scanHistory.length > 0 ? '' : 'hidden'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${scanHistory.length > 0 ? 'bg-indigo-500' : 'bg-slate-400'}`}></span>
            </span>
            <span>{language === 'ar' ? 'سجل المسح' : 'Log de Scan'}</span>
            <span className="bg-slate-100 text-slate-800 font-mono text-[9px] px-1.5 py-0.2 rounded font-black border border-slate-200">
              {scanHistory.length}
            </span>
          </button>

          {/* Toggle Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all shadow-3xs flex items-center gap-2 cursor-pointer border ${
              isFullscreen
                ? 'bg-zinc-800 hover:bg-zinc-900 text-white border-zinc-750'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-250'
            }`}
            title={language === 'ar' ? 'تغيير وضع ملء الشاشة' : 'Basculer le mode plein écran'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-3.5 h-3.5 shrink-0" />
                <span>{language === 'ar' ? 'مخرج 🖥️' : 'Quitter Plein Écran 🖥️'}</span>
              </>
            ) : (
              <>
                <Maximize className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span>{language === 'ar' ? 'ملء الشاشة 🖥️' : 'Plein Écran 🖥️'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scan History Drawer Overlay */}
      <AnimatePresence>
        {isScanHistoryOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScanHistoryOpen(false)}
              className="fixed inset-0 bg-slate-900 z-40 no-print"
            />
            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 22, stiffness: 180 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-white border-l border-slate-200 z-50 flex flex-col no-print shadow-2xl"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Header inside drawer */}
              <div className="bg-slate-50 border-b border-slate-150 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2 bg-indigo-50 text-indigo-600 rounded text-xs font-mono font-bold uppercase tracking-wider">
                    LOGS
                  </div>
                  <h3 className="text-sm font-black text-slate-850">
                    {language === 'ar' ? 'سجل مسح الباركود الأخير' : 'Derniers Scans (Audit)'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScanHistoryOpen(false)}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-800 transition-colors text-slate-400 rounded-lg cursor-pointer animate-fade-in"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scanned Items list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
                <p className="text-[10px] text-slate-500 font-medium font-sans">
                  {language === 'ar'
                    ? 'يعرض هذا السجل آخر 5 رموز باركود تم مسحها بالكاميرا أو القارئ الخارجي لتوفير تدقيق ومراجعة سريعة.'
                    : 'Le journal sauvegarde temporairement les 5 derniers codes-barres scannés pour un audit instantané.'}
                </p>

                {scanHistory.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <ScanLine className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="text-xs font-semibold">{language === 'ar' ? 'لا توجد عمليات مسح بعد' : 'Aucun scan enregistré.'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{language === 'ar' ? 'امسح سلعة لبدء التسجيل' : 'Scannez des produits pour peupler ce log.'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scanHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border flex flex-col justify-between gap-1.5 transition-all shadow-3xs ${
                          item.success
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-rose-50/45 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded ${
                            item.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.success ? (language === 'ar' ? 'مقبول / معروف' : 'Identifié') : (language === 'ar' ? 'غير معروف' : 'Inconnu')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">
                            {item.timestamp}
                          </span>
                        </div>

                        <div>
                          <p className="font-mono text-xs font-black text-slate-900 break-all select-all select-text">
                            📟 {item.code}
                          </p>
                          <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                            {item.success ? item.productName : (language === 'ar' ? 'رمز غير مسجل بقاعدة البيانات' : 'Code absent du catalogue')}
                          </p>
                        </div>

                        {item.success && (
                          <div className="pt-2 border-t border-slate-200/40 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const prod = db.products.find(p => p.code === item.code);
                                if (prod) {
                                  handleAddToCart(prod);
                                  playScanBeep();
                                }
                              }}
                              className="text-[9.5px] text-indigo-700 hover:text-indigo-900 border border-indigo-200 bg-white hover:bg-indigo-50 font-black px-2 py-1 rounded transition-all cursor-pointer shadow-3xs flex items-center gap-1"
                            >
                              <span>⚡ {language === 'ar' ? 'إضافة للسلة مجدداً' : 'Ajouter encore'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer footer controls */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setScanHistory([])}
                  disabled={scanHistory.length === 0}
                  className="px-3 py-1.5 rounded text-[10.5px] font-bold border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer bg-white shadow-3xs"
                >
                  {language === 'ar' ? 'مسح السجل' : 'Vider le Log'}
                </button>
                <div className="text-[9px] text-slate-400 font-mono">
                  {language === 'ar' ? 'الحد الأقصى: 5 أسطر' : 'Max : 5 entrées'}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Sliding Scanning Feedbacks Toast */}
      <AnimatePresence>
        {scanToast && (
          <motion.div
            key={scanToast.id}
            initial={{ opacity: 0, y: -45, x: '-50%', scale: 0.92 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -25, x: '-50%', scale: 0.92 }}
            className="bg-emerald-600 text-white rounded-xl py-3 px-5 shadow-xl border border-emerald-500/35 flex items-center justify-between gap-4 font-sans select-none z-50 fixed md:absolute top-4 left-1/2 w-[92%] max-w-sm backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6.5 h-6.5 bg-white/20 rounded-full flex items-center justify-center text-xs shrink-0 select-none animate-pulse">
                ⚡
              </div>
              <div className="text-left">
                <p className="text-[9px] font-mono uppercase tracking-widest text-emerald-200/90 font-bold">
                  {language === 'ar' ? 'مسح مستمر: تمت الإضافة تلقائياً' : 'SCAN CONTINU : AJOUTÉ'}
                </p>
                <p className="text-[11.5px] font-extrabold line-clamp-1">
                  {language === 'ar' ? scanToast.nameAr : scanToast.nameFr}
                </p>
              </div>
            </div>
            
            <div className="bg-emerald-800 text-emerald-100 font-extrabold font-mono px-2 py-0.5 rounded text-xs shrink-0 select-none animate-bounce">
              +{scanToast.qty}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual checkout grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Products catalog (8 cols in desktop) */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white p-6 border border-slate-150 rounded-2xl space-y-5 no-print shadow-xs">
          
          {/* Dedicated continuous barcode scanner entry block */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3 relative overflow-hidden transition-all duration-200 hover:border-emerald-250 hover:shadow-2xs">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pl-1">
              <div className="flex items-center gap-2 text-emerald-850 text-xs font-black uppercase tracking-wider font-sans select-none">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isRapidScanFocused ? 'bg-emerald-400 opacity-75' : 'bg-slate-300'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isRapidScanFocused ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </span>
                <span>{language === 'ar' ? 'سحب سريع للباركود (بدون نقر)' : 'Saisie Directe Code-barres (Sans clic)'}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Active scan indicator */}
                <div 
                  onClick={() => rapidScanInputRef.current?.focus()}
                  className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-0.5 rounded border border-slate-200 select-none hover:bg-slate-50 transition-all text-[10px]"
                >
                  <span className="text-[10px] font-bold text-slate-500">
                    {isRapidScanFocused 
                      ? (language === 'ar' ? 'القارئ جاهز' : 'PRÊT / EN ÉCOUTE') 
                      : (language === 'ar' ? 'انقر للتفعيل' : 'CLIQUEZ POUR FILTRER / ACTIVER')
                    }
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <input
                    type="checkbox"
                    id="autoFocusScanField"
                    checked={autoFocusScanField}
                    onChange={(e) => {
                      setAutoFocusScanField(e.target.checked);
                      safeLocalStorage.setItem('pos_autofocus_scan_field', String(e.target.checked));
                    }}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-550 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="autoFocusScanField" className="text-[10px] font-black text-slate-600 cursor-pointer select-none">
                    {language === 'ar' ? 'تركيز تلقائي دائم' : 'Autofocus auto'}
                  </label>
                </div>
              </div>
            </div>

            <form onSubmit={handleRapidBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-3 text-sm select-none">📟</span>
                <input
                  ref={rapidScanInputRef}
                  type="text"
                  placeholder={
                    language === 'ar'
                      ? 'امسح باركود السلعة هنا لإضافتها فوراً (دون لمس الفأرة)...'
                      : 'Scannez un code-barres ici... Le produit s\'ajoutera instantanément !'
                  }
                  value={rapidScanValue}
                  onChange={(e) => setRapidScanValue(e.target.value)}
                  onFocus={() => {
                    setIsRapidScanFocused(true);
                    setActiveNumpadTarget('rapidScan');
                    setKeyboardLayout('numeric');
                  }}
                  onBlur={() => setIsRapidScanFocused(false)}
                  className={`w-full pl-9 pr-4 py-2.5 text-xs font-semibold font-mono bg-white border rounded-lg shadow-inner focus:outline-hidden transition-all placeholder:text-slate-400 ${
                    isRapidScanFocused
                      ? 'border-emerald-500 ring-2 ring-emerald-500/10 text-emerald-950'
                      : 'border-slate-250 text-slate-700'
                  }`}
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wider uppercase px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap active:scale-98 shadow-xs"
              >
                <span>⚡</span>
                <span>{language === 'ar' ? 'إضافة' : 'Ajouter'}</span>
              </button>
            </form>
            <p className="text-[9.5px] text-slate-500 font-mono">
              💡 {language === 'ar' 
                ? 'ملاحظة: هذا الحقل مخصص للمسح السريع المتكرر للسلع التي تملك رمز باركود.' 
                : 'Astuce : Gardez l\'Autofocus activé pour scanner à la chaîne sans toucher la souris !'}
            </p>
          </div>

          {/* Consolidated Search filter and Scan Triggers */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={language === 'ar' ? "ابحث عن سلعة بالاسم أو الكود..." : "Rechercher un produit... (Nom ou Code)"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  setActiveNumpadTarget('search');
                  setKeyboardLayout('alphabetic');
                }}
                className="w-full pl-9 pr-24 py-2 text-xs bg-slate-55 border border-slate-205 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-colors"
                autoComplete="off"
              />
              
              {/* Embedded premium scanning camera trigger inside input box */}
              <button
                type="button"
                onClick={() => setIsCameraActive(!isCameraActive)}
                title={language === 'ar' ? 'تشغيل الكاميرا للمسح التلقائي المستمر' : 'Scanner continu via Caméra'}
                className={`absolute right-1.5 top-1.5 h-[26px] px-2 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all select-none hover:scale-102 cursor-pointer ${
                  isCameraActive
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>{language === 'ar' ? 'قارئ الكاميرا' : 'Cam Scanner'}</span>
              </button>
            </div>
            
            {/* Horizontal custom scroll category selector - beautifully responsive */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 max-w-full md:max-w-[280px] lg:max-w-[340px] custom-scrollbar self-center">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-indigo-600 text-white shadow-xs font-bold' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat === 'Tous' ? (language === 'ar' ? 'الكل' : 'Tout') : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Saisie Libre d'un produit non enregistré - بيع حر مباشر */}
          <form 
            onSubmit={handleAddCustomItem} 
            className="bg-sky-50/40 border border-sky-100/70 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
            <div className="flex items-center gap-1.5 shrink-0 text-sky-850 text-xs font-black uppercase tracking-wide select-none">
              <span>🏷️</span>
              <span>{language === 'ar' ? 'بيع حر مباشر:' : 'Vente Libre (Saisie direct) :'}</span>
            </div>

            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder={language === 'ar' ? 'اسم السلعة المباشرة (اختياري)...' : "Nom de l'article libre (Optionnel)..."}
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:border-sky-500 transition-colors"
                autoComplete="off"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder={language === 'ar' ? 'السعر (د.ت)*' : 'Prix libre (DT)*'}
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  onFocus={() => {
                    setActiveNumpadTarget('customPrice');
                    setKeyboardLayout('numeric');
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:border-sky-500 font-mono font-bold text-slate-850"
                  required
                />
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded-md text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                >
                  {language === 'ar' ? 'إضافة +' : 'Ajouter +'}
                </button>
              </div>
            </div>

            {/* Quick preset amount tags */}
            <div className="flex flex-wrap gap-1 items-center shrink-0">
              {[1, 2, 5, 10, 20].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    const price = amount;
                    const timestamp = Date.now();
                    const customProduct: Product = {
                      id: `custom-${timestamp}`,
                      code: `VLIBRE-${timestamp}`,
                      name: language === 'ar' ? `مبلغ مباشر ${amount} د.ت` : `Vente Libre ${amount} DT`,
                      category: 'Général',
                      purchasePrice: 0,
                      sellingPrice: price,
                      stock: 99999,
                      minAlertQty: 0,
                      unit: 'U',
                    };
                    setCart([...cart, { product: customProduct, qty: 1, customPrice: price }]);
                    playScanBeep();
                  }}
                  className="bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-mono font-bold border border-slate-200 px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer select-none"
                >
                  +{amount}
                </button>
              ))}
            </div>
          </form>

          {/* Continuous Camera Barcode Scanner Panel */}
          <AnimatePresence>
            {isCameraActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-3 shadow-3xs relative mr-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">
                      {language === 'ar' ? 'قارئ الباركود المتواصل بالكاميرا' : 'Lecteur Code-barres Caméra (Mode Continu)'}
                    </h4>
                  </div>
                  
                  {/* Scanner controls: sound toggle and dismiss */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !isBeepEnabled;
                        setIsBeepEnabled(nextVal);
                        safeLocalStorage.setItem('pos_scan_beep', String(nextVal));
                      }}
                      className={`p-1.5 rounded transition-colors cursor-pointer border ${
                        isBeepEnabled 
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100' 
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300 border-slate-300'
                      }`}
                      title={isBeepEnabled ? 'Désactiver le bip' : 'Activer le bip'}
                    >
                      {isBeepEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCameraActive(false)}
                      className="p-1.5 bg-slate-200 hover:bg-rose-100 border border-slate-300 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Video camera canvas container aspect ratios */}
                <div className="relative w-full aspect-video sm:max-h-60 bg-slate-950 rounded-lg overflow-hidden border border-slate-950 shadow-inner flex flex-col items-center justify-center">
                  
                  {/* html5-qrcode renderer element Target ID */}
                  <div id="pos-camera-scanner-view" className="w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

                  {/* Camera scan flash overlay pulse */}
                  {isFlashActive && (
                    <div className="absolute inset-0 bg-white pointer-events-none z-30 transition-opacity duration-100" />
                  )}

                  {/* Laser aiming guides layer overlay */}
                  <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none p-5 sm:p-8">
                    <div className="w-full flex justify-between">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-500"></div>
                      <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-500"></div>
                    </div>
                    
                    {/* Glowing active barcode laser tracker */}
                    <div className="w-full border-t border-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.7)] animate-pulse relative"></div>
                    
                    <div className="w-full flex justify-between">
                      <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-500"></div>
                      <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-500"></div>
                    </div>
                  </div>

                  {/* Visual helpful subtitles overlay */}
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 px-2.5 py-1.5 rounded text-center text-[9px] text-slate-300 font-mono tracking-wide max-w-[90%] mx-auto">
                    {language === 'ar' 
                      ? 'ضع الرموز المقروءة أمام الكاميرا للإضافة التلقائية المتواصلة بالسلة 🚀' 
                      : 'Placez les codes-barres devant la caméra pour l\'ajout automatique en continu 🚀'}
                  </div>
                </div>

                {/* Display scanning status / errors */}
                {cameraError ? (
                  <p className="text-[10px] font-bold text-rose-600 font-mono bg-rose-50/50 p-2 rounded border border-rose-150 text-center">
                    {cameraError}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono gap-1 border-t border-slate-100 pt-2 shadow-inner">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {language === 'ar' ? 'الملتقط: نشط وبانتظار الرموز' : 'Objectif: Actif & Écoute active'}
                    </span>
                    
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-600 hover:text-slate-850 font-bold select-none">
                      <input
                        type="checkbox"
                        checked={isBeepEnabled}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          setIsBeepEnabled(nextVal);
                          safeLocalStorage.setItem('pos_scan_beep', String(nextVal));
                        }}
                        className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer transition-all"
                      />
                      <span className="flex items-center gap-1">
                        🔊 {language === 'ar' ? 'صوت الرنين' : 'Bip sonore'}
                      </span>
                    </label>

                    {lastScannedText && (
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                        {language === 'ar' ? 'آخر رمز:' : 'Dernier code:'} {lastScannedText}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid display products */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 stroke-1" />
              <p className="text-sm font-semibold">Aucun article ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {filteredProducts.map(prod => {
                const isOutOfStock = prod.stock <= 0;
                const visual = getProductVisual(prod);
                return (
                  <motion.button
                    key={prod.id}
                    onClick={() => handleAddToCart(prod)}
                    whileHover={isOutOfStock ? {} : { scale: 1.02, y: -2 }}
                    whileTap={isOutOfStock ? {} : { scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 350, damping: 18 }}
                    className={`p-2.5 bg-white hover:bg-slate-50/40 hover:border-blue-400 text-left rounded-lg border border-slate-200 flex flex-col justify-between h-[195px] transition-all group relative cursor-pointer shadow-3xs hover:shadow-sm ${
                      isOutOfStock ? 'opacity-60 cursor-not-allowed border-dashed bg-slate-50/50' : ''
                    }`}
                  >
                    {/* Flying particle animation feedback */}
                    <AnimatePresence>
                      {addedParticles.filter(p => p.productId === prod.id).map(p => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 1, scale: 0.6, y: 10 }}
                          animate={{ opacity: 0, scale: 1.4, y: -65, rotate: [0, -12, 12, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.75, ease: "easeOut" }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                        >
                          <span className={`text-xs font-black font-mono select-none px-2 py-0.5 rounded-full text-white shadow-md ${
                            isReturnMode 
                              ? "bg-rose-600 shadow-rose-900/30" 
                              : "bg-emerald-600 shadow-emerald-900/30"
                          }`}>
                            {p.text}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Visual Image / Emoji Box */}
                    <div className="w-full h-24 bg-slate-50 border border-slate-150 rounded-md overflow-hidden relative flex items-center justify-center group-hover:bg-blue-50/10 transition-colors shrink-0">
                      {visual.type === 'image' ? (
                        <img 
                          src={visual.value} 
                          alt={prod.name} 
                          className="w-full h-full object-cover rounded-md group-hover:scale-110 transition-transform duration-300"
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <span className="text-3xl select-none drop-shadow-xs group-hover:scale-115 group-hover:-rotate-3 transition-transform duration-300 ease-out">
                          {visual.value}
                        </span>
                      )}

                      {/* Stock status overlay tags */}
                      {isOutOfStock ? (
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center">
                          <span className="bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded shadow-sm tracking-wide uppercase">
                            {language === 'ar' ? 'منتهي' : 'Rupture'}
                          </span>
                        </div>
                      ) : prod.stock <= prod.minAlertQty ? (
                        <div className="absolute top-1.5 left-1.5 min-w-4 h-4 bg-amber-500 text-white font-mono text-[9px] font-bold px-1 rounded-full flex items-center justify-center shadow-2xs" title="Stock faible">
                          ⚠️
                        </div>
                      ) : null}

                      {/* Category mini tag */}
                      <span className="absolute bottom-1 right-1 bg-slate-900/65 text-white font-bold text-[8px] px-1.5 py-0.2 rounded-sm backdrop-blur-3xs uppercase tracking-wider">
                        {prod.category}
                      </span>
                    </div>

                    {/* Content text */}
                    <div className="flex-1 min-h-0 flex flex-col justify-between mt-1.5 w-full">
                      <h3 className="font-bold text-[11px] text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-900 pr-1 text-ellipsis overflow-hidden" title={prod.name}>
                        {prod.name}
                      </h3>
                      
                      <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between w-full select-none">
                        {isProductInPromo(prod) ? (
                          <div className="flex flex-col items-start leading-none">
                            <span className="text-[9px] text-slate-400 line-through leading-none decoration-rose-500/50">
                              {formatCurrency(prod.sellingPrice)}
                            </span>
                            <span className="font-extrabold font-mono text-[11px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md mt-0.5" title="Saison Promotionnelle">
                              {formatCurrency(prod.promoPrice || 0)} 🏷️
                            </span>
                          </div>
                        ) : (
                          <span className="font-extrabold font-mono text-[11px] text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {formatCurrency(prod.sellingPrice)}
                          </span>
                        )}
                        <span className={`text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded-full border ${
                          isOutOfStock 
                            ? 'bg-rose-50 text-rose-700 border-rose-100/50' 
                            : prod.stock <= prod.minAlertQty 
                              ? 'bg-amber-50 text-amber-850 border-amber-200/50' 
                              : 'bg-slate-100 text-slate-700 border-slate-200/50'
                        }`}>
                          {language === 'ar' ? 'متاح: ' : 'Qté: '}{prod.stock}
                        </span>
                      </div>
                    </div>

                    {/* Quick plus action floating hover button */}
                    {!isOutOfStock && (
                      <div className="absolute right-1.5 top-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center border border-indigo-500 shadow-3xs transition-all duration-200 scale-0 group-hover:scale-100 shrink-0 select-none z-10">
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Cart, customer, settings & actions (5 cols in desktop) */}
        <div className="lg:col-span-12 xl:col-span-5 bg-slate-50 p-6 border border-slate-200 rounded-2xl space-y-5 no-print shadow-xs">
          
          {/* Customer Selection Card with inline Loyalty info */}
          <div className="bg-white p-5 rounded-xl border border-slate-150 space-y-4 shadow-3xs relative overflow-hidden transition-all duration-200">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <div className="flex items-center justify-between pl-1">
              <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 select-none">
                👤 {language === 'ar' ? 'العميل المستفيد' : 'Client bénéficiaire'}
              </span>
              <button 
                type="button"
                onClick={() => setShowNewClientModal(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer transition-all hover:translate-x-0.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Nouveau Client</span>
              </button>
            </div>
            
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-205 rounded-lg py-2 px-3 text-xs font-semibold focus:outline-hidden focus:border-blue-500 cursor-pointer transition-colors"
            >
              <option value="">⚙️ {language === 'ar' ? 'زبون عادي (غير مسجل - نقدي)' : 'Client Comptoir (Anonyme/Espèces)'}</option>
              {clients.map(cl => (
                <option key={cl.id} value={cl.id}>
                  👤 {cl.name} {cl.discountRate !== undefined && cl.discountRate > 0 ? `(-${cl.discountRate}%)` : ''} {cl.currentBalance > 0 ? `(Crédit: ${formatCurrency(cl.currentBalance)})` : ''}
                </option>
              ))}
            </select>

            {activePartner && activePartner.discountRate !== undefined && activePartner.discountRate > 0 && (
              <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-100 rounded-lg px-2.5 py-1.5 select-none animate-fade-in">
                <span>🏷️</span>
                <span>
                  {language === 'ar' 
                    ? `خصم تلقائي نشط: ${activePartner.discountRate}% على كامل المعاملة` 
                    : `Remise automatique active : ${activePartner.discountRate}% sur le panier`}
                </span>
              </div>
            )}

            {/* Integrated Loyalty Slider directly in Customer Selection */}
            {activePartner && db.settings?.enableLoyaltyPoints && (
              <div className="pt-3.5 border-t border-slate-100 space-y-2 mt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-indigo-700 flex items-center gap-1.5">
                    <span>🎁</span>
                    <span>{language === 'ar' ? 'برنامج نقاط الوفاء:' : 'Points Cadeau de Fidélité :'}</span>
                  </span>
                  <span className="font-black text-indigo-900 font-mono bg-indigo-50 px-2.5 py-0.5 rounded-full text-[10.5px]">
                    {activePartner.loyaltyPoints || 0} pts
                  </span>
                </div>
                
                {maxPointsRedeemable > 0 ? (
                  <div className="bg-indigo-50/50 border border-indigo-100/50 p-2.5 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-[10.5px] text-indigo-700 font-bold font-mono">
                      <span>{language === 'ar' ? 'النقاط المستبدلة:' : 'Points convertis :'}</span>
                      <span>
                        {redeemedPoints} pts = -{formatCurrency(loyaltyDiscount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range"
                        min="0"
                        max={maxPointsRedeemable}
                        value={redeemedPoints}
                        onChange={(e) => setRedeemedPoints(Number(e.target.value))}
                        className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <button 
                        type="button"
                        onClick={() => setRedeemedPoints(maxPointsRedeemable)}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9.5px] font-black transition-colors shrink-0 cursor-pointer"
                      >
                        {language === 'ar' ? 'الأقصى' : 'Max'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-indigo-500 font-bold leading-tight select-none">
                    {activePartner.loyaltyPoints && activePartner.loyaltyPoints > 0 
                      ? (language === 'ar' ? 'لا يمكن استبدال نقاط: السعر مجاني بالفعل.' : 'Aucun point supplémentaire convertible.')
                      : (language === 'ar' ? 'لا توجد نقاط كافية للاستخدام حالياً.' : 'Aucun point disponible pour ce client actuellement.')
                    }
                  </p>
                )}
                
                {cart.length > 0 && (
                  <p className="text-[9.5px] text-indigo-400 font-medium italic">
                    ✨ {language === 'ar' 
                      ? `يكتسب المشتري +${Math.floor(finalTotal / (db.settings?.loyaltyXSpent ?? 10)) * (db.settings?.loyaltyYPoints ?? 1)} نقطة وفاء عند الشراء.` 
                      : `Cet achat va lui rapporter +${Math.floor(finalTotal / (db.settings?.loyaltyXSpent ?? 10)) * (db.settings?.loyaltyYPoints ?? 1)} pts loyalty.`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Cart Listing Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-150 space-y-4 shadow-3xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                <motion.div
                  animate={triggerPulse ? {
                    scale: [1, 1.3, 0.9, 1.15, 1],
                    y: [0, -4, 1.5, -0.5, 0],
                    rotate: [0, -6, 6, -3, 0]
                  } : { scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                >
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                </motion.div>
                <span>{language === 'ar' ? 'سلة المشتريات' : "Panier d'articles"}</span>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={cart.length}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-mono text-[10px] font-black w-5 h-5 rounded-full border border-blue-100"
                  >
                    {cart.length}
                  </motion.span>
                </AnimatePresence>
              </span>
              {cart.length > 0 && (
                <button 
                  onClick={() => setCart([])} 
                  className="text-xs text-rose-500 hover:text-rose-700 font-black cursor-pointer transition-colors"
                >
                  {language === 'ar' ? 'تفريغ السلة' : 'Vider le Panier'}
                </button>
              )}
            </div>

            {/* Mode Retour Toggle Row */}
            <div className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
              isReturnMode 
                ? 'bg-rose-50 border-rose-250 text-rose-900 shadow-sm shadow-rose-100/30' 
                : 'bg-slate-50 border-slate-150 text-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-md ${isReturnMode ? 'bg-rose-200 text-rose-700 animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold block">
                    {language === 'ar' ? 'وضع إسترجاع السلع' : 'Mode Retour de Marchandise'}
                  </span>
                  <span className="text-[8.5px] text-slate-400 block font-medium">
                    {language === 'ar' ? 'إرجاع سلع وتحديث المخزون تلقائياً' : 'Ré-insère le stock et ajuste le solde client'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (cart.length > 0) {
                    const confirmClear = window.confirm(
                      language === 'ar' 
                        ? 'تنبيه: تغيير الوضع سيقوم بإفراغ السلة الحالية. هل أنت متأكد؟' 
                        : 'Attention: Changer de mode videra le panier actuel. Continuer ?'
                    );
                    if (!confirmClear) return;
                    setCart([]);
                  }
                  setIsReturnMode(!isReturnMode);
                }}
                className={`px-3 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider cursor-pointer ${
                  isReturnMode 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs' 
                    : 'bg-white border border-slate-250 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {language === 'ar' ? (isReturnMode ? 'عادي 🛒' : 'إرجاع ↩') : (isReturnMode ? 'NORMAL 🛒' : 'RETOUR ↩')}
              </button>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-1 divide-y divide-slate-150/75">
              <AnimatePresence initial={false}>
                {cart.map((item, idx) => {
                    const isItemReturn = item.qty < 0;
                    return (
                      <motion.div
                        key={item.product.id}
                        layout
                        initial={{ opacity: 0, height: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, height: "auto", y: 0, scale: 1 }}
                        exit={{ opacity: 0, height: 0, y: 15, scale: 0.9, transition: { duration: 0.15 } }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        className={`pt-2.5 flex items-start justify-between gap-3 ${idx === 0 ? '!pt-0' : ''}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-slate-800 truncate leading-snug">{item.product.name}</p>
                            {isItemReturn && (
                              <span className="p-0.5 px-1.5 text-[8.5px] font-extrabold font-mono bg-rose-100 text-rose-700 rounded select-none uppercase tracking-wider animate-pulse">
                                {language === 'ar' ? 'إرجاع ↩' : 'RETOUR ↩'}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">P.U:</span>
                              <input
                                type="number"
                                value={item.customPrice}
                                onChange={(e) => handleUpdatePrice(item.product.id, Number(e.target.value))}
                                className="w-16 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded px-1.5 py-0.5 text-[10px] font-black font-mono text-blue-600 focus:bg-white focus:outline-hidden"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">x</span>
                            <motion.span
                              key={item.qty}
                              initial={{ scale: 0.75, opacity: 0.7 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 450, damping: 15 }}
                              className={`${isItemReturn ? 'text-rose-600' : 'text-slate-700'} text-[10px] font-black font-mono inline-block`}
                            >
                              {isItemReturn ? Math.abs(item.qty) : item.qty}
                            </motion.span>
                            <span className="text-[10px] text-slate-400">=</span>
                            <motion.span
                              key={`${item.qty}-${item.customPrice}`}
                              initial={{ scale: 0.85 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 450, damping: 15 }}
                              className={`${isItemReturn ? 'text-rose-600' : 'text-slate-700'} text-[10px] font-black font-mono inline-block`}
                            >
                              {formatCurrency(item.qty * item.customPrice)}
                            </motion.span>
                            
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-medium select-none">
                              TVA {item.product.tvaRate !== undefined ? item.product.tvaRate : 19}%
                            </span>
                          </div>
                        </div>

                        {/* Compact elegant Qty and Action block */}
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, item.qty - 1)}
                            className="w-5.5 h-5.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-750 rounded-md flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          
                          <motion.span
                            key={item.qty}
                            initial={{ scale: 0.65 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            className="text-xs font-bold font-mono w-5 text-center text-slate-800 inline-block"
                          >
                            {isItemReturn ? Math.abs(item.qty) : item.qty}
                          </motion.span>
                          
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, item.qty + 1)}
                            className="w-5.5 h-5.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-750 rounded-md flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="w-5.5 h-5.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md flex items-center justify-center cursor-pointer transition-colors ml-1.5"
                          title={language === 'ar' ? 'حذف السلعة' : 'Retirer l\'article'}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
            </div>
          </div>

          {/* Checkout & Bill Configurations Card */}
          {cart.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-150 space-y-4 shadow-3xs">
              
              {/* Type Switch BL vs Facture (Segmented slider design) */}
              <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-2 gap-1.5 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setCashRegisterType('bl');
                    setTaxRate(0);
                  }}
                  className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    cashRegisterType === 'bl'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-550 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bon de Livraison</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCashRegisterType('facture');
                    setTaxRate(19);
                  }}
                  className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    cashRegisterType === 'facture'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-550 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Facture Officielle</span>
                </button>
              </div>

              {/* Adjustments: Discount & Tax */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'تخفيض إجمالي (د.ت)' : 'Remise Globale (DT)'}
                  </label>
                  <input
                    type="number"
                    value={globalDiscount || ''}
                    placeholder="0 DT"
                    onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value)))}
                    onFocus={() => {
                      setActiveNumpadTarget('discount');
                      setKeyboardLayout('numeric');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-800 font-mono font-bold focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">TVA (%)</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-800 font-mono font-bold focus:bg-white focus:outline-none cursor-pointer transition-colors"
                  >
                    <option value={-1}>{language === 'ar' ? "حسب السلعة" : "TVA par article"}</option>
                    <option value={0}>0% (Nulle)</option>
                    <option value={7}>7% (Taux Réduit)</option>
                    <option value={9}>9% (Réduit)</option>
                    <option value={19}>19% (Standard)</option>
                  </select>
                </div>
              </div>

              {/* Summary prices and payment */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs select-none">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Sous-total :</span>
                  <span className="font-bold text-slate-800 font-mono">{formatCurrency(subTotal)}</span>
                </div>
                {clientDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 font-semibold">
                    <span>{language === 'ar' ? `تخفيض العميل (${activePartner?.discountRate}%) :` : `Remise Client (${activePartner?.discountRate}%) :`}</span>
                    <span className="font-mono font-black">- {formatCurrency(clientDiscount)}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between items-center text-indigo-600 font-semibold">
                    <span>{language === 'ar' ? `خصم نقاط الوفاء (${redeemedPoints} pts) :` : `Remise Fidélité (${redeemedPoints} pts) :`}</span>
                    <span className="font-mono font-black">- {formatCurrency(loyaltyDiscount)}</span>
                  </div>
                )}
                {globalDiscount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-semibold">
                    <span>{language === 'ar' ? 'تخفيض إضافي :' : 'Remise Ajoutée :'}</span>
                    <span className="font-mono font-black">- {formatCurrency(globalDiscount)}</span>
                  </div>
                )}
                {finalTaxAmount > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>TVA :</span>
                    <span className="font-bold text-slate-800 font-mono">{formatCurrency(finalTaxAmount)}</span>
                  </div>
                )}

                {/* Stunning Grand Total Panel */}
                <div className={`${isReturnMode ? 'bg-rose-900 border border-rose-800' : 'bg-slate-900'} text-white rounded-xl p-3.5 flex items-center justify-between shadow-xs mt-3 select-all`}>
                  <div>
                    <p className={`text-[9px] uppercase tracking-wider font-extrabold ${isReturnMode ? 'text-rose-305 text-rose-200 animate-pulse' : 'text-slate-400'}`}>
                      {isReturnMode 
                        ? (language === 'ar' ? 'المبلغ المراد إرجاعه للزبون' : 'À REMBOURSER AU CLIENT') 
                        : (language === 'ar' ? 'الصافي الإجمالي للدفع' : 'Net à Payer (TTC)')}
                    </p>
                    <p className="text-[10.5px] font-bold text-sky-400 mt-0.5">
                      {isReturnMode 
                        ? (language === 'ar' ? 'تذكرة إرجاع مرتجع' : 'Avoir / Retour fiscal')
                        : `${cashRegisterType.toUpperCase()} ${taxRate === 0 ? '(Exonéré)' : `(TVA Incluse)`}`}
                    </p>
                  </div>
                  <strong className={`text-xl font-mono font-black tracking-tight ${isReturnMode ? 'text-rose-300' : 'text-emerald-400'}`}>
                    {formatCurrency(finalTotal)}
                  </strong>
                </div>
              </div>

              {/* Cash payment section */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between select-none">
                  <label className="text-[10px] font-black text-slate-600 uppercase">
                    {language === 'ar' ? 'المبلغ المستلم / كاش' : 'Montant Reçu / Cash (DT)'}
                  </label>
                  <button
                    type="button"
                    onClick={handleQuickPayFull}
                    className="text-[10.5px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Exact / الكل</span>
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    ref={paidAmountInputRef}
                    type="number"
                    value={paidAmount}
                    placeholder={language === 'ar' ? "أدخل المبلغ المستلم..." : "Saisir montant reçu..."}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    onKeyDown={handlePaidAmountKeyDown}
                    onFocus={() => {
                      setActiveNumpadTarget('paidAmount');
                      setKeyboardLayout('numeric');
                    }}
                    className="w-full bg-slate-50 border border-slate-205 rounded-lg py-2.5 pl-3 pr-10 text-xs font-black font-mono focus:bg-white focus:outline-none transition-colors text-slate-850"
                  />
                  <span className="font-black text-[10px] text-slate-400 absolute right-3.5 top-3">
                    DT
                  </span>
                </div>

                {/* Return balance /debt status indicator widget */}
                {remainingDebt > 0 ? (
                  selectedPartnerId ? (
                    <div className="text-xs bg-rose-50 border border-rose-150 text-rose-800 p-2.5 rounded-lg font-bold flex items-center justify-between animate-fade-in select-none">
                      <span>{language === 'ar' ? 'المتبقي يسجل كدين على الحساب :' : 'Le reste sera reporter à CRÉDIT :'}</span>
                      <strong className="font-mono text-rose-955 text-sm">{formatCurrency(remainingDebt)}</strong>
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-amber-850 bg-amber-50 p-2.5 rounded-lg border border-amber-205 font-bold leading-relaxed animate-fade-in select-none">
                      ⚠️ {language === 'ar' 
                        ? 'زبون عادي مجهول: يرجى تحديد عميل مسجل لتسجيل الدين بقيمة ' 
                        : 'Client comptoir anonyme : impossible de reporter la dette de '}
                      <strong className="font-mono font-black">{formatCurrency(remainingDebt)}</strong>
                      {language === 'ar' 
                        ? ' أو دفع المبلغ كاملاً.' 
                        : ' à crédit. Réglage complet requis.'}
                    </div>
                  )
                ) : changeDue > 0 ? (
                  <div className="bg-emerald-500 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs animate-pulse select-none">
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-widest text-emerald-100">
                        {language === 'ar' ? 'صرف العميل / الباقي' : 'Reste à Rendre (Monnaie)'}
                      </p>
                      <p className="text-xs font-medium text-emerald-100 mt-0.5">{language === 'ar' ? 'يرجى ترجيع الفائض' : 'Remettre au client'}</p>
                    </div>
                    <strong className="text-xl font-mono font-black">{formatCurrency(changeDue)}</strong>
                  </div>
                ) : (
                  currentPay > 0 && (
                    <div className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-100 text-center select-none animate-fade-in">
                      ✨ {language === 'ar' ? 'تم استيفاء كامل المبلغ بالضبط' : 'Règlement effectué au centime près !'}
                    </div>
                  )
                )}

                {/* Clean, compact security SMS check trigger - lower vertical profile */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 no-print select-none">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="opt-secure-checkbox"
                      checked={useOtpVerification}
                      onChange={(e) => setUseOtpVerification(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <label htmlFor="opt-secure-checkbox" className="text-[10px] font-black text-slate-700 cursor-pointer text-left leading-normal">
                      <span>{language === 'ar' ? 'تأكيد العملية برمز OTP' : 'Notification SMS de sécurité'}</span>
                      <span className="block text-[8.5px] font-medium text-slate-450 mt-0.2">
                        {language === 'ar' ? 'لضمان المعاملة وتوثيق الدين' : 'Sécuriser le crédit du client'}
                      </span>
                    </label>
                  </div>
                  <span className="bg-indigo-100 text-[8.5px] text-indigo-800 font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wide">
                    SMS API
                  </span>
                </div>

                {/* Primary Submit Call-to-action button */}
                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  disabled={!selectedPartnerId && remainingDebt > 0}
                  className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-3 text-xs font-black tracking-widest uppercase disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-2 mt-2"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'ar' ? 'تأكيد وحفظ المعاملة' : `Valider l'Encaissement`}</span>
                </button>

                {/* Compact, styled quick layout printer config line */}
                <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-[10px] text-slate-500">
                  <div className="flex items-center gap-1 font-bold">
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Impression :</span>
                  </div>
                  <div className="flex items-center gap-2.5 justify-between sm:justify-end flex-1">
                    {/* Auto-print checkbox slider layout */}
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        id="autoPrintCheckbox"
                        checked={autoPrint}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAutoPrint(val);
                          safeLocalStorage.setItem('pos_auto_print', String(val));
                        }}
                        className="rounded border-slate-300 text-slate-700 w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor="autoPrintCheckbox" className="font-black text-slate-550 select-none cursor-pointer">
                        {language === 'ar' ? 'تلقائي' : 'Auto'}
                      </label>
                    </div>

                    <div className="h-3 w-px bg-slate-200"></div>

                    {/* Compact layout pill selector */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintFormat('ticket');
                          safeLocalStorage.setItem('pos_print_format', 'ticket');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold transition-all ${
                          printFormat === 'ticket' ? 'bg-white text-slate-950 font-black shadow-3xs' : 'text-slate-500'
                        }`}
                      >
                        Ticket (80m)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPrintFormat('a4');
                          safeLocalStorage.setItem('pos_print_format', 'a4');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold transition-all ${
                          printFormat === 'a4' ? 'bg-white text-slate-950 font-black shadow-3xs' : 'text-slate-500'
                        }`}
                      >
                        A4 Page
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIRTUAL KEYBOARD & ON-SCREEN NUMPAD DRAWER */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-4.5 space-y-3.5 shadow-xl select-none no-print mt-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">📟</span>
                <span className="text-[10.5px] font-black tracking-wider uppercase font-mono text-slate-200">
                  {language === 'ar' ? 'لوحة المدخلات والمفاتيح الذكية' : 'Contrôles Tactiles & Shortcuts'}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleNumpadExpanded}
                className="text-[9px] bg-slate-800 hover:bg-slate-700 font-extrabold px-2.5 py-1 rounded-md text-slate-300 transition-colors"
              >
                {isNumpadExpanded ? (language === 'ar' ? 'إخفاء' : 'Fermer ✕') : (language === 'ar' ? 'Afficher ⌨️' : 'Ouvrir ⌨️')}
              </button>
            </div>

            {isNumpadExpanded && (
              <div className="space-y-3 animate-fade-in text-[11px]">
                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950 rounded-lg text-[9px] font-bold">
                  {[
                    { id: 'rapidScan', label: language === 'ar' ? 'رمز باركود' : 'Barcode 📟' },
                    { id: 'search', label: language === 'ar' ? 'بحث سلع' : 'Chercher 🔍' },
                    { id: 'customPrice', label: language === 'ar' ? 'سعر حر' : 'Libre ✍️' },
                    { id: 'paidAmount', label: language === 'ar' ? 'كاش reçu' : 'Espèces 👤' },
                    { id: 'discount', label: language === 'ar' ? 'خصم' : 'Remise 🏷️' },
                    { id: 'lastItemQty', label: language === 'ar' ? 'كمية سعة' : 'Quantité 📦' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveNumpadTarget(tab.id as any);
                        if (tab.id === 'search') {
                          setKeyboardLayout('alphabetic');
                          setTimeout(() => searchInputRef.current?.focus(), 50);
                        } else if (tab.id === 'rapidScan') {
                          setKeyboardLayout('numeric');
                          setTimeout(() => rapidScanInputRef.current?.focus(), 50);
                        } else if (tab.id === 'paidAmount') {
                          setKeyboardLayout('numeric');
                          setTimeout(() => paidAmountInputRef.current?.focus(), 50);
                        } else {
                          setKeyboardLayout('numeric');
                        }
                      }}
                      className={`py-1 rounded-md transition-all text-center select-none ${
                        activeNumpadTarget === tab.id
                          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Keyboard Layout Switcher (Numeric vs Alphabetic) */}
                <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 pl-2">
                    {language === 'ar' ? 'نمط لوحة المفاتيح' : 'Layout Clavier'}
                  </span>
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 gap-1 select-none">
                    <button
                      type="button"
                      onClick={() => setKeyboardLayout('numeric')}
                      className={`px-3 py-1 rounded text-[9px] font-black tracking-wider transition-all uppercase ${
                        keyboardLayout === 'numeric'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🔢 123
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyboardLayout('alphabetic')}
                      className={`px-3 py-1 rounded text-[9px] font-black tracking-wider transition-all uppercase ${
                        keyboardLayout === 'alphabetic'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🔤 ABC
                    </button>
                  </div>
                </div>

                {/* Sub-layout selectors when Alphabetic is active */}
                {keyboardLayout === 'alphabetic' && (
                  <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded-xl border border-slate-850 animate-fade-in">
                    <span className="text-[8px] uppercase font-extrabold tracking-wider text-slate-500 pl-2">
                      {language === 'ar' ? 'تنسيق الحروف' : 'Format de Clavier'}
                    </span>
                    <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 gap-1 text-[8px] font-black">
                      <button
                        type="button"
                        onClick={() => setAlphabeticType('azerty')}
                        className={`px-2 py-0.5 rounded transition-all ${
                          alphabeticType === 'azerty' ? 'bg-indigo-800 text-white' : 'text-slate-400 hover:text-slate-205'
                        }`}
                      >
                        AZERTY
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlphabeticType('qwerty')}
                        className={`px-2 py-0.5 rounded transition-all ${
                          alphabeticType === 'qwerty' ? 'bg-indigo-800 text-white' : 'text-slate-400 hover:text-slate-205'
                        }`}
                      >
                        QWERTY
                      </button>
                    </div>
                  </div>
                )}

                {/* Glistening active display readout */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center space-y-0.5">
                  <p className="text-[8px] font-black tracking-widest text-slate-500 uppercase">
                    {activeNumpadTarget === 'rapidScan' && (language === 'ar' ? 'تعديل الباركود' : 'Saisie Code-barres')}
                    {activeNumpadTarget === 'search' && (language === 'ar' ? 'بحث السلع بالاسم' : 'Filtre Catalogue')}
                    {activeNumpadTarget === 'customPrice' && (language === 'ar' ? 'سعر البيع المباشر' : 'Saisie Prix Libre')}
                    {activeNumpadTarget === 'paidAmount' && (language === 'ar' ? 'مبلغ كاش مستلم' : 'Saisie Espèces Reçu')}
                    {activeNumpadTarget === 'discount' && (language === 'ar' ? 'حجم الخصم المضاف' : 'Saisie Remise Globale')}
                    {activeNumpadTarget === 'lastItemQty' && (language === 'ar' ? 'كمية السلعة الأخيرة' : 'Saisie Quantité Article')}
                  </p>
                  <p className="text-sm font-mono font-black text-cyan-400 truncate">
                    {activeNumpadTarget === 'rapidScan' && (rapidScanValue || '—')}
                    {activeNumpadTarget === 'search' && (searchQuery || '—')}
                    {activeNumpadTarget === 'customPrice' && (customItemPrice ? `${customItemPrice} DT` : '—')}
                    {activeNumpadTarget === 'paidAmount' && (paidAmount ? `${paidAmount} DT` : '—')}
                    {activeNumpadTarget === 'discount' && (globalDiscount ? `${globalDiscount} DT` : '0 DT')}
                    {activeNumpadTarget === 'lastItemQty' && (cart.length > 0 ? `${cart[cart.length - 1].qty} x ${cart[cart.length - 1].product.name}` : (language === 'ar' ? 'لا توجد سلع بال سلة (فارغ)' : 'Le panier est vide'))}
                  </p>
                </div>

                {/* Tactile Grids (Numeric vs Alphabetical) */}
                {keyboardLayout === 'alphabetic' ? (
                  <div className="space-y-1.5 animate-fade-in select-none">
                    {/* Row 1 */}
                    <div className="flex gap-1.2 justify-between">
                      {(alphabeticType === 'azerty' 
                        ? ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
                        : ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
                      ).map(char => (
                        <button
                          key={char}
                          type="button"
                          onClick={() => handleNumpadKeyPress(char)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-[10px] font-black rounded-lg transition-all text-slate-200 text-center cursor-pointer shadow-xs border border-slate-750"
                        >
                          {char}
                        </button>
                      ))}
                    </div>

                    {/* Row 2 */}
                    <div className="flex gap-1.2 justify-between pl-1.5">
                      {(alphabeticType === 'azerty'
                        ? ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M']
                        : ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M']
                      ).map(char => (
                        <button
                          key={char}
                          type="button"
                          onClick={() => handleNumpadKeyPress(char)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-[10px] font-black rounded-lg transition-all text-slate-200 text-center cursor-pointer shadow-xs border border-slate-750"
                        >
                          {char}
                        </button>
                      ))}
                    </div>

                    {/* Row 3 */}
                    <div className="flex gap-1.2 justify-between pl-3">
                      {(alphabeticType === 'azerty'
                        ? ['W', 'X', 'C', 'V', 'B', 'N']
                        : ['Z', 'X', 'C', 'V', 'B', 'N']
                      ).map(char => (
                        <button
                          key={char}
                          type="button"
                          onClick={() => handleNumpadKeyPress(char)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-[10px] font-black rounded-lg transition-all text-slate-200 text-center cursor-pointer shadow-xs border border-slate-750"
                        >
                          {char}
                        </button>
                      ))}
                      {/* Special fast character '-' */}
                      <button
                        type="button"
                        onClick={() => handleNumpadKeyPress('-')}
                        className="flex-1 bg-slate-850 hover:bg-slate-750 active:scale-95 py-2 text-[10px] font-black rounded-lg transition-all text-slate-350 text-center cursor-pointer border border-slate-750"
                      >
                        -
                      </button>
                      {/* Backspace */}
                      <button
                        type="button"
                        onClick={() => handleNumpadKeyPress('⌫')}
                        className="flex-grow-[1.5] bg-rose-950/70 border border-rose-900 text-rose-300 hover:bg-rose-905 active:scale-95 py-2 text-[10px] font-black rounded-lg transition-all text-center cursor-pointer shadow-xs"
                        title="Effacer"
                      >
                        ⌫
                      </button>
                    </div>

                    {/* Row 4 (Space, Clear, Special chars) */}
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleNumpadKeyPress('C')}
                        className="w-14 bg-amber-950/70 border border-amber-900 text-amber-300 hover:bg-amber-900 active:scale-95 py-2 text-[10px] font-black rounded-lg transition-all text-center cursor-pointer"
                        title="Vider"
                      >
                        CLR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNumpadKeyPress(' ')}
                        className="flex-1 bg-indigo-950/90 hover:bg-indigo-900 active:scale-95 py-2 text-[10px] font-black rounded-lg transition-all text-indigo-200 text-center uppercase tracking-widest font-mono cursor-pointer border border-indigo-800"
                      >
                        {language === 'ar' ? 'فراغ ␣' : 'ESPACE ␣'}
                      </button>
                      {/* Extra symbols for convenience */}
                      {['@', '_', '.'].map(char => (
                        <button
                          key={char}
                          type="button"
                          onClick={() => handleNumpadKeyPress(char)}
                          className="w-8 bg-slate-850 hover:bg-slate-750 active:scale-95 py-2 text-[10px] font-black rounded-lg transition-all text-slate-350 text-center cursor-pointer border border-slate-750"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Tactile Numeric Grid */
                  <div className="grid grid-cols-4 gap-1.5 animate-fade-in select-none">
                    <button type="button" onClick={() => handleNumpadKeyPress('7')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">7</button>
                    <button type="button" onClick={() => handleNumpadKeyPress('8')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">8</button>
                    <button type="button" onClick={() => handleNumpadKeyPress('9')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">9</button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (activeNumpadTarget === 'lastItemQty') {
                          if (cart.length > 0) {
                            const last = cart[cart.length - 1];
                            handleUpdateQty(last.product.id, last.qty + 1);
                            playScanBeep();
                          }
                        } else if (activeNumpadTarget === 'paidAmount') {
                          setPaidAmount(prev => String((Number(prev) || 0) + 10));
                        } else {
                          handleNumpadKeyPress('1');
                        }
                      }} 
                      className="bg-indigo-950 border border-indigo-900 text-indigo-400 hover:bg-indigo-900 active:scale-95 py-2 text-[9px] font-black rounded-lg transition-all"
                    >
                      {activeNumpadTarget === 'lastItemQty' ? '+1 Qty' : '+10 DT'}
                    </button>

                    <button type="button" onClick={() => handleNumpadKeyPress('4')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">4</button>
                    <button type="button" onClick={() => handleNumpadKeyPress('5')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">5</button>
                    <button type="button" onClick={() => handleNumpadKeyPress('6')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">6</button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (activeNumpadTarget === 'lastItemQty') {
                          if (cart.length > 0) {
                            const last = cart[cart.length - 1];
                            handleUpdateQty(last.product.id, last.qty + 5);
                            playScanBeep();
                          }
                        } else if (activeNumpadTarget === 'paidAmount') {
                          setPaidAmount(prev => String((Number(prev) || 0) + 20));
                        }
                      }} 
                      className="bg-indigo-950 border border-indigo-900 text-indigo-400 hover:bg-indigo-900 active:scale-95 py-2 text-[9px] font-black rounded-lg transition-all"
                    >
                      {activeNumpadTarget === 'lastItemQty' ? '+5 Qty' : '+20 DT'}
                    </button>

                    <button type="button" onClick={() => handleNumpadKeyPress('1')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">1</button>
                    <button type="button" onClick={() => handleNumpadKeyPress('2')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">2</button>
                    <button type="button" onClick={() => handleNumpadKeyPress('3')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">3</button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (activeNumpadTarget === 'lastItemQty') {
                          if (cart.length > 0) {
                            const last = cart[cart.length - 1];
                            handleUpdateQty(last.product.id, last.qty + 10);
                            playScanBeep();
                          }
                        } else if (activeNumpadTarget === 'paidAmount') {
                          setPaidAmount(prev => String((Number(prev) || 0) + 50));
                        }
                      }} 
                      className="bg-indigo-950 border border-indigo-900 text-indigo-400 hover:bg-indigo-900 active:scale-95 py-2 text-[9px] font-black rounded-lg transition-all"
                    >
                      {activeNumpadTarget === 'lastItemQty' ? '+10 Qty' : '+50 DT'}
                    </button>

                    <button type="button" onClick={() => handleNumpadKeyPress('0')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-xs font-black rounded-lg transition-all text-slate-200">0</button>
                    <button type="button" onClick={() => handleNumpadKeyPress('.')} className="bg-slate-800 hover:bg-slate-700 active:scale-95 py-2 text-sm font-black rounded-lg transition-all text-slate-200">.</button>
                    <button type="button" onClick={() => handleNumpadKeyPress('⌫')} className="bg-rose-950/70 border border-rose-900 text-rose-300 hover:bg-rose-900 active:scale-95 py-2 text-xs font-black rounded-lg transition-all" title="Effacer dernier">⌫</button>
                    <button type="button" onClick={() => handleNumpadKeyPress('C')} className="bg-amber-950/70 border border-amber-900 text-amber-350 hover:bg-amber-900 active:scale-95 py-2 text-xs font-black rounded-lg transition-all" title="Vider tout">C</button>
                  </div>
                )}

                {/* Essential Quick Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setPaidAmount(String(finalTotal));
                      playScanBeep();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 py-2 rounded-lg text-white font-semibold font-mono text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all text-center"
                    title="Entrer le montant TTC exact de la caisse"
                  >
                    💵 {language === 'ar' ? 'المبلغ المستلم دقيق' : 'Montant Exact'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (cart.length > 0) {
                        handleCheckoutClick();
                      } else {
                        showToast(language === 'ar' ? 'السلة فارغة' : 'Le panier est vide', 'error');
                      }
                    }}
                    className="bg-sky-600 hover:bg-sky-700 active:scale-95 py-2 rounded-lg text-white font-semibold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    ✔ {language === 'ar' ? 'تأكيد المعاملة ✔' : 'Valider Ticket'}
                  </button>
                </div>

                {/* Collapsible reference guide */}
                <div className="pt-2.5 text-[9.5px] text-slate-400 font-mono space-y-1 bg-slate-950/30 p-2.5 rounded-lg border border-slate-850">
                  <p className="font-extrabold text-slate-300 border-b border-slate-800 pb-1 mb-1 text-[9.5px]">⌨️ Raccourcis Clavier Cashier (Pro) :</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.8 text-[8.5px]">
                    <p>• <kbd className="bg-slate-800 text-slate-200 px-1 rounded font-bold">F2</kbd> : Vider Panier</p>
                    <p>• <kbd className="bg-slate-800 text-slate-200 px-1 rounded font-bold">F3</kbd> : Recherche</p>
                    <p>• <kbd className="bg-slate-800 text-slate-200 px-1 rounded font-bold">F4</kbd> : Saisie Espece</p>
                    <p>• <kbd className="bg-slate-800 text-slate-200 px-1 rounded font-bold">F7</kbd> : Mode Retour</p>
                    <p>• <kbd className="bg-slate-800 text-slate-200 px-1 rounded font-bold">F8</kbd> : Client Facture</p>
                    <p>• <kbd className="bg-slate-800 text-slate-200 px-1 rounded font-bold">/</kbd> : Saisie Barcode</p>
                    <p>• <kbd className="bg-slate-800 text-slate-200 px-1 rounded font-bold">*</kbd> : Prix Vente Libre</p>
                    <p>• <kbd className="bg-slate-800 text-slate-200 px-1 rounded font-bold">+</kbd> / <kbd className="bg-slate-800 text-slate-200 px-1 rounded font-bold">-</kbd> : Ajuster dernier</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QUICK CLIENT MODAL OVERLAY */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 md:p-6 shadow-xl space-y-4 my-auto">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">➕ Ajouter un Client à la Caisse</h3>
            <form onSubmit={handleCreateQuickClient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Sarl Algiers Tech"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone</label>
                  <input
                    type="text"
                    placeholder="Ex : +216..."
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Adresse</label>
                  <input
                    type="text"
                    placeholder="Ex : Tunis"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  🏷️ {language === 'ar' ? 'الخصم التلقائي للزبون (%)' : 'Remise Client Automatique (%)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Ex : 5"
                  value={newClientDiscountRate}
                  onChange={(e) => setNewClientDiscountRate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-hidden font-mono text-emerald-700 font-bold"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs font-bold cursor-pointer hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold cursor-pointer hover:bg-blue-750 font-mono transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW OVERLAY & EMBED FOR DIRECT IN-BROWSER HANDOFF */}
      {printedInvoice && (() => {
        const storeName = db.settings?.storeName ?? "INNOVA POS PRO";
        const storePhone = db.settings?.storePhone ?? "+216 24260711";
        const storeAddress = db.settings?.storeAddress ?? "AVENU HABIB BORGIBA GHANNOUCHE GABES";
        const matriculeFiscal = db.settings?.matriculeFiscal ?? "1234567/A/M/000";
        const activitySector = db.settings?.activitySector ?? "superette";

        return (
          <>
            {/* Interactive Screen Preview Sheet */}
            <div 
              onClick={closePrintModal}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 md:p-6 z-50 overflow-y-auto no-print animate-fade-in"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl w-full max-w-3xl p-5 md:p-6 border border-slate-200 shadow-2xl relative my-4 sm:my-8 transition-all"
              >
                
                {/* Absolute Top-Right X Close Button */}
                <button
                  type="button"
                  onClick={closePrintModal}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full cursor-pointer transition-colors no-print z-50 border border-slate-200 flex items-center justify-center focus:outline-hidden"
                  title={language === 'ar' ? 'إغلاق' : 'Fermer (✕)'}
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Sticky Header to ensure format selectors and close/print actions are always on screen and accessible */}
                <div className="sticky top-0 bg-white z-40 pb-4 mb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-display">
                    <Receipt className="w-5 h-5 text-blue-600 animate-pulse" />
                    <span>
                      {language === 'ar' ? `مستند جاهز للطباعة - ${printedInvoice.number}` : `Facturation Prête - ${printedInvoice.number}`}
                    </span>
                  </span>
                  
                  {/* Print format selector */}
                  <div className="flex items-center bg-slate-100 p-1.5 rounded border border-slate-200 space-x-1">
                    <button
                      onClick={() => setPrintFormat('a4')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${printFormat === 'a4' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      📄 A4
                    </button>
                    <button
                      onClick={() => setPrintFormat('ticket')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${printFormat === 'ticket' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🎫 Ticket (80mm)
                    </button>
                  </div>

                   <div className="flex items-center space-x-2">
                    {/* Manual print button to launch print dialog */}
                    <button
                      onClick={handlePrint}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer font-mono"
                    >
                      📠 {language === 'ar' ? 'طباعة' : 'Imprimer'}
                    </button>

                    <button
                      onClick={handleDownloadPDF}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'تحميل مباشر' : 'PDF'}
                    </button>

                    {/* Highly visible close button */}
                    <button
                      onClick={closePrintModal}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <X className="w-3.5 h-3.5 shrink-0" />
                      <span>{language === 'ar' ? 'إغلاق' : 'Fermer'}</span>
                    </button>

                  </div>
                </div>

                {/* High quality iframe sandboxing notification banner */}
                {checkIsIframe() && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3 rounded-xl text-xs flex items-start gap-2 mb-4 leading-normal no-print">
                    <span className="text-sm shrink-0">⚠️</span>
                    <div>
                      <p className="font-bold">{language === 'ar' ? 'وضع المعاينة (الإطار المضمن)' : 'Mode Aperçu (iFrame)'}</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        {language === 'ar'
                          ? 'الطباعة المباشرة معطلة بواسطة بيئة المعاينة الآمنة. لحفظ كـ PDF أو استخدام الطابعة، يرجى فتح التطبيق في علامة تبويب جديدة أو استخدام زر تحميل PDF المباشر.'
                          : "L'impression physique directe est bloquée par l'environnement bac à sable d'AI Studio. Pour imprimer vos tickets, veuillez ouvrir l'application dans un nouvel onglet, ou utilisez le téléchargement PDF direct."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Helpful dynamic PDF tip */}
                <div className="bg-blue-50/70 p-3 rounded text-[11px] text-blue-900 border border-blue-100 mb-4 leading-normal flex items-start gap-2 no-print">
                  <span className="text-amber-500 font-bold shrink-0">💡 PDF :</span>
                  <p>
                    {language === 'ar' 
                      ? "لحفظ الفاتورة كـ ملف PDF، اضغط زر الطباعة ثم اختر 'حفظ بتنسيق PDF' (Enregistrer au format PDF) من قائمة الطابعات المتوفرة." 
                      : "Pour sauvegarder en PDF, cliquez sur Imprimer puis sélectionnez 'Enregistrer au format PDF' dans la liste des imprimantes."}
                  </p>
                </div>

                {/* Printable Document Area for Screen Preview */}
                <div 
                  id="print-area" 
                  className={`bg-white rounded border border-slate-200 overflow-y-auto max-h-[500px] shadow-inner ${
                    printFormat === 'ticket' ? 'max-w-[380px] mx-auto text-xs' : 'w-full'
                  }`}
                  style={
                    printFormat === 'ticket' ? {
                      paddingTop: `${db.settings?.receiptMarginTop ?? 2}mm`,
                      paddingBottom: `${db.settings?.receiptMarginBottom ?? 3}mm`,
                      paddingLeft: `${db.settings?.receiptMarginLeft ?? 3}mm`,
                      paddingRight: `${db.settings?.receiptMarginRight ?? 3}mm`,
                    } : {
                      paddingTop: `${db.settings?.invoiceMarginTop ?? 8}mm`,
                      paddingBottom: `${db.settings?.invoiceMarginBottom ?? 8}mm`,
                      paddingLeft: `${db.settings?.invoiceMarginLeft ?? 8}mm`,
                      paddingRight: `${db.settings?.invoiceMarginRight ?? 8}mm`,
                    }
                  }
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                  
                  {printFormat === 'ticket' ? (
                    /* ----------------- THERMAL TICKET FORMAT ----------------- */
                    <div className={`text-center font-sans space-y-3 ${db.settings?.receiptCompactSize ? 'text-[10px] leading-tight space-y-2' : 'text-xs'}`}>
                      <div className="border-b border-dashed border-slate-300 pb-3">
                        {db.settings?.receiptShowLogo !== false && (db.settings?.receiptCustomLogo || db.settings?.storeLogo) && (
                          ((db.settings.receiptCustomLogo || db.settings.storeLogo)!.startsWith('data:') || (db.settings.receiptCustomLogo || db.settings.storeLogo)!.startsWith('http') || (db.settings.receiptCustomLogo || db.settings.storeLogo)!.startsWith('/') || (db.settings.receiptCustomLogo || db.settings.storeLogo)!.includes('.') || (db.settings.receiptCustomLogo || db.settings.storeLogo)!.length > 15) ? (
                            <img 
                              src={db.settings.receiptCustomLogo || db.settings.storeLogo} 
                              alt="Logo" 
                              className="w-20 h-20 rounded object-cover bg-white mx-auto mb-1.5 border border-slate-200" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-4xl mx-auto mb-1.5 shrink-0 select-none">
                              {db.settings.receiptCustomLogo || db.settings.storeLogo}
                            </div>
                          )
                        )}
                        
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{storeName}</h2>
                        
                        {db.settings?.receiptShowStoreDetails !== false && (
                          <>
                            <p className="text-[10px] text-slate-500 mt-1">{storeAddress}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Tél: {storePhone}</p>
                            {matriculeFiscal && <p className="text-[9px] text-slate-400 font-mono mt-0.5">MF: {matriculeFiscal}</p>}
                          </>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono border-b border-dashed border-slate-200 pb-2">
                        <span>{printedInvoice.type === 'facture' ? 'FACTURE' : 'BON LIVRAISON'}</span>
                        <span className="font-bold">{printedInvoice.number}</span>
                        <span>{printedInvoice.date.includes('T') ? printedInvoice.date.split('T')[0] : printedInvoice.date}</span>
                      </div>

                      <div className="text-start text-[10px] text-slate-700 space-y-0.5 pb-2 border-b border-dashed border-slate-200">
                        <p><span className="font-bold">{language === 'ar' ? 'العميل:' : 'Client:'}</span> {printedInvoice.partnerName}</p>
                      </div>

                      {/* Table simple for Ticket */}
                      <div className="space-y-2 py-2 border-b border-dashed border-slate-300 text-left" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        {printedInvoice.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-start text-[11px] leading-tight font-mono">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold text-slate-800 font-sans truncate">{item.productName}</p>
                              <p className="text-[9px] text-slate-500">{item.qty} x {formatCurrency(item.sellingPrice)}</p>
                            </div>
                            <span className="font-bold text-slate-900 shrink-0">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Calculations for Ticket */}
                      <div className="space-y-1 pt-1.5 text-xs font-mono" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{language === 'ar' ? 'المجموع:' : 'Sous-total:'}</span>
                          <span>{formatCurrency(printedInvoice.subTotal)}</span>
                        </div>
                        {printedInvoice.discount > 0 && (
                          <div className="flex justify-between text-rose-600 font-bold">
                            <span>{language === 'ar' ? 'الخصم:' : 'Remise:'}</span>
                            <span>- {formatCurrency(printedInvoice.discount)}</span>
                          </div>
                        )}
                        {printedInvoice.taxAmount > 0 && (
                          <div className="flex justify-between">
                            <span>TVA{printedInvoice.taxRate === -1 ? '' : ` (${printedInvoice.taxRate}%)`}:</span>
                            <span>{formatCurrency(printedInvoice.taxAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black border-t border-dashed border-slate-300 pt-1.5 text-slate-900">
                          <span>{language === 'ar' ? 'الصافي للدفع:' : 'Net à Payer:'}</span>
                          <span>{formatCurrency(printedInvoice.total)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-600">
                          <span>{language === 'ar' ? 'المستلم:' : 'Reçu:'}</span>
                          <span className="text-emerald-600">{formatCurrency(printedInvoice.paidAmount)}</span>
                        </div>
                        {printedInvoice.balance > 0 && (
                          <div className="flex justify-between text-xs bg-rose-50 text-rose-800 p-1 rounded font-bold">
                            <span>{language === 'ar' ? 'المتبقي بالدين:' : 'Reste à CREDIT:'}</span>
                            <span>{formatCurrency(printedInvoice.balance)}</span>
                          </div>
                        )}
                        {printedInvoice.loyaltyPointsEarned !== undefined && printedInvoice.loyaltyPointsEarned > 0 && (
                          <div className="flex justify-between text-[10px] text-indigo-700 font-bold border-t border-dashed border-slate-200 pt-1.5 mt-1.5 pb-0.5">
                            <span>🎉 {language === 'ar' ? 'النقاط المكتسبة:' : 'Points acquis:'}</span>
                            <span>+{printedInvoice.loyaltyPointsEarned} pts</span>
                          </div>
                        )}
                        {printedInvoice.loyaltyPointsRedeemed !== undefined && printedInvoice.loyaltyPointsRedeemed > 0 && (
                          <div className="flex justify-between text-[10px] text-indigo-700 font-bold">
                            <span>🎁 {language === 'ar' ? 'النقاط المستبدلة:' : 'Points retirés:'}</span>
                            <span>-{printedInvoice.loyaltyPointsRedeemed} pts</span>
                          </div>
                        )}
                      </div>

                      {/* Custom note and Terms */}
                      <div className="pt-3 text-center text-[10px] border-t border-dashed border-slate-200 space-y-1">
                        <p className="font-bold text-slate-800">
                          {db.settings?.receiptCustomThankYou || (language === 'ar' ? '✨ شكراً لزيارتكم وثقتكم بنا ✨' : 'Merci pour votre confiance !')}
                        </p>
                        
                        {db.settings?.receiptShowCommercialTerms !== false && (
                          <p className="text-[8px] text-slate-400 leading-normal" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            {language === 'ar' 
                              ? '⚠️ البضاعة المباعة لا تُرد ولا تُستبدل بعد مضي 48 ساعة.' 
                              : '⚠️ Marchandise ni reprise ni échangée après 48H.'}
                          </p>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* ----------------- PROFESSIONAL A4 FORMAT ----------------- */
                    <div className="space-y-6">
                      {/* Document Header */}
                      <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                        <div className="flex items-start gap-4">
                          {(db.settings?.invoiceCustomLogo || db.settings?.storeLogo) && (
                            ((db.settings.invoiceCustomLogo || db.settings.storeLogo)!.startsWith('data:') || (db.settings.invoiceCustomLogo || db.settings.storeLogo)!.startsWith('http') || (db.settings.invoiceCustomLogo || db.settings.storeLogo)!.startsWith('/') || (db.settings.invoiceCustomLogo || db.settings.storeLogo)!.includes('.') || (db.settings.invoiceCustomLogo || db.settings.storeLogo)!.length > 15) ? (
                              <img 
                                src={db.settings.invoiceCustomLogo || db.settings.storeLogo} 
                                alt="Logo" 
                                className="w-28 h-28 rounded-lg object-cover bg-white border border-slate-200 shadow-xs shrink-0" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-24 h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-5xl font-bold font-sans shrink-0 select-none">
                                {db.settings.invoiceCustomLogo || db.settings.storeLogo}
                              </div>
                            )
                          )}
                          <div>
                            <h2 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">{storeName}</h2>
                            <p className="text-[10px] text-slate-500 font-mono mt-1">{storeAddress}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Tél: {storePhone}</p>
                            {matriculeFiscal && <p className="text-[10px] text-slate-500 font-mono">MF: {matriculeFiscal}</p>}
                            <p className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase mt-1/4 w-max">
                              {activitySector.toUpperCase()} SPECIALIST
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-xs bg-blue-100 text-blue-900 font-black px-2.5 py-1 rounded block uppercase mb-1">
                            {printedInvoice.type === 'facture' ? (language === 'ar' ? 'فاتورة بيع' : 'Facture') : (language === 'ar' ? 'وصل تسليم سلع' : 'Bon de Livraison')}
                          </span>
                          <p className="text-xs font-bold text-slate-900 font-mono">{printedInvoice.number}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">Date: {printedInvoice.date.includes('T') ? printedInvoice.date.split('T')[0] : printedInvoice.date}</p>
                        </div>
                      </div>

                      {/* Partners section */}
                      <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded border border-slate-150">
                        <div>
                          <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            {language === 'ar' ? 'المصدر' : 'Émetteur'}
                          </h4>
                          <p className="font-bold text-slate-850">{storeName}</p>
                          <p className="text-slate-500 font-mono text-[10px] mt-0.5">Tél: {storePhone}</p>
                          <p className="text-slate-500 font-mono text-[10px]">{storeAddress}</p>
                        </div>
                        <div>
                          <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            {language === 'ar' ? 'المرسل إليه (الحريف)' : 'Destinataire (Client)'}
                          </h4>
                          <p className="font-bold text-slate-850">{printedInvoice.partnerName}</p>
                          <p className="text-slate-500 font-mono text-[10px] mt-0.5">
                            {language === 'ar' ? 'تاريخ الدفع: دفع فوري' : `Échéance : ${printedInvoice.dueDate || 'Paiement comptant'}`}
                          </p>
                        </div>
                      </div>

                      {/* Items Table details */}
                      <div className="overflow-x-auto">
                        <table className={`w-full text-xs text-slate-700 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200">
                              <th className="p-2.5">{language === 'ar' ? 'السلعة / البيان' : 'Description'}</th>
                              <th className="p-2.5 text-center">{language === 'ar' ? 'الكمية' : 'Qté'}</th>
                              <th className="p-2.5 text-right">{language === 'ar' ? 'سعر الوحدة' : 'Prix Unitaire'}</th>
                              <th className="p-2.5 text-right">{language === 'ar' ? 'المجموع' : 'Montant Total'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {printedInvoice.items.map((item, i) => (
                              <tr key={i} className="hover:bg-slate-50 font-mono text-[11px]">
                                <td className="p-2.5 font-sans font-bold text-slate-850">{item.productName}</td>
                                <td className="p-2.5 text-center">{item.qty}</td>
                                <td className="p-2.5 text-right">{formatCurrency(item.sellingPrice)}</td>
                                <td className="p-2.5 text-right font-black text-slate-900">{formatCurrency(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Financial calculations bottom */}
                      <div className="border-t border-slate-200 pt-4 flex justify-end">
                        <div className="w-72 space-y-2 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-500">{language === 'ar' ? 'المجموع الصافي الفرعي:' : 'Sous-total :'}</span>
                            <span className="text-slate-800">{formatCurrency(printedInvoice.subTotal)}</span>
                          </div>
                          {printedInvoice.discount > 0 && (
                            <div className="flex justify-between text-rose-600 font-bold">
                              <span>{language === 'ar' ? 'التخفيض الإجمالي:' : 'Remise globale :'}</span>
                              <span>- {formatCurrency(printedInvoice.discount)}</span>
                            </div>
                          )}
                          {printedInvoice.taxAmount > 0 && (
                            <div className="flex justify-between">
                              <span>TVA{printedInvoice.taxRate === -1 ? '' : ` (${printedInvoice.taxRate}%)`} :</span>
                              <span>{formatCurrency(printedInvoice.taxAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-1.5 text-slate-950">
                            <span>{language === 'ar' ? 'الصافي النهائي للدفع:' : 'Total Net à Payer :'}</span>
                            <span>{formatCurrency(printedInvoice.total)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold pt-1 text-slate-600">
                            <span>{language === 'ar' ? 'المبلغ المدفوع حينه:' : 'Montant Versé :'}</span>
                            <span className="text-emerald-600">{formatCurrency(printedInvoice.paidAmount)}</span>
                          </div>
                          {printedInvoice.balance > 0 && (
                            <div className="flex justify-between text-xs bg-rose-50 text-rose-800 p-1 rounded font-bold border border-rose-100">
                              <span>{language === 'ar' ? 'باقي الحساب (دين):' : 'Crédit Restant :'}</span>
                              <span>{formatCurrency(printedInvoice.balance)}</span>
                            </div>
                          )}
                          {printedInvoice.loyaltyPointsEarned !== undefined && printedInvoice.loyaltyPointsEarned > 0 && (
                            <div className="flex justify-between text-[11px] text-indigo-750 font-bold border-t border-slate-100 pt-1.5 mt-1 pb-0.5">
                              <span>🎉 {language === 'ar' ? 'النقاط المكتسبة:' : 'Points de fidélité acquis:'}</span>
                              <span className="text-indigo-800">+{printedInvoice.loyaltyPointsEarned} pts</span>
                            </div>
                          )}
                          {printedInvoice.loyaltyPointsRedeemed !== undefined && printedInvoice.loyaltyPointsRedeemed > 0 && (
                            <div className="flex justify-between text-[11px] text-indigo-750 font-bold">
                              <span>🎁 {language === 'ar' ? 'النقاط المستبدلة:' : 'Points de fidélité utilisés:'}</span>
                              <span className="text-indigo-800">-{printedInvoice.loyaltyPointsRedeemed} pts</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-8 border-t border-dashed border-slate-200 pt-4 flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>{language === 'ar' ? 'شكراً لتعاملكم معنا' : 'Merci pour votre confiance !'}</span>
                        <span>Signature & Cachet commercial</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

             {/* DECOUPLED FULL-FIDELITY PRINT PORTAL LAYER */}
             {createPortal(
               <div 
                 className={printFormat === 'ticket' ? 'ticket-print-layout' : 'a4-print-layout'} 
                 style={
                   printFormat === 'ticket' ? {
                     paddingTop: `${db.settings?.receiptMarginTop ?? 2}mm`,
                     paddingBottom: `${db.settings?.receiptMarginBottom ?? 3}mm`,
                     paddingLeft: `${db.settings?.receiptMarginLeft ?? 3}mm`,
                     paddingRight: `${db.settings?.receiptMarginRight ?? 3}mm`,
                   } : {
                     paddingTop: `${db.settings?.invoiceMarginTop ?? 8}mm`,
                     paddingBottom: `${db.settings?.invoiceMarginBottom ?? 8}mm`,
                     paddingLeft: `${db.settings?.invoiceMarginLeft ?? 8}mm`,
                     paddingRight: `${db.settings?.invoiceMarginRight ?? 8}mm`,
                   }
                 }
                 dir={language === 'ar' ? 'rtl' : 'ltr'}
               >
                 {printFormat === 'ticket' ? (
                   /* ----------------- THERMAL TICKET FORMAT FOR PORTAL ----------------- */
                   <div className={`text-center space-y-3 ${db.settings?.receiptCompactSize ? 'text-[10px] leading-tight space-y-2' : 'text-xs'}`}>
                     <div className="border-b border-dashed border-slate-300 pb-3">
                       {db.settings?.receiptShowLogo !== false && (db.settings?.receiptCustomLogo || db.settings?.storeLogo) && (
                         ((db.settings.receiptCustomLogo || db.settings.storeLogo)!.startsWith('data:') || (db.settings.receiptCustomLogo || db.settings.storeLogo)!.startsWith('http') || (db.settings.receiptCustomLogo || db.settings.storeLogo)!.startsWith('/') || (db.settings.receiptCustomLogo || db.settings.storeLogo)!.includes('.') || (db.settings.receiptCustomLogo || db.settings.storeLogo)!.length > 15) ? (
                           <img 
                             src={db.settings.receiptCustomLogo || db.settings.storeLogo} 
                             alt="Logo" 
                             className="w-20 h-20 rounded object-cover bg-white mx-auto mb-1.5 border border-slate-200" 
                             referrerPolicy="no-referrer"
                           />
                         ) : (
                           <div className="w-16 h-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-4xl mx-auto mb-1.5 shrink-0 select-none">
                             {db.settings.receiptCustomLogo || db.settings.storeLogo}
                           </div>
                         )
                       )}
                      
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{storeName}</h2>
                      
                      {db.settings?.receiptShowStoreDetails !== false && (
                        <>
                          <p className="text-[10px] text-slate-500 mt-1">{storeAddress}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Tél: {storePhone}</p>
                          {matriculeFiscal && <p className="text-[9px] text-slate-400 font-mono mt-0.5">MF: {matriculeFiscal}</p>}
                        </>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono border-b border-dashed border-slate-200 pb-2">
                      <span>{printedInvoice.type === 'facture' ? 'FACTURE' : 'BON LIVRAISON'}</span>
                      <span className="font-bold">{printedInvoice.number}</span>
                      <span>{printedInvoice.date.includes('T') ? printedInvoice.date.split('T')[0] : printedInvoice.date}</span>
                    </div>

                    <div className="text-start text-[10px] text-slate-700 space-y-0.5 pb-2 border-b border-dashed border-slate-200">
                      <p><span className="font-bold">{language === 'ar' ? 'العميل:' : 'Client:'}</span> {printedInvoice.partnerName}</p>
                    </div>

                    {/* Table simple for Ticket */}
                    <div className="space-y-2 py-2 border-b border-dashed border-slate-300 text-left" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                      {printedInvoice.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-start text-[11px] leading-tight font-mono">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-bold text-slate-800 font-sans truncate">{item.productName}</p>
                            <p className="text-[9px] text-slate-500">{item.qty} x {formatCurrency(item.sellingPrice)}</p>
                          </div>
                          <span className="font-bold text-slate-900 shrink-0">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Calculations for Ticket */}
                    <div className="space-y-1 pt-1.5 text-xs font-mono" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === 'ar' ? 'المجموع:' : 'Sous-total:'}</span>
                        <span>{formatCurrency(printedInvoice.subTotal)}</span>
                      </div>
                      {printedInvoice.discount > 0 && (
                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>{language === 'ar' ? 'الخصم:' : 'Remise:'}</span>
                          <span>- {formatCurrency(printedInvoice.discount)}</span>
                        </div>
                      )}
                      {printedInvoice.taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span>TVA{printedInvoice.taxRate === -1 ? '' : ` (${printedInvoice.taxRate}%)`}:</span>
                          <span>{formatCurrency(printedInvoice.taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black border-t border-dashed border-slate-300 pt-1.5 text-slate-900">
                        <span>{language === 'ar' ? 'الصافي للدفع:' : 'Net à Payer:'}</span>
                        <span>{formatCurrency(printedInvoice.total)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>{language === 'ar' ? 'المستلم:' : 'Reçu:'}</span>
                        <span className="text-emerald-600">{formatCurrency(printedInvoice.paidAmount)}</span>
                      </div>
                      {printedInvoice.balance > 0 && (
                        <div className="flex justify-between text-xs bg-rose-50 text-rose-800 p-1 rounded font-bold">
                          <span>{language === 'ar' ? 'المتبقي بالدين:' : 'Reste à CREDIT:'}</span>
                          <span>{formatCurrency(printedInvoice.balance)}</span>
                        </div>
                      )}
                      {printedInvoice.loyaltyPointsEarned !== undefined && printedInvoice.loyaltyPointsEarned > 0 && (
                        <div className="flex justify-between text-[10px] text-indigo-700 font-bold border-t border-dashed border-slate-200 pt-1.5 mt-1.5 pb-0.5 animate-bounce">
                          <span>🎉 {language === 'ar' ? 'النقاط المكتسبة:' : 'Points acquis:'}</span>
                          <span>+{printedInvoice.loyaltyPointsEarned} pts</span>
                        </div>
                      )}
                      {printedInvoice.loyaltyPointsRedeemed !== undefined && printedInvoice.loyaltyPointsRedeemed > 0 && (
                        <div className="flex justify-between text-[10px] text-indigo-700 font-bold">
                          <span>🎁 {language === 'ar' ? 'النقاط المستبدلة:' : 'Points retirés:'}</span>
                          <span>-{printedInvoice.loyaltyPointsRedeemed} pts</span>
                        </div>
                      )}
                    </div>

                    {/* Custom note and Terms */}
                    <div className="pt-3 text-center text-[10px] border-t border-dashed border-slate-200 space-y-1">
                      <p className="font-bold text-slate-850">
                        {db.settings?.receiptCustomThankYou || (language === 'ar' ? '✨ شكراً لزيارتكم وثقتكم بنا ✨' : 'Merci pour votre confiance !')}
                      </p>
                      
                      {db.settings?.receiptShowCommercialTerms !== false && (
                        <p className="text-[8px] text-slate-400 leading-normal" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                          {language === 'ar' 
                            ? '⚠️ البضاعة المباعة لا تُرد ولا تُستبدل بعد مضي 48 ساعة.' 
                            : '⚠️ Marchandise ni reprise ni échangée après 48H.'}
                        </p>
                      )}
                    </div>

                  </div>
                ) : (
                  /* ----------------- PROFESSIONAL A4 FORMAT FOR PORTAL ----------------- */
                  <div className="space-y-6">
                    {/* Document Header */}
                    <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                      <div className="flex items-start gap-4">
                        {(db.settings?.invoiceCustomLogo || db.settings?.storeLogo) && (
                          ((db.settings.invoiceCustomLogo || db.settings.storeLogo)!.startsWith('data:') || (db.settings.invoiceCustomLogo || db.settings.storeLogo)!.startsWith('http') || (db.settings.invoiceCustomLogo || db.settings.storeLogo)!.startsWith('/') || (db.settings.invoiceCustomLogo || db.settings.storeLogo)!.includes('.') || (db.settings.invoiceCustomLogo || db.settings.storeLogo)!.length > 15) ? (
                            <img 
                              src={db.settings.invoiceCustomLogo || db.settings.storeLogo} 
                              alt="Logo" 
                              className="w-28 h-28 rounded-lg object-cover bg-white border border-slate-200 shadow-xs shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-5xl font-bold font-sans shrink-0 select-none">
                              {db.settings.invoiceCustomLogo || db.settings.storeLogo}
                            </div>
                          )
                        )}
                        <div>
                          <h2 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">{storeName}</h2>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">{storeAddress}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Tél: {storePhone}</p>
                          {matriculeFiscal && <p className="text-[10px] text-slate-500 font-mono">MF: {matriculeFiscal}</p>}
                          <p className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase mt-1/4 w-max">
                            {activitySector.toUpperCase()} SPECIALIST
                          </p>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs bg-blue-100 text-blue-900 font-black px-2.5 py-1 rounded block uppercase mb-1">
                          {printedInvoice.type === 'facture' ? (language === 'ar' ? 'فاتورة بيع' : 'Facture') : (language === 'ar' ? 'وصل تسليم سلع' : 'Bon de Livraison')}
                        </span>
                        <p className="text-xs font-bold text-slate-900 font-mono">{printedInvoice.number}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">Date: {printedInvoice.date.includes('T') ? printedInvoice.date.split('T')[0] : printedInvoice.date}</p>
                      </div>
                    </div>

                    {/* Partners section */}
                    <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded border border-slate-150">
                      <div>
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {language === 'ar' ? 'المصدر' : 'Émetteur'}
                        </h4>
                        <p className="font-bold text-slate-850">{storeName}</p>
                        <p className="text-slate-500 font-mono text-[10px] mt-0.5">Tél: {storePhone}</p>
                        <p className="text-slate-500 font-mono text-[10px]">{storeAddress}</p>
                      </div>
                      <div>
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {language === 'ar' ? 'المرسل إليه (الحريف)' : 'Destinataire (Client)'}
                        </h4>
                        <p className="font-bold text-slate-850">{printedInvoice.partnerName}</p>
                        <p className="text-slate-500 font-mono text-[10px] mt-0.5">
                          {language === 'ar' ? 'تاريخ الدفع: دفع فوري' : `Échéance : ${printedInvoice.dueDate || 'Paiement comptant'}`}
                        </p>
                      </div>
                    </div>

                    {/* Items Table details */}
                    <div className="overflow-x-auto">
                      <table className={`w-full text-xs text-slate-700 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200">
                            <th className="p-2.5">{language === 'ar' ? 'السلعة / البيان' : 'Description'}</th>
                            <th className="p-2.5 text-center">{language === 'ar' ? 'الكمية' : 'Qté'}</th>
                            <th className="p-2.5 text-right">{language === 'ar' ? 'سعر الوحدة' : 'Prix Unitaire'}</th>
                            <th className="p-2.5 text-right">{language === 'ar' ? 'المجموع' : 'Montant Total'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {printedInvoice.items.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50 font-mono text-[11px]">
                              <td className="p-2.5 font-sans font-bold text-slate-850">{item.productName}</td>
                              <td className="p-2.5 text-center">{item.qty}</td>
                              <td className="p-2.5 text-right">{formatCurrency(item.sellingPrice)}</td>
                              <td className="p-2.5 text-right font-black text-slate-900">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Financial calculations bottom */}
                    <div className="border-t border-slate-200 pt-4 flex justify-end">
                      <div className="w-72 space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{language === 'ar' ? 'المجموع الصافي الفرعي:' : 'Sous-total :'}</span>
                          <span className="text-slate-800">{formatCurrency(printedInvoice.subTotal)}</span>
                        </div>
                        {printedInvoice.discount > 0 && (
                          <div className="flex justify-between text-rose-600 font-bold">
                            <span>{language === 'ar' ? 'التخفيض الإجمالي:' : 'Remise globale :'}</span>
                            <span>- {formatCurrency(printedInvoice.discount)}</span>
                          </div>
                        )}
                        {printedInvoice.taxAmount > 0 && (
                          <div className="flex justify-between">
                            <span>TVA{printedInvoice.taxRate === -1 ? '' : ` (${printedInvoice.taxRate}%)`} :</span>
                            <span>{formatCurrency(printedInvoice.taxAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-1.5 text-slate-950">
                          <span>{language === 'ar' ? 'الصافي النهائي للدفع:' : 'Total Net à Payer :'}</span>
                          <span>{formatCurrency(printedInvoice.total)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold pt-1 text-slate-600">
                          <span>{language === 'ar' ? 'المبلغ المدفوع حينه:' : 'Montant Versé :'}</span>
                          <span className="text-emerald-600">{formatCurrency(printedInvoice.paidAmount)}</span>
                        </div>
                        {printedInvoice.balance > 0 && (
                          <div className="flex justify-between text-xs bg-rose-50 text-rose-800 p-1 rounded font-bold border border-rose-100">
                            <span>{language === 'ar' ? 'باقي الحساب (دين):' : 'Crédit Restant :'}</span>
                            <span>{formatCurrency(printedInvoice.balance)}</span>
                          </div>
                        )}
                        {printedInvoice.loyaltyPointsEarned !== undefined && printedInvoice.loyaltyPointsEarned > 0 && (
                          <div className="flex justify-between text-[11px] text-indigo-750 font-bold border-t border-slate-100 pt-1.5 mt-1 pb-0.5">
                            <span>🎉 {language === 'ar' ? 'النقاط المكتسبة:' : 'Points de fidélité acquis:'}</span>
                            <span className="text-indigo-800 font-sans font-bold">+{printedInvoice.loyaltyPointsEarned} pts</span>
                          </div>
                        )}
                        {printedInvoice.loyaltyPointsRedeemed !== undefined && printedInvoice.loyaltyPointsRedeemed > 0 && (
                          <div className="flex justify-between text-[11px] text-indigo-750 font-bold">
                            <span>🎁 {language === 'ar' ? 'النقاط المستبدلة:' : 'Points de fidélité utilisés:'}</span>
                            <span className="text-indigo-800 font-sans font-bold">-{printedInvoice.loyaltyPointsRedeemed} pts</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 border-t border-dashed border-slate-200 pt-4 flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>{language === 'ar' ? 'شكراً لتعاملكم معنا' : 'Merci pour votre confiance !'}</span>
                      <span>Signature & Cachet commercial</span>
                    </div>
                  </div>
                )}
              </div>,
              document.getElementById('print-portal') || document.body
            )}
          </>
        );
      })()}

      {/* SECURE SMS GATEWAY / OTP CONFIRMATION MODAL */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOtpModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md no-print"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden text-slate-100 flex flex-col gap-4 text-start font-sans select-none no-print"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Decorative top accent line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />

              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/15">
                    <Smartphone className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wider text-slate-200 uppercase font-mono">
                      {language === 'ar' ? 'بوابة التحقق الآمن OTP' : 'SECURE SMS INTEGRATION'}
                    </h3>
                    <p className="text-[10px] text-indigo-400 font-bold font-mono tracking-wider">
                      INNOVA COMMERCE GATE • ACTIVE
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="p-1 px-2 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Recipient Details Card */}
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                  <span>{language === 'ar' ? 'المستلم للرسالة' : 'Destinataire (Client)'}</span>
                  <span className="text-emerald-400 font-mono flex items-center gap-1 text-[9px] font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Tunisia SMS API
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold text-xs shrink-0">{language === 'ar' ? 'رقم الهاتف:' : 'N° Téléphone :'}</span>
                  <input
                    type="text"
                    value={otpPhoneNumber}
                    onChange={(e) => setOtpPhoneNumber(e.target.value)}
                    placeholder="Saisir numéro (ex: 0550123456)"
                    className="flex-1 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                {selectedPartnerId && (
                  <p className="text-[10.5px] text-indigo-300 font-bold">
                    👤 {db.partners.find(p => p.id === selectedPartnerId)?.name}
                  </p>
                )}
              </div>

              {/* OTP Generation panel */}
              {!isOtpSent ? (
                <div className="space-y-4">
                  <div className="text-xs text-slate-400 leading-relaxed">
                    {language === 'ar' ? 
                      'لتأمين هذه المعاملة وتوثيق حركات البيع، يرجى إرسال رسالة تأكيد قصيرة تحتوي على رمز سري مؤقت مخصص لهذا العميل ليدخله حالاً.' :
                      'Afin de sécuriser le crédit et d\'authentifier la vente, veuillez émettre un code secret OTP unique. Ce code sera simulé instantanément et s\'affichera sur votre écran.'}
                  </div>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      if (!otpPhoneNumber || otpPhoneNumber.length < 5) {
                        showToast(language === 'ar' ? "⚠️ يرجى إدخال رقم هاتف صالح!" : "⚠️ Veuillez saisir un numéro de téléphone valide!", 'error');
                        return;
                      }
                      setOtpSending(true);
                      setOtpError(null);
                      
                      // Haptic Sound Feedback (Send SMS Tone)
                      try {
                        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.3);
                        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 0.4);
                      } catch (e) {}

                      // Simulate server request time
                      await new Promise(resolve => setTimeout(resolve, 1100));
                      
                      const code = String(Math.floor(1000 + Math.random() * 9000));
                      setOtpCodeGenerated(code);
                      setIsOtpSent(true);
                      setOtpSending(false);
                    }}
                    disabled={otpSending}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {otpSending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{language === 'ar' ? 'جاري إرسال SMS...' : 'Transmission SMS via API...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{language === 'ar' ? 'إرسال رمز OTP للمصادقة' : 'Émettre le Code OTP par SMS'}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* SIMULATED PHONE SMS NOTIFICATION */}
                  <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-xl space-y-1.5 shadow-xs"
                  >
                    <div className="flex justify-between items-center text-[9px] text-amber-500 font-extrabold tracking-widest uppercase">
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-amber-500 animate-pulse" />
                        {language === 'ar' ? 'محاكاة رسائل جوال العميل' : 'Simulateur Smartphone Client'}
                      </span>
                      <span>{language === 'ar' ? 'الآن' : 'Maintenant'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">{language === 'ar' ? 'محتوى الرسالة من: INNOVA' : 'De : INNOVA-POS SMS'}</span>
                      <p className="text-xs text-amber-400 font-medium font-mono leading-relaxed mt-0.5" dir="ltr">
                        "INNOVA: Code de validation unique pour votre commande/crédit est : <strong className="text-white text-sm bg-slate-950 px-2 py-0.5 rounded leading-none border border-slate-800 tracking-wider font-extrabold select-all">{otpCodeGenerated}</strong>"
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpCodeEntered(otpCodeGenerated);
                        // Beep
                        try {
                          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                          const osc = audioCtx.createOscillator();
                          const gain = audioCtx.createGain();
                          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                          gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
                          osc.connect(gain);
                          gain.connect(audioCtx.destination);
                          osc.start();
                          osc.stop(audioCtx.currentTime + 0.1);
                        } catch (e) {}
                      }}
                      className="text-[9.5px] font-bold text-indigo-400 hover:text-white transition-colors cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-800 w-full"
                    >
                      {language === 'ar' ? '⚡ نسخ تلقائي للمحاكاة لتسهيل المراجعة' : '⚡ Saisir le code automatiquement pour tester'}
                    </button>
                  </motion.div>

                  {/* Verification inputs */}
                  <div className="space-y-2">
                    <label className="text-[10.5px] font-black text-slate-300 uppercase tracking-widest block font-mono">
                      {language === 'ar' ? 'أدخل الرمز المكون من 4 أرقام:' : 'Entrez le code de vérification reçu :'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="####"
                        value={otpCodeEntered}
                        onChange={(e) => {
                          setOtpCodeEntered(e.target.value.replace(/\D/g, ''));
                          setOtpError(null);
                        }}
                        className="w-full text-center bg-slate-950 border border-slate-800 text-white rounded-xl py-3 text-xl tracking-[0.6em] font-black font-mono focus:outline-hidden focus:border-emerald-500"
                      />
                      <Key className="w-5 h-5 text-slate-650 absolute left-4 top-3.5" />
                    </div>
                    {otpError && (
                      <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{otpError}</span>
                      </div>
                    )}
                  </div>

                  {/* Action controls */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOtpSent(false)}
                      className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-xs font-black text-slate-400 hover:text-white cursor-pointer transition-colors"
                    >
                      {language === 'ar' ? 'المستلم' : 'Modifier'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (otpCodeEntered === otpCodeGenerated) {
                          // Success sound beep
                          try {
                            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const osc = audioCtx.createOscillator();
                            const gain = audioCtx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
                            osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
                            gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
                            osc.connect(gain);
                            gain.connect(audioCtx.destination);
                            osc.start();
                            osc.stop(audioCtx.currentTime + 0.3);
                          } catch (e) {}

                          // Run the checkout!
                          handleConfirmCheckout();
                          setShowOtpModal(false);
                        } else {
                          // Error sound
                          try {
                            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const osc = audioCtx.createOscillator();
                            const gain = audioCtx.createGain();
                            osc.type = 'sawtooth';
                            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                            osc.connect(gain);
                            gain.connect(audioCtx.destination);
                            osc.start();
                            osc.stop(audioCtx.currentTime + 0.2);
                          } catch (e) {}
                          setOtpError(language === 'ar' ? 'رمز تفعيل خاطئ، الرجاء مراجعة المحاكاة أعلاه!' : 'Code OTP invalide! Veuillez copier le code de la bulle orange.');
                        }
                      }}
                      className="flex-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 rounded-xl text-xs font-black uppercase text-white tracking-wider cursor-pointer transition-all shadow-md shadow-emerald-600/10"
                    >
                      {language === 'ar' ? 'تأكيد المعاملة ✔' : 'Valider Trans. & Vente ✔'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* 💵 DETAILED CASH DRAWER AUDITING & CONTROL PANEL */}
      <AnimatePresence>
        {/* Cash Drawer features completely removed/disabled */}
        {false && showCashDrawerPanel && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs no-print" style={{ zIndex: 9999 }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-205 w-full max-w-2xl overflow-hidden text-start font-sans flex flex-col max-h-[90vh]"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">💵</span>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide">
                      {language === 'ar' ? 'نظام إدارة و عد درج النقود (Tiroir Caisse)' : 'Système de Comptage & Suivi du Tiroir Caisse'}
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-extrabold uppercase font-mono tracking-wider leading-none mt-1">
                      {language === 'ar' ? 'مراقبة السيولة النقدية والتدقيق اليومي' : 'CONCILIATION ET CONTROLE DE CAISSE EN DIRECT'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCashDrawerPanel(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable contents */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* 1. Upper Statistics: Expected Cash and Counted Cash */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Card A: Expected Liquid POS Balance */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">
                      {language === 'ar' ? 'السيولة المتوقعة بالنظام :' : 'SOLDE THÉORIQUE CAISSE :'}
                    </span>
                    <strong className="text-lg font-mono text-slate-900 block font-black">
                      {formatCurrency(expectedCashAmount)}
                    </strong>
                    <span className="text-[8.5px] text-slate-400 font-bold block">
                      {language === 'ar' ? 'تأسيس: 150.00 د.ت + المبيعات المستلمة' : 'Fonds de caisse (150 DT) + Ventes - Retours'}
                    </span>
                  </div>

                  {/* Card B: Counted Physical Cash */}
                  <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl space-y-1">
                    <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider block font-sans">
                      {language === 'ar' ? 'النقود المعدودة بالفحص :' : 'MONTANT COMPTÉ (PHYSIQUE) :'}
                    </span>
                    <strong className="text-lg font-mono text-emerald-800 block font-extrabold">
                      {formatCurrency(totalDrawerCash)}
                    </strong>
                    <span className="text-[8.5px] text-emerald-600 font-bold block">
                      {language === 'ar' ? 'محسوبة بناء على فئات الأوراق النقدية' : 'Calculé selon le nombre de billets & pièces'}
                    </span>
                  </div>

                  {/* Card C: Discrepancy (Écart de caisse) */}
                  <div className={`p-4 rounded-xl border space-y-1 ${
                    Math.abs(cashDrawerDiscrepancy) < 0.01
                      ? 'bg-blue-50 border-blue-150 text-blue-900'
                      : cashDrawerDiscrepancy > 0
                      ? 'bg-amber-50 border-amber-150 text-amber-900'
                      : 'bg-rose-50 border-rose-150 text-rose-900'
                  }`}>
                    <span className="text-[9px] font-black uppercase tracking-wider block opacity-90 font-sans">
                      {language === 'ar' ? 'فرق عجز/زيادة الصندوق :' : 'ÉCART DE COMPTAGE / SOLDE :'}
                    </span>
                    <strong className="text-lg font-mono block font-black">
                      {cashDrawerDiscrepancy > 0 ? '+' : ''}{formatCurrency(cashDrawerDiscrepancy)}
                    </strong>
                    <span className="text-[8.5px] font-bold block">
                      {Math.abs(cashDrawerDiscrepancy) < 0.01
                        ? (language === 'ar' ? 'طابق تام متطابق بنسبة 100% ✨' : 'Concordance parfaite ! Aucun écart. ✨')
                        : cashDrawerDiscrepancy > 0
                        ? (language === 'ar' ? '📈 فائض نقدي غير مسجل' : '📈 Excédent de caisse constaté')
                        : (language === 'ar' ? '📉 عجز/نقص في الصندوق' : '📉 Déficit de caisse constaté')}
                    </span>
                  </div>

                </div>

                {/* 2. Double section grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left segment: Coins & bills detailed counting */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-550 border-b pb-2 flex items-center gap-1.5 select-none font-sans">
                      <span>🧮</span>
                      <span>{language === 'ar' ? 'جرد وتعداد الأوراق النقدية والعملات المعدنية :' : 'COMPTAGE DÉTAILLÉ DE LA CAISSE :'}</span>
                    </h4>

                    {/* Denominations table count layout */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {[
                        { denom: '50DT', label: '50 DT', type: 'bill', val: 50 },
                        { denom: '20DT', label: '20 DT', type: 'bill', val: 20 },
                        { denom: '10DT', label: '10 DT', type: 'bill', val: 10 },
                        { denom: '5DT', label: '5 DT', type: 'bill', val: 5 },
                        { denom: '1DT', label: '1 DT', type: 'coin', val: 1 },
                        { denom: '0.5DT', label: '500 mil', type: 'coin', val: 0.5 },
                        { denom: '0.2DT', label: '200 mil', type: 'coin', val: 0.2 },
                        { denom: '0.1DT', label: '100 mil', type: 'coin', val: 0.1 }
                      ].map((item) => {
                        const count = drawerCashComposition[item.denom] || 0;
                        return (
                          <div 
                            key={item.denom}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base select-none">{item.type === 'bill' ? '💵' : '🪙'}</span>
                              <div className="text-start">
                                <span className="text-xs font-extrabold text-slate-800">{item.label}</span>
                                <span className="block text-[8px] font-mono text-slate-400">
                                  {formatCurrency(item.val * count)}
                                </span>
                              </div>
                            </div>

                            {/* Counters */}
                            <div className="flex items-center gap-2">
                              {/* Decrement */}
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawerCashComposition(prev => {
                                    const next = { ...prev, [item.denom]: Math.max(0, count - 1) };
                                    safeLocalStorage.setItem('pos_cash_drawer_composition', JSON.stringify(next));
                                    return next;
                                  });
                                }}
                                className="w-6 h-6 rounded-md bg-white border border-slate-250 hover:bg-slate-150 text-slate-600 font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
                              >
                                -
                              </button>
                              
                              <input
                                type="number"
                                min="0"
                                value={count}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value));
                                  setDrawerCashComposition(prev => {
                                    const next = { ...prev, [item.denom]: val };
                                    safeLocalStorage.setItem('pos_cash_drawer_composition', JSON.stringify(next));
                                    return next;
                                  });
                                }}
                                className="w-12 h-6 text-center text-xs font-mono font-black bg-white border border-slate-200 rounded text-slate-900"
                              />

                              {/* Increment */}
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawerCashComposition(prev => {
                                    const next = { ...prev, [item.denom]: count + 1 };
                                    safeLocalStorage.setItem('pos_cash_drawer_composition', JSON.stringify(next));
                                    return next;
                                  });
                                }}
                                className="w-6 h-6 rounded-md bg-white border border-slate-250 hover:bg-slate-150 text-slate-600 font-extrabold text-xs flex items-center justify-center cursor-pointer transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Manual Ejection Control Area */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleManualDrawerEject}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Unlock className="w-4 h-4 text-emerald-250 animate-pulse" />
                        <span>{language === 'ar' ? 'فتح وطرد درج النقود آلياً' : 'Ejecter le tiroir caisse 🔓'}</span>
                      </button>
                    </div>

                  </div>

                  {/* Right segment: Audit Logs history */}
                  <div className="space-y-4 font-sans">
                    <div className="flex justify-between items-center border-b pb-2 select-none">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-550 flex items-center gap-1.5">
                        <span>📋</span>
                        <span>{language === 'ar' ? 'سجل العمليات وحركات فتح الدرج :' : "LOG D'OUVERTURE DU TIROIR CAISSE :"}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const initialLog = [
                            { id: '1', time: new Date().toLocaleTimeString(), action: 'Fonds de caisse réinitialisé', user: 'Administrateur', amount: 150.0 }
                          ];
                          setCashDrawerLogs(initialLog);
                          safeLocalStorage.setItem('pos_cash_drawer_logs', JSON.stringify(initialLog));
                        }}
                        className="text-[9px] font-bold text-rose-500 hover:underline uppercase cursor-pointer"
                      >
                        {language === 'ar' ? 'مسح السجل' : 'Vider Log'}
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {cashDrawerLogs.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-bold py-8 text-center bg-slate-50 border border-dashed rounded-lg">
                          {language === 'ar' ? 'لا توجد حركات فتح مسجلة' : 'Aucun journal d\'ouverture disponible.'}
                        </p>
                      ) : (
                        cashDrawerLogs.map((log) => (
                          <div 
                            key={log.id} 
                            className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs flex flex-col gap-1 text-slate-700 hover:bg-slate-100/50 transition-colors"
                          >
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-slate-900 font-extrabold flex items-center gap-1">
                                <span className={log.action.includes('auto') || log.action.includes('تلقائي') ? 'text-blue-600' : 'text-emerald-600'}>●</span>
                                {log.action}
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">{log.time}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                              <span>
                                {language === 'ar' ? 'الوكيل: ' : 'Opérateur : '}
                                <strong className="text-slate-700">{log.user}</strong>
                              </span>
                              {log.amount !== undefined && (
                                <span className="font-mono text-emerald-700 font-extrabold uppercase bg-emerald-100/60 px-1.5 py-0.2 rounded text-[9px]">
                                  +{formatCurrency(log.amount)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3.5 bg-sky-50 border border-sky-150 rounded-lg text-[10px] text-sky-850 leading-relaxed space-y-1">
                      <strong className="block font-black uppercase text-[10px] tracking-wider text-sky-950 block font-sans">
                        📌 {language === 'ar' ? 'عن مطابقة السيولة اليومية :' : 'À PROPOS DU CASH MANAGING :'}
                      </strong>
                      <p>
                        {language === 'ar' 
                          ? 'يقدم هذا نظام جرد فوري وصحيح للسيولة لضمان كشف الفروقات والأخطاء أثناء تسليم الوردية ومطابقة النقدية تماشياً مع المعايير المحاسبية.'
                          : 'Le comptage de fin de shift évite les écarts lors du passage de témoin. Conservez toujours un fond initial stable (e.g. 150 DT) pour délivrer la monnaie.'}
                      </p>
                    </div>

                  </div>

                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-150 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCashDrawerPanel(false)}
                  className="px-4 py-2 bg-slate-900 text-white hover:bg-black font-extrabold text-[11px] uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'تأكيد وحفظ الإغلاق' : 'Fermer & Terminer ✔'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
