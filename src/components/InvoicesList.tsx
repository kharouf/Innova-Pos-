import React, { useState, useMemo } from 'react';
import { DatabaseState, Invoice } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { showToast } from '../utils/toast';
import { 
  FileText, 
  Search, 
  Eye, 
  Printer, 
  DollarSign, 
  ChevronRight,
  Sparkles,
  Receipt,
  CheckCircle,
  X,
  Download
} from 'lucide-react';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { checkIsIframe } from '../utils/storage';

interface InvoicesListProps {
  db: DatabaseState;
  onUpdateDb: (updatedDb: DatabaseState) => void;
}

export default function InvoicesList({ db, onUpdateDb }: InvoicesListProps) {
  const { language, t, formatCurrency } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'facture' | 'bl' | 'return'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Neat items count per page

  // Preview / Settle state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentInput, setPaymentInput] = useState<string>('');
  const [printFormat, setPrintFormat] = useState<'a4' | 'ticket'>(
    db.settings?.activitySector === 'superette' ? 'ticket' : 'a4'
  );

  const filteredInvoices = useMemo(() => {
    return (db.invoices || []).filter(inv => {
      const matchSearch = inv.number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inv.partnerName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchType = true;
      if (typeFilter === 'facture') matchType = inv.type === 'facture' && !inv.isReturn;
      if (typeFilter === 'bl') matchType = inv.type === 'bl' && !inv.isReturn;
      if (typeFilter === 'return') matchType = !!inv.isReturn;
      
      let matchStatus = true;
      if (statusFilter === 'paid') matchStatus = inv.balance === 0;
      if (statusFilter === 'unpaid') matchStatus = inv.balance > 0;

      return matchSearch && matchType && matchStatus;
    });
  }, [db.invoices, searchQuery, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice(startIndex, endIndex);
  }, [filteredInvoices, startIndex, endIndex]);

  // Settle outstanding invoice balance remaining
  const handleSettleInvoiceBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const amountToPay = Number(paymentInput);
    if (isNaN(amountToPay) || amountToPay <= 0 || amountToPay > selectedInvoice.balance) {
      showToast("⚠️ Saisie invalide. Le montant doit être supérieur à 0 et inférieur ou égal au solde restant.", 'error');
      return;
    }

    const updatedRemaining = selectedInvoice.balance - amountToPay;
    const updatedPaid = selectedInvoice.paidAmount + amountToPay;

    // 1. Update the Invoice record directly
    const updatedInvoices = (db.invoices || []).map(inv => {
      if (inv.id === selectedInvoice.id) {
        return {
          ...inv,
          paidAmount: updatedPaid,
          balance: updatedRemaining
        };
      }
      return inv;
    });

    // 2. Adjust partner/customer debits if invoice is bound to client
    const updatedPartners = (db.partners || []).map(p => {
      if (p.id === selectedInvoice.partnerId) {
        return {
          ...p,
          currentBalance: Math.max(0, p.currentBalance - amountToPay)
        };
      }
      return p;
    });

    // 3. Log Payment Ledger Entry
    const newPayment = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partnerId: selectedInvoice.partnerId || 'anonymous',
      partnerName: selectedInvoice.partnerName,
      partnerType: 'client' as const,
      type: 'payment_received' as const,
      amount: amountToPay,
      notes: `Encaissement sur ${selectedInvoice.number}`,
      invoiceId: selectedInvoice.id
    };

    onUpdateDb({
      ...db,
      invoices: updatedInvoices,
      partners: updatedPartners,
      payments: [newPayment, ...(db.payments || [])]
    });

    setSelectedInvoice(null);
    setPaymentInput('');
    showToast("✅ Le paiement partiel a été appliqué avec succès !", 'success');
  };

  const handlePrint = () => {
    try {
      const printFormatToUse = printFormat;
      const printContent = document.getElementById('print-area');
      const portal = document.getElementById('print-portal');
      const isIframe = checkIsIframe();

      if (printContent && portal) {
        const s = db.settings;
        const styleString = printFormatToUse === 'ticket'
          ? `padding-top: ${s?.receiptMarginTop ?? 2}mm !important; padding-bottom: ${s?.receiptMarginBottom ?? 3}mm !important; padding-left: ${s?.receiptMarginLeft ?? 3}mm !important; padding-right: ${s?.receiptMarginRight ?? 3}mm !important;`
          : `padding-top: ${s?.invoiceMarginTop ?? 8}mm !important; padding-bottom: ${s?.invoiceMarginBottom ?? 8}mm !important; padding-left: ${s?.invoiceMarginLeft ?? 8}mm !important; padding-right: ${s?.invoiceMarginRight ?? 8}mm !important;`;

        portal.innerHTML = `
          <div class="${printFormatToUse === 'ticket' ? 'ticket-print-layout' : 'a4-print-layout'}" style="${styleString}" dir="${language === 'ar' ? 'rtl' : 'ltr'}">
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
          console.log("[INNOVA PRINT] Invoice print triggered inside sandboxed preview.");
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

  const handleDownloadPDF = () => {
    if (!selectedInvoice) return;
    try {
      downloadInvoicePDF({
        invoice: selectedInvoice,
        settings: db.settings,
        language,
        formatCurrency,
        format: printFormat
      });
    } catch (error) {
      console.error("PDF generation error: ", error);
      showToast(language === 'ar' ? "⚠️ حدث خطأ أثناء تحميل ملف الـ PDF" : "⚠️ Échec du téléchargement du fichier PDF.", 'error');
    }
  };

  const handleDirectDownloadPDF = (inv: Invoice, format: 'a4' | 'ticket' = 'a4') => {
    try {
      downloadInvoicePDF({
        invoice: inv,
        settings: db.settings,
        language,
        formatCurrency,
        format
      });
    } catch (error) {
      console.error("Direct PDF generation error: ", error);
      showToast(language === 'ar' ? "⚠️ حدث خطأ أثناء تحميل ملف الـ PDF" : "⚠️ Échec du téléchargement du fichier PDF.", 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900">Registre des Factures & Bons de Livraison</h1>
        <p className="text-slate-500 text-sm">Aperçu chronologique de vos documents de vente, statuts de règlement de crédit et ré-impression.</p>
      </div>

      {/* Directory filters bar */}
      <div className="bg-white p-4 border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Chercher N° de pièce ou Nom Client..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all font-semibold"
          />
        </div>

        {/* Categories togglers */}
        <div className="flex space-x-2 overflow-x-auto self-stretch sm:self-auto pb-1 md:pb-0">
          <select 
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as any); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded focus:outline-hidden text-slate-700 font-bold"
          >
            <option value="all">📝 Tout Type de Document</option>
            <option value="facture">📄 Facture Uniquement</option>
            <option value="bl">🚛 Bons de Livraison (BL)</option>
            <option value="return">↩️ {language === 'ar' ? 'مرتجعات السلع (Avoirs)' : 'Retours / Avoirs Client'}</option>
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 text-xs py-2 px-3 rounded focus:outline-hidden text-slate-700 font-bold"
          >
            <option value="all">💳 Tous Règlements</option>
            <option value="paid">✅ Payé intégralement</option>
            <option value="unpaid">⚠️ Crédit Restant (Non soldé)</option>
          </select>
        </div>
      </div>

      {/* Primary Invoices list table */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <FileText className="w-12 h-12 stroke-1 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-slate-800">Aucun document archivé</h3>
            <p className="text-xs text-slate-400 mt-1">Créez votre première facture via la Caisse Tactile.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[9px] tracking-wider whitespace-nowrap">
                  <th className="p-4">Référence</th>
                  <th className="p-4">Date de pièce</th>
                  <th className="p-4">Client</th>
                  <th className="p-4 text-right">Montant Total</th>
                  <th className="p-4 text-right text-emerald-600">Montant Versé</th>
                  <th className="p-4 text-right text-rose-600">Reste dû (Crédit)</th>
                  <th className="p-4 text-center">Statut pièce</th>
                  <th className="p-4 text-right">Aperçu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {paginatedInvoices.map(inv => {
                  const isPaid = inv.balance === 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 font-bold text-slate-950 text-xs whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm mr-1.5 uppercase ${
                          inv.isReturn 
                            ? 'bg-rose-100 text-rose-800' 
                            : (inv.type === 'facture' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-800')
                        }`}>
                          {inv.isReturn ? 'Retour' : inv.type}
                        </span>
                        {inv.number}
                      </td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        {inv.date.includes('T') ? inv.date.split('T')[0] : inv.date}
                      </td>
                      <td className="p-4 font-sans font-bold text-slate-800 truncate max-w-[160px]">
                        {inv.partnerName}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="p-4 text-right text-emerald-600 whitespace-nowrap font-bold">
                        {formatCurrency(inv.paidAmount)}
                      </td>
                      <td className="p-4 text-right font-bold text-rose-600 whitespace-nowrap">
                        {formatCurrency(inv.balance)}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-sm w-max ${
                          isPaid 
                            ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                            : inv.paidAmount > 0 
                              ? 'bg-amber-50 text-amber-700' 
                              : 'bg-rose-50 text-rose-700 font-semibold'
                        }`}>
                          {isPaid ? 'Réglement Total' : inv.paidAmount > 0 ? 'Partiel (Encours)' : 'Impayé'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDirectDownloadPDF(inv, db.settings?.activitySector === 'superette' ? 'ticket' : 'a4')}
                          title={language === 'ar' ? 'تحميل مباشر PDF 📥' : 'Télécharger directement en PDF 📥'}
                          className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSelectedInvoice(inv); setPaymentInput(inv.balance.toString()); setPrintFormat('ticket'); }}
                          title="Preview Thermal Receipt"
                          className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSelectedInvoice(inv); setPaymentInput(inv.balance.toString()); setPrintFormat('a4'); }}
                          title="View Document Details"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs font-semibold text-slate-600 no-print">
            <div>
              {language === 'ar' ? (
                <span>عرض {startIndex + 1} إلى {Math.min(endIndex, filteredInvoices.length)} من {filteredInvoices.length} وثيقة</span>
              ) : (
                <span>Affichage de {startIndex + 1} à {Math.min(endIndex, filteredInvoices.length)} sur {filteredInvoices.length} documents</span>
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

  {/* DETAIL DOCUMENT DETAILED MODAL VIEWER */}
  {selectedInvoice && (() => {
    const storeName = db.settings?.storeName ?? "INNOVA POS PRO";
    const storePhone = db.settings?.storePhone ?? "+216 24260711";
    const storeAddress = db.settings?.storeAddress ?? "AVENU HABIB BORGIBA GHANNOUCHE GABES";
    const matriculeFiscal = db.settings?.matriculeFiscal ?? "1234567/A/M/000";
    const activitySector = db.settings?.activitySector ?? "superette";

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-start justify-center p-3 md:p-6 z-50 overflow-y-auto print-only">
        <div className="bg-white rounded-2xl w-full max-w-3xl p-5 md:p-6 border border-slate-200 shadow-2xl relative my-4 sm:my-8 transition-all">
          
          {/* Action Bar Header - Sticky to keep actions and Fermer button always reachable */}
          <div className="sticky top-0 bg-white z-40 pb-3 mb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
              <FileText className="w-5 h-5 text-blue-600 animate-pulse" />
              <span className="font-display">
                {language === 'ar' ? `معاينة المستند رقم - ${selectedInvoice.number}` : `Visualisation Pièce - ${selectedInvoice.number}`}
              </span>
            </h3>
            
            {/* Format choice toggle toolbar */}
            <div className="flex items-center bg-slate-100 p-1.5 rounded border border-slate-200 space-x-1">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${printFormat === 'a4' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                📄 A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('ticket')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${printFormat === 'ticket' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                🎫 Ticket (80mm)
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer font-mono shadow-xs animate-fade-in"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تحميل PDF مباشر' : 'Télécharger PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer font-mono shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'طباعة / حفظ PDF' : 'Imprimer / Garder PDF'}</span>
              </button>
              
              <button 
                type="button"
                onClick={() => setSelectedInvoice(null)} 
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer transition-colors border border-slate-200 shadow-xs hover:border-slate-300"
              >
                {language === 'ar' ? 'إغلاق' : 'Fermer'}
              </button>
            </div>
          </div>

          {/* Useful dynamic PDF tip */}
          <div className="bg-blue-50/70 p-3 rounded text-[11px] text-blue-900 border border-blue-100 mb-2 leading-normal flex items-start gap-2 no-print">
            <span className="text-amber-500 font-bold shrink-0">💡 PDF :</span>
            <p>
              {language === 'ar' 
                ? "لحفظ الفاتورة كـ ملف PDF، اضغط زر الطباعة ثم اختر 'حفظ بتنسيق PDF' (Enregistrer au format PDF) من قائمة الطابعات المتوفرة." 
                : "Pour sauvegarder en PDF, cliquez sur Imprimer puis sélectionnez 'Enregistrer au format PDF' dans la liste des imprimantes."}
            </p>
          </div>

          {/* Core Invoice Area */}
          <div 
            id="print-area" 
            className={`bg-white rounded border border-slate-205 overflow-y-auto max-h-[460px] shadow-inner ${
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

                <div className="flex justify-between items-center text-[10px] text-slate-605 font-mono border-b border-dashed border-slate-200 pb-2">
                  <span>{selectedInvoice.type === 'facture' ? 'FACTURE' : 'BON LIVRAISON'}</span>
                  <span className="font-bold">{selectedInvoice.number}</span>
                  <span>{selectedInvoice.date}</span>
                </div>

                <div className="text-start text-[10px] text-slate-750 space-y-0.5 pb-2 border-b border-dashed border-slate-200">
                  <p><span className="font-bold">{language === 'ar' ? 'العميل:' : 'Client:'}</span> {selectedInvoice.partnerName}</p>
                  <p><span className="font-bold">{language === 'ar' ? 'الملاحظة:' : 'Note:'}</span> {selectedInvoice.notes || 'Comptoir d\'alimentation'}</p>
                </div>

                {/* Table simple for Ticket */}
                <div className="space-y-2 py-2 border-b border-dashed border-slate-300 text-left" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {selectedInvoice.items.map((item, i) => (
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
                    <span className="text-slate-505">{language === 'ar' ? 'المجموع:' : 'Sous-total:'}</span>
                    <span>{formatCurrency(selectedInvoice.subTotal)}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>{language === 'ar' ? 'الخصم:' : 'Remise:'}</span>
                      <span>- {formatCurrency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  {selectedInvoice.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>TVA ({selectedInvoice.taxRate}%):</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t border-dashed border-slate-300 pt-1.5 text-slate-900">
                    <span>{language === 'ar' ? 'الصافي للدفع:' : 'Net à Payer:'}</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-650">
                    <span>{language === 'ar' ? 'المستلم:' : 'Acompte reçu:'}</span>
                    <span className="text-emerald-600">{formatCurrency(selectedInvoice.paidAmount)}</span>
                  </div>
                  {selectedInvoice.balance > 0 && (
                    <div className="flex justify-between text-xs bg-rose-50 text-rose-800 p-1 rounded font-bold">
                      <span>{language === 'ar' ? 'المتبقي بالدين:' : 'Reste à CREDIT:'}</span>
                      <span>{formatCurrency(selectedInvoice.balance)}</span>
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
                {/* Header */}
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
                      <h2 className="text-base font-bold text-slate-900 font-display uppercase tracking-tight">{storeName}</h2>
                      <p className="text-[10px] text-slate-505 font-mono mt-0.5">{storeAddress}</p>
                      <p className="text-[10px] text-slate-505 font-mono">Tél : {storePhone}</p>
                      {matriculeFiscal && <p className="text-[10px] text-slate-505 font-mono">MF : {matriculeFiscal}</p>}
                      <p className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase mt-1 w-max">
                        {activitySector.toUpperCase()} SPECIALIST
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-blue-100 text-blue-900 font-bold px-2.5 py-1 rounded block uppercase font-mono">
                      {selectedInvoice.type === 'facture' ? (language === 'ar' ? 'فاتورة بيع' : 'Facture') : (language === 'ar' ? 'وصل تسليم سلع' : 'Bon de Livraison')}
                    </span>
                    <p className="text-xs font-bold text-slate-800 font-mono mt-1">{selectedInvoice.number}</p>
                    <p className="text-[9px] text-slate-450 mt-0.5 font-mono">Date: {selectedInvoice.date}</p>
                  </div>
                </div>

                {/* Partners and addresses */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded border border-slate-150">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">
                      {language === 'ar' ? 'المرسل' : 'Émetteur'}
                    </span>
                    <p className="font-bold text-slate-850">{storeName}</p>
                    <p className="text-slate-500 font-mono text-[10px] mt-0.5">Tél: {storePhone}</p>
                    <p className="text-slate-500 font-mono text-[10px]">{storeAddress}</p>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">
                      {language === 'ar' ? 'الحريف (المستلم)' : 'Destinataire (Client)'}
                    </span>
                    <p className="font-bold text-slate-850">{selectedInvoice.partnerName}</p>
                    <p className="text-slate-505 font-mono text-[10px] mt-0.5">
                      Note Réf: {selectedInvoice.notes || 'Règlement d\'alimentation standard'}
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
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 font-mono text-[11px]">
                          <td className="p-2.5 font-sans font-bold text-slate-850">{item.productName}</td>
                          <td className="p-2.5 text-center">{item.qty}</td>
                          <td className="p-2.5 text-right">{formatCurrency(item.sellingPrice)}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Core numbers bottom */}
                <div className="border-t border-slate-200 pt-4 flex justify-end">
                  <div className="w-72 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{language === 'ar' ? 'المجموع الصافي الفرعي:' : 'Sous-total :'}</span>
                      <span className="text-slate-800">{formatCurrency(selectedInvoice.subTotal)}</span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>{language === 'ar' ? 'التخفيض الإجمالي:' : 'Remise globale :'}</span>
                        <span>- {formatCurrency(selectedInvoice.discount)}</span>
                      </div>
                    )}
                    {selectedInvoice.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span>TVA ({selectedInvoice.taxRate}%) :</span>
                        <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-1.5 text-slate-950">
                      <span>{language === 'ar' ? 'الصافي النهائي للدفع:' : 'Total Net à Payer :'}</span>
                      <span>{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold pt-1 text-slate-600">
                      <span>{language === 'ar' ? 'المبلغ المستلم سابقا:' : 'Montant Versé :'}</span>
                      <span className="text-emerald-605 font-bold">{formatCurrency(selectedInvoice.paidAmount)}</span>
                    </div>
                    {selectedInvoice.balance > 0 && (
                      <div className="flex justify-between text-xs bg-rose-50 text-rose-800 p-1 rounded font-bold border border-rose-100">
                        <span>{language === 'ar' ? 'باقي الحساب (دين):' : 'Reste à CREDIT :'}</span>
                        <span>{formatCurrency(selectedInvoice.balance)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-4 flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{language === 'ar' ? 'شكراً لتعاملكم معنا' : 'Merci pour votre confiance !'}</span>
                  <span>Signature & Cachet commercial</span>
                </div>
              </div>
            )}
          </div>

          {/* If has client remaining debt unpaid, show convenient mini payment form inline! */}
          {selectedInvoice.balance > 0 && (
            <div className="bg-blue-50 p-4 rounded border border-blue-200 mt-4">
              <form onSubmit={handleSettleInvoiceBalance} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full text-xs" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <label className="text-xs font-bold text-blue-950 block mb-1">
                    {language === 'ar' ? '📝 تسجيل دفعة مالية جديدة لهذه الفاتورة (د.ت) :' : '📝 Enregistrer un versement sur cette facture (DT) :'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.001"
                    max={selectedInvoice.balance}
                    value={paymentInput}
                    onChange={(e) => setPaymentInput(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded py-2 px-3 focus:outline-hidden font-bold font-mono text-slate-800"
                    placeholder={language === 'ar' ? `الأقصى: ${formatCurrency(selectedInvoice.balance)}` : `Max: ${formatCurrency(selectedInvoice.balance)}`}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تطبيق وقبول الدفعة' : 'Appliquer'}</span>
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    );
  })()}

    </div>
  );
}
