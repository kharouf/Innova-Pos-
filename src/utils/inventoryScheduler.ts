import { DatabaseState, Product, Partner, Invoice, Traite, WeeklyInventoryReport, WeeklyInventoryProductSnapshot, WeeklyInventorySupplierSummary, StoreSettings } from '../types';
import { safeLocalStorage } from './storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Calculates ISO week number and year
 */
export function getWeekNumber(date: Date = new Date()): { week: number; year: number } {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { week, year: date.getFullYear() };
}

const DAY_NAMES: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

const DAY_LABELS_AR: Record<string, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت'
};

const DAY_LABELS_FR: Record<string, string> = {
  sunday: 'Dimanche',
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi'
};

export { DAY_LABELS_AR, DAY_LABELS_FR };

/**
 * Generates an instantaneous Weekly Inventory & Supplier Audit Report snapshot
 */
export function generateWeeklyInventoryReport(
  db: DatabaseState,
  branchId: string = 'default',
  branchName: string = 'الفرع الرئيسي',
  isAuto: boolean = false
): WeeklyInventoryReport {
  const now = new Date();
  const { week, year } = getWeekNumber(now);
  const dateStr = now.toISOString().split('T')[0];
  const dayOfWeekKey = DAY_NAMES[now.getDay()] || 'friday';

  const products = db.products || [];
  const partners = db.partners || [];
  const invoices = db.invoices || [];
  const traites = db.traites || [];

  // Filter sales for the last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyInvoices = invoices.filter(inv => {
    try {
      const invDate = new Date(inv.date);
      return invDate >= sevenDaysAgo && invDate <= now;
    } catch {
      return false;
    }
  });

  // Calculate sold quantities per product in the last 7 days
  const weeklySoldMap: Record<string, number> = {};
  let totalWeeklySalesAmount = 0;
  let totalWeeklySoldUnits = 0;

  weeklyInvoices.forEach(inv => {
    if (!inv.isReturn) {
      totalWeeklySalesAmount += inv.total || 0;
    } else {
      totalWeeklySalesAmount -= inv.total || 0;
    }

    inv.items?.forEach(item => {
      const pId = item.productId;
      const qty = inv.isReturn ? -item.qty : item.qty;
      weeklySoldMap[pId] = (weeklySoldMap[pId] || 0) + qty;
      totalWeeklySoldUnits += qty;
    });
  });

  // Map suppliers for quick lookup
  const supplierPartners = partners.filter(p => p.type === 'fournisseur');
  const supplierMap = new Map<string, Partner>();
  supplierPartners.forEach(s => supplierMap.set(s.id, s));

  // Build product snapshots
  let totalStockUnits = 0;
  let totalPurchaseValue = 0;
  let totalSellingValue = 0;
  let optimalCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const productsSnapshot: WeeklyInventoryProductSnapshot[] = products.map(p => {
    const stock = Number(p.stock || 0);
    const minAlert = Number(p.minAlertQty || 5);
    const pPrice = Number(p.purchasePrice || 0);
    const sPrice = Number(p.sellingPrice || 0);
    const pVal = stock * pPrice;
    const sVal = stock * sPrice;

    totalStockUnits += stock;
    totalPurchaseValue += pVal;
    totalSellingValue += sVal;

    let status: 'optimal' | 'low' | 'out_of_stock' = 'optimal';
    if (stock <= 0) {
      status = 'out_of_stock';
      outOfStockCount++;
    } else if (stock <= minAlert) {
      status = 'low';
      lowStockCount++;
    } else {
      optimalCount++;
    }

    // Try finding supplier name
    let sName = p.supplierName;
    if (!sName && p.supplierId && supplierMap.has(p.supplierId)) {
      sName = supplierMap.get(p.supplierId)?.name;
    }

    return {
      productId: p.id,
      code: p.code || '',
      name: p.name,
      category: p.category || 'Général',
      supplierId: p.supplierId,
      supplierName: sName,
      stockQty: stock,
      minAlertQty: minAlert,
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      totalPurchaseValue: pVal,
      totalSellingValue: sVal,
      status,
      weeklySoldQty: weeklySoldMap[p.id] || 0
    };
  });

  // Estimated gross profit on current inventory
  const estimatedProfitMargin = totalSellingValue > 0 
    ? ((totalSellingValue - totalPurchaseValue) / totalSellingValue) * 100 
    : 0;

  // Build Supplier Summaries
  let totalSupplierDebts = 0;
  const suppliersSummary: WeeklyInventorySupplierSummary[] = [];

  // Group products by supplier
  const supplierProductsMap = new Map<string, Product[]>();
  products.forEach(p => {
    const sId = p.supplierId || 'unassigned';
    if (!supplierProductsMap.has(sId)) {
      supplierProductsMap.set(sId, []);
    }
    supplierProductsMap.get(sId)!.push(p);
  });

  // Process known suppliers
  supplierPartners.forEach(sup => {
    const supProducts = supplierProductsMap.get(sup.id) || [];
    let supStockValue = 0;
    let criticalCount = 0;
    const criticalList: WeeklyInventorySupplierSummary['criticalProductsList'] = [];
    const allProdList: WeeklyInventorySupplierSummary['allProducts'] = [];

    supProducts.forEach(p => {
      const stock = Number(p.stock || 0);
      const minAlert = Number(p.minAlertQty || 5);
      const pPrice = Number(p.purchasePrice || 0);
      supStockValue += stock * pPrice;

      allProdList.push({
        id: p.id,
        code: p.code || '',
        name: p.name,
        stock,
        minAlertQty: minAlert,
        purchasePrice: pPrice,
        sellingPrice: Number(p.sellingPrice || 0)
      });

      if (stock <= minAlert) {
        criticalCount++;
        const suggestedReorder = Math.max(minAlert * 2 - stock, 10);
        criticalList.push({
          id: p.id,
          code: p.code || '',
          name: p.name,
          stock,
          minAlertQty: minAlert,
          purchasePrice: pPrice,
          suggestedReorderQty: suggestedReorder
        });
      }
    });

    // Supplier balance & pending traites
    // In our system, positive or negative balance conventions: supplier balance negative means store owes supplier
    const balance = sup.currentBalance || 0;
    const absDebt = balance < 0 ? Math.abs(balance) : (balance > 0 ? balance : 0);
    totalSupplierDebts += absDebt;

    // Supplier pending traites
    const supTraites = traites.filter(t => t.partnerId === sup.id && t.status === 'pending');
    const pendingTraitesAmount = supTraites.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Purchases recorded this week
    const weeklyPurchasesAmount = weeklyInvoices
      .filter(inv => inv.partnerId === sup.id && inv.type === 'bl')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    suppliersSummary.push({
      supplierId: sup.id,
      supplierName: sup.name,
      supplierPhone: sup.phone,
      supplierAddress: sup.address,
      supplierEmail: sup.email,
      productsCount: supProducts.length,
      totalStockValue: supStockValue,
      currentBalance: balance,
      pendingTraitesAmount,
      weeklyPurchasesAmount,
      criticalProductsCount: criticalCount,
      criticalProductsList: criticalList,
      allProducts: allProdList
    });
  });

  // Handle unassigned products if any
  const unassignedProds = supplierProductsMap.get('unassigned') || [];
  if (unassignedProds.length > 0) {
    let unassignedVal = 0;
    let criticalCount = 0;
    const criticalList: WeeklyInventorySupplierSummary['criticalProductsList'] = [];
    const allProdList: WeeklyInventorySupplierSummary['allProducts'] = [];

    unassignedProds.forEach(p => {
      const stock = Number(p.stock || 0);
      const minAlert = Number(p.minAlertQty || 5);
      const pPrice = Number(p.purchasePrice || 0);
      unassignedVal += stock * pPrice;

      allProdList.push({
        id: p.id,
        code: p.code || '',
        name: p.name,
        stock,
        minAlertQty: minAlert,
        purchasePrice: pPrice,
        sellingPrice: Number(p.sellingPrice || 0)
      });

      if (stock <= minAlert) {
        criticalCount++;
        criticalList.push({
          id: p.id,
          code: p.code || '',
          name: p.name,
          stock,
          minAlertQty: minAlert,
          purchasePrice: pPrice,
          suggestedReorderQty: Math.max(minAlert * 2 - stock, 10)
        });
      }
    });

    suppliersSummary.push({
      supplierId: 'unassigned',
      supplierName: 'سلع بدون مزود محدد (Non assigné)',
      productsCount: unassignedProds.length,
      totalStockValue: unassignedVal,
      currentBalance: 0,
      pendingTraitesAmount: 0,
      weeklyPurchasesAmount: 0,
      criticalProductsCount: criticalCount,
      criticalProductsList: criticalList,
      allProducts: allProdList
    });
  }

  const generatedFormatted = now.toLocaleDateString('fr-TN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    id: `inv-week-${year}-W${week.toString().padStart(2, '0')}-${Date.now()}`,
    date: dateStr,
    generatedAt: generatedFormatted,
    weekNumber: week,
    year,
    dayOfWeek: dayOfWeekKey,
    branchId,
    branchName,
    totalProductsCount: products.length,
    totalStockUnits,
    totalPurchaseValue,
    totalSellingValue,
    estimatedProfitMargin,
    optimalCount,
    lowStockCount,
    outOfStockCount,
    totalWeeklySalesAmount,
    totalWeeklySoldUnits,
    suppliersCount: supplierPartners.length,
    totalSupplierDebts,
    suppliersSummary,
    productsSnapshot,
    notes: `Inventaire automatique semaine ${week}/${year}`,
    generatedAutomatically: isAuto
  };
}

/**
 * Storage helpers for weekly inventory archive
 */
export function getSavedWeeklyInventories(branchId: string = 'default'): WeeklyInventoryReport[] {
  const key = `weekly_inventories_${branchId}`;
  const raw = safeLocalStorage.getItem(key);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveWeeklyInventoryReport(report: WeeklyInventoryReport, branchId: string = 'default'): WeeklyInventoryReport[] {
  const currentList = getSavedWeeklyInventories(branchId);
  // Keep last 52 weeks of reports
  const updatedList = [report, ...currentList.filter(r => r.id !== report.id)].slice(0, 52);
  safeLocalStorage.setItem(`weekly_inventories_${branchId}`, JSON.stringify(updatedList));
  return updatedList;
}

/**
 * Automatic Weekly Check Trigger:
 * Executes automatic inventory if enabled and today matches the scheduled day (or >= 7 days passed)
 */
export function checkAndRunAutoWeeklyInventory(
  db: DatabaseState,
  onUpdateDb: (newDb: DatabaseState) => void,
  branchId: string = 'default',
  branchName: string = 'الفرع الرئيسي'
): { ran: boolean; report?: WeeklyInventoryReport } {
  const settings: StoreSettings = db.settings || {
    storeName: 'INNOVA POS PRO',
    storePhone: '+216 24260711',
    storeAddress: 'AVENU HABIB BORGIBA GHANNOUCHE GABES',
    activitySector: 'superette'
  };
  if (settings.enableAutoWeeklyInventory === false) {
    return { ran: false };
  }

  const now = new Date();
  const todayDayName = DAY_NAMES[now.getDay()]; // e.g. 'friday'
  const targetDay = settings.weeklyInventoryDay || 'friday'; // Default Friday (كل جمعة)

  const todayDateStr = now.toISOString().split('T')[0];
  const lastRunDateStr = settings.lastAutoWeeklyInventoryDate;

  // If already ran today, skip
  if (lastRunDateStr === todayDateStr) {
    return { ran: false };
  }

  // Check if today matches the scheduled day, or if more than 7 days have passed since last run
  let shouldRun = false;
  if (todayDayName === targetDay) {
    shouldRun = true;
  } else if (lastRunDateStr) {
    const lastRunDate = new Date(lastRunDateStr);
    const diffDays = (now.getTime() - lastRunDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays >= 7) {
      shouldRun = true;
    }
  } else {
    // Never ran before, generate the initial baseline snapshot
    shouldRun = true;
  }

  if (shouldRun) {
    const newReport = generateWeeklyInventoryReport(db, branchId, branchName, true);
    saveWeeklyInventoryReport(newReport, branchId);

    const updatedSettings: StoreSettings = {
      ...settings,
      lastAutoWeeklyInventoryDate: todayDateStr
    };

    onUpdateDb({
      ...db,
      settings: updatedSettings
    });

    return { ran: true, report: newReport };
  }

  return { ran: false };
}

/**
 * Generates and downloads a clean, professional PDF Audit Report for Weekly Inventory & Suppliers
 */
export function exportWeeklyInventoryToPDF(
  report: WeeklyInventoryReport,
  settings?: StoreSettings,
  language: string = 'ar'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const isAr = language === 'ar';
  const storeName = settings?.storeName || 'INNOVA POS PRO';
  const storePhone = settings?.storePhone || '';
  const storeAddress = settings?.storeAddress || '';

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(isAr ? `RAPPORT D'INVENTAIRE HEBDOMADAIRE & FOURNISSEURS` : `RAPPORT D'INVENTAIRE HEBDOMADAIRE & FOURNISSEURS`, 105, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Semaine ${report.weekNumber} / ${report.year} • Date: ${report.date} • ${report.branchName || 'Magasin'}`, 105, 20, { align: 'center' });
  doc.text(`${storeName} ${storePhone ? `• Tel: ${storePhone}` : ''}`, 105, 26, { align: 'center' });

  // Key Metric Cards (Row 1)
  const startY = 38;
  
  // Card 1: Total Stock Valuation
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(12, startY, 44, 20, 2, 2, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(isAr ? "VALEUR D'ACHAT STOCK" : "VALEUR D'ACHAT STOCK", 34, startY + 6, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`${report.totalPurchaseValue.toFixed(3)} DT`, 34, startY + 14, { align: 'center' });

  // Card 2: Retail Valuation
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(60, startY, 44, 20, 2, 2, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text(isAr ? "VALEUR DE VENTE" : "VALEUR DE VENTE", 82, startY + 6, { align: 'center' });
  doc.setTextColor(16, 185, 129); // Emerald
  doc.setFontSize(11);
  doc.text(`${report.totalSellingValue.toFixed(3)} DT`, 82, startY + 14, { align: 'center' });

  // Card 3: Supplier Debts
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(108, startY, 44, 20, 2, 2, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text(isAr ? "DETTES FOURNISSEURS" : "DETTES FOURNISSEURS", 130, startY + 6, { align: 'center' });
  doc.setTextColor(225, 29, 72); // Rose
  doc.setFontSize(11);
  doc.text(`${report.totalSupplierDebts.toFixed(3)} DT`, 130, startY + 14, { align: 'center' });

  // Card 4: Stock Alerts Count
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(156, startY, 42, 20, 2, 2, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text(isAr ? "RUPTURES / CRITIQUES" : "RUPTURES / CRITIQUES", 177, startY + 6, { align: 'center' });
  doc.setTextColor(217, 119, 6); // Amber
  doc.setFontSize(11);
  doc.text(`${report.outOfStockCount + report.lowStockCount} Articles`, 177, startY + 14, { align: 'center' });

  // Section 1: Suppliers Summary Table (المزودين شكون)
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`1. RECAPITULATIF DES FOURNISSEURS (${report.suppliersSummary.length})`, 12, startY + 28);

  const supplierRows = report.suppliersSummary.map(s => [
    s.supplierName,
    s.supplierPhone || '-',
    s.productsCount.toString(),
    `${s.totalStockValue.toFixed(3)} DT`,
    s.criticalProductsCount > 0 ? `${s.criticalProductsCount} ALERTE(S)` : 'OK',
    `${Math.abs(s.currentBalance).toFixed(3)} DT`
  ]);

  autoTable(doc, {
    startY: startY + 31,
    head: [['Fournisseur / Distributeur', 'Telephone', 'Nb Articles', 'Valeur Stock', 'Articles Manquants', 'Solde / Dette']],
    body: supplierRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 28 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 12, right: 12 }
  });

  // Section 2: Critical Stock Requiring Immediate Supplier Order
  const lastTableY = (doc as any).lastAutoTable.finalY || 120;
  
  const criticalItems = report.productsSnapshot.filter(p => p.status === 'low' || p.status === 'out_of_stock');
  
  if (lastTableY + 40 < 270) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`2. ARTICLES CRITIQUES A RECOMMANDER AUX FOURNISSEURS (${criticalItems.length})`, 12, lastTableY + 10);

    const criticalRows = criticalItems.slice(0, 25).map(p => [
      p.code || '-',
      p.name,
      p.supplierName || 'Non assigne',
      `${p.stockQty}`,
      `${p.minAlertQty}`,
      `${p.purchasePrice.toFixed(3)} DT`,
      p.status === 'out_of_stock' ? 'RUPTURE (0)' : 'FAIBLE'
    ]);

    autoTable(doc, {
      startY: lastTableY + 13,
      head: [['Code SKU', 'Article', 'Fournisseur Associe', 'Stock Actuel', 'Seuil Min', 'Prix Achat', 'Etat']],
      body: criticalRows,
      theme: 'striped',
      headStyles: { fillColor: [190, 18, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 55 },
        2: { cellWidth: 40 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 20, halign: 'center' }
      },
      margin: { left: 12, right: 12 }
    });
  }

  // Footer note
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Genere automatiquement par INNOVA POS PRO • Date: ${report.generatedAt}`, 105, pageHeight - 8, { align: 'center' });

  doc.save(`Inventaire_Hebdomadaire_S${report.weekNumber}_${report.year}.pdf`);
}
