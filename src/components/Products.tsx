import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseState, Product } from '../types';
import { getProductVisual } from '../utils/db';
import { useLanguage } from '../utils/LanguageContext';
import { safeLocalStorage, checkIsIframe } from '../utils/storage';
import { Html5Qrcode } from 'html5-qrcode';
import { jsPDF } from 'jspdf';
import { showToast } from '../utils/toast';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Boxes,
  PlusCircle,
  TrendingUp,
  X,
  Sparkles,
  Image as ImageIcon,
  Camera,
  Smile,
  Volume2,
  VolumeX,
  ScanLine,
  Download,
  Barcode,
  Printer,
  FileText,
  DollarSign,
  History
} from 'lucide-react';

const COMMON_FOODS = [
  { name: 'Couscous Fin Diari 1kg (كسكسي دياري)', category: 'Céréales & Pâtes', code: '6191002003001', purchasePrice: 0.850, sellingPrice: 1.100, unit: 'Pcs' },
  { name: 'Lait Demi-Écrémé Délice UHT 1L (حليب دليس)', category: 'Produits Laitiers', code: '6192403104523', purchasePrice: 1.350, sellingPrice: 1.450, unit: 'Pcs' },
  { name: 'Thon Entier Olive Sidi Daoud 160g (تن سيدي داود)', category: 'Conserves', code: '6194512001122', purchasePrice: 4.200, sellingPrice: 4.900, unit: 'Pcs' },
  { name: 'Harissa Sicam Traditionnelle 135g (هريسة سيكام)', category: 'Conserves', code: '6198502214433', purchasePrice: 0.950, sellingPrice: 1.250, unit: 'Pcs' },
  { name: 'Tomate Double Concentrée Sicam 800g (طماطم سيكام)', category: 'Conserves', code: '6198502214455', purchasePrice: 3.400, sellingPrice: 4.100, unit: 'Pcs' },
  { name: 'Eau Minérale Sabrine 1.5L (ماء صبرين)', category: 'Boissons', code: '6191234567891', purchasePrice: 0.550, sellingPrice: 0.700, unit: 'Pcs' },
  { name: 'Eau Minérale Safia 1.5L (ماء صافية)', category: 'Boissons', code: '6191234567892', purchasePrice: 0.550, sellingPrice: 0.700, unit: 'Pcs' },
  { name: 'Pâtes Spaghetti Randa N°2 500g (سباغيتي راندة)', category: 'Céréales & Pâtes', code: '6194512009988', purchasePrice: 0.750, sellingPrice: 0.950, unit: 'Pcs' },
  { name: 'Yaourt Nature Délice (ياغورت دليس)', category: 'Produits Laitiers', code: '6191002003010', purchasePrice: 0.400, sellingPrice: 0.480, unit: 'Pcs' },
  { name: 'Café Moulu Ben Yedder Traditionnel 250g (قهوة بن يدر)', category: 'Épicerie', code: '6192425262728', purchasePrice: 2.200, sellingPrice: 2.700, unit: 'Pcs' },
  { name: 'Sucre Blanc Raffiné Canne 1kg (سكر)', category: 'Épicerie', code: '6191230001001', purchasePrice: 1.100, sellingPrice: 1.400, unit: 'Pcs' },
  { name: 'Semoule Fine Rose Blanche 1kg (سميد وردة)', category: 'Céréales & Pâtes', code: '6194512005524', purchasePrice: 0.900, sellingPrice: 1.150, unit: 'Pcs' }
];

interface ProductsProps {
  db: DatabaseState;
  onUpdateDb: (updatedDb: DatabaseState) => void;
}

export default function Products({ db, onUpdateDb }: ProductsProps) {
  const { language, t, formatCurrency } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert' | 'ok' | 'out'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Standard beautiful page limit

  // Form states (Add / Edit Modals)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minAlertQty, setMinAlertQty] = useState<number>(5);
  const [unit, setUnit] = useState('Pcs');
  const [image, setImage] = useState('');
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState<boolean>(true);

  // Food product specific optional states
  const [expiryDate, setExpiryDate] = useState('');
  const [weightVolume, setWeightVolume] = useState('');
  const [isFoodProduct, setIsFoodProduct] = useState(false);
  const [tvaRate, setTvaRate] = useState<number>(19); // 0%, 7%, 19%
  const [isNewCategory, setIsNewCategory] = useState(false);

  // Rapid price update states
  const [editPriceProductId, setEditPriceProductId] = useState<string | null>(null);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);

  // Price history modal state
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // 🏷️ Barcode Print states
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);
  const [barcodeCount, setBarcodeCount] = useState<number>(12);
  const [barcodeLabelSize, setBarcodeLabelSize] = useState<'mini' | 'standard'>('standard');
  const [showStoreNameOnLabel, setShowStoreNameOnLabel] = useState<boolean>(true);
  const [showPriceOnLabel, setShowPriceOnLabel] = useState<boolean>(true);
  const [showBarcodeTextOnLabel, setShowBarcodeTextOnLabel] = useState<boolean>(true);

  // Camera Barcode Scanner State for adding/editing product
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [isBeepEnabled, setIsBeepEnabled] = useState<boolean>(() => {
    return safeLocalStorage.getItem('product_scan_beep') !== 'false';
  });
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const playScanBeep = () => {
    if (!isBeepEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (err) {
      console.warn('AudioContext scanner beep failed:', err);
    }
  };

  const handleBarcodeScanSuccess = (rawCode: string) => {
    const cleaned = rawCode.trim();
    if (!cleaned) return;

    playScanBeep();
    setCode(cleaned);
    setIsFlashActive(true);
    setTimeout(() => {
      setIsFlashActive(false);
      setIsCameraActive(false); // Auto close scanner on success
    }, 200);
  };

  // Manage camera scanning lifecycle in product form modal
  useEffect(() => {
    if (isCameraActive && showFormModal) {
      setCameraError(null);
      
      const startTimer = setTimeout(() => {
        try {
          const scannerInstance = new Html5Qrcode('product-form-camera-scanner-view');
          html5QrCodeRef.current = scannerInstance;

          scannerInstance.start(
            { facingMode: 'environment' },
            {
              fps: 15,
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
              // Ignore frame fail noises
            }
          ).catch((err) => {
            console.error('Camera startup exception in form Modal:', err);
            setCameraError(
              language === 'ar'
                ? '❌ تعذر تشغيل الكاميرا! يرجى السماح بالوصول في متصفحك.'
                : '❌ Impossible d\'accéder à la caméra. Veuillez autoriser l\'accès.'
            );
            setIsCameraActive(false);
          });
        } catch (err) {
          console.error('Html5Qrcode instance creation error in form:', err);
          setCameraError(
            language === 'ar'
              ? '❌ جهاز الكاميرا غير مهيأ أو غير مدعوم في متصفحك.'
              : '❌ La caméra n\'est pas supportée sur ce navigateur.'
          );
          setIsCameraActive(false);
        }
      }, 350);

      return () => {
        clearTimeout(startTimer);
        if (html5QrCodeRef.current) {
          const instance = html5QrCodeRef.current;
          html5QrCodeRef.current = null;
          if (instance.isScanning) {
            instance.stop().catch(err => console.warn('Clean up form camera stop failed:', err));
          }
        }
      };
    } else {
      if (html5QrCodeRef.current) {
        const instance = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        if (instance.isScanning) {
          instance.stop().catch(err => console.warn('Stop active form camera failed:', err));
        }
      }
    }
  }, [isCameraActive, showFormModal]);

  // Turn off scanner if modal closes
  useEffect(() => {
    if (!showFormModal) {
      setIsCameraActive(false);
    }
  }, [showFormModal]);

  const categories = useMemo(() => {
    return ['Tous', ...Array.from(new Set(db.products.map(p => p.category)))];
  }, [db.products]);

  // Handle fast incremental stock adjustments
  const handleQuickStockAdjust = (productId: string, delta: number) => {
    const updatedProducts = db.products.map(p => {
      if (p.id === productId) {
        return { ...p, stock: Math.max(0, p.stock + delta) };
      }
      return p;
    });
    onUpdateDb({ ...db, products: updatedProducts });
  };

  // Handle fast price adjustments from simple modal
  const handleQuickPriceUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPriceProductId) return;

    const updatedProducts = db.products.map(p => {
      if (p.id === editPriceProductId) {
        const oldSelling = p.sellingPrice;
        const oldPurchase = p.purchasePrice;
        const newSelling = Number(editSellingPrice);
        const newPurchase = Number(editPurchasePrice);

        let currentHistory = p.priceHistory || [];
        if (oldSelling !== newSelling || oldPurchase !== newPurchase) {
          currentHistory = [
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toISOString(),
              oldSellingPrice: oldSelling,
              newSellingPrice: newSelling,
              oldPurchasePrice: oldPurchase,
              newPurchasePrice: newPurchase,
            },
            ...currentHistory
          ];
        }

        return {
          ...p,
          purchasePrice: newPurchase,
          sellingPrice: newSelling,
          priceHistory: currentHistory
        };
      }
      return p;
    });

    onUpdateDb({ ...db, products: updatedProducts });
    setEditPriceProductId(null);
    showToast(
      language === 'ar' 
        ? 'تم تحديث السعر بنجاح' 
        : 'Prix de l\'article mis à jour avec succès'
    );
  };

  const filteredProducts = useMemo(() => {
    return db.products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.includes(searchQuery);
      const matchCategory = categoryFilter === 'Tous' || p.category === categoryFilter;
      
      let matchStatus = true;
      if (statusFilter === 'alert') matchStatus = p.stock <= p.minAlertQty && p.stock > 0;
      if (statusFilter === 'out') matchStatus = p.stock === 0;
      if (statusFilter === 'ok') matchStatus = p.stock > p.minAlertQty;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [db.products, searchQuery, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, startIndex, endIndex]);

  // Open modal for new creation
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setCode('');
    setName('');
    setCategory('');
    setPurchasePrice(0);
    setSellingPrice(0);
    setStock(10);
    setMinAlertQty(5);
    setUnit('Pcs');
    setImage('');
    setExpiryDate('');
    setWeightVolume('');
    setIsFoodProduct(false);
    setTvaRate(19);
    setIsNewCategory(false);
    setEmailAlertsEnabled(true);
    setShowFormModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setCode(prod.code);
    setName(prod.name);
    setCategory(prod.category);
    setPurchasePrice(prod.purchasePrice);
    setSellingPrice(prod.sellingPrice);
    setStock(prod.stock);
    setMinAlertQty(prod.minAlertQty);
    setUnit(prod.unit);
    setImage(prod.image || '');
    setExpiryDate(prod.dateExpiration || prod.expiryDate || '');
    setWeightVolume((prod as any).weightVolume || '');
    setIsFoodProduct(!!(prod as any).isFoodProduct);
    setTvaRate(prod.tvaRate !== undefined ? prod.tvaRate : 19);
    setIsNewCategory(false);
    setEmailAlertsEnabled(prod.emailAlertsEnabled !== false);
    setShowFormModal(true);
  };

  // Form Submit Action handles both Add & Edit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updatedProducts = [...db.products];

    if (editingProduct) {
      // Edit mode
      updatedProducts = updatedProducts.map(p => {
        if (p.id === editingProduct.id) {
          const oldSelling = p.sellingPrice;
          const oldPurchase = p.purchasePrice;
          const newSelling = Number(sellingPrice);
          const newPurchase = Number(purchasePrice);

          let currentHistory = p.priceHistory || [];
          if (oldSelling !== newSelling || oldPurchase !== newPurchase) {
            currentHistory = [
              {
                id: `log-${Date.now()}`,
                timestamp: new Date().toISOString(),
                oldSellingPrice: oldSelling,
                newSellingPrice: newSelling,
                oldPurchasePrice: oldPurchase,
                newPurchasePrice: newPurchase,
              },
              ...currentHistory
            ];
          }

          return {
            ...p,
            code: code.trim() || `ref-${Date.now()}`,
            name: name.trim(),
            category: category.trim() || 'Divers',
            purchasePrice: newPurchase,
            sellingPrice: newSelling,
            stock: Number(stock),
            minAlertQty: Number(minAlertQty),
            unit,
            image: image.trim() || undefined,
            expiryDate: expiryDate ? expiryDate : undefined,
            dateExpiration: expiryDate ? expiryDate : undefined,
            weightVolume: isFoodProduct ? weightVolume : undefined,
            isFoodProduct: isFoodProduct,
            emailAlertsEnabled: emailAlertsEnabled,
            tvaRate: Number(tvaRate),
            priceHistory: currentHistory
          };
        }
        return p;
      });
    } else {
      // Create mode
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        code: code.trim() || `ref-${Date.now()}`,
        name: name.trim(),
        category: category.trim() || 'Divers',
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        stock: Number(stock),
        minAlertQty: Number(minAlertQty),
        unit,
        image: image.trim() || undefined,
        expiryDate: expiryDate ? expiryDate : undefined,
        dateExpiration: expiryDate ? expiryDate : undefined,
        weightVolume: isFoodProduct ? weightVolume : undefined,
        isFoodProduct: isFoodProduct,
        emailAlertsEnabled: emailAlertsEnabled,
        tvaRate: Number(tvaRate),
        priceHistory: [{
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          oldSellingPrice: 0,
          newSellingPrice: Number(sellingPrice),
          oldPurchasePrice: 0,
          newPurchasePrice: Number(purchasePrice)
        }]
      };
      updatedProducts.unshift(newProd);
    }

    onUpdateDb({ ...db, products: updatedProducts });
    setShowFormModal(false);
    showToast(editingProduct 
      ? (language === 'ar' ? 'تم التعديل بنجاح' : 'Produit modifié avec succès') 
      : (language === 'ar' ? 'تمت الإضافة بنجاح' : 'Produit ajouté avec succès')
    );
  };

  // Export current list to CSV format with Excel UTF-8 BOM protection
  const handleExportCSV = () => {
    // Determine headers based on active language
    const headers = language === 'ar' 
      ? ['معرف السلعة', 'الكود', 'الاسم', 'الفئة', 'سعر الشراء', 'سعر البيع', 'الكمية في المخزون', 'الحد الأدنى للتنبيه', 'الوحدة', 'منتج غذائي', 'تاريخ الصلاحية', 'الوزن / الحجم']
      : ['ID du produit', 'Code barre (SKU)', 'Désignation (Nom)', 'Catégorie', 'Prix d\'Achat', 'Prix de Vente', 'Quantité en Stock', 'Seuil Alerte Minimal', 'Unité', 'Alimentaire?', 'Date Expiration', 'Poids/Volume'];

    // Map through products
    const csvRows = [
      headers,
      ...db.products.map(p => {
        const isFood = !!(p as any).isFoodProduct;
        const expDate = isFood ? ((p as any).expiryDate || '') : '';
        const wtVol = isFood ? ((p as any).weightVolume || '') : '';
        
        return [
          p.id,
          p.code,
          p.name,
          p.category,
          p.purchasePrice.toString(),
          p.sellingPrice.toString(),
          p.stock.toString(),
          p.minAlertQty.toString(),
          p.unit,
          isFood ? (language === 'ar' ? 'نعم' : 'Oui') : (language === 'ar' ? 'لا' : 'Non'),
          expDate,
          wtVol
        ];
      })
    ];

    // Build the properly escaped CSV string using semicolon for North-African/French Excel preferences
    const csvContent = "\uFEFF" + csvRows.map(row => 
      row.map(field => {
        const escaped = (field || '').replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(';')
    ).join('\n');

    // Create secure URL and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `inventaire_produits_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current inventory list to a highly polished PDF document
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const storeName = db.settings?.storeName || 'INNOVA POS PRO';
    const storePhone = db.settings?.storePhone || '';
    const dateStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR').slice(0, 5);

    // Helper to draw clean header on each page
    const drawPageHeader = (pageNum: number) => {
      // Deep elegant slate blue top header band
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, 210, 30, 'F');

      // Title & Store details
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(storeName.toUpperCase(), 15, 11);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      let detailsString = '';
      if (storePhone) detailsString += `Tél: ${storePhone}   |   `;
      detailsString += `Adresse: ${db.settings?.storeAddress || 'Tunis, Tunisie'}`;
      if (db.settings?.matriculeFiscal) {
        detailsString += `   |   M.F: ${db.settings.matriculeFiscal}`;
      }
      doc.text(detailsString, 15, 17);
      doc.text(`Garantie de traçabilité d'inventaire - Innova POS Pro Core Engine`, 15, 23);

      // Document type label on right in French
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("RAPPORT D'INVENTAIRE DE STOCK", 195, 11, { align: 'right' });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Impression: ${dateStr}`, 195, 17, { align: 'right' });
      doc.text(`Document Page ${pageNum}`, 195, 23, { align: 'right' });
    };

    // Calculate Totals and category grouping
    const products = db.products;
    const totalQty = products.reduce((sum, p) => sum + p.stock, 0);
    const totalPurchaseVal = products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);
    const totalSellingVal = products.reduce((sum, p) => sum + (p.stock * p.sellingPrice), 0);

    const categoryMap: { [key: string]: { qty: number; purchaseVal: number; sellingVal: number; count: number } } = {};
    products.forEach(p => {
      const cat = p.category || 'Non classé';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { qty: 0, purchaseVal: 0, sellingVal: 0, count: 0 };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].qty += p.stock;
      categoryMap[cat].purchaseVal += p.stock * p.purchasePrice;
      categoryMap[cat].sellingVal += p.stock * p.sellingPrice;
    });

    // Page 1 initial setup
    let currentPage = 1;
    drawPageHeader(currentPage);

    // Summary Cards (Metrics Dashboard)
    // Card 1: Quantités totales
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(15, 36, 56, 18, 1.5, 1.5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("TOTAL ARTICLES & UNITÉS", 18, 41);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`${totalQty} Unité(s) de stock`, 18, 48);

    // Card 2: Valorisation Achat
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.roundedRect(76, 36, 58, 18, 1.5, 1.5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52); // emerald-800
    doc.text("VALEUR COMPTABLE AU PRIX D'ACHAT", 79, 41);
    doc.setFontSize(11);
    doc.setTextColor(21, 128, 61); // emerald-700
    doc.text(formatCurrency(totalPurchaseVal), 79, 48);

    // Card 3: Valorisation Vente
    doc.setFillColor(239, 246, 255); // blue-50
    doc.roundedRect(139, 36, 56, 18, 1.5, 1.5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text("VALEUR ESTIMÉE AU PRIX DE VENTE", 142, 41);
    doc.setFontSize(11);
    doc.setTextColor(29, 78, 216); // blue-700
    doc.text(formatCurrency(totalSellingVal), 142, 48);

    // SECTION 1: SYNTHÈSE DE VALORISATION PAR CATÉGORIE
    let currentY = 60;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("1. RAPPORT SYNTHÉTIQUE DE VALORISATION PAR CATÉGORIE", 15, currentY);
    
    currentY += 4;
    // Category headers
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(15, currentY, 180, 6, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("Catégorie d'Articles", 18, currentY + 4);
    doc.text("Réf. uniques", 80, currentY + 4, { align: 'right' });
    doc.text("Stock Cumulé", 110, currentY + 4, { align: 'right' });
    doc.text("Valeur Valeureuse (Achat)", 150, currentY + 4, { align: 'right' });
    doc.text("Valeur Vente (TTC)", 191, currentY + 4, { align: 'right' });

    currentY += 6;
    doc.setTextColor(15, 23, 42);

    Object.entries(categoryMap).forEach(([catName, summary]) => {
      // Background row style alternate
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(catName, 18, currentY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.text(`${summary.count}`, 80, currentY + 4.5, { align: 'right' });
      doc.text(`${summary.qty}`, 110, currentY + 4.5, { align: 'right' });
      doc.text(formatCurrency(summary.purchaseVal), 150, currentY + 4.5, { align: 'right' });
      doc.text(formatCurrency(summary.sellingVal), 191, currentY + 4.5, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(15, currentY + 6.5, 195, currentY + 6.5);
      currentY += 6.5;
    });

    // Header totals row
    doc.setFillColor(248, 250, 252);
    doc.rect(15, currentY, 180, 6.5, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TOTAL D'INVENTAIRE SYNTHÉTISÉ", 18, currentY + 4.5);
    doc.text(`${products.length}`, 80, currentY + 4.5, { align: 'right' });
    doc.text(`${totalQty}`, 110, currentY + 4.5, { align: 'right' });
    doc.text(formatCurrency(totalPurchaseVal), 150, currentY + 4.5, { align: 'right' });
    doc.text(formatCurrency(totalSellingVal), 191, currentY + 4.5, { align: 'right' });
    
    currentY += 14;

    // SECTION 2: DETAIL DES RÉFÉRENCES EN STOCK
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("2. ETAT PHYSICO-VALORISÉ DÉTAILLÉ DE TOUS LES PRODUITS EN STOCK", 15, currentY);

    currentY += 4;
    // Section Table Headers
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(15, currentY, 180, 6.5, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("Code (Barcode)", 18, currentY + 4.2);
    doc.text("Nom de l'Article (Désignation)", 54, currentY + 4.2);
    doc.text("Catégorie", 112, currentY + 4.2);
    doc.text("Stock Actuel", 148, currentY + 4.2, { align: 'right' });
    doc.text("P.Achat Unit.", 171, currentY + 4.2, { align: 'right' });
    doc.text("Valeur Vente (TTC)", 191, currentY + 4.2, { align: 'right' });

    currentY += 6.5;

    // Table rows
    products.forEach((prod) => {
      // Check if page overflow
      if (currentY > 275) {
        doc.addPage();
        currentPage += 1;
        drawPageHeader(currentPage);
        
        currentY = 36;
        // Table Headers on new target page
        doc.setFillColor(241, 245, 249);
        doc.rect(15, currentY, 180, 6.5, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Code (Barcode)", 18, currentY + 4.2);
        doc.text("Nom de l'Article (Désignation)", 54, currentY + 4.2);
        doc.text("Catégorie", 112, currentY + 4.2);
        doc.text("Stock Actuel", 148, currentY + 4.2, { align: 'right' });
        doc.text("P.Achat Unit.", 171, currentY + 4.2, { align: 'right' });
        doc.text("Valeur Vente (TTC)", 191, currentY + 4.2, { align: 'right' });
        currentY += 6.5;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      // Barcode
      doc.text(prod.code || '—', 18, currentY + 4.5);

      // Name (Truncate to fit line)
      let truncatedName = prod.name || '';
      if (truncatedName.length > 34) {
        truncatedName = truncatedName.substring(0, 31) + '...';
      }
      doc.text(truncatedName, 54, currentY + 4.5);

      // Category
      let truncatedCat = prod.category || 'Non classé';
      if (truncatedCat.length > 20) {
        truncatedCat = truncatedCat.substring(0, 18) + '...';
      }
      doc.text(truncatedCat, 112, currentY + 4.5);

      // Stock
      const isAlerta = prod.stock <= prod.minAlertQty;
      if (isAlerta) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38); // Warning color
      }
      doc.text(`${prod.stock} ${prod.unit || 'U'}`, 148, currentY + 4.5, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);

      // Prix Achat
      doc.text(formatCurrency(prod.purchasePrice), 171, currentY + 4.5, { align: 'right' });

      // Valeur Vente cumulée pour l'article (stock * sellingPrice)
      doc.text(formatCurrency(prod.stock * prod.sellingPrice), 191, currentY + 4.5, { align: 'right' });

      // Row divider
      doc.setDrawColor(245, 247, 250);
      doc.line(15, currentY + 6, 195, currentY + 6);
      currentY += 6;
    });

    // Check if stamps fit on last page
    if (currentY > 245) {
      doc.addPage();
      currentPage += 1;
      drawPageHeader(currentPage);
      currentY = 36;
    } else {
      currentY += 4;
    }

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(15, currentY, 195, currentY);
    currentY += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("ZONE DE SIGNATURES COMPTABLES ET CACHETS OPÉRATIONNELS", 15, currentY + 3);

    currentY += 6;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(15, currentY, 180, 25, 1, 1, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Direction Innova POS / Manager : ", 20, currentY + 8);
    doc.text("Validé à Tunis, le " + new Date().toLocaleDateString('fr-FR'), 125, currentY + 8);
    doc.setFont("helvetica", "bold");
    doc.text("Signature & Empreinte de Cachet", 125, currentY + 16);

    // Triggers direct save/download
    doc.save(`INVENTAIRE_GENERAL_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Delete product action safely
  const handleDeleteProduct = (productId: string) => {
    setDeleteProductId(productId);
  };

  const confirmDeleteProduct = () => {
    if (deleteProductId) {
      const updatedProducts = db.products.filter(p => p.id !== deleteProductId);
      onUpdateDb({ ...db, products: updatedProducts });
      setDeleteProductId(null);
      showToast(language === 'ar' ? 'تم حذف المنتج' : 'Produit supprimé', 'info');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header section with Stats widgets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            {language === 'ar' ? 'إدارة المخزون والكتالوج' : 'Gestion Stock & Catalogue'}
          </h1>
          <p className="text-slate-500 text-sm">
            {language === 'ar' 
              ? 'إدارة وتحديث ومتابعة مستويات التنبيه ومردودية سلعك في الوقت الفعلي.' 
              : 'Gérer, mettre à jour, et suivre les niveaux d\'alerte et rendements de vos articles en temps réel.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start md:self-auto">
          {/* PDF Inventory Report Button */}
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'ar' ? 'تحميل جرد المخزون (PDF)' : "Rapport d'Inventaire (PDF)"}</span>
          </button>

          {/* CSV Download Button */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير المخزون (CSV)' : 'Exporter en CSV'}</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'بطاقة منتج جديد' : 'Fiche Produit (Nouveau)'}</span>
          </button>
        </div>
      </div>

      {/* Quick metrics overview inside products */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Références</p>
            <p className="text-xl font-bold text-slate-900">{db.products.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 font-sans">Alertes & Ruptures</p>
            <p className="text-xl font-bold text-slate-900">
               {db.products.filter(p => p.stock <= p.minAlertQty).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded">
            <TrendingUp className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Bénéfice latent estimé</p>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(db.products.reduce((sum, p) => sum + (p.stock * (p.sellingPrice - p.purchasePrice)), 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-4 rounded border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        
        {/* Search & Category filter */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Chercher par nom ou code-barres..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              onClick={(e) => { e.currentTarget.focus(); }}
              onTouchStart={(e) => { e.currentTarget.focus(); }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all font-mono"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded focus:outline-hidden"
          >
            <option value="Tous">📁 Catégorie : Toutes</option>
            {categories.filter(c => c !== 'Tous').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Status filter toggles */}
        <div className="flex space-x-1.5 self-stretch sm:self-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tout ({db.products.length})
          </button>
          <button
            onClick={() => { setStatusFilter('ok'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Suffisant ({db.products.filter(p => p.stock > p.minAlertQty).length})
          </button>
          <button
            onClick={() => { setStatusFilter('alert'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'alert' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Niveaux Bas ({db.products.filter(p => p.stock <= p.minAlertQty && p.stock > 0).length})
          </button>
          <button
            onClick={() => { setStatusFilter('out'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'out' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rupture ({db.products.filter(p => p.stock === 0).length})
          </button>
        </div>
      </div>

      {/* Main visual products table list */}
      <div className="bg-white rounded border border-slate-205 overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Boxes className="w-12 h-12 stroke-1 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-slate-800">Aucun produit trouvé</h3>
            <p className="text-xs text-slate-400 mt-1">Créez votre première fiche ou modifiez vos filtres.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase text-[9px] tracking-wider whitespace-nowrap">
                  <th className="p-4">Désignation & Code</th>
                  <th className="p-4">Catégorie</th>
                  <th className="p-4 text-right">Prix d'Achat</th>
                  <th className="p-4 text-right">Prix de Vente</th>
                  <th className="p-4 text-right text-blue-600">Rendement / Marge</th>
                  <th className="p-4 text-center">Quantité en Stock</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProducts.map(prod => {
                  const profit = prod.sellingPrice - prod.purchasePrice;
                  const marginPercent = prod.purchasePrice > 0 ? (profit / prod.purchasePrice) * 100 : 0;
                  const isLow = prod.stock <= prod.minAlertQty && prod.stock > 0;
                  const isOut = prod.stock === 0;
                  const visual = getProductVisual(prod);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          {/* Aesthetic product visual representation */}
                          <div className="w-9 h-9 text-slate-700 rounded bg-slate-50 border border-slate-150 flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                            {visual.type === 'image' ? (
                              <img 
                                src={visual.value} 
                                alt={prod.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              <span className="text-xl select-none">{visual.value}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs sm:text-[13px] leading-snug">{prod.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 font-sans">
                              <span className="font-mono text-[10px] text-slate-400">🏷️ {prod.code}</span>
                              {(prod as any).isFoodProduct && (prod as any).weightVolume && (
                                <span className="bg-amber-105/50 text-amber-805 border border-amber-200 text-[8.5px] font-black uppercase px-1 rounded shrink-0">
                                  ⚖️ {(prod as any).weightVolume}
                                </span>
                              )}
                              {(prod.expiryDate || prod.dateExpiration) && (
                                <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[8.5px] font-black uppercase px-1 rounded flex items-center gap-0.5 shrink-0">
                                  📅 EXP: {prod.dateExpiration || prod.expiryDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg">
                          {prod.category}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-slate-700">
                        {formatCurrency(prod.purchasePrice)}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(prod.sellingPrice)}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="font-mono">
                          <span className="text-emerald-600 font-bold">+{formatCurrency(profit)} </span>
                          <span className="text-slate-400 text-[9px] block">Marge: {marginPercent.toFixed(1)}%</span>
                        </div>
                      </td>
                      
                      {/* Interactive Stock Column */}
                      <td className="p-4">
                        <div className="flex flex-col items-center justify-center space-y-1.5 min-w-[140px]">
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleQuickStockAdjust(prod.id, -1)}
                              className="w-5 h-5 bg-white border border-slate-200 hover:bg-slate-100 rounded flex items-center justify-center text-slate-500 font-bold shrink-0 transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            
                            <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-md min-w-[50px] text-center ${
                              isOut 
                                ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                : isLow 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {prod.stock} {prod.unit}
                            </span>

                            <button
                              onClick={() => handleQuickStockAdjust(prod.id, 1)}
                              className="w-5 h-5 bg-white border border-slate-200 hover:bg-slate-100 rounded flex items-center justify-center text-slate-500 font-bold shrink-0 transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <span className="text-[9px] text-slate-400 font-bold">Seuil Alerte: {prod.minAlertQty}</span>
                          {db.settings?.enableIndividualProductEmailAlerts && (
                            <span 
                              className={`text-[8.5px] font-black tracking-wide px-1.5 py-0.5 rounded-sm inline-flex items-center gap-0.5 mt-0.5 border ${
                                prod.emailAlertsEnabled !== false 
                                  ? 'text-indigo-700 bg-indigo-50 border-indigo-100' 
                                  : 'text-slate-400 bg-slate-50 border-slate-200'
                              }`}
                            >
                              <span>{prod.emailAlertsEnabled !== false ? '📧 ✓' : '🔕 ✗'}</span>
                              <span>{prod.emailAlertsEnabled !== false ? (language === 'ar' ? 'تنبيه نشط' : 'Alerte Active') : (language === 'ar' ? 'غير مفعل' : 'Muet')}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Management Edit Actions */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedBarcodeProduct(prod);
                              setBarcodeCount(12);
                              setShowBarcodeModal(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 rounded text-slate-500 transition-colors cursor-pointer flex items-center justify-center"
                            title={language === 'ar' ? 'إنشاء وطباعة ملصق باركود المنتج' : 'Générer & imprimer étiquette code-barres'}
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setHistoryProduct(prod)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-650 text-indigo-500 rounded text-slate-500 transition-colors cursor-pointer flex items-center justify-center"
                            title={language === 'ar' ? 'سجل تغير الأسعار' : 'Historique des prix'}
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditPriceProductId(prod.id);
                              setEditPurchasePrice(prod.purchasePrice);
                              setEditSellingPrice(prod.sellingPrice);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-600 rounded text-slate-500 transition-colors cursor-pointer flex items-center justify-center"
                            title={language === 'ar' ? 'تعديل سريع للأسعار' : 'Modifier prix rapidement'}
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded text-slate-500 transition-colors cursor-pointer flex items-center justify-center"
                            title="Modifier Fiche"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-500 transition-colors cursor-pointer flex items-center justify-center"
                            title="Supprimer"
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

            {/* Pagination Controls bar */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-205 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs font-semibold text-slate-600 no-print">
                <div>
                  {language === 'ar' ? (
                    <span>عرض {startIndex + 1} إلى {Math.min(endIndex, filteredProducts.length)} من {filteredProducts.length} منتج</span>
                  ) : (
                    <span>Affichage de {startIndex + 1} à {Math.min(endIndex, filteredProducts.length)} sur {filteredProducts.length} articles</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed select-none font-bold"
                  >
                    {language === 'ar' ? 'السابق' : 'Précédent'}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded border font-bold select-none transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed select-none font-bold"
                  >
                    {language === 'ar' ? 'التالي' : 'Suivant'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAILED ADD / EDIT MODAL OVERLAY */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] md:max-h-[85vh] my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>{editingProduct ? (language === 'ar' ? 'تعديل بيانات المنتج' : 'Modifier le Produit') : (language === 'ar' ? 'إدخل منتج جديد' : 'Saisir un Nouveau Produit')}</span>
              </h3>
              <button type="button" onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0 text-xs font-sans">
              <div className="flex-1 overflow-y-auto pr-1.5 py-1 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-705 block mb-1">
                    {db.settings?.activitySector === 'superette' ? '🍉 Désignation / Produit Alimentaire *' : 'Désignation / Nom Produit *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={db.settings?.activitySector === 'superette' ? "Ex : Couscous Fin Diari 1kg ou Lait..." : "Ex : Laptop ASUS i7"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-hidden text-slate-800 font-semibold"
                    list="food-products-suggest"
                  />
                  <datalist id="food-products-suggest">
                    {COMMON_FOODS.map((food, idx) => (
                      <option key={idx} value={food.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Code-barres / SKU</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex : 8809121..."
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2 pl-3 pr-16 focus:outline-hidden font-mono text-slate-800 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCameraActive(!isCameraActive)}
                      title={language === 'ar' ? 'تشغيل الكاميرا لمسح الباركود' : 'Scanner via Caméra'}
                      className={`absolute right-1.5 top-1.5 h-[24px] px-2 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all select-none hover:scale-102 cursor-pointer ${
                        isCameraActive
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline Camera Scanner Section for adding brand new products */}
              {isCameraActive && (
                <div className="border border-slate-200 bg-slate-50/90 rounded-xl p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-800 uppercase tracking-widest font-mono">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                      {language === 'ar' ? 'قارئ الكاميرا نشط' : 'Lecteur Caméra Actif'}
                    </span>
                    
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 cursor-pointer text-[10px] text-slate-600 hover:text-slate-800 font-semibold select-none">
                        <input
                          type="checkbox"
                          checked={isBeepEnabled}
                          onChange={(e) => {
                            const nextVal = e.target.checked;
                            setIsBeepEnabled(nextVal);
                            safeLocalStorage.setItem('product_scan_beep', String(nextVal));
                          }}
                          className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                        />
                        <span>🔊 Bip</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCameraActive(false)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative w-full aspect-video sm:max-h-52 bg-slate-950 rounded-lg overflow-hidden border border-slate-950 shadow-inner flex flex-col items-center justify-center">
                    <div id="product-form-camera-scanner-view" className="w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />
                    
                    {/* Laser aiming guides layer overlay */}
                    <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none p-4 sm:p-6">
                      <div className="w-full flex justify-between">
                        <div className="w-3 h-3 border-t-2 border-l-2 border-indigo-500"></div>
                        <div className="w-3 h-3 border-t-2 border-r-2 border-indigo-500"></div>
                      </div>
                      <div className="w-full border-t border-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.7)] animate-pulse"></div>
                      <div className="w-full flex justify-between">
                        <div className="w-3 h-3 border-b-2 border-l-2 border-indigo-500"></div>
                        <div className="w-3 h-3 border-b-2 border-r-2 border-indigo-500"></div>
                      </div>
                    </div>

                    {/* Camera scan flash overlay pulse */}
                    {isFlashActive && (
                      <div className="absolute inset-0 bg-white pointer-events-none z-30 transition-all duration-100 ease-out" />
                    )}
                  </div>

                  {cameraError ? (
                    <p className="text-[10px] font-bold text-rose-600 font-mono text-center">
                      {cameraError}
                    </p>
                  ) : (
                    <p className="text-[9px] font-mono text-slate-500 text-center uppercase tracking-wider">
                      {language === 'ar' ? 'وجه الباركود للعدسة للملء التلقائي في الخانة 🚀' : 'Présentez le code-barres devant la caméra pour le saisir automatiquement 🚀'}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Catégorie</label>
                  {isNewCategory ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="Ex : Épicerie"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-indigo-50/50 border border-indigo-200 rounded py-2 px-3 focus:outline-hidden text-slate-800 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCategory(false);
                          setCategory('');
                        }}
                        className="px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-200 cursor-pointer"
                      >
                        Liste
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setIsNewCategory(true);
                          setCategory('');
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-2.5 focus:outline-hidden text-slate-800 font-semibold cursor-pointer"
                    >
                      <option value="">Sélectionner...</option>
                      {db.products
                        .map(p => p.category)
                        .filter((v, i, self) => self.indexOf(v) === i && v)
                        .map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))
                      }
                      <option value="__add_new__" className="text-blue-600 font-extrabold bg-blue-50">➕ Nouvelle catégorie...</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unité de mesure</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-2.5 focus:outline-hidden text-slate-800 font-bold"
                  >
                    <option value="Pcs">Cartons / Pièces</option>
                    <option value="Kg">Grammes / Kilogrammes (Kg)</option>
                    <option value="Litre">Litres (L)</option>
                    <option value="Metre">Mètres (M)</option>
                    <option value="Blister">Blisters / Rames</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Niveau d'Alerte (Min)</label>
                  <input
                    type="number"
                    min="0"
                    value={minAlertQty}
                    onChange={(e) => setMinAlertQty(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-hidden font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Individual Product email alerts toggle (visible if setting enabled globally) */}
              {db.settings?.enableIndividualProductEmailAlerts && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    id="productEmailAlertsToggle"
                    checked={emailAlertsEnabled}
                    onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex flex-col text-left">
                    <label htmlFor="productEmailAlertsToggle" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      {language === 'ar' ? 'تفعيل تنبيه البريد الإلكتروني لهذا المنتج' : 'Activer alerte email pour ce produit'}
                    </label>
                    <span className="text-[10.5px] text-slate-500 leading-normal">
                      {language === 'ar' 
                        ? '💡 إرسال إشعار فوري عند هبوط كمية هذا المنتج المعين دون الصنف الأدنى.' 
                        : '💡 Déclencher l\'expédition d\'un courrier automatique SMTP spécifiquement pour ce produit.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Preset Food products selector */}
              {db.settings?.activitySector === 'superette' && (
                <div className="bg-indigo-50/40 p-3 rounded border border-indigo-100/70 space-y-1.5 no-print">
                  <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-widest block">
                    ⚡ Remplissage Rapide Produit Alimentaire :
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                    {COMMON_FOODS.map((food, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setName(food.name);
                          setCategory(food.category);
                          setCode(food.code);
                          setPurchasePrice(food.purchasePrice);
                          setSellingPrice(food.sellingPrice);
                          setUnit(food.unit);
                          setIsFoodProduct(true);
                          setIsNewCategory(false);
                        }}
                        className="py-1 px-2 bg-white hover:bg-neutral-50 text-slate-800 rounded border border-slate-200 text-[10px] font-semibold cursor-pointer active:scale-95 transition-all truncate max-w-[150px]"
                        title={food.name}
                      >
                        🍞 {food.name.split(' ').slice(0, 3).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date d'expiration - General Field */}
              <div className="bg-rose-50/20 p-3.5 rounded-xl border border-rose-100/70 space-y-2 no-print">
                <div className="flex items-start gap-2">
                  <span className="text-sm">📅</span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {language === 'ar' ? 'تاريخ انتهاء الصلاحية' : "Date d'expiration / Péremption"}
                    </span>
                    <span className="text-[10px] text-slate-550 block">
                      {language === 'ar' ? 'قم بتحديد تاريخ لتلقي تنبيهات تلقائية بانتهاء الصلاحية على لوحة التحكم.' : 'Indiquez une date pour déclencher automatiquement des alertes visuelles sur le tableau de bord.'}
                    </span>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-rose-100/60 flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full">
                    <label htmlFor="dateExpirationInput" className="text-[9.5px] font-bold text-rose-900 block mb-1 uppercase tracking-wider">
                      {language === 'ar' ? 'تحديد التاريخ (الملء اختياري)' : "Date limite de conservation / péremption (Facultatif)"}
                    </label>
                    <input
                      type="date"
                      id="dateExpirationInput"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full max-w-xs bg-white border border-rose-200/80 rounded py-1.5 px-3 focus:outline-hidden text-slate-800 font-bold font-mono transition-shadow focus:ring-1 focus:ring-rose-450"
                    />
                  </div>
                </div>
              </div>

              {/* Food-specific net details toggle block */}
              <div className="bg-amber-50/20 p-3 rounded-lg border border-amber-100/50 space-y-2 no-print">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFoodProduct}
                    onChange={(e) => setIsFoodProduct(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4.5 h-4.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-955 block">🍩 Ce produit est un produit alimentaire</span>
                    <span className="text-[9.5px] text-slate-500 block">Permet d'ajouter des indications de contenance spécifique (poids net / volume).</span>
                  </div>
                </label>

                {isFoodProduct && (
                  <div className="pt-2 border-t border-amber-100/60 animate-fadeIn">
                    <div>
                      <label className="text-[10px] font-bold text-amber-900 block mb-1">⚖️ Poids Net / Volume (Contenance)</label>
                      <input
                        type="text"
                        placeholder="Ex: 1 Kg, 500g, 1.5 Litres"
                        value={weightVolume}
                        onChange={(e) => setWeightVolume(e.target.value)}
                        className="w-full bg-white border border-amber-200/80 rounded py-1 px-2.5 focus:outline-hidden text-slate-800 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Product Visual Customization (Image / émoji) */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-205 space-y-3">
                <label className="text-xs font-bold text-slate-750 uppercase tracking-wide block">
                  🎨 {language === 'ar' ? 'صورة المنتج أو الرمز التعبيري' : 'Visuel du Produit'}
                </label>
                
                <div className="flex items-start gap-3.5">
                  {/* Visual Preview Card */}
                  <div className="w-16 h-16 rounded-md bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-3xs relative group">
                    {image ? (
                      image.startsWith('data:image') || image.startsWith('http') || image.length > 30 ? (
                        <img 
                          src={image} 
                          alt="Product preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <span className="text-4xl select-none">{image}</span>
                      )
                    ) : (
                      // Fallback automatic preview
                      (() => {
                        const autoVisual = getProductVisual({ name, category, image: '' });
                        return autoVisual.type === 'image' ? (
                          <img src={autoVisual.value} alt="Auto preview" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-4xl text-slate-350 select-none opacity-60" title="Automatique de secours">{autoVisual.value}</span>
                        );
                      })()
                    )}
                    
                    {image && (
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-bold cursor-pointer"
                      >
                        {language === 'ar' ? 'إزالة' : 'Effacer'}
                      </button>
                    )}
                  </div>

                  {/* Inputs and Selector shortcuts */}
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={language === 'ar' ? 'اكتب رمزًا تعبيريًا (مثال 🍎) أو الصق رابطًا' : 'Coller un émoji (ex: 🍎) ou un lien'}
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded py-1.5 px-2.5 text-xs text-slate-800 transition-colors focus:border-blue-400 focus:outline-hidden font-medium"
                      />
                      
                      <label className="bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 py-1.5 px-3 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs select-none shrink-0">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'رفع صور' : 'Importer'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const imgEl = document.createElement('img');
                              imgEl.src = event.target?.result as string;
                              imgEl.onload = () => {
                                // Downscale and compress to keep database light
                                const canvas = document.createElement('canvas');
                                const max_size = 300; // 300px max provides crisp retina images for POS & products list while keeping the DB lightweight
                                let width = imgEl.width;
                                let height = imgEl.height;
                                if (width > height) {
                                  if (width > max_size) {
                                    height *= max_size / width;
                                    width = max_size;
                                  }
                                } else {
                                  if (height > max_size) {
                                    width *= max_size / height;
                                    height = max_size;
                                  }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                canvas.getContext('2d')?.drawImage(imgEl, 0, 0, width, height);
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // High performance downscaled base64 jpeg
                                setImage(dataUrl);
                              };
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>

                    {/* Quick emoji helper grid */}
                    <div className="flex flex-wrap gap-1">
                      {['🍎', '🍊', '🥩', '🥚', '🍞', '🥛', '🥤', '🥫', '🍫', '🧂', '🧼', '🧴', '🧱', '🔨', '💊', '💻', '🔌', '☕'].map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setImage(em)}
                          className={`w-6 h-6 rounded flex items-center justify-center text-sm bg-white hover:bg-slate-100 border border-slate-150 transition-all cursor-pointer ${image === em ? '!border-blue-500 !bg-blue-50/50 scale-105 font-bold shadow-2xs' : ''}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-50/50 p-4 rounded border border-blue-100">
                <div>
                  <label className="text-xs font-bold text-blue-950 block mb-1">
                    {language === 'ar' ? "سعر الشراء (د.ت) *" : "Prix d'Achat (DT) *"}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0"
                    placeholder="0.000"
                    value={purchasePrice || ''}
                    onChange={(e) => setPurchasePrice(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-blue-200 rounded py-2 px-3 focus:outline-hidden font-bold font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-950 block mb-1">
                    {language === 'ar' ? "سعر البيع (TTC) *" : "Prix de Vente (TTC) *"}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0"
                    placeholder="0.000"
                    value={sellingPrice || ''}
                    onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-blue-200 rounded py-2 px-3 focus:outline-hidden font-bold font-mono text-blue-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-950 block mb-1">
                    {language === 'ar' ? "نسبة الأداء TVA *" : "Taux de TVA *"}
                  </label>
                  <select
                    value={tvaRate}
                    onChange={(e) => setTvaRate(Number(e.target.value))}
                    className="w-full bg-white border border-blue-200 rounded py-2 px-3 focus:outline-hidden font-bold font-sans text-slate-800"
                  >
                    <option value={0}>0%</option>
                    <option value={7}>7%</option>
                    <option value={19}>19%</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-950 block mb-1">Stock Initial</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-blue-200 rounded py-2 px-3 focus:outline-hidden font-mono text-slate-800"
                  />
                </div>
              </div>

              {sellingPrice > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-[11px] font-sans">
                  <div className="flex justify-between items-center text-slate-650">
                    <span>{language === 'ar' ? 'سعر البيع دون احتساب الأداء (HT) :' : 'Prix de Vente Hors Taxes (H.T.) :'}</span>
                    <strong className="font-mono text-slate-800 text-xs font-black">
                      {formatCurrency(sellingPrice / (1 + tvaRate / 100))}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-650">
                    <span>{language === 'ar' ? 'قيمة الأداء على القيمة المضافة (TVA) :' : 'Valeur de la taxe (TVA) :'}</span>
                    <span className="font-mono text-slate-800">
                      {formatCurrency(sellingPrice - (sellingPrice / (1 + tvaRate / 100)))} ({tvaRate}%)
                    </span>
                  </div>
                  {purchasePrice > 0 && (
                    <div className="pt-1.5 border-t border-slate-150 flex justify-between items-center text-emerald-800 font-medium">
                      <span>{language === 'ar' ? 'هامش الربح الصافي على هذا المنتج :' : 'Marge bénéficiaire sur cet article :'}</span>
                      <strong className="font-mono text-emerald-700 text-xs font-black">
                        +{formatCurrency(sellingPrice - purchasePrice)} ({( ((sellingPrice - purchasePrice) / purchasePrice) * 100).toFixed(1)}%)
                      </strong>
                    </div>
                  )}
                </div>
              )}
              </div>

              <div className="flex justify-end space-x-3 pt-3 mt-3 border-t border-slate-150 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded text-xs font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  {language === 'ar' ? 'إغلاق' : 'Fermer'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  {language === 'ar' ? 'حفظ بيانات المنتج' : 'Enregistrer Fiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RAPID PRICE UPDATE MODAL */}
      {editPriceProductId && (() => {
        const product = db.products.find(p => p.id === editPriceProductId);
        if (!product) return null;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 md:p-6 shadow-2xl border border-slate-200 text-start my-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                  <span>{language === 'ar' ? 'تعديل سريع للأسعار' : 'Modification rapide des prix'}</span>
                </h3>
                <button type="button" onClick={() => setEditPriceProductId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500">{language === 'ar' ? 'اسم المنتج:' : 'Désignation :'}</span>
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">{product.name}</span>
                </div>
                {product.code && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">{language === 'ar' ? 'رمز الباركود:' : 'Code-barres :'}</span>
                    <span className="font-mono text-slate-800 font-semibold">{product.code}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleQuickPriceUpdate} className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      {language === 'ar' ? 'سعر الشراء' : "Prix d'Achat"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={editPurchasePrice}
                      onChange={(e) => setEditPurchasePrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-hidden text-slate-800 font-semibold text-center font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      {language === 'ar' ? 'سعر البيع' : 'Prix de Vente'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={editSellingPrice}
                      onChange={(e) => setEditSellingPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-hidden text-slate-800 font-semibold text-center font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditPriceProductId(null)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded text-xs font-bold cursor-pointer hover:bg-slate-100 font-sans"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold cursor-pointer transition-all shadow-xs font-sans"
                  >
                    {language === 'ar' ? 'تحديث السعر' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* DETAILED DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteProductId && (() => {
          const product = db.products.find(p => p.id === deleteProductId);
          if (!product) return null;
          
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 z-55 overflow-y-auto no-print" style={{ zIndex: 99999 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-2xl max-w-md w-full p-5 md:p-6 shadow-2xl space-y-4 border border-rose-100 text-start my-auto relative font-sans"
              >
                {/* Visual warning background pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/40 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex items-start gap-3 relative">
                  <div className="p-2.5 bg-rose-50 rounded-full text-rose-600 shrink-0">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-rose-900 font-display">
                      {language === 'ar' ? '⚠️ تنبيه: تأكيد حذف منتج' : '⚠️ ALERTE : Confirmer la suppression'}
                    </h3>
                    <p className="text-xs text-rose-700 font-bold font-sans">
                      {language === 'ar' 
                        ? 'تنبيه هام جداً: هذا الإجراء سيؤثر على التاريخ المحاسبي للمبيعات.' 
                        : "Attention critique : la suppression définitive de cet article affectera vos archives."}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-xs space-y-2.5 font-sans relative">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-550 font-bold">{language === 'ar' ? 'اسم المنتج:' : 'Désignation :'}</span>
                    <span className="font-extrabold text-slate-900 truncate max-w-[220px] bg-slate-200/50 px-2 py-0.5 rounded">{product.name}</span>
                  </div>
                  {product.code && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-550 font-bold">{language === 'ar' ? 'رمز الباركود / SKU:' : 'Code-barres / SKU :'}</span>
                      <span className="font-mono text-slate-800 font-extrabold bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded leading-none">{product.code}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-550 font-bold">{language === 'ar' ? 'المخزون الحالي:' : 'Stock Actuel :'}</span>
                    <span className="font-extrabold px-1.5 py-0.5 bg-slate-200/60 rounded text-slate-900">{product.stock} {product.unit}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-550 font-bold">{language === 'ar' ? 'سعر البيع:' : 'Prix de vente :'}</span>
                    <span className="font-bold text-slate-950 font-mono">{formatCurrency(product.sellingPrice)}</span>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-150 rounded-lg p-3 text-[10.5px] text-rose-950 leading-relaxed space-y-1 font-sans">
                  <strong className="block font-black uppercase text-[10px] tracking-wide text-rose-900">
                    📢 {language === 'ar' ? 'تبعات الحذف :' : 'IMPACT DE LA DELETION :'}
                  </strong>
                  <p>
                    {language === 'ar'
                      ? 'سيؤدي حذف هذا المنتج إلى إزالته كلياً من القوائم النشطة ونقاط البيع. السجلات المالية والمبيعات السابقة قد تفقد دقتها.'
                      : 'La suppression déréférence cet article des rayons de vente. Les statistiques de ventes passées et l\'historique comptable des factures n\'afficheront plus son libellé.'}
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 font-sans">
                  <button
                    type="button"
                    onClick={() => setDeleteProductId(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteProduct}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'ar' ? 'نعم، احذف المنتج نهائياً' : 'Oui, Supprimer Définitivement'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 🏷️ INTUITIVE DUAL-MODE BARCODE & STICKER PRINTER MODAL */}
      {showBarcodeModal && selectedBarcodeProduct && (() => {
        const prod = selectedBarcodeProduct;
        const storeName = db.settings?.storeName || 'INNOVA POS';
        
        // Generate pseudo-barcodes dynamically to prevent any heavy image or canvas dependencies
        const renderStickerBarcodes = (codeValue: string, isCompact: boolean) => {
          const barcodeStr = codeValue || '000000000000';
          const seed = barcodeStr.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
          
          return (
            <div className="flex items-stretch justify-center w-full select-none" style={{ height: isCompact ? '28px' : '44px' }}>
              {/* Left boundary */}
              <div className="w-[1.5px] bg-black shrink-0" />
              <div className="w-[1px] bg-white shrink-0" />
              <div className="w-[1px] bg-black shrink-0" />
              
              {/* Dynamic width stripes */}
              {barcodeStr.split('').map((char, index) => {
                const asciiVal = char.charCodeAt(0);
                const width = ((asciiVal + index + seed) % 3) + 1; // 1px to 3px
                const isBlack = (asciiVal + index + seed) % 2 === 0;
                
                return (
                  <div
                    key={index}
                    style={{
                      width: `${width}px`,
                      backgroundColor: isBlack ? '#000000' : '#ffffff'
                    }}
                    className="h-full shrink-0"
                  />
                );
              })}
              
              {/* Layout padding stripes */}
              {[4, 2, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 4].slice(0, Math.max(5, 20 - barcodeStr.length)).map((val, idx) => {
                const isBlack = (idx + seed) % 2 === 0;
                return (
                  <div
                    key={`pad-${idx}`}
                    style={{
                      width: `${val}px`,
                      backgroundColor: isBlack ? '#000000' : '#ffffff'
                    }}
                    className="h-full shrink-0"
                  />
                );
              })}
              
              {/* Right boundary */}
              <div className="w-[1px] bg-black shrink-0" />
              <div className="w-[1px] bg-white shrink-0" />
              <div className="w-[1.5px] bg-black shrink-0" />
            </div>
          );
        };

        const handleDirectPrintInitiation = () => {
          try {
            const printContent = document.getElementById('print-barcode-area');
            const portal = document.getElementById('print-portal');
            const isIframe = checkIsIframe();

            if (printContent && portal) {
              portal.innerHTML = `
                <div id="print-barcode-area" style="display: block !important; background: #ffffff !important; padding: 10px;">
                  ${printContent.innerHTML}
                </div>
              `;
              if (!isIframe) {
                try {
                  window.print();
                } catch (printErr) {
                  console.warn("window.print failed", printErr);
                }
              } else {
                console.log("[INNOVA PRINT] Barcode print triggered inside sandbox preview.");
              }
              setTimeout(() => {
                portal.innerHTML = '';
              }, 1000);
            } else {
              if (!isIframe) {
                try {
                  window.print();
                } catch (printErr) {
                  console.error(printErr);
                }
              }
            }
          } catch (err) {
            console.warn("Robust print failed", err);
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 text-start overflow-y-auto">
            {/* Inject native thermal label printer CSS on matching view contexts */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #print-barcode-area, #print-barcode-area * {
                  visibility: visible !important;
                }
                #print-barcode-area {
                  display: block !important;
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                /* Anti-pagebreak margin protection for precise sticker alignments */
                .page-break-avoid {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            `}</style>

            <div className="bg-white rounded-2xl max-w-3xl w-full p-5 md:p-6 shadow-2xl border border-slate-200 flex flex-col md:flex-row gap-6 my-auto">
              {/* Print Config Side */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Barcode className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {language === 'ar' ? 'طباعة وتوليد باركود المنتجات' : 'Impression de Codes-barres'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {language === 'ar' ? 'أنشئ ملصقات متوافقة مع الطابعات الحرارية وورق الأوراق A4 المستمر' : 'Prêt pour rouleaux thermiques et planches adhésives A4'}
                    </p>
                  </div>
                </div>

                {/* Product Dropdown Selector */}
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase">
                    {language === 'ar' ? 'المنتج المستهدف' : 'Sélection du Produit'}
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold font-sans text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    value={prod.id}
                    onChange={(e) => {
                      const matched = db.products.find(p => p.id === e.target.value);
                      if (matched) setSelectedBarcodeProduct(matched);
                    }}
                  >
                    {db.products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Layout Grid properties */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-500 uppercase">
                      {language === 'ar' ? 'عدد الملصقات المطلوبة' : 'Nombre d\'Étiquettes'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500 text-center"
                      value={barcodeCount}
                      onChange={(e) => setBarcodeCount(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-500 uppercase">
                      {language === 'ar' ? 'مقاس ورق الملصق' : 'Dimensions de l\'Étiquette'}
                    </label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-[34px]">
                      <button
                        type="button"
                        onClick={() => setBarcodeLabelSize('standard')}
                        className={`flex-1 rounded text-[10.5px] font-bold transition-all cursor-pointer ${barcodeLabelSize === 'standard' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500'}`}
                      >
                        {language === 'ar' ? 'قياسي (38x25)' : 'Std 38x25mm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBarcodeLabelSize('mini')}
                        className={`flex-1 rounded text-[10.5px] font-bold transition-all cursor-pointer ${barcodeLabelSize === 'mini' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500'}`}
                      >
                        {language === 'ar' ? 'صغير (25x15)' : 'Mini 25x15'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Switchable Display properties */}
                <div className="bg-slate-55 border border-slate-150 p-3 rounded-lg space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-slate-450 block tracking-wider">
                    {language === 'ar' ? 'محتويات وهوية كرت الملصق :' : 'Informations à imprimer :'}
                  </span>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showStoreNameOnLabel}
                      onChange={(e) => setShowStoreNameOnLabel(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>{language === 'ar' ? 'إظهار اسم المحل التجاري' : 'Afficher le nom de votre commerce'}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPriceOnLabel}
                      onChange={(e) => setShowPriceOnLabel(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>{language === 'ar' ? 'إظهار سعر البيع للمستهلك' : 'Afficher le prix public de vente'}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBarcodeTextOnLabel}
                      onChange={(e) => setShowBarcodeTextOnLabel(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>{language === 'ar' ? 'إظهار رقم الباركود الصريح' : 'Afficher le code brut en texte'}</span>
                  </label>
                </div>

                {/* Helpful tip overlay */}
                <div className="bg-amber-50 border border-amber-200 text-amber-850 p-2.5 rounded-lg text-[10.5px] font-medium leading-relaxed">
                  💡 {language === 'ar' 
                    ? 'نصيحة: عند فتح نافذة الطباعة الافتراضية، يرجى ضبط حجم الورق الملائم واختيار "بدون الهوامش" (Margins: None) للحصول على أفضل محاذاة تلقائية.'
                    : 'Astuce : En ouvrant l’aperçu d’impression, choisissez "Marges : Aucune" et définissez la taille de papier au format de votre rouleau adhésif.'}
                </div>

                {/* Action CTA triggers */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBarcodeModal(false)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    {language === 'ar' ? 'إغلاق المعاينة' : 'Fermer'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectPrintInitiation}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{language === 'ar' ? 'بدء سحب الطباعة' : 'Lancer l\'Impression'}</span>
                  </button>
                </div>
              </div>

              {/* Graphic Mock live Preview (Right side) */}
              <div className="w-full md:w-[280px] bg-slate-900 rounded-xl p-4 flex flex-col justify-center items-center text-center select-none shadow-inner border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-wider">
                  🎯 {language === 'ar' ? 'معاينة الملصق على الطابعة' : 'Aperçu Virtuel de l\'Étiquette'}
                </span>

                {/* Mock physical sticker representation */}
                <div 
                  className={`bg-white text-black p-3 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-emerald-400/40 shadow-xl select-none text-center ${barcodeLabelSize === 'mini' ? 'w-[200px] h-[130px]' : 'w-[240px] h-[160px]'}`}
                >
                  {showStoreNameOnLabel && (
                    <span className="text-[11px] font-black uppercase tracking-tight text-slate-800 border-b border-black/10 pb-0.5 leading-none w-full max-w-[180px] truncate block">
                      🏰 {storeName}
                    </span>
                  )}
                  
                  <span className="font-extrabold text-slate-900 truncate max-w-[200px] block mt-1.5 leading-tight" style={{ fontSize: barcodeLabelSize === 'mini' ? '11px' : '13px' }}>
                    {prod.name}
                  </span>

                  <div className="my-1.5 w-full flex flex-col items-center justify-center">
                    {renderStickerBarcodes(prod.code, barcodeLabelSize === 'mini')}
                  </div>

                  {showBarcodeTextOnLabel && (
                    <span className="font-mono tracking-[4px] text-[10px] font-bold text-slate-600 block leading-none">
                      {prod.code}
                    </span>
                  )}

                  {showPriceOnLabel && (
                    <span className="text-sm font-black font-mono text-black border border-black/80 px-2 py-0.5 rounded-sm mt-1 mb-0.5 inline-block bg-slate-50">
                      {formatCurrency(prod.sellingPrice)}
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-emerald-400 font-bold block mt-3 font-mono">
                  📊 Plan : {barcodeCount} x {barcodeLabelSize === 'standard' ? '38x25mm' : '25x15mm'}
                </span>
              </div>
            </div>

            {/* 🔥 Hidden dynamic printable grid generated in runtime DOM only seen by print spool controllers */}
            <div id="print-barcode-area" className="hidden">
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: barcodeLabelSize === 'mini' ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: 'white',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {Array.from({ length: barcodeCount }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e1e1e1',
                      padding: barcodeLabelSize === 'mini' ? '6px' : '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'white',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                      boxSizing: 'border-box',
                      minHeight: barcodeLabelSize === 'mini' ? '100px' : '140px',
                      borderRadius: '4px',
                      textAlign: 'center'
                    }}
                    className="page-break-avoid"
                  >
                    {showStoreNameOnLabel && (
                      <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #ccc', width: '100%', paddingBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {storeName}
                      </span>
                    )}

                    <span style={{ fontSize: barcodeLabelSize === 'mini' ? '10px' : '12px', fontWeight: 'bold', margin: '4px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', display: 'block' }}>
                      {prod.name}
                    </span>

                    <div style={{ margin: '4px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
                      {renderStickerBarcodes(prod.code, barcodeLabelSize === 'mini')}
                    </div>

                    {showBarcodeTextOnLabel && (
                      <span style={{ fontFamily: 'monospace', fontSize: '9px', letterSpacing: '2px', fontWeight: 'bold', color: '#555' }}>
                        {prod.code}
                      </span>
                    )}

                    {showPriceOnLabel && (
                      <span style={{ fontSize: '11px', fontWeight: '900', border: '1px solid #000', padding: '1px 5px', marginTop: '4px', borderRadius: '2px', display: 'inline-block' }}>
                        {formatCurrency(prod.sellingPrice)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        );
      })()}

      {/* PRICE HISTORY DIALOG MODAL */}
      {historyProduct && (() => {
        const historyLogs = historyProduct.priceHistory || [];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-slate-200 text-start my-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                  <History className="w-5 h-5 text-indigo-505 animate-pulse" />
                  <span>{language === 'ar' ? 'سجل أسعار المنتج' : 'Historique des prix du produit'}</span>
                </h3>
                <button 
                  type="button" 
                  onClick={() => setHistoryProduct(null)} 
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Product Info Summary Box */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-indigo-100 border border-indigo-200/50 text-indigo-750 flex items-center justify-center overflow-hidden shrink-0">
                  <span className="text-xl">🏷️</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-sm truncate">{historyProduct.name}</p>
                  <p className="font-mono text-[10px] text-slate-500 mt-0.5">Code: {historyProduct.code}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">{language === 'ar' ? 'السعر الحالي' : 'Prix Actuel'}</span>
                  <span className="font-mono text-xs font-bold text-indigo-700">{formatCurrency(historyProduct.sellingPrice)}</span>
                </div>
              </div>

              {/* Logs Timeline */}
              <div className="max-h-[320px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                {historyLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-450 text-xs">
                    <p className="font-bold">📅 {language === 'ar' ? 'لا يوجد سجل أسعار مدون بعد' : 'Aucun historique de prix pour le moment'}</p>
                    <p className="text-[10px] mt-1 text-slate-400">{language === 'ar' ? 'سيتغير هذا السجل عند أي تعديل أو تحديث للأسعار.' : 'Les changements de prix futurs y seront inscrits.'}</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-150 pl-4 ml-2.5 space-y-4">
                    {historyLogs.map((log) => {
                      const isInitial = log.oldSellingPrice === 0 && log.oldPurchasePrice === 0;
                      
                      // Calculate percentage changes
                      const sellDiff = log.newSellingPrice - log.oldSellingPrice;
                      const sellPct = log.oldSellingPrice > 0 ? (sellDiff / log.oldSellingPrice) * 100 : 0;
                      
                      const purchaseDiff = log.newPurchasePrice - log.oldPurchasePrice;
                      const purchasePct = log.oldPurchasePrice > 0 ? (purchaseDiff / log.oldPurchasePrice) * 100 : 0;

                      // Format timestamp
                      const formattedDate = (() => {
                        try {
                          const d = new Date(log.timestamp);
                          return d.toLocaleDateString(language === 'ar' ? 'ar-TN' : 'fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } catch {
                          return log.timestamp;
                        }
                      })();

                      return (
                        <div key={log.id} className="relative">
                          {/* Timeline dot marker */}
                          <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-white transition-colors ${isInitial ? 'border-emerald-500 bg-emerald-550' : 'border-indigo-500'}`} />

                          <div className="bg-slate-50/50 border border-slate-150/60 rounded-xl p-3 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between gap-2 border-b border-dashed border-slate-150 pb-1.5 mb-2">
                              <span className="font-mono text-[9px] font-bold text-slate-400 uppercase">{formattedDate}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isInitial ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'}`}>
                                {isInitial 
                                  ? (language === 'ar' ? 'إنشاء سلعة' : 'Création') 
                                  : (language === 'ar' ? 'تعديل أسعار' : 'Modification')}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Purchase Price comparison */}
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'سعر الشراء' : "Prix d'achat"}</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {!isInitial && (
                                    <>
                                      <span className="font-mono text-[10.5px] text-slate-500 line-through">{formatCurrency(log.oldPurchasePrice)}</span>
                                      <span className="text-slate-400 font-bold">➔</span>
                                    </>
                                  )}
                                  <span className="font-mono text-xs font-bold text-slate-800">{formatCurrency(log.newPurchasePrice)}</span>
                                  {!isInitial && purchaseDiff !== 0 && (
                                    <span className={`text-[8.5px] font-bold ${purchaseDiff > 0 ? 'text-rose-600' : 'text-emerald-605'}`}>
                                      {purchaseDiff > 0 ? '▲' : '▼'} {Math.abs(purchasePct).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Selling Price comparison */}
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'سعر البيع' : "Prix de vente"}</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {!isInitial && (
                                    <>
                                      <span className="font-mono text-[10.5px] text-slate-505 line-through">{formatCurrency(log.oldSellingPrice)}</span>
                                      <span className="text-slate-400 font-bold">➔</span>
                                    </>
                                  )}
                                  <span className="font-sans text-xs font-extrabold text-slate-900">{formatCurrency(log.newSellingPrice)}</span>
                                  {!isInitial && sellDiff !== 0 && (
                                    <span className={`text-[8.5px] font-bold ${sellDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                      {sellDiff > 0 ? '▲' : '▼'} {Math.abs(sellPct).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setHistoryProduct(null)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition-all shadow-xs"
                >
                  {language === 'ar' ? 'إغلاق' : 'Fermer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
