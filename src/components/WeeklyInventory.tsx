import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseState, Product, Partner, WeeklyInventoryReport, WeeklyInventorySupplierSummary, WeeklyInventoryProductSnapshot, StoreSettings } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { 
  generateWeeklyInventoryReport, 
  getSavedWeeklyInventories, 
  saveWeeklyInventoryReport, 
  exportWeeklyInventoryToPDF,
  DAY_LABELS_AR,
  DAY_LABELS_FR
} from '../utils/inventoryScheduler';
import { showToast } from '../utils/toast';
import { 
  ClipboardCheck, 
  Boxes, 
  Truck, 
  History, 
  Download, 
  Printer, 
  RefreshCw, 
  Settings2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  Phone, 
  MapPin, 
  MessageSquare, 
  Calendar, 
  Search, 
  Filter, 
  Sparkles, 
  Share2, 
  FileSpreadsheet, 
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ShoppingBag,
  SlidersHorizontal
} from 'lucide-react';

interface WeeklyInventoryProps {
  db: DatabaseState;
  onUpdateDb: (newDb: DatabaseState) => void;
  branchId?: string;
  branchName?: string;
}

export default function WeeklyInventory({ db, onUpdateDb, branchId = 'default', branchName = 'الفرع الرئيسي' }: WeeklyInventoryProps) {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';

  // Active view inside the inventory component
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'suppliers' | 'history'>('products');

  // Stored archives & current active report
  const [archives, setArchives] = useState<WeeklyInventoryReport[]>(() => getSavedWeeklyInventories(branchId));
  
  // Real-time live generated report for the current moment
  const [currentReport, setCurrentReport] = useState<WeeklyInventoryReport>(() => {
    const saved = getSavedWeeklyInventories(branchId);
    if (saved.length > 0) {
      return saved[0];
    }
    return generateWeeklyInventoryReport(db, branchId, branchName, false);
  });

  const [selectedHistoricalReport, setSelectedHistoricalReport] = useState<WeeklyInventoryReport | null>(null);
  const displayedReport = selectedHistoricalReport || currentReport;

  // Search & Filter States
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'optimal' | 'low' | 'out_of_stock'>('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [autoInventoryEnabled, setAutoInventoryEnabled] = useState<boolean>(
    db.settings?.enableAutoWeeklyInventory !== false
  );
  const [scheduledDay, setScheduledDay] = useState<string>(
    db.settings?.weeklyInventoryDay || 'friday'
  );

  // Supplier Detail Modal
  const [selectedSupplierForDetails, setSelectedSupplierForDetails] = useState<WeeklyInventorySupplierSummary | null>(null);

  // Re-generate live report when db changes or manual refresh
  const handleRegenerateInstantReport = () => {
    const fresh = generateWeeklyInventoryReport(db, branchId, branchName, false);
    setCurrentReport(fresh);
    const updated = saveWeeklyInventoryReport(fresh, branchId);
    setArchives(updated);
    setSelectedHistoricalReport(null);
    showToast(isAr ? 'تم تحديث وإنشاء جرد المخزون والمزودين بنجاح! 📋' : 'Inventaire mis à jour avec succès ! 📋', 'success');
  };

  // Save Settings
  const handleSaveSettings = () => {
    const updatedSettings: StoreSettings = {
      ...(db.settings || {
        storeName: 'INNOVA POS PRO',
        storePhone: '',
        storeAddress: '',
        activitySector: 'superette'
      }),
      enableAutoWeeklyInventory: autoInventoryEnabled,
      weeklyInventoryDay: scheduledDay as any
    };

    onUpdateDb({
      ...db,
      settings: updatedSettings
    });

    setShowSettingsModal(false);
    showToast(isAr ? 'تم حفظ إعدادات الجرد التلقائي بنجاح! ⚙️' : 'Paramètres d\'inventaire enregistrés !', 'success');
  };

  // Export PDF
  const handleExportPDF = () => {
    exportWeeklyInventoryToPDF(displayedReport, db.settings, language);
    showToast(isAr ? 'تم تصدير تقرير الجرد بصيغة PDF بنجاح! 📄' : 'Rapport PDF exporté avec succès ! 📄', 'success');
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    displayedReport.productsSnapshot.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [displayedReport]);

  // Filtered Products Snapshot
  const filteredProducts = useMemo(() => {
    return displayedReport.productsSnapshot.filter(p => {
      const matchSearch = !productSearch || 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(productSearch.toLowerCase()));
      
      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchSupplier = supplierFilter === 'ALL' || p.supplierId === supplierFilter;

      return matchSearch && matchCategory && matchStatus && matchSupplier;
    });
  }, [displayedReport, productSearch, categoryFilter, statusFilter, supplierFilter]);

  // Suppliers list for filter dropdown
  const suppliersList = useMemo(() => {
    return (db.partners || []).filter(p => p.type === 'fournisseur');
  }, [db.partners]);

  return (
    <div className="space-y-6 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 🌟 TOP EXECUTIVE AUDIT BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg text-xs font-black uppercase tracking-wider">
                <ClipboardCheck className="w-3.5 h-3.5" />
                {isAr ? `جرد الأسبوع ${displayedReport.weekNumber} / ${displayedReport.year}` : `Inventaire Hebdo Semaine ${displayedReport.weekNumber}`}
              </span>
              
              {db.settings?.enableAutoWeeklyInventory !== false && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-lg text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  {isAr 
                    ? `جرد تلقائي كل ${DAY_LABELS_AR[db.settings?.weeklyInventoryDay || 'friday'] || 'جمعة'}` 
                    : `Auto chaque ${DAY_LABELS_FR[db.settings?.weeklyInventoryDay || 'friday'] || 'Vendredi'}`}
                </span>
              )}

              {selectedHistoricalReport && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded text-xs font-bold">
                  {isAr ? '📁 معاينة من الأرشيف' : '📁 Archive historique'}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black font-display text-white tracking-tight">
              {isAr ? 'الجرد الأسبوعي للمخزون والمزودين' : 'Inventaire Hebdomadaire & Fournisseurs'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAr
                ? 'تدقيق ومراقبة شاملة لكامل السلع، قيمة رأس المال، تنبيهات النواقص، ومستحقات وديون جميع المزودين لتسهيل إعادة التزود.'
                : 'Audit complet du stock, valorisation financière, suivi des ruptures et état financier des fournisseurs pour un réapprovisionnement optimal.'}
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            <button
              onClick={handleRegenerateInstantReport}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
              title={isAr ? 'تحديث وحفظ جرد فوري الآن' : 'Générer un inventaire instantané'}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isAr ? 'جرد فوري الآن' : 'Actualiser le jrad'}</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer active:scale-95"
              title={isAr ? 'تصدير وطباعة تقرير الجرد والمزودين' : 'Imprimer le rapport PDF'}
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'تصدير PDF' : 'Exporter PDF'}</span>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
              title={isAr ? 'إعدادات وتوقيت الجرد التلقائي' : 'Paramètres d\'automatisation'}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 📊 Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-8 pt-6 border-t border-slate-800">
          
          {/* Card 1: Stock Purchase Valuation */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              {isAr ? 'قيمة المخزون (شراء)' : 'Valeur d\'Achat Stock'}
            </span>
            <div className="text-lg md:text-xl font-black text-white font-mono">
              {displayedReport.totalPurchaseValue.toFixed(3)} <span className="text-xs font-normal text-slate-400">DT</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {displayedReport.totalProductsCount} {isAr ? 'صنف سلعي' : 'articles'}
            </span>
          </div>

          {/* Card 2: Stock Retail Valuation */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
              {isAr ? 'قيمة البيع المتوقعة' : 'Valeur de Vente'}
            </span>
            <div className="text-lg md:text-xl font-black text-emerald-400 font-mono">
              {displayedReport.totalSellingValue.toFixed(3)} <span className="text-xs font-normal text-emerald-300">DT</span>
            </div>
            <span className="text-[10px] text-emerald-500 font-bold mt-1 block">
              +{displayedReport.estimatedProfitMargin.toFixed(1)}% {isAr ? 'هامش ربح' : 'marge brute'}
            </span>
          </div>

          {/* Card 3: Supplier Debts & Balances */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-1">
              {isAr ? 'ديون ومستحقات المزودين' : 'Dettes Fournisseurs'}
            </span>
            <div className="text-lg md:text-xl font-black text-rose-400 font-mono">
              {displayedReport.totalSupplierDebts.toFixed(3)} <span className="text-xs font-normal text-rose-300">DT</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {displayedReport.suppliersCount} {isAr ? 'مزود مسجل' : 'fournisseurs'}
            </span>
          </div>

          {/* Card 4: Critical Stock & Shortages */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
              {isAr ? 'تنبيهات النواقص' : 'Alertes de Rupture'}
            </span>
            <div className="text-lg md:text-xl font-black text-amber-400 font-mono">
              {displayedReport.outOfStockCount + displayedReport.lowStockCount}
            </div>
            <span className="text-[10px] text-amber-300 mt-1 block">
              {displayedReport.outOfStockCount} {isAr ? 'نافد تماماً' : 'épuisés (0)'} • {displayedReport.lowStockCount} {isAr ? 'حرج' : 'faibles'}
            </span>
          </div>

          {/* Card 5: Weekly Sales Quantity */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mb-1">
              {isAr ? 'استهلاك ومبيعات الأسبوع' : 'Ventes de la Semaine'}
            </span>
            <div className="text-lg md:text-xl font-black text-blue-400 font-mono">
              {displayedReport.totalWeeklySalesAmount.toFixed(3)} <span className="text-xs font-normal text-blue-300">DT</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {displayedReport.totalWeeklySoldUnits} {isAr ? 'قطعة مباعة' : 'unités vendues'}
            </span>
          </div>

        </div>
      </div>

      {/* 🧭 NAVIGATION SUB-TABS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'products'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>{isAr ? 'جرد السلع والبضاعة' : 'Inventaire Produits'}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-mono">
              {displayedReport.productsSnapshot.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('suppliers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'suppliers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{isAr ? 'المزودين والموردين (شكون المزود؟)' : 'Audit Fournisseurs'}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-mono">
              {displayedReport.suppliersSummary.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{isAr ? 'أرشيف الأسابيع السابقة' : 'Archives Hebdo'}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-mono">
              {archives.length}
            </span>
          </button>
        </div>

        {selectedHistoricalReport && (
          <button
            onClick={() => setSelectedHistoricalReport(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold cursor-pointer hover:bg-amber-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isAr ? 'العودة للجرد الحالي' : 'Retour au jrad actuel'}</span>
          </button>
        )}
      </div>

      {/* 📦 SUB-TAB 1: PRODUCTS INVENTORY TABLE */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 rtl:right-3 rtl:left-auto text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم، الباركود، أو اسم المزود...' : 'Recherche par nom, code, fournisseur...'}
                className="w-full pl-9 rtl:pr-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  statusFilter === 'ALL' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500'
                }`}
              >
                {isAr ? 'الكل' : 'Tous'}
              </button>
              <button
                onClick={() => setStatusFilter('optimal')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  statusFilter === 'optimal' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:text-emerald-500'
                }`}
              >
                {isAr ? 'متوفر' : 'Normal'}
              </button>
              <button
                onClick={() => setStatusFilter('low')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  statusFilter === 'low' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:text-amber-500'
                }`}
              >
                {isAr ? 'حرج' : 'Faible'}
              </button>
              <button
                onClick={() => setStatusFilter('out_of_stock')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                  statusFilter === 'out_of_stock' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-rose-500'
                }`}
              >
                {isAr ? 'نافد (0)' : 'Rupture (0)'}
              </button>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="ALL">{isAr ? 'كل الأصناف' : 'Toutes les catégories'}</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Supplier Filter */}
            {suppliersList.length > 0 && (
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="ALL">{isAr ? 'تصفية حسب المزود (الكل)' : 'Tous les fournisseurs'}</option>
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Products Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 text-start">{isAr ? 'السلعة والباركود' : 'Article & Code'}</th>
                    <th className="py-3 px-3 text-start">{isAr ? 'المزود المورد' : 'Fournisseur'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'المخزون الحالي' : 'Stock Actuel'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'حد الأمان' : 'Seuil Min'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'سعر الشراء' : 'Prix Achat'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'سعر البيع' : 'Prix Vente'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'إجمالي قيمة الشراء' : 'Valeur Achat'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'مبيعات الأسبوع' : 'Ventes Hebdo'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'État'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Boxes className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="font-bold">{isAr ? 'لا توجد سلع مطابقة لخيارات البحث.' : 'Aucun article trouvé.'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      return (
                        <tr key={p.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{p.name}</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>{p.code || '-'}</span>
                              <span>•</span>
                              <span className="text-slate-500">{p.category}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {p.supplierName ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-800">
                                <Truck className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[140px]">{p.supplierName}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                {isAr ? 'غير محدد' : 'Non assigné'}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block font-bold font-mono px-2.5 py-0.5 rounded text-xs ${
                              p.stockQty <= 0 
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' 
                                : p.stockQty <= p.minAlertQty 
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                            }`}>
                              {p.stockQty}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {p.minAlertQty}
                          </td>

                          <td className="py-3 px-3 text-end font-mono font-medium text-slate-700 dark:text-slate-300">
                            {p.purchasePrice.toFixed(3)}
                          </td>

                          <td className="py-3 px-3 text-end font-mono font-bold text-slate-800 dark:text-slate-100">
                            {p.sellingPrice.toFixed(3)}
                          </td>

                          <td className="py-3 px-3 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {p.totalPurchaseValue.toFixed(3)} DT
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {p.weeklySoldQty ? `+${p.weeklySoldQty}` : '0'}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {p.status === 'out_of_stock' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[9px] uppercase">
                                <XCircle className="w-3 h-3" />
                                {isAr ? 'نفد (0)' : 'Rupture'}
                              </span>
                            ) : p.status === 'low' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[9px] uppercase">
                                <AlertTriangle className="w-3 h-3" />
                                {isAr ? 'حرج' : 'Faible'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] uppercase border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                {isAr ? 'متوفر' : 'Normal'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between text-xs text-slate-500 font-semibold gap-2">
              <span>{isAr ? `إجمالي السلع المعروضة: ${filteredProducts.length}` : `Articles affichés: ${filteredProducts.length}`}</span>
              <span>
                {isAr ? 'مجموع قيمة الشراء للسلع المعروضة: ' : 'Total valeur d\'achat: '}
                <strong className="text-slate-800 dark:text-slate-100 font-mono">
                  {filteredProducts.reduce((sum, p) => sum + p.totalPurchaseValue, 0).toFixed(3)} DT
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🚚 SUB-TAB 2: SUPPLIERS AUDIT & MERCHANDISE LINKING (المزودين شكون) */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedReport.suppliersSummary.map((sup) => {
              const hasCritical = sup.criticalProductsCount > 0;
              return (
                <div 
                  key={sup.supplierId}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                          {isAr ? 'مزود معتمد' : 'Fournisseur'}
                        </span>
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 leading-tight">
                          {sup.supplierName}
                        </h3>
                      </div>

                      {hasCritical && (
                        <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{sup.criticalProductsCount} {isAr ? 'ناقص' : 'manquant'}</span>
                        </span>
                      )}
                    </div>

                    {/* Contacts info */}
                    <div className="space-y-1 text-xs text-slate-500">
                      {sup.supplierPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{sup.supplierPhone}</span>
                        </div>
                      )}
                      {sup.supplierAddress && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{sup.supplierAddress}</span>
                        </div>
                      )}
                    </div>

                    {/* Financial & Stock stats */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          {isAr ? 'السلع الموردة' : 'Articles liés'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 font-mono text-sm">
                          {sup.productsCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          {isAr ? 'قيمة مخزونه' : 'Valeur Stock'}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          {sup.totalStockValue.toFixed(3)} <span className="text-[10px]">DT</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          {isAr ? 'ديون مستحقة له' : 'Solde / Dettes'}
                        </span>
                        <span className={`font-bold font-mono text-sm ${sup.currentBalance < 0 ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}>
                          {Math.abs(sup.currentBalance).toFixed(3)} <span className="text-[10px]">DT</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          {isAr ? 'مشتريات الأسبوع' : 'Achats Hebdo'}
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm">
                          {sup.weeklyPurchasesAmount.toFixed(3)} <span className="text-[10px]">DT</span>
                        </span>
                      </div>
                    </div>

                    {/* Critical Products Reorder Suggestions */}
                    {hasCritical && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {isAr ? 'طلبية مقترحة للسلع الناقصة:' : 'Réapprovisionnement conseillé :'}
                        </span>
                        <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                          {sup.criticalProductsList.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                              <span className="truncate max-w-[160px] font-medium">{item.name}</span>
                              <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">
                                {isAr ? `اطلب +${item.suggestedReorderQty}` : `+${item.suggestedReorderQty} pcs`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSupplierForDetails(sup)}
                      className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      {isAr ? 'عرض كل سلعه 📋' : 'Voir ses articles 📋'}
                    </button>

                    {sup.supplierPhone && (
                      <a
                        href={`tel:${sup.supplierPhone}`}
                        className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                        title={isAr ? 'اتصال بالمزود' : 'Appeler'}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {sup.supplierPhone && (
                      <a
                        href={`https://wa.me/${sup.supplierPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `السلام عليكم، طلبيات إعادة التزود من متجر ${db.settings?.storeName || 'INNOVA'}:\n` +
                          sup.criticalProductsList.map(p => `- ${p.name}: مطلوب ${p.suggestedReorderQty} قطعة`).join('\n')
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                        title={isAr ? 'إرسال طلبية عبر WhatsApp' : 'WhatsApp Bon de commande'}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 📜 SUB-TAB 3: ARCHIVES & PREVIOUS WEEKS */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
              {isAr ? 'سجل جرود الأسابيع المحفوظة' : 'Historique des inventaires hebdomadaires'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'يتم أرشفة جرد كل أسبوع تلقائياً للرجوع إليه ومقارنة تطور رأس المال والمخزون.'
                : 'Chaque inventaire hebdomadaire est sauvegardé pour le suivi financier et l\'historique.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archives.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-bold">{isAr ? 'لا يوجد جرود سابقة مؤرشفة بعد.' : 'Aucun historique d\'inventaire.'}</p>
                <button
                  onClick={handleRegenerateInstantReport}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'إنشاء أول جرد الآن' : 'Créer le premier inventaire'}
                </button>
              </div>
            ) : (
              archives.map((rep) => {
                const isSelected = selectedHistoricalReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => {
                      setSelectedHistoricalReport(rep);
                      setActiveSubTab('products');
                      showToast(isAr ? `تم تحميل جرد الأسبوع ${rep.weekNumber} / ${rep.year}` : `Inventaire S${rep.weekNumber} chargé`, 'info');
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-black">
                        {isAr ? `الأسبوع ${rep.weekNumber} / ${rep.year}` : `Semaine ${rep.weekNumber} / ${rep.year}`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{rep.date}</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isAr ? 'قيمة الشراء:' : 'Valeur Achat:'}</span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-100">{rep.totalPurchaseValue.toFixed(3)} DT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isAr ? 'قيمة البيع:' : 'Valeur Vente:'}</span>
                        <span className="font-bold font-mono text-emerald-600">{rep.totalSellingValue.toFixed(3)} DT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isAr ? 'ديون المزودين:' : 'Dettes Fournisseurs:'}</span>
                        <span className="font-bold font-mono text-rose-500">{rep.totalSupplierDebts.toFixed(3)} DT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isAr ? 'النواقص:' : 'Alertes:'}</span>
                        <span className="font-bold font-mono text-amber-500">{rep.outOfStockCount + rep.lowStockCount}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-bold">
                      <span>{isAr ? 'معاينة هذا التقرير 🔍' : 'Consulter ce rapport 🔍'}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportWeeklyInventoryToPDF(rep, db.settings, language);
                        }}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-emerald-500"
                        title={isAr ? 'تحميل PDF' : 'Télécharger PDF'}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ⚙️ AUTOMATIC INVENTORY SETTINGS MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {isAr ? 'إعدادات الجرد الأسبوعي التلقائي' : 'Paramètres d\'inventaire automatique'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'تحديد يوم وتوقيت الجرد التلقائي' : 'Planification et automatisation'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Enable toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block">
                      {isAr ? 'تفعيل الجرد التلقائي الأسبوعي' : 'Activer l\'inventaire automatique'}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {isAr ? 'يقوم بحفظ تقرير تدقيق المخزون والمزودين تلقائياً' : 'Génère et sauvegarde l\'audit chaque semaine'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoInventoryEnabled}
                    onChange={(e) => setAutoInventoryEnabled(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Day selector */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'يوم الجرد المفضل (الافتراضي: كل جمعة)' : 'Jour de l\'inventaire (Défaut: Vendredi)'}
                  </label>
                  <select
                    value={scheduledDay}
                    onChange={(e) => setScheduledDay(e.target.value)}
                    disabled={!autoInventoryEnabled}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="friday">{isAr ? 'يوم الجمعة (Vendredi) ⭐' : 'Vendredi ⭐'}</option>
                    <option value="saturday">{isAr ? 'يوم السبت (Samedi)' : 'Samedi'}</option>
                    <option value="sunday">{isAr ? 'يوم الأحد (Dimanche)' : 'Dimanche'}</option>
                    <option value="monday">{isAr ? 'يوم الإثنين (Lundi)' : 'Lundi'}</option>
                    <option value="tuesday">{isAr ? 'يوم الثلاثاء (Mardi)' : 'Mardi'}</option>
                    <option value="wednesday">{isAr ? 'يوم الأربعاء (Mercredi)' : 'Mercredi'}</option>
                    <option value="thursday">{isAr ? 'يوم الخميس (Jeudi)' : 'Jeudi'}</option>
                  </select>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-900/40 text-[11px] leading-relaxed">
                  {isAr
                    ? '💡 بمجرد حلول يوم الجمعة، سيقوم النظام تلقائياً بإنشاء وحفظ تقرير شامل بكافة السلع ورصيد كل مزود مع تنبيهك فور الدخول.'
                    : '💡 Chaque vendredi, le système archive automatiquement un instantané complet de votre stock et de vos soldes fournisseurs.'}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-blue-600/30"
                >
                  {isAr ? 'حفظ الإعدادات' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔍 MODAL: SUPPLIER DETAILS & MERCHANDISE LIST */}
      <AnimatePresence>
        {selectedSupplierForDetails && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {selectedSupplierForDetails.supplierName}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAr 
                        ? `قائمة السلع الموردة (${selectedSupplierForDetails.productsCount} صنف)` 
                        : `Articles fournis (${selectedSupplierForDetails.productsCount} articles)`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSupplierForDetails(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold text-[10px] uppercase">
                      <th className="py-2.5 px-3 text-start">{isAr ? 'السلعة' : 'Article'}</th>
                      <th className="py-2.5 px-3 text-center">{isAr ? 'المخزون' : 'Stock'}</th>
                      <th className="py-2.5 px-3 text-center">{isAr ? 'حد الأمان' : 'Min'}</th>
                      <th className="py-2.5 px-3 text-end">{isAr ? 'سعر الشراء' : 'Prix Achat'}</th>
                      <th className="py-2.5 px-3 text-end">{isAr ? 'سعر البيع' : 'Prix Vente'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedSupplierForDetails.allProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-100">
                          {p.name}
                          <span className="block text-[10px] text-slate-400 font-mono">{p.code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          <span className={p.stock <= p.minAlertQty ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {p.minAlertQty}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono text-slate-600 dark:text-slate-300">
                          {p.purchasePrice.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-600">
                          {p.sellingPrice.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedSupplierForDetails(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Fermer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
