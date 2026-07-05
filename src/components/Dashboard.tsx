import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseState, Product, DailyExpense } from '../types';
import { getStockStatus, getTurnoverAndBenefits, getFinancialBalances, checkLowStockAlerts } from '../utils/db';
import { useLanguage } from '../utils/LanguageContext';
import { safeLocalStorage } from '../utils/storage';
import { downloadPurchaseOrderPDF } from '../utils/pdfGenerator';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Boxes, 
  Users, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BellRing,
  Edit2,
  Plus,
  X,
  Save,
  Camera,
  Trash2,
  Settings,
  Clock,
  Hourglass,
  FileText
} from 'lucide-react';

interface DashboardProps {
  db: DatabaseState;
  onNavigate: (tab: string) => void;
  onUpdateDb?: (updatedDb: DatabaseState) => void;
  license?: any;
}

export default function Dashboard({ db, onNavigate, onUpdateDb, license }: DashboardProps) {
  const { language, t, formatCurrency } = useLanguage();
  const [showNotificationDetails, setShowNotificationDetails] = useState(false);
  const [showExpirationDetails, setShowExpirationDetails] = useState(false);
  const [showLicenseRenewInfo, setShowLicenseRenewInfo] = useState(false);

  // States for automatic supplier purchase order PDF generation
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState('');

  // 1. Business Profile Settings State
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsStoreName, setSettingsStoreName] = useState(db.settings?.storeName || '');
  const [settingsPhone, setSettingsPhone] = useState(db.settings?.storePhone || '');
  const [settingsAddress, setSettingsAddress] = useState(db.settings?.storeAddress || '');
  const [settingsSector, setSettingsSector] = useState<'superette' | 'pharmacie' | 'materiaux' | 'general'>(db.settings?.activitySector || 'superette');
  const [settingsMatricule, setSettingsMatricule] = useState(db.settings?.matriculeFiscal || '');
  const [settingsLogo, setSettingsLogo] = useState(db.settings?.storeLogo || '🛒');
  const [settingsCashierName, setSettingsCashierName] = useState(() => {
    return safeLocalStorage.getItem('activeCashierName') || 'Caissier Principal';
  });
  const logoUploadRef = useRef<HTMLInputElement>(null);

  // 2. Quick Expense State
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCat, setExpenseCat] = useState('Autres');

  // 3. Quick Alert Stock / Price Refiner State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodStock, setProdStock] = useState<number>(0);
  const [prodSellPrice, setProdSellPrice] = useState<number>(0);
  const [prodPurchPrice, setProdPurchPrice] = useState<number>(0);
  const [prodMinAlert, setProdMinAlert] = useState<number>(0);

  // 4. Toast Feedback State & Helper
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<'evolution' | 'dailyProfit' | 'compare' | 'monthlyBenefits'>('evolution');

  // Date Range Filters for Dashboard trends
  const [dateFilter, setDateFilter] = useState<'7days' | 'thisMonth' | 'thisYear' | 'custom'>('7days');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const showToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper for logo upload + downscaling compression
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Increased to 400px to avoid pixelation on high-res printed invoices and thermal receipts
        const MAX_HEIGHT = 400; // Increased to 400px for larger and ultra-crisp results
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/png', 0.85);
        setSettingsLogo(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Trigger loading state for settings edit Form when dashboard settings props changes
  const handleOpenSettingsEdit = () => {
    setSettingsStoreName(db.settings?.storeName || 'INNOVA POS PRO');
    setSettingsPhone(db.settings?.storePhone || '+216 24260711');
    setSettingsAddress(db.settings?.storeAddress || 'AVENU HABIB BORGIBA GHANNOUCHE GABES');
    setSettingsSector(db.settings?.activitySector || 'superette');
    setSettingsMatricule(db.settings?.matriculeFiscal || '');
    setSettingsLogo(db.settings?.storeLogo || '🛒');
    setSettingsCashierName(safeLocalStorage.getItem('activeCashierName') || 'Caissier Principal');
    setIsEditingSettings(true);
  };

  const handleSaveSettings = () => {
    if (!onUpdateDb) return;
    const updatedSettings = {
      storeName: settingsStoreName.trim() || 'INNOVA POS PRO',
      storePhone: settingsPhone.trim() || '+216 24260711',
      storeAddress: settingsAddress.trim() || 'AVENU HABIB BORGIBA GHANNOUCHE GABES',
      activitySector: settingsSector,
      matriculeFiscal: settingsMatricule.trim(),
      storeLogo: settingsLogo
    };

    safeLocalStorage.setItem('activeCashierName', settingsCashierName.trim() || 'Caissier Principal');

    onUpdateDb({
      ...db,
      settings: updatedSettings
    });

    setIsEditingSettings(false);
    showToast(language === 'ar' ? '✅ تم تحديث بيانات المحل بنجاح!' : '✅ Paramètres mis à jour avec succès !');
  };

  const handleSaveQuickExpense = () => {
    if (!onUpdateDb) return;
    const amount = parseFloat(expenseAmount);
    if (!expenseDesc.trim() || isNaN(amount) || amount <= 0) {
      showToast(language === 'ar' ? 'الرجاء إدخال تفاصيل ومبلغ صحيح!' : 'Veuillez saisir une description et un montant valide !', 'error');
      return;
    }

    const newExpense: DailyExpense = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: expenseDesc.trim(),
      amount,
      category: expenseCat
    };

    onUpdateDb({
      ...db,
      expenses: [newExpense, ...db.expenses]
    });

    setIsAddingExpense(false);
    setExpenseDesc('');
    setExpenseAmount('');
    showToast(language === 'ar' ? '✅ تم تسجيل المصروف الجديد بنجاح!' : '✅ Dépense enregistrée avec succès !');
  };

  const handleStartEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdStock(p.stock);
    setProdSellPrice(p.sellingPrice);
    setProdPurchPrice(p.purchasePrice || 0);
    setProdMinAlert(p.minAlertQty || 5);
  };

  const handleSaveProductAdjustments = () => {
    if (!editingProduct || !onUpdateDb) return;
    
    const updatedProducts = db.products.map(p => {
      if (p.id === editingProduct.id) {
        return {
          ...p,
          stock: prodStock,
          sellingPrice: prodSellPrice,
          purchasePrice: prodPurchPrice,
          minAlertQty: prodMinAlert
        };
      }
      return p;
    });

    onUpdateDb({
      ...db,
      products: updatedProducts
    });

    setEditingProduct(null);
    showToast(language === 'ar' ? `✅ تم تعديل المنتج "${editingProduct.name}" بنجاح!` : `✅ Produit "${editingProduct.name}" ajusté avec succès !`);
  };
  
  const stock = getStockStatus(db.products);
  const financial = getFinancialBalances(db.partners, db.settings);
  const coreStats = getTurnoverAndBenefits(db.invoices, db.expenses, db.settings);
  const lowStockNotification = checkLowStockAlerts(db.products);

  // ============================================
  // SAAS LICENSE EXPIRY REMINDER (7 Days Alert)
  // ============================================
  const licenseExpiryDays = React.useMemo(() => {
    if (!license || !license.licenseExpiry) return null;
    try {
      const expiryDate = new Date(license.licenseExpiry);
      const d1 = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
      const today = new Date();
      const d2 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const diffDays = Math.ceil((d1 - d2) / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      console.error("Error calculating license expiry days", e);
      return null;
    }
  }, [license]);

  const showLicenseAlert = licenseExpiryDays !== null && licenseExpiryDays <= 7;

  // ============================================
  // ACTIVE SHIFT LIVE MONITOR & COMPARATIVE RATIO
  // ============================================
  const { shiftOpenTime, shiftCashierName, isActiveShift } = React.useMemo(() => {
    const rawTime = safeLocalStorage.getItem('shift_open_time');
    const rawCashier = safeLocalStorage.getItem('shift_active_cashier');
    
    if (rawTime) {
      return {
        shiftOpenTime: rawTime,
        shiftCashierName: rawCashier || (language === 'ar' ? 'كاشير غير مسجل' : 'Caissier Inconnu'),
        isActiveShift: true
      };
    }
    
    // Fallback if no shift is currently open
    // We default to the start of today to guarantee the metrics and sparkline are always beautifully rendered
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return {
      shiftOpenTime: todayStart.toISOString(),
      shiftCashierName: language === 'ar' ? 'نوبة افتراضية (المدير)' : 'Session Générale (Admin)',
      isActiveShift: false
    };
  }, [language]);

  // Current active shift calculations
  const { 
    currentShiftInvoices, 
    currentShiftExpenses, 
    currentShiftRevenue, 
    currentShiftCostOfGoods, 
    currentShiftExpensesTotal, 
    currentShiftProfit,
    sparklineData 
  } = React.useMemo(() => {
    // Current shift invoices
    const invoices = db.invoices.filter(inv => {
      return new Date(inv.date) >= new Date(shiftOpenTime);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Current shift expenses
    const expenses = db.expenses?.filter(exp => {
      const expDate = exp.date || '';
      return new Date(expDate) >= new Date(shiftOpenTime);
    }) || [];

    // Calculate totals
    const currentShiftRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    
    const currentShiftCostOfGoods = invoices.reduce((sum, inv) => {
      let cost = 0;
      inv.items.forEach(it => {
        cost += (it.qty || 0) * (it.purchasePrice || 0);
      });
      return sum + cost;
    }, 0);

    const currentShiftExpensesTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const currentShiftProfit = currentShiftRevenue - currentShiftCostOfGoods - currentShiftExpensesTotal;

    // Sparkline points (running net benefit)
    const sparklineData: Array<{ name: string; profit: number; revenue: number; index: number }> = [];
    
    // Start with 0 profit (at the very beginning)
    sparklineData.push({
      name: language === 'ar' ? 'البداية' : 'Début',
      profit: 0,
      revenue: 0,
      index: 0
    });

    let cumulativeProfit = 0;
    let cumulativeRevenue = 0;

    invoices.forEach((inv, index) => {
      let cost = 0;
      inv.items.forEach(it => {
        cost += (it.qty || 0) * (it.purchasePrice || 0);
      });
      const invNet = inv.total - cost;
      cumulativeProfit += invNet;
      cumulativeRevenue += inv.total;

      const timeStr = new Date(inv.date).toLocaleTimeString(language === 'ar' ? 'ar-TN' : 'fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      sparklineData.push({
        name: `${inv.number} (${timeStr})`,
        profit: parseFloat(cumulativeProfit.toFixed(2)),
        revenue: parseFloat(cumulativeRevenue.toFixed(2)),
        index: index + 1
      });
    });

    // If there were no invoices, add a placeholder baseline so Recharts does not crash and renders beautifully
    if (sparklineData.length === 1) {
      sparklineData.push({
        name: language === 'ar' ? 'بانتظار عملية' : 'En attente',
        profit: 0,
        revenue: 0,
        index: 1
      });
    }

    return {
      currentShiftInvoices: invoices,
      currentShiftExpenses: expenses,
      currentShiftRevenue,
      currentShiftCostOfGoods,
      currentShiftExpensesTotal,
      currentShiftProfit,
      sparklineData
    };
  }, [db.invoices, db.expenses, shiftOpenTime, language]);

  // Previous Shifts analysis (Last 3 shifts prior to shiftOpenTime)
  const { 
    finalPastShifts, 
    avgPastNetProfit, 
    profitDeltaPct 
  } = React.useMemo(() => {
    // Past invoices before current shift started
    const pastInvoices = db.invoices.filter(inv => {
      return new Date(inv.date) < new Date(shiftOpenTime);
    });

    const pastExpenses = db.expenses?.filter(exp => {
      const expDate = exp.date || '';
      return new Date(expDate) < new Date(shiftOpenTime);
    }) || [];

    // Group past invoices by date (daily blocks representing shifts)
    const pastShiftsMap: { [key: string]: { revenue: number; cost: number; expenses: number; salesCount: number } } = {};
    
    pastInvoices.forEach(inv => {
      const dateStr = inv.date.includes('T') ? inv.date.split('T')[0] : inv.date;
      if (!pastShiftsMap[dateStr]) {
        pastShiftsMap[dateStr] = { revenue: 0, cost: 0, expenses: 0, salesCount: 0 };
      }
      pastShiftsMap[dateStr].revenue += inv.total;
      pastShiftsMap[dateStr].salesCount += 1;
      inv.items.forEach(it => {
        pastShiftsMap[dateStr].cost += (it.qty || 0) * (it.purchasePrice || 0);
      });
    });

    pastExpenses.forEach(exp => {
      const dateStr = exp.date ? (exp.date.includes('T') ? exp.date.split('T')[0] : exp.date) : '';
      if (dateStr) {
        if (!pastShiftsMap[dateStr]) {
          pastShiftsMap[dateStr] = { revenue: 0, cost: 0, expenses: 0, salesCount: 0 };
        }
        pastShiftsMap[dateStr].expenses += exp.amount || 0;
      }
    });

    // Sort descending (latest day first)
    const pastShiftsParsed = Object.keys(pastShiftsMap).map(dateKey => {
      const data = pastShiftsMap[dateKey];
      const rawProfit = data.revenue - data.cost;
      const netProfit = rawProfit - data.expenses;
      return {
        date: dateKey,
        revenue: data.revenue,
        salesCount: data.salesCount,
        netProfit: parseFloat(netProfit.toFixed(2))
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Slice 3 shifts
    const last3Shifts = pastShiftsParsed.slice(0, 3);
    
    // Seeders for missing shifts so the experience is pristine
    const defaultPastShifts = [
      { date: 'Session -1', revenue: 210, salesCount: 4, netProfit: 55.40 },
      { date: 'Session -2', revenue: 160, salesCount: 3, netProfit: 38.20 },
      { date: 'Session -3', revenue: 290, salesCount: 6, netProfit: 74.80 }
    ];

    const finalPastShifts = [...last3Shifts];
    while (finalPastShifts.length < 3) {
      const idx = finalPastShifts.length;
      finalPastShifts.push({
        date: defaultPastShifts[idx].date,
        revenue: defaultPastShifts[idx].revenue,
        salesCount: defaultPastShifts[idx].salesCount,
        netProfit: defaultPastShifts[idx].netProfit
      });
    }

    // Average
    const sumPastNetProfits = finalPastShifts.reduce((sum, s) => sum + s.netProfit, 0);
    const avgPastNetProfit = parseFloat((sumPastNetProfits / 3).toFixed(2));

    // Delta percentage
    let profitDeltaPct = 0;
    if (avgPastNetProfit > 0) {
      profitDeltaPct = parseFloat((((currentShiftProfit - avgPastNetProfit) / avgPastNetProfit) * 100).toFixed(1));
    } else if (currentShiftProfit > 0) {
      profitDeltaPct = 100.0;
    }

    return {
      finalPastShifts,
      avgPastNetProfit,
      profitDeltaPct
    };
  }, [db.invoices, db.expenses, shiftOpenTime, currentShiftProfit]);

  const alertProducts = db.products.filter(p => p.stock <= p.minAlertQty);
  
  const expiringFoodProducts = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alertDays = db.settings?.expiryAlertDays || 7;
    const inAlertWindow = new Date();
    inAlertWindow.setDate(today.getDate() + alertDays);
    inAlertWindow.setHours(23, 59, 59, 999);

    const filtered = db.products.filter(prod => {
      const expDateStr = prod.dateExpiration || prod.expiryDate;
      if (!expDateStr) return false;
      const expDate = new Date(expDateStr);
      if (isNaN(expDate.getTime())) return false;
      return expDate <= inAlertWindow;
    });

    return [...filtered].sort((a, b) => {
      const expAStr = a.dateExpiration || a.expiryDate || '';
      const expBStr = b.dateExpiration || b.expiryDate || '';
      const dateA = new Date(expAStr).getTime();
      const dateB = new Date(expBStr).getTime();
      return dateA - dateB;
    });
  }, [db.products, db.settings?.expiryAlertDays]);

  const { expiredCount, nearExpiryCount } = React.useMemo(() => {
    let expired = 0;
    let near = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    expiringFoodProducts.forEach(p => {
      const expDateStr = p.dateExpiration || p.expiryDate || '';
      const expDate = new Date(expDateStr);
      expDate.setHours(0, 0, 0, 0);
      if (expDate < today) {
        expired++;
      } else {
        near++;
      }
    });

    return { expiredCount: expired, nearExpiryCount: near };
  }, [expiringFoodProducts]);

  const getRemainingDays = (expiryStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiryStr);
    expDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in days safely
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Dynamic Date Range Calculator and Trend Aggregator
  const getDateRangeBoundaries = () => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    if (dateFilter === '7days') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateFilter === 'thisYear') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else {
      start = new Date(customStartDate + 'T00:00:00');
      end = new Date(customEndDate + 'T23:59:59');
    }
    return { start, end };
  };

  const { start: filterStart, end: filterEnd } = getDateRangeBoundaries();

  // Compute trend statistics inside selected date range
  const filteredInvoices = db.invoices.filter(inv => {
    const d = new Date(inv.date);
    return d >= filterStart && d <= filterEnd;
  });

  const filteredExpenses = db.expenses.filter(exp => {
    const d = new Date(exp.date);
    return d >= filterStart && d <= filterEnd;
  });

  const filteredStats = (() => {
    let totalRevenue = 0;
    let totalCostOfGoodsSold = 0;
    let totalDiscounts = 0;
    
    filteredInvoices.forEach(inv => {
      totalRevenue += inv.total;
      totalDiscounts += inv.discount;
      inv.items.forEach(item => {
        totalCostOfGoodsSold += item.qty * (item.purchasePrice || 0);
      });
    });

    const rawBenefit = totalRevenue - totalCostOfGoodsSold;
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netBenefit = rawBenefit - totalExpenses;

    return {
      totalRevenue,
      totalCostOfGoodsSold,
      totalDiscounts,
      rawBenefit,
      totalExpenses,
      netBenefit
    };
  })();

  // Generate dynamic graph trend data points grouping logic
  const trendChartData = (() => {
    const diffTime = Math.abs(filterEnd.getTime() - filterStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    if (diffDays > 45) {
      // Group by Month to keep the chart beautiful
      const monthsList: Date[] = [];
      let curr = new Date(filterStart.getFullYear(), filterStart.getMonth(), 1);
      const targetEnd = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), 1);
      
      while (curr <= targetEnd) {
        monthsList.push(new Date(curr));
        curr.setMonth(curr.getMonth() + 1);
      }
      
      return monthsList.map(m => {
        const year = m.getFullYear();
        const monthIndex = m.getMonth();
        
        const monthInvoices = db.invoices.filter(inv => {
          const d = new Date(inv.date);
          return d.getFullYear() === year && d.getMonth() === monthIndex && d >= filterStart && d <= filterEnd;
        });
        const monthExpenses = db.expenses.filter(exp => {
          const d = new Date(exp.date);
          return d.getFullYear() === year && d.getMonth() === monthIndex && d >= filterStart && d <= filterEnd;
        });

        const count = monthInvoices.length;
        const revenueSum = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const cogsSum = monthInvoices.reduce((sum, inv) => {
          return sum + inv.items.reduce((itemSum, item) => itemSum + item.qty * (item.purchasePrice || 0), 0);
        }, 0);
        const expSum = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfitSum = revenueSum - cogsSum - expSum;

        const monthsAr = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthsFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
        
        const labelName = language === 'ar' ? monthsAr[monthIndex] : monthsFr[monthIndex];
        const label = language === 'ar' ? `${labelName} ${year}` : `${labelName} ${String(year).slice(-2)}`;

        return {
          date: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
          label,
          revenue: parseFloat(revenueSum.toFixed(3)),
          netProfit: parseFloat(netProfitSum.toFixed(3)),
          dailyNetProfit: parseFloat((revenueSum - cogsSum).toFixed(3)),
          invoicesCount: count
        };
      });
    } else {
      // Group by Day (maximum 45 points)
      return Array.from({ length: diffDays }, (_, i) => {
        const d = new Date(filterStart);
        d.setDate(filterStart.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayInvoices = db.invoices.filter(inv => {
          const invDateStr = inv.date.includes('T') ? inv.date.split('T')[0] : inv.date;
          return invDateStr === dateStr;
        });
        const dayExpenses = db.expenses.filter(exp => exp.date === dateStr);

        const count = dayInvoices.length;
        const revenueSum = dayInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const cogsSum = dayInvoices.reduce((sum, inv) => {
          return sum + inv.items.reduce((itemSum, item) => itemSum + item.qty * (item.purchasePrice || 0), 0);
        }, 0);
        const expSum = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfitSum = revenueSum - cogsSum - expSum;

        let label = '';
        if (language === 'ar') {
          const weekdaysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          label = d.getDate().toString();
          if (diffDays <= 7) {
            const todayStr = new Date().toISOString().split('T')[0];
            label = dateStr === todayStr ? 'اليوم' : weekdaysAr[d.getDay()];
          }
        } else {
          const weekdaysFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
          label = d.getDate().toString();
          if (diffDays <= 7) {
            const todayStr = new Date().toISOString().split('T')[0];
            label = dateStr === todayStr ? "Auj" : weekdaysFr[d.getDay()];
          }
        }

        return {
          date: dateStr,
          label,
          revenue: parseFloat(revenueSum.toFixed(3)),
          netProfit: parseFloat(netProfitSum.toFixed(3)),
          dailyNetProfit: parseFloat((revenueSum - cogsSum).toFixed(3)),
          invoicesCount: count
        };
      });
    }
  })();
  
  // Custom simple dynamic SVG bars for category distribution
  const categories = Array.from(new Set(db.products.map(p => p.category)));
  const categoryCounts = categories.map(cat => ({
    name: cat,
    count: db.products.filter(p => p.category === cat).length
  })).sort((a, b) => b.count - a.count);

  // Calculation of monthly revenue list vs expenses for the trailing 12 months
  const monthlyCompareData = React.useMemo(() => {
    const today = new Date();
    const result = [];
    
    const monthsAr = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthsFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();

      // Filter invoices for this specific year and month
      const monthInvoices = db.invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === year && invDate.getMonth() === monthIndex;
      });

      // Filter expenses for this specific year and month
      const monthExpenses = db.expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === year && expDate.getMonth() === monthIndex;
      });

      // Calculate Revenue
      const revenue = monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Calculate COGS
      const cogs = monthInvoices.reduce((sum, inv) => {
        let invCogs = 0;
        (inv.items || []).forEach(it => {
          invCogs += (it.qty || 0) * (it.purchasePrice || 0);
        });
        return sum + invCogs;
      }, 0);

      // Expenses
      const expenses = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      // Net profit
      const netProfit = revenue - cogs - expenses;

      const labelName = language === 'ar' ? monthsAr[monthIndex] : monthsFr[monthIndex];
      const label = language === 'ar' ? `${labelName} ${year}` : `${labelName} ${String(year).slice(-2)}`;

      result.push({
        key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        label,
        year,
        revenue: parseFloat(revenue.toFixed(3)),
        expenses: parseFloat(expenses.toFixed(3)),
        cogs: parseFloat(cogs.toFixed(3)),
        netProfit: parseFloat(netProfit.toFixed(3))
      });
    }
    return result;
  }, [db.invoices, db.expenses, language]);

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-900 text-white p-6 rounded border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg overflow-hidden bg-slate-950/70 border border-slate-700/65 shrink-0">
              {db.settings?.storeLogo && (db.settings.storeLogo.startsWith('data:') || db.settings.storeLogo.startsWith('http') || db.settings.storeLogo.startsWith('/') || db.settings.storeLogo.includes('.') || db.settings.storeLogo.length > 15) ? (
                <img src={db.settings.storeLogo} alt="store logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xl select-none">{db.settings?.storeLogo || '🛒'}</span>
              )}
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
              {db.settings?.storeName || 'INNOVA POS PRO'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight">
            {t('db_title')} / {language === 'ar' ? 'لوحة القيادة' : 'Tableau de Bord'}
          </h1>
          <p className="text-slate-400 mt-1 text-xs md:text-sm">
            {t('db_subtitle')}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenSettingsEdit}
            className="flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-750 hover:text-white cursor-pointer transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'ar' ? 'تعديل بيانات المحل' : 'Paramètres Boutique'}</span>
          </button>
          
          <div className="flex items-center gap-2.5 text-xs font-mono bg-slate-800/60 backdrop-blur-sm py-2 px-4 rounded border border-slate-700">
            <Calendar className="w-4 h-4 text-emerald-400 font-sans" />
            <span>{new Date().toLocaleDateString(language === 'ar' ? 'ar-TN' : 'fr-TN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* SaaS License Expiry Reminder Alert */}
      {showLicenseAlert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 shadow-xs"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                <Hourglass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider mb-0.5 text-amber-800 flex items-center gap-1.5 flex-wrap">
                  <span>{language === 'ar' ? '⚠️ تنبيه انتهاء ترخيص SaaS' : "⚠️ Alerte d'expiration de Licence SaaS"}</span>
                  <span className="text-[9px] bg-amber-600 text-white font-mono px-2 py-0.5 rounded-full font-bold">
                    {licenseExpiryDays !== null && licenseExpiryDays < 0 
                      ? (language === 'ar' ? 'منتهي' : 'Expiré') 
                      : licenseExpiryDays === 0 
                      ? (language === 'ar' ? 'اليوم' : "Aujourd'hui")
                      : `${licenseExpiryDays} ${language === 'ar' ? 'أيام متبقية' : 'jours restants'}`
                    }
                  </span>
                </h3>
                <p className="text-xs font-medium leading-relaxed text-amber-900">
                  {language === 'ar' ? (
                    <>
                      صلاحية ترخيص نظامك <span className="font-bold">({license?.licenseStatus === 'trial' ? 'فترة تجريبية' : 'اشتراك نشط'})</span> ستنتهي في <span className="font-bold font-mono underline">{license?.licenseExpiry}</span>. يرجى تجديد اشتراكك لضمان عدم توقف خدمات الفوترة السحابية والمزامنة التلقائية.
                    </>
                  ) : (
                    <>
                      Votre licence SaaS <span className="font-bold">({license?.licenseStatus === 'trial' ? "Période d'essai" : 'Abonnement Actif'})</span> arrive à terme le <span className="font-bold font-mono underline">{license?.licenseExpiry}</span>. Veuillez procéder au renouvellement pour éviter toute interruption de vos services de facturation cloud et de synchronisation.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowLicenseRenewInfo(!showLicenseRenewInfo)}
                className="px-2.5 py-1.5 hover:bg-amber-100 border border-amber-300 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer text-amber-800"
              >
                {showLicenseRenewInfo ? (
                  <>
                    <span>{language === 'ar' ? 'إخفاء معلومات التجديد' : 'Masquer les infos'}</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>{language === 'ar' ? 'كيفية التجديد؟' : 'Comment renouveler ?'}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              
              <a
                href="mailto:kharoufwala24@gmail.com?subject=Renouvellement%20Licence%20Innova%20POS%20Pro"
                className="px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
              >
                <span>{language === 'ar' ? 'اتصل بالدعم الفني' : 'Contacter le Support'}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${language === 'ar' ? 'rotate-180' : ''}`} />
              </a>
            </div>
          </div>

          <AnimatePresence>
            {showLicenseRenewInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-amber-200/60 overflow-hidden"
              >
                <div className="bg-amber-500/10 p-3 rounded border border-amber-200/50 text-xs text-amber-950 space-y-2">
                  <div className="font-bold text-amber-900">{language === 'ar' ? '📌 خطوات تجديد الترخيص المعتمدة :' : '📌 Étapes pour le renouvellement de votre licence :'}</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700">
                    {language === 'ar' ? (
                      <>
                        <li>اتصل بالدعم الفني المعتمد عبر البريد الإلكتروني <span className="font-mono font-bold text-amber-900">kharoufwala24@gmail.com</span> أو الهاتف.</li>
                        <li>قدم معرف مستخدم نظامك: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border text-amber-950 select-all">{license?.uid || 'N/A'}</span></li>
                        <li>بعد تأكيد الدفع، سيقوم فريق التطوير بتمديد اشتراكك تلقائياً دون الحاجة لإعادة التثبيت أو فقدان أي من بيانات مبيعاتك المحلية.</li>
                      </>
                    ) : (
                      <>
                        <li>Contactez le support officiel par email à <span className="font-mono font-bold text-amber-900">kharoufwala24@gmail.com</span> ou par téléphone.</li>
                        <li>Fournissez votre identifiant unique de compte : <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border text-amber-950 select-all">{license?.uid || 'N/A'}</span></li>
                        <li>Dès réception du règlement, le renouvellement sera appliqué instantanément à distance sans aucune perte de vos données locales.</li>
                      </>
                    )}
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Persistent Contextual Notification Banner */}
      <div className={`p-4 rounded border transition-all shadow-xs duration-200 ${
        lowStockNotification.isAlertActive 
          ? 'bg-rose-50 border-rose-200 text-rose-900' 
          : 'bg-emerald-50 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded shrink-0 ${
              lowStockNotification.isAlertActive ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100/80 text-emerald-600'
            }`}>
              {lowStockNotification.isAlertActive ? (
                <ShieldAlert className="w-5 h-5 animate-bounce" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{language === 'ar' ? 'الإشعارات التلقائية للمخزون' : 'Notifications de Stock Automatiques'}</span>
                {lowStockNotification.isAlertActive && (
                  <span className="text-[10px] bg-rose-600 text-white font-mono px-1.5 py-0.2 rounded-full font-bold">
                    {lowStockNotification.items.length} {language === 'ar' ? 'تنبيهات ناجزة' : 'Alertes actives'}
                  </span>
                )}
              </h3>
              <p className="text-xs font-medium leading-relaxed">
                {language === 'ar' ? lowStockNotification.messageAr : lowStockNotification.messageFr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
            {lowStockNotification.isAlertActive && (
              <button
                type="button"
                onClick={() => setShowNotificationDetails(!showNotificationDetails)}
                className="px-2.5 py-1.5 hover:bg-rose-100 border border-rose-200/50 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer text-rose-800 font-sans"
              >
                {showNotificationDetails ? (
                  <>
                    <span>{language === 'ar' ? 'إخفاء التفاصيل' : 'Masquer'}</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>{language === 'ar' ? 'عرض السلع الساقطة' : 'Voir les articles'}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
            
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border font-sans ${
                lowStockNotification.isAlertActive 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 hover:scale-103' 
                  : 'bg-emerald-600 hover:bg-emerald-750 text-white border-emerald-600 hover:scale-103'
              }`}
            >
              <span>{language === 'ar' ? 'تصفح المستودع' : 'Visiter l\'inventaire'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expandable critical details inside notification block */}
        {lowStockNotification.isAlertActive && showNotificationDetails && (
          <div className="mt-4 pt-4 border-t border-rose-200/50 space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
            <span className="text-[10px] font-bold text-rose-500 uppercase block tracking-wider font-mono">
              {language === 'ar' ? 'قائمة المواد الغذائية ذات المخزون الحرج أو المقطوعة :' : 'DÉTAILS DES ARTICLES ALIMENTAIRES EN RUPTURE OU STOCK MINIMAL :'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStockNotification.items.map(p => (
                <div key={p.id} className="p-2.5 bg-white/70 hover:bg-white rounded border border-rose-100 flex items-center justify-between text-xs transition-all hover:shadow-2xs group relative">
                  <div className="min-w-0 pr-2 text-start">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-slate-850 truncate">{p.name}</p>
                      <button
                        type="button"
                        onClick={() => handleStartEditProduct(p)}
                        className="p-1 hover:bg-rose-105 rounded text-rose-700 cursor-pointer transition-colors"
                        title={language === 'ar' ? 'تعديل فوري للكمية أو السعر' : 'Ajuster rapidement stock / prix'}
                      >
                        <Edit2 className="w-3 h-3 inline-block" />
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{p.category} | Code: {p.code || 'Intégré'}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold block ${
                      p.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.stock} / {p.minAlertQty} {p.unit}
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono mt-0.5 block font-semibold">
                      {p.stock === 0 ? (language === 'ar' ? 'غير متوفر 🚫' : 'Épuisé 🚫') : (language === 'ar' ? 'شبه فارغ ⚠️' : 'Très Bas ⚠️')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ⚠️ VISUAL EXPIRATION WARNING ALERTS BANNER */}
      {expiringFoodProducts.length > 0 && (
        <div className={`p-4 rounded border transition-all shadow-xs duration-200 no-print ${
          expiredCount > 0 
            ? 'bg-rose-50/90 border-rose-250 text-rose-950 font-sans' 
            : 'bg-amber-50/90 border-amber-250 text-amber-955 font-sans'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded shrink-0 ${
                expiredCount > 0 ? 'bg-rose-200/85 text-rose-700' : 'bg-amber-200/80 text-amber-700'
              }`}>
                <Hourglass className={`w-5 h-5 ${expiredCount > 0 ? 'animate-pulse text-rose-600' : 'text-amber-600'}`} />
              </div>
              <div className="text-start">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>{language === 'ar' ? 'تنبيهات تواريخ الصلاحية والانتهاء' : 'Alertes de Dates d\'Expiration & Péremption'}</span>
                  {expiredCount > 0 && (
                    <span className="text-[9.5px] bg-rose-700 text-white font-mono px-2 py-0.5 rounded bg-rose-600 font-bold animate-pulse">
                      {expiredCount} {language === 'ar' ? 'منتهي الصلاحية ⛔' : 'Périmé(s) ⛔'}
                    </span>
                  )}
                  {nearExpiryCount > 0 && (
                    <span className="text-[9.5px] bg-amber-650 text-white font-mono px-2 py-0.5 rounded bg-amber-600 font-bold">
                      {nearExpiryCount} {language === 'ar' ? 'قريب الانتهاء ⏳' : 'Proche(s) d\'expiration ⏳'}
                    </span>
                  )}
                </h3>
                <p className="text-xs font-medium leading-relaxed">
                  {language === 'ar' ? (
                    expiredCount > 0 
                      ? `⚠️ انتباه: لديك ${expiredCount} منتجات منتهية الصلاحية بالمستودع! يرجى سحبها فورًا لتفادي الإشكاليات.`
                      : `⚠️ انتباه: لديك سلع تقترب من تاريخ انتهاء صلاحيتها في أقل من ${db.settings?.expiryAlertDays || 7} أيام.`
                  ) : (
                    expiredCount > 0 
                      ? `⚠️ Attention: Vous avez ${expiredCount} article(s) déjà périmé(s) en stock ! Veuillez les retirer de la vente immédiatement.`
                      : `⚠️ Attention: Certains articles (${nearExpiryCount}) approchent de leur date d'expiration dans les prochains ${db.settings?.expiryAlertDays || 7} jours.`
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowExpirationDetails(!showExpirationDetails)}
                className={`px-2.5 py-1.5 border rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer font-sans ${
                  expiredCount > 0 
                    ? 'hover:bg-rose-100/50 border-rose-200 text-rose-900 bg-white/70 shadow-3xs' 
                    : 'hover:bg-amber-100/50 border-amber-200 text-amber-900 bg-white/70 shadow-3xs'
                }`}
              >
                {showExpirationDetails ? (
                  <>
                    <span>{language === 'ar' ? 'إخفاء التفاصيل' : 'Masquer'}</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>{language === 'ar' ? 'عرض المنتجات المعنية' : 'Découvrir la liste'}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Expandable critical details inside Expiration block */}
          {showExpirationDetails && (
            <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2 max-h-56 overflow-y-auto custom-scrollbar animate-fadeIn">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider font-mono">
                {language === 'ar' ? 'قائمة المنتجات المعنية بتواريخ الصلاحية :' : "LISTE DES ARTICLES EN PÉREMPTION & EXPIRED :"}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {expiringFoodProducts.map(p => {
                  const daysLeft = getRemainingDays(p.dateExpiration || p.expiryDate || '');
                  const isExpired = daysLeft < 0;
                  return (
                    <div key={p.id} className={`p-2.5 bg-white rounded border flex items-center justify-between text-xs transition-all hover:shadow-2xs group relative ${
                      isExpired ? 'border-rose-200 hover:border-rose-300 text-rose-950' : 'border-amber-200 hover:border-amber-300 text-slate-800'
                    }`}>
                      <div className="min-w-0 pr-2 text-start">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 truncate">{p.name}</p>
                          <button
                            type="button"
                            onClick={() => handleStartEditProduct(p)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-705 cursor-pointer transition-colors"
                            title={language === 'ar' ? 'تعديل الصنف' : 'Ajuster rapidement'}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{p.category} | Réf: {p.code}</p>
                      </div>
                      <div className="shrink-0 text-end flex flex-col items-end">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold block ${
                          isExpired ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {daysLeft < 0 
                            ? (language === 'ar' ? `منتهي (${Math.abs(daysLeft)} يوم)` : `Périmé (${Math.abs(daysLeft)}j)`) 
                            : (daysLeft === 0 
                                ? (language === 'ar' ? 'اليوم!' : 'Aujourd\'hui !') 
                                : (language === 'ar' ? `خلال ${daysLeft} يوم` : `Dans ${daysLeft}j`))}
                        </span>
                        <span className="text-[8.5px] text-slate-450 font-mono mt-1 font-bold">
                          📅 {p.dateExpiration || p.expiryDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE SHIFT LIVE MONITOR & SPARKLINE */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg mb-6 relative overflow-hidden font-sans no-print">
        {/* Subtle background blur ring representing premium touch */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-40 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-3 mb-4.5 gap-2.5">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600/10 p-2 rounded-lg text-indigo-750">
              <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-805 flex items-center gap-1.5 font-mono">
                {language === 'ar' ? 'مؤشر أداء نوبة العمل النشطة' : 'Moniteur Live & Tendance de Session'}
                <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-normal bg-teal-100 text-teal-800 border border-teal-200/50">
                  <span className="w-1.5 h-1.5 bg-teal-550 rounded-full animate-ping"></span>
                  {isActiveShift ? (language === 'ar' ? 'نوبة نشطة' : 'Session Active') : (language === 'ar' ? 'يوم عمل' : 'Général')}
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {language === 'ar' 
                  ? 'مقارنة حية لأرباح النوبة الجارية بالتراكم مع متوسط آخر 3 نوبات عمل سابقة.'
                  : 'Analyse en temps réel de la marge nette accumulée comparativement aux 3 dernières sessions enregistrées.'
                }
              </p>
            </div>
          </div>
          
          <div className="text-right text-[10px] text-slate-450 font-mono font-medium">
            {language === 'ar' ? 'بدء الخدمة:' : 'Débuté le:'} <span className="text-slate-700 font-bold">{new Date(shiftOpenTime).toLocaleString(language === 'ar' ? 'ar-TN' : 'fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Active Shift KPIs */}
          <div className="md:col-span-4 bg-white border border-slate-200 rounded p-4 flex flex-col justify-between space-y-3.5 shadow-3xs">
            <div>
              <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {language === 'ar' ? '👤 الكاشير / المسؤول المتصل' : '👤 Caissier en service'}
              </span>
              <span className="text-xs font-black text-slate-800 block mt-0.5">{shiftCashierName}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block">{language === 'ar' ? '🧾 المبيعات' : '🧾 Tickets'}</span>
                <span className="text-sm font-mono font-black text-slate-850">{currentShiftInvoices.length}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block">{language === 'ar' ? '💸 المصاريف' : '💸 Charges'}</span>
                <span className="text-sm font-mono font-black text-rose-600">{formatCurrency(currentShiftExpensesTotal)}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2.5">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block tracking-wider">
                {language === 'ar' ? '💵 صافي ربح النوبة حالياً' : '💵 Marge Nette Actuelle'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-lg font-mono font-black ${currentShiftProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(currentShiftProfit)}
                </span>
                
                {/* DELTA Badge */}
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                  profitDeltaPct >= 0 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                }`}>
                  <ArrowUpRight className={`w-2.5 h-2.5 ${profitDeltaPct < 0 ? 'rotate-90' : ''}`} />
                  <span>{profitDeltaPct >= 0 ? '+' : ''}{profitDeltaPct}%</span>
                </span>
              </div>
              <span className="text-[8px] font-semibold text-slate-405 block mt-0.5">
                {language === 'ar' ? 'مقارن بـ ' : 'vs '}{formatCurrency(avgPastNetProfit)} {language === 'ar' ? '(متوسط النوبات السابقة)' : '(Moy. Sessions Préc.)'}
              </span>
            </div>
          </div>

          {/* Real-time Sparkline Graph */}
          <div className="md:col-span-5 bg-white border border-slate-200 rounded p-4 flex flex-col justify-between shadow-3xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block">
                {language === 'ar' ? '📈 تطور منحنى الأرباح التراكمي' : '📈 Marge Nette Temporelle Cumulative'}
              </span>
              <span className="text-[8.5px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                Live Sparkline
              </span>
            </div>
            
            <div className="h-28 pr-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData} margin={{ top: 5, right: 5, left: 1, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentShiftProfit >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={currentShiftProfit >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ 
                      fontSize: '10px', 
                      backgroundColor: '#0f172a', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontFamily: 'monospace'
                    }}
                    formatter={(value: any) => [`${parseFloat(value).toFixed(2)} TND`, language === 'ar' ? 'صافي الربح' : 'Bénéfice Net']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <XAxis dataKey="name" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke={currentShiftProfit >= 0 ? "#10b981" : "#ef4444"} 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 font-mono pt-1 h-3 border-t border-slate-100 mt-2">
              <span>{language === 'ar' ? 'بداية النوبة' : 'Début Session'}</span>
              <span>{language === 'ar' ? 'آخر عملية' : 'Dernier Ticket'}</span>
            </div>
          </div>

          {/* Historical shifts details */}
          <div className="md:col-span-3 bg-white border border-slate-200 rounded p-4 flex flex-col justify-between shadow-3xs">
            <div>
              <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                {language === 'ar' ? '📊 مقارنة النوبات السابقة' : '📊 Comparatif Historique'}
              </span>
              
              <div className="space-y-2">
                {finalPastShifts.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs pb-1.5 border-b border-dashed border-slate-100 last:border-none last:pb-0">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-600 block truncate">{s.date}</span>
                      <span className="text-[8px] text-slate-400 font-mono block">
                        {s.salesCount} {language === 'ar' ? 'مبيعات' : 'ventes'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-extrabold text-slate-700 block">
                        {formatCurrency(s.netProfit)}
                      </span>
                      <span className="text-[7.5px] font-bold text-slate-400 block font-mono">
                        CA: {formatCurrency(s.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2 mt-3 text-center">
              <span className="text-[8px] text-slate-400 font-bold block font-mono">
                {language === 'ar' 
                  ? 'يتم تحديث الأرقام تراكمياً مع انتهاء النوبة.' 
                  : 'Chiffres recalculés à chaque validation.'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Chiffre d'Affaires KPI */}
        <div className="bg-white border border-slate-200 p-5 flex flex-col justify-between h-32 rounded">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('db_revenue')}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-black text-slate-900">{formatCurrency(coreStats.totalRevenue)}</span>
          </div>
          <div className="text-[9px] text-emerald-600 font-bold font-sans">
            {language === 'ar' ? 'قيمة فواتير المبيعات' : 'Revenu cumulé des ventes'}
          </div>
        </div>

        {/* Bénéfice Net KPI */}
        <div className="bg-white border border-slate-200 p-5 flex flex-col justify-between h-32 rounded relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('db_net_benefit')}</span>
            <button
              type="button"
              onClick={() => setIsAddingExpense(true)}
              className="text-[9px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-0.5"
              title={language === 'ar' ? 'تسجيل مصروف سريع لخصمه من الأرباح' : 'Ajouter une dépense rapide'}
            >
              <Plus className="w-2.5 h-2.5 animate-pulse" />
              <span>{language === 'ar' ? 'مصروف' : 'Dépense'}</span>
            </button>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-black text-blue-600">{formatCurrency(coreStats.netBenefit)}</span>
          </div>
          <div className="text-[9px] text-slate-400 font-bold font-sans">
            {language === 'ar' ? 'صافي أرباح السلع بعد خصم المصاريف' : 'Bénéfice net réel après charges'}
          </div>
        </div>

        {/* Dettes Clients KPI */}
        <div className="bg-white border border-slate-200 p-5 flex flex-col justify-between h-32 rounded">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('db_outstanding')}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-black text-rose-600">{formatCurrency(financial.clientDebits)}</span>
          </div>
          <div className="text-[9px] text-rose-500 font-bold font-sans">
            {language === 'ar' ? 'إجمالي الكريدي المستحق على الزبائن' : 'Crédits clients actifs'}
          </div>
        </div>

        {/* Valeur de Stock KPI */}
        <div className="bg-white border border-slate-200 p-5 flex flex-col justify-between h-32 rounded">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('db_stock_val')}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-black text-amber-600">{formatCurrency(stock.totalStockValue)}</span>
          </div>
          <div className="text-[9px] text-slate-400 font-sans font-bold">
            {db.products.length} {language === 'ar' ? 'سلعة مسجلة ومسعرة' : 'articles référencés'}
          </div>
        </div>

        {/* Capital de l'Etablissement KPI */}
        <div className="bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between h-32 rounded text-white text-right">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {language === 'ar' ? 'رأس مال المشروع (Capital)' : 'Capital de l\'Établissement'}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-black text-cyan-400">
              {formatCurrency(
                db.settings?.customCapitalValue !== undefined && db.settings.customCapitalValue > 0
                  ? db.settings.customCapitalValue
                  : (stock.totalStockValue + financial.clientDebits - (db.partners.filter(p => p.type === 'fournisseur' && p.currentBalance < 0).reduce((sum, p) => sum + Math.abs(p.currentBalance), 0)))
              )}
            </span>
          </div>
          <div className="text-[9px] text-slate-400 font-sans font-bold">
            {language === 'ar' ? 'رأس مال المشروع والموازنات المتوفرة ' : 'Fonds propres déclarés ou calculés'}
          </div>
        </div>
      </div>

      {/* Warning Indicators and Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Custom Visual Performance charts */}
        <div className="bg-white p-6 border border-slate-200 lg:col-span-8 space-y-6 rounded">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-105 pb-4.5">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-850 flex items-center gap-1.5 font-mono">
                <TrendingUp className="w-4 h-4 text-slate-650" />
                {language === 'ar' ? 'مؤشر الأداء والتحليل المالي' : 'Analyse Financière & Rendement'}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {language === 'ar' ? 'متابعة المبيعات وصافي الأرباح والمصاريف' : 'Analyse comparative des marges et charges réelles'}
              </p>
            </div>

            {/* SECURE TIME PERIOD FILTER */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg select-none no-print">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex bg-white border border-slate-200 p-0.5 rounded gap-0.5 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setDateFilter('7days')}
                  className={`px-2.5 py-1 text-[9.5px] font-black rounded cursor-pointer transition-all ${
                    dateFilter === '7days' ? 'bg-slate-900 text-white' : 'text-slate-550 hover:text-slate-900'
                  }`}
                >
                  {language === 'ar' ? 'آخر 7 أيام' : '7 j'}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('thisMonth')}
                  className={`px-2.5 py-1 text-[9.5px] font-black rounded cursor-pointer transition-all ${
                    dateFilter === 'thisMonth' ? 'bg-slate-900 text-white' : 'text-slate-550 hover:text-slate-900'
                  }`}
                >
                  {language === 'ar' ? 'هذا الشهر' : 'Mois'}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('thisYear')}
                  className={`px-2.5 py-1 text-[9.5px] font-black rounded cursor-pointer transition-all ${
                    dateFilter === 'thisYear' ? 'bg-slate-900 text-white' : 'text-slate-550 hover:text-slate-900'
                  }`}
                >
                  {language === 'ar' ? 'هذه السنة' : 'Année'}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('custom')}
                  className={`px-2.5 py-1 text-[9.5px] font-black rounded cursor-pointer transition-all ${
                    dateFilter === 'custom' ? 'bg-slate-900 text-white' : 'text-slate-550 hover:text-slate-900'
                  }`}
                >
                  {language === 'ar' ? 'مخصص' : 'Perso'}
                </button>
              </div>
              
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-slate-200 text-[10px] font-bold text-slate-700 px-1.5 py-0.5 rounded focus:outline-hidden focus:border-slate-800 font-mono"
                  />
                  <span className="text-[10px] font-bold text-slate-400">→</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-slate-200 text-[10px] font-bold text-slate-700 px-1.5 py-0.5 rounded focus:outline-hidden focus:border-slate-800 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC METRIC CARDS FOR THE CHOSEN TIMEFRAME */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 font-sans">
            {/* Sales vs Purchase Flow */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-2">
              <div className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                {language === 'ar' ? 'ملموسات المعاملات للفترة المحددة' : 'Transactions de la Période'}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500 font-sans font-medium">{language === 'ar' ? 'المبيعات' : 'Ventes'}</span>
                  <span className="text-emerald-600 font-bold">{formatCurrency(filteredStats.totalRevenue)}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 overflow-hidden rounded">
                  <div className="bg-blue-600 h-full" style={{ width: '100%' }}></div>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500 font-sans font-medium">{language === 'ar' ? 'تكلفة الشراء' : 'Coût d\'Achat'}</span>
                  <span className="text-amber-600 font-bold">{formatCurrency(filteredStats.totalCostOfGoodsSold)}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 overflow-hidden rounded">
                  <div 
                    className="bg-amber-500 h-full" 
                    style={{ width: `${Math.min(100, filteredStats.totalRevenue > 0 ? (filteredStats.totalCostOfGoodsSold / filteredStats.totalRevenue) * 100 : 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Profit Margin Rate */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-2 flex flex-col justify-between">
              <div>
                <div className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                  {language === 'ar' ? 'نسبة هامش المبيعات' : 'Taux de Marge Moyenne'}
                </div>
                <div className="text-lg font-mono font-bold text-slate-800 mt-1">
                  {filteredStats.totalRevenue > 0 
                    ? `${((filteredStats.rawBenefit / filteredStats.totalRevenue) * 100).toFixed(1)}%` 
                    : '0.0%'}
                </div>
              </div>
              <div className="text-[9px] text-slate-400 leading-tight">
                {language === 'ar' ? 'متوسط الهامش الإجمالي لحركات البيع المستجلة.' : 'Performance brute sur le coût d\'achat de la période.'}
              </div>
            </div>

            {/* Net Profits Impact */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-2 flex flex-col justify-between">
              <div>
                <div className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                  {language === 'ar' ? 'صافي الربح الفعلي' : 'Bénéfice Net de la Période'}
                </div>
                <div className={`text-lg font-mono font-bold mt-1 ${filteredStats.netBenefit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  {formatCurrency(filteredStats.netBenefit)}
                </div>
              </div>
              <p className="text-[9px] text-slate-400 leading-tight">
                {language === 'ar' ? 'الربح بعد خصم مصاريف ومستلزمات التشغيل.' : 'Total bénéfices réels nets après déduction des dépenses.'}
              </p>
            </div>
          </div>

          {/* Chart Header Tab Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-5 mt-4 gap-2">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {chartTab === 'evolution' 
                ? (language === 'ar' ? 'تحليل المبيعات وصافي الأرباح التراكمية' : 'Courbes des performances (Ventes vs Profit)')
                : chartTab === 'dailyProfit'
                ? (language === 'ar' ? 'أرباح السلع والبيع اليومية (المبيعات - التكلفة)' : 'Bénéfice Net Quotidien (Ventes - Coût d\'Achat)')
                : chartTab === 'monthlyBenefits'
                ? (language === 'ar' ? 'مقارنة المداخيل والمصاريف وصافي الأرباح شهرياً' : 'Comparaison mensuelle des revenus, dépenses et bénéfices')
                : (language === 'ar' ? 'التوزيع المالي لبنود الميزانية' : 'Bilan synthétique global')}
            </span>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1 select-none flex-wrap">
              <button
                type="button"
                onClick={() => setChartTab('evolution')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                  chartTab === 'evolution'
                    ? 'bg-slate-900 text-white shadow-xs scale-102'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {language === 'ar' ? '📈 اتجاهات الأرباح' : 'Tendances (📈) '}
              </button>
              <button
                type="button"
                onClick={() => setChartTab('dailyProfit')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                  chartTab === 'dailyProfit'
                    ? 'bg-slate-900 text-white shadow-xs scale-102'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {language === 'ar' ? '💵 أرباح البيع' : 'Profit Quotidien (💵)'}
              </button>
              <button
                type="button"
                onClick={() => setChartTab('monthlyBenefits')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                  chartTab === 'monthlyBenefits'
                    ? 'bg-slate-900 text-white shadow-xs scale-102'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {language === 'ar' ? '📅 الأرباح الشهرية' : 'Bénéfices Mensuels (📅)'}
              </button>
              <button
                type="button"
                onClick={() => setChartTab('compare')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                  chartTab === 'compare'
                    ? 'bg-slate-900 text-white shadow-xs scale-102'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {language === 'ar' ? '📊 الهامش والميزانية' : 'Bilan Analytique (📊)'}
              </button>
            </div>
          </div>

          {chartTab === 'dailyProfit' ? (
            /* Bar Chart for Daily Net Profit */
            <div className="h-60 w-full bg-slate-900 rounded-xl p-4 flex flex-col justify-between border border-slate-850 shadow-xs relative" dir="ltr">
              <div className="absolute top-2 right-3 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[8px] font-bold text-slate-400 tracking-wider font-mono uppercase">
                    {language === 'ar' ? 'صافي أرباح السلع والمبيعات' : 'Net Profit (Revenue - COGS)'}
                  </span>
                </span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendChartData}
                  margin={{ top: 15, right: 10, left: -25, bottom: -5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#64748b" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val.toFixed(1)}`}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 border border-slate-850 p-2.5 text-[10px] text-start font-mono leading-relaxed text-slate-200 rounded shadow-2xl">
                            <p className="text-slate-400 font-sans font-bold mb-1 border-b border-slate-850 pb-1">
                              {payload[0].payload.date} {payload[0].payload.label ? `(${payload[0].payload.label})` : ''}
                            </p>
                            <p className="text-violet-400 font-extrabold text-xs">
                              {language === 'ar' ? 'صافي أرباح السلع: ' : 'Profit Net Direct: '}
                              {formatCurrency(payload[0].payload.dailyNetProfit)}
                            </p>
                            <p className="text-emerald-400 text-[9px] mt-0.5">
                              {language === 'ar' ? 'المبيعات الإجمالية: ' : 'Ventes Totales: '}
                              {formatCurrency(payload[0].payload.revenue)}
                            </p>
                            <p className="text-amber-500 text-[9px] mt-0.5">
                              {language === 'ar' ? 'تكلفة السلع المبيعة: ' : 'Coût d\'Achat (COGS): '}
                              {formatCurrency(parseFloat((payload[0].payload.revenue - payload[0].payload.dailyNetProfit).toFixed(3)))}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="dailyNetProfit" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : chartTab === 'evolution' ? (
            /* Dual Area Chart plotting BOTH Revenue and Net profit */
            <div className="h-60 w-full bg-slate-900 rounded-xl p-4 flex flex-col justify-between border border-slate-850 shadow-xs relative" dir="ltr">
              <div className="absolute top-2 right-3 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[8px] font-bold text-slate-400 tracking-wider font-mono uppercase">
                    {language === 'ar' ? 'المبيعات' : 'Ventes'}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[8px] font-bold text-slate-400 tracking-wider font-mono uppercase">
                    {language === 'ar' ? 'صافي الربح' : 'Bénéfice Net'}
                  </span>
                </span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendChartData}
                  margin={{ top: 15, right: 10, left: -25, bottom: -5 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNetProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#64748b" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val.toFixed(1)}`}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 border border-slate-850 p-2.5 text-[10px] text-start font-mono leading-relaxed text-slate-200 rounded shadow-2xl">
                            <p className="text-slate-400 font-sans font-bold mb-1 border-b border-slate-850 pb-1">
                              {payload[0].payload.date} {payload[0].payload.label ? `(${payload[0].payload.label})` : ''}
                            </p>
                            <p className="text-emerald-400 font-extrabold text-xs">
                              {language === 'ar' ? 'المبيعات: ' : 'Ventes: '}
                              {formatCurrency(payload[0].payload.revenue)}
                            </p>
                            <p className="text-blue-400 font-extrabold text-xs mt-0.5">
                              {language === 'ar' ? 'صافي الربح: ' : 'Bénéfice Net: '}
                              {formatCurrency(payload[0].payload.netProfit)}
                            </p>
                            <p className="text-slate-400 font-medium mt-1 text-[9px] border-t border-slate-900 pt-0.5 block">
                              {language === 'ar' ? 'الفواتير: ' : 'Nombre de factures: '}
                              {payload[0].payload.invoicesCount}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="netProfit" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorNetProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : chartTab === 'monthlyBenefits' ? (
            /* Grouped Bar Chart comparing revenues, expenses and net profit monthly */
            <div className="h-60 w-full bg-slate-900 rounded-xl p-4 flex flex-col justify-between border border-slate-855 shadow-xs relative" dir="ltr">
              <div className="absolute top-2 right-3 flex flex-wrap items-center gap-3 z-10 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  <span className="text-[8px] font-bold text-slate-400 tracking-wider font-mono uppercase">
                    {language === 'ar' ? 'المداخيل (الإيرادات)' : 'Revenus'}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                  <span className="text-[8px] font-bold text-slate-400 tracking-wider font-mono uppercase">
                    {language === 'ar' ? 'المصاريف' : 'Dépenses'}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 animate-pulse" />
                  <span className="text-[8px] font-bold text-slate-400 tracking-wider font-mono uppercase">
                    {language === 'ar' ? 'صافي الربح' : 'Bénéfice Net'}
                  </span>
                </span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyCompareData}
                  margin={{ top: 25, right: 10, left: -25, bottom: -5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#64748b" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val.toFixed(1)}`}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-850 p-2.5 text-[10px] text-start font-mono leading-relaxed text-slate-200 rounded shadow-2xl">
                            <p className="text-slate-400 font-sans font-bold mb-1 border-b border-slate-850 pb-1">
                              {data.label}
                            </p>
                            <p className="text-emerald-400 font-semibold text-xs">
                              {language === 'ar' ? 'الإيرادات: ' : 'Revenus: '}
                              {formatCurrency(data.revenue)}
                            </p>
                            <p className="text-rose-400 font-semibold text-xs">
                              {language === 'ar' ? 'المصاريف: ' : 'Dépenses: '}
                              {formatCurrency(data.expenses)}
                            </p>
                            <p className="text-amber-400 font-semibold text-xs">
                              {language === 'ar' ? 'تكلفة السلع: ' : 'Coût d\'Achat des Articles: '}
                              {formatCurrency(data.cogs)}
                            </p>
                            <div className="border-t border-slate-850 mt-1 pt-1">
                              <p className={`font-black text-xs ${data.netProfit >= 0 ? 'text-blue-400' : 'text-rose-500'}`}>
                                {language === 'ar' ? 'صافي الربح: ' : 'Bénéfice Net: '}
                                {formatCurrency(data.netProfit)}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="#10b981" 
                    radius={[3, 3, 0, 0]} 
                    maxBarSize={15}
                  />
                  <Bar 
                    dataKey="expenses" 
                    fill="#f43f5e" 
                    radius={[3, 3, 0, 0]} 
                    maxBarSize={15}
                  />
                  <Bar 
                    dataKey="netProfit" 
                    fill="#3b82f6" 
                    radius={[3, 3, 0, 0]} 
                    maxBarSize={15}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            /* Simple Visual Bar charts layout using the selected period's stats */
            <div className="h-44 sm:h-48 w-full bg-slate-900 rounded p-4 flex flex-col justify-between border border-slate-800">
              <span className="text-[9px] text-slate-400 font-mono tracking-wider">
                {language === 'ar' ? 'جدول مقارن وتوضيحي لمداخيل وصافي أرباح المغازة' : 'Vue globale des performances commerciales de la période (Ventes, Bénéfices, Charges)'}
              </span>
              
              <div className="flex items-end justify-around h-32 pt-2 gap-4">
                {/* Sales Bar */}
                <div className="flex flex-col items-center flex-1 h-full justify-end group">
                  <span className="text-[9px] font-bold text-slate-350 mb-1 font-mono transition-opacity opacity-0 group-hover:opacity-100 absolute -translate-y-6 bg-slate-950 p-1 rounded border border-slate-800 z-10">
                    {formatCurrency(filteredStats.totalRevenue)}
                  </span>
                  <div className="bg-blue-600 hover:bg-blue-500 w-full transition-all duration-300" style={{ height: filteredStats.totalRevenue > 0 ? '75%' : '5%' }}></div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 font-semibold truncate w-full text-center">{language === 'ar' ? 'المبيعات' : 'Ventes'}</span>
                </div>
                
                {/* Coût Achat Bar */}
                <div className="flex flex-col items-center flex-1 h-full justify-end group">
                  <span className="text-[9px] font-bold text-slate-355 mb-1 font-mono transition-opacity opacity-0 group-hover:opacity-100 absolute -translate-y-6 bg-slate-950 p-1 rounded border border-slate-800 z-10">
                    {formatCurrency(filteredStats.totalCostOfGoodsSold)}
                  </span>
                  <div className="bg-amber-500 hover:bg-amber-450 w-full transition-all duration-300" style={{ height: filteredStats.totalRevenue > 0 ? `${(filteredStats.totalCostOfGoodsSold / filteredStats.totalRevenue) * 75}%` : '5%' }}></div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 font-semibold truncate w-full text-center">{language === 'ar' ? 'الشراء' : 'Coût Achat'}</span>
                </div>

                {/* Marge Brute Bar */}
                <div className="flex flex-col items-center flex-1 h-full justify-end group">
                  <span className="text-[9px] font-bold text-slate-355 mb-1 font-mono transition-opacity opacity-0 group-hover:opacity-100 absolute -translate-y-6 bg-slate-950 p-1 rounded border border-slate-800 z-10">
                    {formatCurrency(filteredStats.rawBenefit)}
                  </span>
                  <div className="bg-emerald-500 hover:bg-emerald-400 w-full transition-all duration-300" style={{ height: filteredStats.totalRevenue > 0 ? `${(filteredStats.rawBenefit / filteredStats.totalRevenue) * 75}%` : '5%' }}></div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 font-semibold truncate w-full text-center">{language === 'ar' ? 'هامش' : 'Marge Br'}</span>
                </div>

                {/* Dépenses Bar */}
                <div className="flex flex-col items-center flex-1 h-full justify-end group">
                  <span className="text-[9px] font-bold text-slate-355 mb-1 font-mono transition-opacity opacity-0 group-hover:opacity-100 absolute -translate-y-6 bg-slate-950 p-1 rounded border border-slate-800 z-10">
                    {formatCurrency(filteredStats.totalExpenses)}
                  </span>
                  <div className="bg-rose-500 hover:bg-rose-450 w-full transition-all duration-300" style={{ height: filteredStats.totalRevenue > 0 ? `${(filteredStats.totalExpenses / filteredStats.totalRevenue) * 75}%` : '5%' }}></div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 font-semibold truncate w-full text-center">{language === 'ar' ? 'المصاريف' : 'Charges'}</span>
                </div>

                {/* Bénéfice Net Bar */}
                <div className="flex flex-col items-center flex-1 h-full justify-end group">
                  <span className="text-[9px] font-bold text-slate-355 mb-1 font-mono transition-opacity opacity-0 group-hover:opacity-100 absolute -translate-y-6 bg-slate-950 p-1 rounded border border-slate-800 z-10">
                    {formatCurrency(filteredStats.netBenefit)}
                  </span>
                  <div className="bg-cyan-500 hover:bg-cyan-400 w-full transition-all duration-300" style={{ height: filteredStats.totalRevenue > 0 ? `${(Math.max(0, filteredStats.netBenefit) / filteredStats.totalRevenue) * 75}%` : '5%' }}></div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 font-semibold truncate w-full text-center">{language === 'ar' ? 'الصافي' : 'Bénéfice Net'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar Alerts Column */}
        <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          
          {/* Stock Alert Warning Panel */}
          <div className="bg-white p-6 border border-slate-200 flex flex-col justify-between space-y-5 rounded">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase font-display">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>{t('db_recent_alerts')} ({stock.alertsCount})</span>
                </h2>
                <button 
                  onClick={() => onNavigate('products')}
                  className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  {t('db_details')}
                </button>
              </div>

              {alertProducts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">🎉</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800">{t('db_no_alerts')}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'ar' ? 'جميع المواد الغذائية متوفرة والمستودع ممتاز.' : 'Tous vos produits alimentaires sont en quantité optimale.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  <AnimatePresence mode="popLayout">
                    {alertProducts.slice(0, 5).map(prod => (
                      <motion.div 
                        key={prod.id} 
                        initial={{ opacity: 0, y: -10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        layout
                        className="p-3 bg-amber-50/60 rounded border border-amber-100 flex items-center justify-between gap-1 group relative"
                      >
                        <div className="min-w-0 text-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                            <button
                              type="button"
                              onClick={() => handleStartEditProduct(prod)}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 hover:bg-amber-100 rounded text-amber-700 cursor-pointer"
                              title={language === 'ar' ? 'تعديل فوري للكمية أو السعر' : 'Ajuster rapidement stock / prix'}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5">Réf: {prod.code || 'N/A'}</p>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="text-xs font-bold text-amber-700 font-mono">
                            {prod.stock} / {prod.minAlertQty} {prod.unit}
                          </p>
                          <span className="text-[8px] bg-amber-100 text-amber-800 font-semibold px-1 rounded block mt-0.5 uppercase">
                            {prod.stock === 0 ? (language === 'ar' ? 'مقطوع' : 'Rupture') : (language === 'ar' ? 'ضعيف' : 'Niveau Bas')}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {alertProducts.length > 5 && (
                    <div className="text-center font-bold text-slate-400 text-[10px] py-1">
                      + {alertProducts.length - 5} {language === 'ar' ? 'مواد أخرى في حالة تنبيه' : 'autres produits en alerte...'}
                    </div>
                  )}
                </div>
              )}

              {alertProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowOrderModal(true)}
                  className="w-full mt-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-sans text-[11px] font-bold py-2.5 px-3 rounded flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                  <span>
                    {language === 'ar' ? 'إنشاء طلب شراء للمزود (PDF)' : 'Bon de Commande Fournisseur (PDF)'}
                  </span>
                </button>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1.5 font-sans">
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">{t('db_potential_benefit')} :</span>
                <span className="text-blue-600 font-bold font-mono">{formatCurrency(stock.potentialBenefit)}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">{t('db_outstanding_debt')} :</span>
                <span className="text-emerald-600 font-bold font-mono">{formatCurrency(financial.clientDebits)}</span>
              </div>
            </div>
          </div>

          {/* Expiration Alerts Warning Panel */}
          <div className="bg-white p-6 border border-slate-200 flex flex-col justify-between space-y-5 rounded">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase font-display">
                  <Hourglass className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>
                    {language === 'ar' ? 'تنبيهات انتهاء الصلاحية' : 'Alertes Expiration'} ({expiringFoodProducts.length})
                  </span>
                </h2>
                <button 
                  onClick={() => onNavigate('products')}
                  className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  {language === 'ar' ? 'التفاصيل' : 'Détails'}
                </button>
              </div>

              {expiringFoodProducts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">🎉</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800">
                    {language === 'ar' ? 'مستودع آمن وسليم' : 'Aucune expiration'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'ar' 
                      ? 'لا توجد سلع غذائية تنتهي صلاحيتها في أقل من 7 أيام.' 
                      : "Aucun produit alimentaire n'expire dans les 7 prochains jours."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  <AnimatePresence mode="popLayout">
                    {expiringFoodProducts.slice(0, 5).map(prod => {
                      const diffDays = getRemainingDays(prod.expiryDate || '');
                      let badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                      let badgeText = "";
                      
                      if (diffDays < 0) {
                        badgeColor = "bg-rose-100 text-rose-800 border-rose-200 font-extrabold";
                        badgeText = language === 'ar' ? `منتهي (${Math.abs(diffDays)} يوم)` : `Périmé (${Math.abs(diffDays)}j)`;
                      } else if (diffDays === 0) {
                        badgeColor = "bg-red-500 text-white border-red-600 font-extrabold animate-pulse";
                        badgeText = language === 'ar' ? 'اليوم !' : "Aujourd'hui !";
                      } else if (diffDays === 1) {
                        badgeColor = "bg-orange-100 text-orange-850 border-orange-200 font-bold";
                        badgeText = language === 'ar' ? 'غداً !' : 'Demain !';
                      } else {
                        badgeColor = "bg-amber-50 text-amber-850 border-amber-105";
                        badgeText = language === 'ar' ? `باقي ${diffDays} أيام` : `Dans ${diffDays}j`;
                      }

                      return (
                        <motion.div 
                          key={`exp-${prod.id}`} 
                          initial={{ opacity: 0, y: -10, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.96 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          layout
                          className="p-3 bg-slate-50/60 rounded border border-slate-150 flex items-center justify-between gap-1 group relative"
                        >
                          <div className="min-w-0 text-start">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                              <button
                                type="button"
                                onClick={() => handleStartEditProduct(prod)}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                                title={language === 'ar' ? 'تعديل السعر أو المخزون' : 'Ajuster rapidement stock / prix'}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                              {language === 'ar' ? `المخزون: ${prod.stock} ${prod.unit}` : `Stock: ${prod.stock} ${prod.unit}`}
                              {prod.code ? ` | Réf: ${prod.code}` : ''}
                            </p>
                          </div>
                          <div className="text-end shrink-0 flex flex-col items-end">
                            <p className="text-[10px] font-bold text-slate-700 font-mono flex items-center gap-1">
                              📅 {prod.expiryDate}
                            </p>
                            <span className={`text-[8px] px-1.5 py-0.5 border rounded block mt-1 uppercase font-mono ${badgeColor}`}>
                              {badgeText}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {expiringFoodProducts.length > 5 && (
                    <div className="text-center font-bold text-slate-450 text-[10px] py-1">
                      + {expiringFoodProducts.length - 5} {language === 'ar' ? 'مواد غدائية أخرى قريبة الانتهاء' : "autres produits proches de l'expiration..."}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1 text-slate-400 text-[10px] font-sans">
              <p className="flex justify-between">
                <span>{language === 'ar' ? 'إجمالي المواد المراقبة بالصلاحية :' : 'Total articles suivis en péremption :'}</span>
                <span className="font-bold text-slate-700 font-mono">
                  {db.products.filter(p => p.dateExpiration || p.expiryDate).length}
                </span>
              </p>
              <p className="flex justify-between">
                <span>{language === 'ar' ? 'تنبيهات نشطة حالياً :' : 'Total en alerte active :'}</span>
                <span className="font-bold text-rose-600 font-mono">
                  {expiringFoodProducts.length}
                </span>
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* 📊 Stock Distribution PieChart Card */}
      <div className="bg-white p-6 border border-slate-200 rounded" id="stock-distribution-section">
        <div className="border-b border-slate-100 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-850 flex items-center gap-1.5 font-mono">
              <Boxes className="w-4 h-4 text-slate-650" />
              {language === 'ar' ? '📊 توزيع المخزون والتصنيفات' : '📊 Répartition du Stock par Catégorie'}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {language === 'ar' 
                ? 'متابعة بصرية لحجم السلع المخزنة وقيمتها الإجمالية بكل قسم' 
                : 'Contrôle visuel des quantités et de la valeur financière du stock par rayon'}
            </p>
          </div>
          <div className="bg-slate-50 text-[10px] font-mono text-slate-550 border border-slate-150 px-3 py-1 rounded flex items-center gap-2">
            <span>
              {language === 'ar' ? 'إجمالي المواد:' : 'Total produits:'}{' '}
              <strong className="text-slate-800 font-extrabold">{db.products.length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              {language === 'ar' ? 'إجمالي القطع في المستودع:' : 'Volume total stock:'}{' '}
              <strong className="text-slate-800 font-extrabold">
                {(() => {
                  const rawCategories = Array.from(new Set(db.products.map(p => p.category || (language === 'ar' ? 'عام' : 'Général'))));
                  return rawCategories.reduce((sum, cat) => {
                    const catProducts = db.products.filter(p => (p.category || (language === 'ar' ? 'عام' : 'Général')) === cat);
                    return sum + catProducts.reduce((prodSum, p) => prodSum + Math.max(0, p.stock), 0);
                  }, 0);
                })()}
              </strong>
            </span>
          </div>
        </div>

        {db.products.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Boxes className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-xs font-bold text-slate-850">
              {language === 'ar' ? 'مستودع فارغ' : 'Aucun produit enregistré'}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              {language === 'ar' ? 'يرجى تسجيل وتدشين السلع في قاعدة البيانات أولا لتفعيل هذا الرسم البياني.' : 'Ajoutez des articles dans votre catalogue pour générer le diagramme de répartition graphique.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Pie Chart Section */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[280px]">
              <div className="w-full h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(() => {
                        const rawCategories = Array.from(new Set(db.products.map(p => p.category || (language === 'ar' ? 'عام' : 'Général'))));
                        const list = rawCategories.map(cat => {
                          const catProducts = db.products.filter(p => (p.category || (language === 'ar' ? 'عام' : 'Général')) === cat);
                          const totalStock = catProducts.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
                          const uniqueProductCount = catProducts.length;
                          const totalCostValue = catProducts.reduce((sum, p) => sum + (Math.max(0, p.stock) * (p.purchasePrice || 0)), 0);
                          return {
                            name: cat,
                            value: totalStock,
                            productCount: uniqueProductCount,
                            totalValue: totalCostValue
                          };
                        });
                        const totalStockAll = list.reduce((sum, item) => sum + item.value, 0);
                        const isAllStockZero = totalStockAll === 0;

                        return list
                          .filter(item => item.value > 0 || item.productCount > 0)
                          .sort((a, b) => isAllStockZero ? b.productCount - a.productCount : b.value - a.value)
                          .map((item, index) => ({
                            name: item.name,
                            value: isAllStockZero ? item.productCount : item.value,
                            realValue: item.value,
                            prodCount: item.productCount,
                            totalVal: item.totalValue,
                            color: [
                              '#10b981', '#3b82f6', '#f59e0b', '#ec4899', 
                              '#6366f1', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316'
                            ][index % 9]
                          }));
                      })()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(() => {
                        const rawCategories = Array.from(new Set(db.products.map(p => p.category || (language === 'ar' ? 'عام' : 'Général'))));
                        const list = rawCategories.map(cat => {
                          const catProducts = db.products.filter(p => (p.category || (language === 'ar' ? 'عام' : 'Général')) === cat);
                          const totalStock = catProducts.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
                          const uniqueProductCount = catProducts.length;
                          const totalCostValue = catProducts.reduce((sum, p) => sum + (Math.max(0, p.stock) * (p.purchasePrice || 0)), 0);
                          return {
                            name: cat,
                            value: totalStock,
                            productCount: uniqueProductCount,
                            totalValue: totalCostValue
                          };
                        });
                        const totalStockAll = list.reduce((sum, item) => sum + item.value, 0);
                        const isAllStockZero = totalStockAll === 0;

                        return list
                          .filter(item => item.value > 0 || item.productCount > 0)
                          .sort((a, b) => isAllStockZero ? b.productCount - a.productCount : b.value - a.value)
                          .map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={[
                                '#10b981', '#3b82f6', '#f59e0b', '#ec4899', 
                                '#6366f1', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316'
                              ][index % 9]} 
                            />
                          ));
                      })()}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const rawCategories = Array.from(new Set(db.products.map(p => p.category || (language === 'ar' ? 'عام' : 'Général'))));
                          const list = rawCategories.map(cat => {
                            const catProducts = db.products.filter(p => (p.category || (language === 'ar' ? 'عام' : 'Général')) === cat);
                            const totalStock = catProducts.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
                            return { value: totalStock, productCount: catProducts.length };
                          });
                          const totalStockAll = list.reduce((sum, item) => sum + item.value, 0);
                          const isAllStockZero = totalStockAll === 0;

                          const percent = isAllStockZero
                            ? ((data.prodCount / db.products.length) * 100).toFixed(1)
                            : ((data.realValue / totalStockAll) * 100).toFixed(1);
                          return (
                            <div className="bg-slate-950 border border-slate-850 p-2.5 text-[10px] text-start font-mono leading-relaxed text-slate-200 rounded shadow-2xl max-w-xs">
                              <p className="text-slate-300 font-sans font-bold border-b border-slate-800 pb-1.5 mb-1.5 flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: data.color }} />
                                <span>{data.name}</span>
                              </p>
                              {isAllStockZero ? (
                                <p className="text-amber-400 font-bold">
                                  {language === 'ar' ? 'المنتجات المميزة: ' : 'Produits distincts: '}
                                  {data.prodCount} ({percent}%)
                                </p>
                              ) : (
                                <>
                                  <p className="text-emerald-400 font-bold">
                                    {language === 'ar' ? 'الكمية الإجمالية: ' : 'Quantité totale: '}
                                    {data.realValue} {language === 'ar' ? 'وحدة' : 'unités'} ({percent}%)
                                  </p>
                                  <p className="text-cyan-400 font-bold mt-0.5 font-mono">
                                    {language === 'ar' ? 'قيمة الاستثمار: ' : 'Valeur d\'achat: '}
                                    {formatCurrency(data.totalVal)}
                                  </p>
                                  <p className="text-slate-400 text-[9px] mt-0.5">
                                    {language === 'ar' ? 'تنوع السلع: ' : 'Matières distinctes: '}
                                    {data.prodCount} {language === 'ar' ? 'سلعة' : 'articles'}
                                  </p>
                                </>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Central text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  {(() => {
                    const rawCategories = Array.from(new Set(db.products.map(p => p.category || (language === 'ar' ? 'عام' : 'Général'))));
                    const totalStk = rawCategories.reduce((sum, cat) => {
                      const catProducts = db.products.filter(p => (p.category || (language === 'ar' ? 'عام' : 'Général')) === cat);
                      return sum + catProducts.reduce((prodSum, p) => prodSum + Math.max(0, p.stock), 0);
                    }, 0);
                    return totalStk === 0 
                      ? (language === 'ar' ? 'السلع' : 'Articles') 
                      : (language === 'ar' ? 'المخزون' : 'Stock');
                  })()}
                </span>
                <span className="text-sm font-mono font-black text-slate-800 mt-0.5">
                  {(() => {
                    const rawCategories = Array.from(new Set(db.products.map(p => p.category || (language === 'ar' ? 'عام' : 'Général'))));
                    const totalStk = rawCategories.reduce((sum, cat) => {
                      const catProducts = db.products.filter(p => (p.category || (language === 'ar' ? 'عام' : 'Général')) === cat);
                      return sum + catProducts.reduce((prodSum, p) => prodSum + Math.max(0, p.stock), 0);
                    }, 0);
                    return totalStk === 0 ? db.products.length : totalStk;
                  })()}
                </span>
              </div>
            </div>

            {/* Comprehensive category stats list table with bars */}
            <div className="lg:col-span-7 space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-2 pl-1">
              {(() => {
                const rawCategories = Array.from(new Set(db.products.map(p => p.category || (language === 'ar' ? 'عام' : 'Général'))));
                const list = rawCategories.map(cat => {
                  const catProducts = db.products.filter(p => (p.category || (language === 'ar' ? 'عام' : 'Général')) === cat);
                  const totalStock = catProducts.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
                  const uniqueProductCount = catProducts.length;
                  const totalCostValue = catProducts.reduce((sum, p) => sum + (Math.max(0, p.stock) * (p.purchasePrice || 0)), 0);
                  return {
                    name: cat,
                    value: totalStock,
                    productCount: uniqueProductCount,
                    totalValue: totalCostValue
                  };
                });
                const totalStockAll = list.reduce((sum, item) => sum + item.value, 0);
                const isAllStockZero = totalStockAll === 0;

                const sorted = list
                  .filter(item => item.value > 0 || item.productCount > 0)
                  .sort((a, b) => isAllStockZero ? b.productCount - a.productCount : b.value - a.value);

                return sorted.map((item, index) => {
                  const color = [
                    '#10b981', '#3b82f6', '#f59e0b', '#ec4899', 
                    '#6366f1', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316'
                  ][index % 9];
                  const sharePercent = isAllStockZero
                    ? (db.products.length > 0 ? (item.productCount / db.products.length) * 100 : 0)
                    : (totalStockAll > 0 ? (item.value / totalStockAll) * 100 : 0);

                  return (
                    <div key={item.name} className="p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-150 rounded flex flex-col gap-1 transition-all text-start relative group">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 pr-1 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                          <span className="text-slate-650 font-bold" title={language === 'ar' ? 'إجمالي السلع في هذا التصنيف' : 'Unités physiques de stock'}>
                            {item.value} <span className="text-[8px] font-sans font-medium text-slate-400">{language === 'ar' ? 'وحدة' : 'unités'}</span>
                          </span>
                          <span className="text-slate-200">|</span>
                          <span className="text-slate-500" title={language === 'ar' ? 'تنوع السلع' : 'Nombre de références'}>
                            {item.productCount} <span className="text-[8px] font-sans font-medium text-slate-400">{language === 'ar' ? 'مرجع' : 'réfs'}</span>
                          </span>
                          <span className="text-slate-200">|</span>
                          <span className="text-emerald-700 font-bold" title={language === 'ar' ? 'القيمة الإجمالية للمخزون بسعر الشراء' : 'Valeur marchande estimée'}>
                            {formatCurrency(item.totalValue)}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar and margin summary */}
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <div className="flex-1 bg-slate-200/60 h-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              backgroundColor: color,
                              width: `${sharePercent}%` 
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 shrink-0 w-8 text-end">
                          {sharePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Quick Access Actions */}
      <div className="bg-slate-50 p-6 border border-slate-200 rounded">
        <h3 className="text-xs font-bold text-slate-800 mb-4 h-max uppercase tracking-wider">{language === 'ar' ? 'بوابة الخدمات والعمليات السريعة' : 'Actions rapides / خدمات سريعة'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => onNavigate('pos')}
            className="p-4 bg-white hover:bg-blue-50/50 hover:border-blue-400 transition-all border border-slate-200 text-start flex flex-col justify-between h-28 cursor-pointer group rounded shadow-3xs"
          >
            <div className="p-2 bg-blue-50 group-hover:bg-blue-100 text-blue-600 w-max transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-800">{language === 'ar' ? 'شاشة البيع والنقد' : 'Caisse Tactile'}</div>
              <p className="text-[10px] text-slate-400">{language === 'ar' ? 'تسجيل فواتير البيع' : 'Facturer au comptoir'}</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('products')}
            className="p-4 bg-white hover:bg-emerald-50/50 hover:border-emerald-400 transition-all border border-slate-200 text-start flex flex-col justify-between h-28 cursor-pointer group rounded shadow-3xs"
          >
            <div className="p-2 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 w-max transition-colors">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-800">{language === 'ar' ? 'جدول السلع والأسعار' : 'Stock & Articles'}</div>
              <p className="text-[10px] text-slate-400">{language === 'ar' ? 'إضافة وتوريد سلع' : 'Gérer l\'inventaire'}</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('invoices')}
            className="p-4 bg-white hover:bg-sky-50/50 hover:border-sky-400 transition-all border border-slate-200 text-start flex flex-col justify-between h-28 cursor-pointer group rounded shadow-3xs"
          >
            <div className="p-2 bg-sky-50 group-hover:bg-sky-100 text-sky-600 w-max transition-colors">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-800">{language === 'ar' ? 'الفواتير والوصولات' : 'Journal Ventes'}</div>
              <p className="text-[10px] text-slate-400 font-medium">{language === 'ar' ? 'مراجعة المطبوعات' : 'Impressions et Archives'}</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('partners')}
            className="p-4 bg-white hover:bg-amber-50/50 hover:border-amber-400 transition-all border border-slate-200 text-start flex flex-col justify-between h-28 cursor-pointer group rounded shadow-3xs"
          >
            <div className="p-2 bg-amber-50 group-hover:bg-amber-100 text-amber-600 w-max transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-800">{language === 'ar' ? 'الديون والحسابات' : 'Clients & Crédits'}</div>
              <p className="text-[10px] text-slate-400">{language === 'ar' ? 'استخلاص مبالغ الكريدي' : 'Suivi dettes & versements'}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-850 text-white font-sans text-xs font-bold py-3 px-5 rounded shadow-lg flex items-center gap-2 animate-bounce">
          <span className="text-emerald-400 font-bold">●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal 1: Settings Editing Overlay */}
      {isEditingSettings && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
          <div className="bg-white border text-start border-slate-100 rounded-2xl max-w-lg w-full p-5 md:p-6 space-y-4 shadow-2xl my-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-850 flex items-center gap-1.5 font-display">
                <Settings className="w-4 h-4 text-blue-500" />
                <span>{language === 'ar' ? 'تعديل بيانات الهوية والمحل' : 'Modifier les Paramètres de la Boutique'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-slate-800">
              {/* Store Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  {language === 'ar' ? 'اسم المغازة / المحل' : 'Nom de la Boutique / Enseigne'}
                </label>
                <input
                  type="text"
                  value={settingsStoreName}
                  onChange={(e) => setSettingsStoreName(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors"
                  placeholder="e.g. Superette El Baraka"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Phone */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'رقم الهاتف (تونس)' : 'Téléphone (Tunisie)'}
                  </label>
                  <input
                    type="text"
                    value={settingsPhone}
                    onChange={(e) => setSettingsPhone(e.target.value)}
                    className="w-full text-xs font-mono font-medium border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors"
                    placeholder="e.g. 71 000 000"
                  />
                </div>

                {/* Fiscal ID */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'المعرف الجبائي (الماتريكول)' : 'Matricule Fiscal'}
                  </label>
                  <input
                    type="text"
                    value={settingsMatricule}
                    onChange={(e) => setSettingsMatricule(e.target.value)}
                    className="w-full text-xs font-mono font-medium border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors"
                    placeholder="e.g. 1547842/A/M/000"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  {language === 'ar' ? 'العنوان الجغرافي للمحل' : 'Adresse Géographique'}
                </label>
                <input
                  type="text"
                  value={settingsAddress}
                  onChange={(e) => setSettingsAddress(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors"
                  placeholder="e.g. Rue de la Liberté, Tunis"
                />
              </div>

              {/* Activity Sector */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  {language === 'ar' ? 'قطاع النشاط الرئيسي' : 'Secteur d\'Activité Principal'}
                </label>
                <select
                  value={settingsSector}
                  onChange={(e) => setSettingsSector(e.target.value as any)}
                  className="w-full text-xs font-medium border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors"
                >
                  <option value="superette">{language === 'ar' ? 'مواد غذائية ومغازة عامة (Superette)' : 'Alimentation Générale / Supérette'}</option>
                  <option value="pharmacie">{language === 'ar' ? 'صيدلية وعناية طبية (Pharmacie)' : 'Pharmacie / Parapharmacie'}</option>
                  <option value="materiaux">{language === 'ar' ? 'مواد بناء وحديد (Quincaillerie)' : 'Matériaux de Construction / Quincaillerie'}</option>
                  <option value="general">{language === 'ar' ? 'تجارة عامة وخدمات متعددة' : 'Commerce Général / Services'}</option>
                </select>
              </div>

              {/* Store Icon / Logo */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">
                  {language === 'ar' ? 'الشعار أو الرمز التعبيري للبوتيك' : 'Icône ou Logo de l\'Enseigne'}
                </label>
                
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded border border-slate-150">
                  <div className="w-14 h-14 bg-white border border-slate-200 rounded flex items-center justify-center text-2xl overflow-hidden shrink-0 shadow-3xs">
                    {settingsLogo && settingsLogo.startsWith('data:') ? (
                      <img src={settingsLogo} alt="store logo" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="animate-fade-in">{settingsLogo || '🛒'}</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {['🛒', '🍞', '🥫', '🥛', '🍎', '☕', '💊', '🔨'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setSettingsLogo(emoji)}
                          className={`w-7 h-7 flex items-center justify-center rounded border text-xs cursor-pointer transition-colors ${
                            settingsLogo === emoji ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={logoUploadRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoUploadRef.current?.click()}
                        className="py-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[9px] font-bold text-slate-600 transition-colors uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3 text-slate-400" />
                        <span>{language === 'ar' ? 'تحميل صورة مخصصة' : 'Compacter & Charger image'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cashier profile customized info */}
              <div className="border-t border-slate-150 pt-3.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  {language === 'ar' ? 'اسم الكاشير النشط اليوم' : 'Nom Complet du Caissier de Service'}
                </label>
                <input
                  type="text"
                  value={settingsCashierName}
                  onChange={(e) => setSettingsCashierName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
                  placeholder="Ex: Wala"
                />
                <p className="text-[9px] text-slate-400 mt-1 font-mono">
                  {language === 'ar' ? '💡 يظهر هذا الاسم على تذاكر البيع ومستندات الخروج اليومية.' : '💡 Ce nom apparaîtra sur les tickets de vente imprimés et les sessions.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="py-2 px-4 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-750 text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="py-2 px-5 rounded bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-3xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'حفظ البيانات الجديدة' : 'Enregistrer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Quick Expense Adding Overlay */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
          <div className="bg-white border text-start border-slate-100 rounded-2xl max-w-md w-full p-5 md:p-6 space-y-4 shadow-2xl my-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 font-display">
                <TrendingUp className="w-4 h-4 text-rose-500 rotate-180" />
                <span>{language === 'ar' ? 'تسجيل سريع لمصروف ومصاريف تشغيل' : 'Saisir une Dépense Directe'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  {language === 'ar' ? 'بيان المصروف (السبب)' : 'Libellé de la dépense / Objet'}
                </label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
                  placeholder={language === 'ar' ? 'مثال: فاتورة الـ STEG للكهرباء لشهر ماي' : 'Ex: Facture d\'électricité STEG'}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  {language === 'ar' ? 'المبلغ بالدينار التونسي (DT)' : 'Montant total de la charge (DT)'}
                </label>
                <input
                  type="number"
                  step="0.050"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full text-xs font-mono font-bold border border-slate-200 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-rose-600"
                  placeholder="e.g. 145.250"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  {language === 'ar' ? 'نوع التصنيف العام' : 'Catégorie de charge'}
                </label>
                <select
                  value={expenseCat}
                  onChange={(e) => setExpenseCat(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
                >
                  <option value="Loyer">{language === 'ar' ? 'إيجار / كراء المحل' : 'Loyer commercial'}</option>
                  <option value="Facture">{language === 'ar' ? 'فواتير (كهرباء، ماء، إنترنت)' : 'STEG, SONEDE & Télécom'}</option>
                  <option value="Transport">{language === 'ar' ? 'نقل وتوريد السلع' : 'Transport & Carburant'}</option>
                  <option value="Salaires">{language === 'ar' ? 'أجور العملة والصانع' : 'Salaires & Rémunérations'}</option>
                  <option value="Impôts">{language === 'ar' ? 'أداءات، ضرائب وضمان اجتماعي' : 'Taxes et Impôts'}</option>
                  <option value="Autres">{language === 'ar' ? 'مصاريف تشغيل أخرى' : 'Autres frais opérationnels'}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="py-2 px-4 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleSaveQuickExpense}
                className="py-2 px-5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-3xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تسجيل المصروف الفوري' : 'Enregistrer la charge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Quick Alert Stock / Price Refiner Overlay */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
          <div className="bg-white border text-start border-slate-100 rounded-2xl max-w-md w-full p-5 md:p-6 space-y-4 shadow-2xl my-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5 font-display">
                <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>{language === 'ar' ? 'تعديل فوري للكمية وسعر السلعة' : 'Ajustement Express Produit'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-slate-800">
              <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase font-mono">
                {editingProduct.category}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">{editingProduct.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Code-barres: {editingProduct.code || 'Système'}</p>
            </div>

            <div className="space-y-3.5 text-slate-800">
              {/* Stock Quantity */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'الكمية الحالية بالمخزن' : 'Quantité de Stock'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={prodStock}
                      onChange={(e) => setProdStock(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xs font-mono font-bold border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
                    />
                    <span className="text-xs text-slate-500 font-bold font-sans shrink-0">{editingProduct.unit}</span>
                  </div>
                </div>

                {/* Min Stock threshold */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'حد التنبيه الأدنى' : 'Seuil d\'Alerte'}
                  </label>
                  <input
                    type="number"
                    value={prodMinAlert}
                    onChange={(e) => setProdMinAlert(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-xs font-mono font-bold border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
                  />
                </div>
              </div>

              {/* Purchase and Selling Prices */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'ثمن الشراء الأصلي (DT)' : 'Prix d\'Achat (DT)'}
                  </label>
                  <input
                    type="number"
                    step="0.010"
                    value={prodPurchPrice}
                    onChange={(e) => setProdPurchPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-mono font-bold border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'سعر البيع للعموم (DT)' : 'Prix de Vente (DT)'}
                  </label>
                  <input
                    type="number"
                    step="0.010"
                    value={prodSellPrice}
                    onChange={(e) => setProdSellPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-mono font-bold text-emerald-600 border border-slate-250 p-2.5 rounded bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors"
                  />
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 rounded border border-slate-150 text-[11px] font-medium text-slate-500">
                <span>{language === 'ar' ? 'هامش الربح المتوقع للوحدة : ' : 'Marge brute unitaire estimée : '}</span>
                <span className="font-mono font-bold text-emerald-600 ml-1">
                  {formatCurrency(Math.max(0, prodSellPrice - prodPurchPrice))}
                </span>
                <span className="text-[9px] text-slate-400 ml-1">
                  ({prodSellPrice > 0 ? (((prodSellPrice - prodPurchPrice) / prodSellPrice) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="py-2 px-4 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleSaveProductAdjustments}
                className="py-2 px-5 rounded bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-3xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تعديل وحفظ البيانات' : 'Appliquer l\'ajustement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Automatic Supplier Purchase Order PDF Generator */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
          <div className="bg-white border text-start border-slate-100 rounded-2xl max-w-lg w-full p-5 md:p-6 space-y-4 shadow-2xl my-auto animate-fadeIn" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-display">
                <FileText className="w-4 h-4 text-slate-700" />
                <span>
                  {language === 'ar' ? 'إعداد وثيقة طلب الشراء للمزود' : 'Créer un Bon de Commande Fournisseur'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-slate-550 leading-normal font-medium">
                {language === 'ar' 
                  ? `سيقوم النظام تلقائياً بتضمين كل المنتجات (${alertProducts.length}) التي بلغت أو انخفضت عن حد التنبيه لطلبها وتأمين المخزون.` 
                  : `Le système va générer automatiquement un bon de commande d'approvisionnement incluant les ${alertProducts.length} produit(s) actuellement en alerte stock critique.`}
              </p>

              {/* Supplier Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  {language === 'ar' ? 'اختر المزود المستهدف (اختياري) :' : 'Sélectionner le Fournisseur Partenaire :'}
                </label>
                
                {db.partners?.filter(p => p.type === 'fournisseur').length === 0 ? (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[10.5px] text-slate-450 font-medium">
                    {language === 'ar' 
                      ? '⚠️ لا يوجد مزودين مسجلين في النظام حالياً. سيتم إصدار الوثيقة لمزود افتراضي.' 
                      : '⚠️ Aucun fournisseur enregistré. Le bon de commande sera émis à un destinataire générique.'}
                  </div>
                ) : (
                  <select
                    value={orderSupplierId}
                    onChange={(e) => setOrderSupplierId(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-250 p-2.5 rounded bg-slate-100 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
                  >
                    <option value="">
                      -- {language === 'ar' ? 'مزود عام (افتراضي)' : 'Fournisseur Principal d\'Approvisionnement'} --
                    </option>
                    {db.partners
                      ?.filter(p => p.type === 'fournisseur')
                      .map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          🏢 {vendor.name} ({vendor.phone || 'Pas de tél'})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Quick Preview list of items being ordered */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider font-mono">
                  {language === 'ar' ? 'قائمة المواد المطلوبة وقيمها التقريبية :' : 'ARTICLES INCLUS DANS LA COMMANDE :'}
                </span>
                
                <div className="max-h-40 overflow-y-auto border border-slate-150 rounded custom-scrollbar p-1.5 space-y-1.5 bg-slate-50/50">
                  {alertProducts.map(prod => {
                    const orderQty = Math.max(10, (prod.minAlertQty * 2) - prod.stock);
                    const costEst = orderQty * prod.purchasePrice;
                    return (
                      <div key={prod.id} className="text-[11px] flex justify-between items-center bg-white p-1.5 rounded border border-slate-100">
                        <div className="min-w-0 pr-1 text-start">
                          <p className="font-bold text-slate-800 truncate text-[11.5px]">{prod.name}</p>
                          <span className="text-[9px] text-slate-450 font-mono">Stock actuel : {prod.stock} / Seuil : {prod.minAlertQty}</span>
                        </div>
                        <div className="text-end shrink-0 font-mono">
                          <span className="font-black text-blue-600 font-sans block">Qté : {orderQty} {prod.unit}</span>
                          <span className="text-[9px] text-slate-450">Est : {formatCurrency(costEst)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="py-2 px-4 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Fermer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const selectedVendor = db.partners?.find(p => p.id === orderSupplierId);
                  downloadPurchaseOrderPDF({
                    products: alertProducts,
                    partner: selectedVendor,
                    settings: db.settings,
                    language,
                    formatCurrency
                  });
                  setShowOrderModal(false);
                }}
                className="py-2 px-5 rounded bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar' ? 'تصدير وتحميل PDF' : 'Générer & Télécharger PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
