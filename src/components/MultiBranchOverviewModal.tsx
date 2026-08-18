import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DatabaseState, BranchMeta } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { getSuperetteDatabase } from '../utils/db';
import { loadUserDatabase } from '../utils/firebaseSync';
import { 
  Building2, 
  TrendingUp, 
  Boxes, 
  DollarSign, 
  FileText, 
  X, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Phone,
  MapPin,
  Sparkles
} from 'lucide-react';

interface BranchStats {
  branch: BranchMeta;
  productsCount: number;
  stockValue: number;
  totalRevenue: number;
  totalInvoicesCount: number;
  totalCreditRemaining: number;
  todaySales: number;
}

interface MultiBranchOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: BranchMeta[];
  currentBranchId: string;
  onSwitchBranch: (branchId: string) => void;
  user?: any;
}

export default function MultiBranchOverviewModal({
  isOpen,
  onClose,
  branches,
  currentBranchId,
  onSwitchBranch,
  user
}: MultiBranchOverviewModalProps) {
  const { language, formatCurrency } = useLanguage();
  const [stats, setStats] = useState<BranchStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAllBranchStats = async () => {
    setIsLoading(true);
    const userId = user ? user.uid : 'default';
    const todayStr = new Date().toISOString().split('T')[0];

    const results: BranchStats[] = [];

    for (const b of branches) {
      let bDb: DatabaseState = getSuperetteDatabase(userId, b.id);
      if (user) {
        try {
          const cloudDb = await loadUserDatabase(user.uid, b.id);
          if (cloudDb) bDb = cloudDb;
        } catch (e) {}
      }

      const products = bDb.products || [];
      const invoices = bDb.invoices || [];

      const stockVal = products.reduce((acc, p) => acc + (p.purchasePrice * (p.stock || 0)), 0);
      const totalRev = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
      const totalCredit = invoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);
      
      const todaySalesAmt = invoices
        .filter(inv => inv.date && inv.date.startsWith(todayStr))
        .reduce((acc, inv) => acc + (inv.total || 0), 0);

      results.push({
        branch: b,
        productsCount: products.length,
        stockValue: stockVal,
        totalRevenue: totalRev,
        totalInvoicesCount: invoices.length,
        totalCreditRemaining: totalCredit,
        todaySales: todaySalesAmt
      });
    }

    setStats(results);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadAllBranchStats();
    }
  }, [isOpen, branches]);

  if (!isOpen) return null;

  const totalGlobalStockValue = stats.reduce((acc, s) => acc + s.stockValue, 0);
  const totalGlobalRevenue = stats.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalGlobalInvoices = stats.reduce((acc, s) => acc + s.totalInvoicesCount, 0);
  const totalGlobalTodaySales = stats.reduce((acc, s) => acc + s.todaySales, 0);

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-6 space-y-6 relative max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rtl:left-5 rtl:right-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={language === 'ar' ? 'إغلاق' : 'Fermer'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <span>{language === 'ar' ? '📊 التقرير المالي الموحد لجميع الفروع' : '📊 Rapport Global Consolidé Multi-Branches'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
                  {branches.length} {language === 'ar' ? 'فروع' : 'branches'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'رؤية مالية مجمعة تشمل إجمالي المبيعات، قيمة المخزونات، وأداء كل نقطة بيع مستقلة.' 
                  : 'Vue analytique globale des performances commerciales et des stocks de toutes vos succursales.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAllBranchStats}
            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={language === 'ar' ? 'تحديث الإحصائيات' : 'Actualiser'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Consolidated Global KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-800/60 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
              {language === 'ar' ? 'مبيعات اليوم الإجمالية' : 'Ventes Aujourd’hui'}
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : formatCurrency(totalGlobalTodaySales)}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              {language === 'ar' ? 'إجمالي المداخيل المحصلة' : 'Revenu Global Encaissé'}
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : formatCurrency(totalGlobalRevenue)}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-slate-900 border border-purple-200 dark:border-purple-800/60 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
              {language === 'ar' ? 'قيمة المخزون الكلي' : 'Valeur Globale du Stock'}
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : formatCurrency(totalGlobalStockValue)}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-slate-900 border border-amber-200 dark:border-amber-800/60 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
              {language === 'ar' ? 'إجمالي المعاملات والفواتير' : 'Total des Ventes (Factures)'}
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {isLoading ? '...' : totalGlobalInvoices}
            </div>
          </div>
        </div>

        {/* Per-Branch Breakdown Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {language === 'ar' ? 'مقارنة أداء الفروع الفردية' : 'Détail par Succursale'}
            </h4>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">{language === 'ar' ? 'جاري تجميع بيانات الفروع...' : 'Chargement des données...'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.map(({ branch, productsCount, stockValue, totalRevenue, totalInvoicesCount, todaySales }) => {
                const isActive = branch.id === currentBranchId;
                return (
                  <div
                    key={branch.id}
                    className={`p-5 rounded-2xl border transition-all space-y-4 ${
                      isActive 
                        ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 shadow-md ring-1 ring-blue-500/20' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            🏢 {branch.name}
                          </span>
                          {branch.isMain && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                              {language === 'ar' ? 'الفرع الرئيسي' : 'Siège Principal'}
                            </span>
                          )}
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{language === 'ar' ? 'الفرع النشط حالياً' : 'Actif'}</span>
                            </span>
                          )}
                        </div>

                        {(branch.address || branch.city || branch.phone) && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            {branch.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{branch.address} {branch.city ? `(${branch.city})` : ''}</span>
                              </span>
                            )}
                            {branch.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{branch.phone}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchBranch(branch.id);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
                        >
                          <span>{language === 'ar' ? 'فتح الفرع' : 'Basculer'}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{language === 'ar' ? 'قيد العمل' : 'En cours'}</span>
                        </span>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-center">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[9.5px] text-slate-400 font-bold block mb-0.5">
                          {language === 'ar' ? 'مبيعات اليوم' : 'Aujourd’hui'}
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(todaySales)}
                        </span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[9.5px] text-slate-400 font-bold block mb-0.5">
                          {language === 'ar' ? 'المخزون (السلع)' : 'Nb Articles'}
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {productsCount} {language === 'ar' ? 'سلعة' : 'art.'}
                        </span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[9.5px] text-slate-400 font-bold block mb-0.5">
                          {language === 'ar' ? 'قيمة البضاعة' : 'Val. Stock'}
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(stockValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            {language === 'ar' ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
