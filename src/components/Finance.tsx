import React, { useState, useMemo } from 'react';
import { DatabaseState, Traite, DailyExpense } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { showToast } from '../utils/toast';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  Sparkles,
  Calendar,
  X,
  FileCheck2,
  AlertCircle,
  TrendingDown,
  Coins,
  MapPin,
  Building,
  DollarSign,
  Printer
} from 'lucide-react';

interface FinanceProps {
  db: DatabaseState;
  onUpdateDb: (updatedDb: DatabaseState) => void;
}

export default function Finance({ db, onUpdateDb }: FinanceProps) {
  const { language, t, formatCurrency } = useLanguage();
  const [activeFinanceTab, setActiveFinanceTab] = useState<'traites' | 'expenses' | 'payments'>('traites');

  // Expense forms state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expCategory, setExpCategory] = useState('Charges');

  // Traite forms state
  const [showTraiteModal, setShowTraiteModal] = useState(false);
  const [selectedTraiteToPrint, setSelectedTraiteToPrint] = useState<Traite | null>(null);

  // New Traite fields
  const [traNumber, setTraNumber] = useState('');
  const [traPartnerId, setTraPartnerId] = useState('');
  const [traAmount, setTraAmount] = useState<number>(0);
  const [traDateIssue, setTraDateIssue] = useState('');
  const [traDateDue, setTraDateDue] = useState('');
  const [traBankName, setTraBankName] = useState('');
  const [traRib, setTraRib] = useState('');
  const [traCity, setTraCity] = useState('Tunis');
  const [traNotes, setTraNotes] = useState('');

  const clients = useMemo(() => {
    return db.partners.filter(p => p.type === 'client');
  }, [db.partners]);

  // Submit Expense onSubmit
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || expAmount <= 0) return;

    const newExpense: DailyExpense = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: expDesc.trim(),
      amount: Number(expAmount),
      category: expCategory
    };

    onUpdateDb({
      ...db,
      expenses: [newExpense, ...db.expenses]
    });

    setShowExpenseModal(false);
    setExpDesc('');
    setExpAmount(0);
    showToast(language === 'ar' ? "تم تسجيل المصروف بنجاح" : "Dépense enregistrée avec succès !", 'success');
  };

  // Submit Traite onSubmit
  const handleTraiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traPartnerId || traAmount <= 0 || !traDateDue) {
      alert("⚠️ Saisie incomplète. Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const partner = db.partners.find(p => p.id === traPartnerId);
    if (!partner) return;

    const newTraite: Traite = {
      id: `tra-${Date.now()}`,
      number: traNumber.trim() || `TR-${Date.now().toString().slice(-6)}`,
      dateIssue: traDateIssue || new Date().toISOString().split('T')[0],
      dateDue: traDateDue,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerPhone: partner.phone,
      amount: Number(traAmount),
      bankName: traBankName.trim() || 'CPA Agence Centrale',
      rib: traRib.trim() || '0040012345678901234567',
      city: traCity.trim(),
      status: 'pending',
      notes: traNotes.trim()
    };

    onUpdateDb({
      ...db,
      traites: [newTraite, ...db.traites]
    });

    setShowTraiteModal(false);
    // Reset fields
    setTraNumber('');
    setTraPartnerId('');
    setTraAmount(0);
    setTraDateIssue('');
    setTraDateDue('');
    setTraBankName('');
    setTraRib('');
    setTraCity('Alger');
    setTraNotes('');
    showToast(language === 'ar' ? 'تم إنشاء الكمبيالة (الرسالة التجارية) بنجاح' : "Traite commerciale (Lettre de change) émise avec succès !", 'success');
  };

  // Settle or Cancel Traite status change
  const handleToggleTraiteStatus = (id: string, newStatus: 'pending' | 'cleared' | 'cancelled') => {
    const updated = db.traites.map(t => {
      if (t.id === id) {
        return { ...t, status: newStatus };
      }
      return t;
    });
    onUpdateDb({ ...db, traites: updated });
    showToast(language === 'ar' ? 'تم تحديث حالة الكمبيالة' : 'Statut de la traite mis à jour', 'info');
  };

  const handlePrintTraite = () => {
    try {
      const printContent = document.getElementById('print-area');
      const portal = document.getElementById('print-portal');
      const isIframe = window.self !== window.top;

      if (printContent && portal) {
        portal.innerHTML = `
          <div class="a4-print-layout" dir="${language === 'ar' ? 'rtl' : 'ltr'}">
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
          console.log("[INNOVA PRINT] Traite print triggered inside sandboxed preview.");
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
    <div className="space-y-6">
      
      {/* Upper banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            {language === 'ar' ? 'المتابعة المالية والاستحقاقات' : 'Suivi Financier & Échéances'}
          </h1>
          <p className="text-slate-500 text-sm">
            {language === 'ar' 
              ? 'مراقبة الكمبيالات التجارية والمدفوعات الأخيرة ومصاريف تشغيل المحل.' 
              : 'Contrôle des traites de change, des règlements récents et des dépenses d\'exploitation du magasin.'}
          </p>
        </div>

        {activeFinanceTab === 'expenses' ? (
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة مصروف 💸' : 'Saisir une Dépense'}</span>
          </button>
        ) : activeFinanceTab === 'traites' ? (
          <button
            onClick={() => setShowTraiteModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'كمبيالة جديدة 🏦' : 'Nouvelle Traite / Lettre'}</span>
          </button>
        ) : null}
      </div>

      {/* Primary switches tab */}
      <div className="bg-white p-4 border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded self-stretch sm:self-auto">
          <button
            onClick={() => setActiveFinanceTab('traites')}
            className={`px-4 py-2 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeFinanceTab === 'traites' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🏦 {language === 'ar' ? 'الكمبيالات التجارية' : 'Traites Commerciales'} ({db.traites.length})
          </button>
          
          <button
            onClick={() => setActiveFinanceTab('expenses')}
            className={`px-4 py-2 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeFinanceTab === 'expenses' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            💸 {language === 'ar' ? 'دفتر المصاريف' : 'Journal des Dépenses'} ({db.expenses.length})
          </button>

          <button
            onClick={() => setActiveFinanceTab('payments')}
            className={`px-4 py-2 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeFinanceTab === 'payments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🧾 {language === 'ar' ? 'سجل المقبوضات' : 'Journal des Encaissements'} ({db.payments.length})
          </button>
        </div>
      </div>

      {/* Grid panels rendering */}
      {activeFinanceTab === 'expenses' ? (
        <div className="space-y-4">
          <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
            {db.expenses.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <TrendingDown className="w-12 h-12 stroke-1 mx-auto mb-3" />
                <h3 className="font-bold text-sm text-slate-800">
                  {language === 'ar' ? 'لا توجد مصاريف مسجلة' : 'Aucune charge déclarée'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'ar' ? 'سجل تكاليفك الثابتة (الفواتير، الإيجار) لتقارير أرباح أدق.' : 'Enregistrez vos frais fixes (factures, loyers) pour de meilleures analyses.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 font-bold uppercase text-[9px] tracking-wider whitespace-nowrap">
                      <th className="p-4">{language === 'ar' ? 'تاريخ الإنشاء' : 'Date création'}</th>
                      <th className="p-4">{language === 'ar' ? 'البيان / الوصف' : 'Description'}</th>
                      <th className="p-4">{language === 'ar' ? 'الفئة' : 'Catégorie'}</th>
                      <th className="p-4 text-right">{language === 'ar' ? 'قيمة المصروف' : 'Montant dépense'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {db.expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/60 font-medium">
                        <td className="p-4 text-slate-500 whitespace-nowrap">{exp.date}</td>
                        <td className="p-4 font-sans text-slate-800 font-bold max-w-sm truncate">{exp.description}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="bg-rose-50 text-rose-800 font-bold text-[9px] px-1.5 py-0.5 rounded">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-4 text-right text-rose-600 font-black whitespace-nowrap">
                          - {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeFinanceTab === 'payments' ? (
        <div className="space-y-4">
          <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
            {db.payments.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Coins className="w-12 h-12 stroke-1 mx-auto mb-3" />
                <h3 className="font-bold text-sm text-slate-800">
                  {language === 'ar' ? 'لا توجد عمليات دفع مسجلة' : 'Aucune écriture de paiement'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'ar' ? 'جميع المبالغ المحصلة من المبيعات والمدفوعة ستظهر هنا.' : 'Toutes les rentrées de caisse apparaîtront ici.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 font-bold uppercase text-[9px] tracking-wider whitespace-nowrap">
                      <th className="p-4">{language === 'ar' ? 'تاريخ السند' : 'Date de saisie'}</th>
                      <th className="p-4">{language === 'ar' ? 'الاسم الشريك' : 'Partenaire'}</th>
                      <th className="p-4">{language === 'ar' ? 'الحالة' : 'Type'}</th>
                      <th className="p-4">{language === 'ar' ? 'البيان / مرجع السند' : 'Désignation / Référence'}</th>
                      <th className="p-4 text-right">{language === 'ar' ? 'المبلغ الفعلي' : 'Montant réglé'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {db.payments.map(pay => (
                      <tr key={pay.id} className="hover:bg-slate-50/60 font-medium">
                        <td className="p-4 text-slate-500 whitespace-nowrap">{pay.date}</td>
                        <td className="p-4 font-sans text-slate-800 font-bold">{pay.partnerName}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            pay.type === 'payment_received' 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-800 border border-rose-100'
                          }`}>
                            {pay.type === 'payment_received' 
                              ? (language === 'ar' ? 'تحصيل من زبون 🟢' : 'Encaissement Client') 
                              : (language === 'ar' ? 'خروج دفع لمورد 🔴' : 'Décaissement Fournisseur')}
                          </span>
                        </td>
                        <td className="p-4 font-sans text-slate-500 max-w-sm truncate">{pay.notes}</td>
                        <td className="p-4 text-right whitespace-nowrap font-black text-emerald-600">
                          + {formatCurrency(pay.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Traites tab renderer
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.traites.length === 0 ? (
              <div className="bg-white p-8 text-center rounded border border-slate-200 text-slate-400 md:col-span-2">
                <FileCheck2 className="w-12 h-12 stroke-1 mx-auto mb-3 text-slate-300" />
                <h3 className="font-bold text-sm text-slate-800">
                  {language === 'ar' ? 'لا توجد كمبيالات بنكية / مستندات دفع مصدرة' : 'Aucune traite (Lettre de change) émise'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'ar' ? 'قم بإنشاء السندات والكمبيالات هنا لتنظيم الأجال الزمنية لبنوك الشركاء.' : 'Émettez des traites pour formaliser des échéanciers bancaires à terme.'}
                </p>
              </div>
            ) : (
              db.traites.map(t => {
                const isOverdue = new Date(t.dateDue) < new Date() && t.status === 'pending';
                return (
                  <div key={t.id} className="bg-white rounded border border-slate-200 p-5 space-y-4 shadow-3xs flex flex-col justify-between">
                    <div>
                      {/* Traite Card Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded block w-max font-bold mb-1">
                            {language === 'ar' ? 'سند سحب كمبيالة' : 'TRAITE BANCAIRE'}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 font-mono">
                            {language === 'ar' ? `سند رقم ${t.number}` : `Pièce N° ${t.number}`}
                          </h3>
                          <p className="text-xs text-slate-400 font-sans mt-1">
                            {language === 'ar' ? 'المسحوب عليه : ' : 'Tiré : '}
                            <strong className="text-slate-800">{t.partnerName}</strong>
                          </p>
                        </div>

                        {/* Traite Status labels */}
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded block ${
                            t.status === 'cleared' 
                              ? 'bg-emerald-50 text-emerald-800' 
                              : t.status === 'cancelled' 
                                ? 'bg-slate-100 text-slate-500' 
                                : isOverdue 
                                  ? 'bg-rose-50 text-rose-800 animate-pulse' 
                                  : 'bg-amber-50 text-amber-800'
                          }`}>
                            {t.status === 'cleared' 
                              ? (language === 'ar' ? 'تم تحصيلها / مدفوعة' : 'Encaissée / Payée') 
                              : t.status === 'cancelled' 
                                ? (language === 'ar' ? 'ملغاة' : 'Annulée') 
                                : isOverdue 
                                  ? (language === 'ar' ? 'متأخرة عن الدفع' : 'En Souffrance (Retard)') 
                                  : (language === 'ar' ? 'في انتظار تاريخ الاستحقاق' : 'En attente échéance')}
                          </span>
                        </div>
                      </div>

                      {/* Financial info summary */}
                      <div className="bg-slate-50 p-3 rounded border border-slate-150 text-xs font-mono space-y-1.5 mt-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{language === 'ar' ? 'مبلغ السند :' : 'Montant Traite :'}</span>
                          <span className="font-bold text-slate-900">{formatCurrency(t.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{language === 'ar' ? 'البنك المسحوب :' : 'Banque :'}</span>
                          <span className="text-slate-700 truncate max-w-[150px]">{t.bankName}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-205">
                          <span className="text-slate-500">{language === 'ar' ? 'أجل الاستحقاق :' : 'Échéance de paiement :'}</span>
                          <span className={isOverdue ? 'text-rose-600 font-black' : 'text-slate-800'}>{t.dateDue}</span>
                        </div>
                      </div>
                    </div>

                    {/* Settle Traite options and Print view */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-150 text-xs font-bold font-mono">
                      {t.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleToggleTraiteStatus(t.id, 'cleared')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded py-1.5 text-center cursor-pointer transition-colors"
                          >
                            {language === 'ar' ? 'تأكيد الخلاص' : 'Valider payée'}
                          </button>
                          <button
                            onClick={() => handleToggleTraiteStatus(t.id, 'cancelled')}
                            className="px-2.5 py-1.5 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 cursor-pointer"
                            title={language === 'ar' ? 'إلغاء' : 'Annuler'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => setSelectedTraiteToPrint(t)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded py-1.5 text-center flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'طباعة الكمبيالة' : 'Imprimer Traite'}</span>
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* DETAILED DÉPENSES REGISTRATION OVERLAY */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 md:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">➕ Enregistrer une Dépense Magasin</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description / Motif de dépense *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Loyer du Local commerciale"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'المبلغ المصروف (د.ت) *' : 'Montant Décaissé (DT) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={expAmount || ''}
                    onChange={(e) => setExpAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Catégorie</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2.5 focus:outline-hidden"
                  >
                    <option value="Charges">Charges fixes (Loyer, eau)</option>
                    <option value="Fournitures">Fournitures & consommables</option>
                    <option value="Impôts & Taxes">Impôts & Taxes</option>
                    <option value="Autre">Autre dépense</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-205 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-50 text-slate-605 rounded border border-slate-200 cursor-pointer hover:bg-slate-100"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded cursor-pointer hover:bg-rose-700 shadow-xs"
                >
                  Confirmer Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMISSORY TRAITE ISSUANCE MODAL */}
      {showTraiteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 md:p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-205 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span className="font-display">Création de Traite Bancaire</span>
              </h3>
              <button onClick={() => setShowTraiteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTraiteSubmit} className="space-y-4 text-xs font-sans">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">N° de Traite *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TR-26-0988"
                    value={traNumber}
                    onChange={(e) => setTraNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tiré (Client débiteur) *</label>
                  <select
                    required
                    value={traPartnerId}
                    onChange={(e) => setTraPartnerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden font-bold"
                  >
                    <option value="">Sélectionner un Client</option>
                    {clients.map(cl => (
                      <option key={cl.id} value={cl.id}>👤 {cl.name} (Solde: {formatCurrency(cl.currentBalance)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-blue-50/60 p-4 rounded border border-blue-200">
                <div className="col-span-1">
                  <label className="text-xs font-bold block mb-1 text-blue-900">Montant Traite *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={language === 'ar' ? 'المبلغ بالدينار' : 'Montant en DT'}
                    value={traAmount || ''}
                    onChange={(e) => setTraAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-blue-205 rounded py-2 px-3 focus:outline-hidden font-bold font-mono text-blue-950"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-blue-900">Échéance finale *</label>
                  <input
                    type="date"
                    required
                    value={traDateDue}
                    onChange={(e) => setTraDateDue(e.target.value)}
                    className="w-full bg-white border border-blue-205 rounded py-2 px-3 focus:outline-hidden font-mono text-blue-950"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-blue-900">Date d'émission</label>
                  <input
                    type="date"
                    value={traDateIssue}
                    onChange={(e) => setTraDateIssue(e.target.value)}
                    className="w-full bg-white border border-blue-205 rounded py-2 px-3 focus:outline-hidden font-mono text-blue-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nom Banque du tiré (Client)</label>
                  <input
                    type="text"
                    placeholder="Ex: Banque Nationale d'Algérie"
                    value={traBankName}
                    onChange={(e) => setTraBankName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">RIB de compte (20 chiffres)</label>
                  <input
                    type="text"
                    placeholder="Ex: 012006129988..."
                    value={traRib}
                    onChange={(e) => setTraRib(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Lieu d'émission</label>
                  <input
                    type="text"
                    value={traCity}
                    onChange={(e) => setTraCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Motif additionnels</label>
                  <input
                    type="text"
                    placeholder="Ex: Garantie pour commande de smartphones"
                    value={traNotes}
                    onChange={(e) => setTraNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-205 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowTraiteModal(false)}
                  className="px-4 py-2 bg-slate-50 text-slate-605 border border-slate-200 rounded cursor-pointer hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 shadow-xs"
                >
                  Émettre la Traite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT STYLED BANK LETTER TRAITE OVERLAY */}
      {selectedTraiteToPrint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto print-only">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-5 md:p-6 border border-slate-200 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-250 pb-3 mb-4 no-print">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileCheck2 className="w-5 h-5 text-blue-600" />
                <span className="font-display">Modèle de Traite d'Échange Prête pour impression</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintTraite}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer font-mono"
                >
                  Imprimer Traite (Lettre)
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedTraiteToPrint(null);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded text-xs font-bold cursor-pointer transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Standard Bank Note visual layout printable */}
            <div id="print-area" className="p-10 bg-orange-50/20 rounded border-4 border-dashed border-slate-400 font-mono text-slate-900 relative">
              
              {/* Outer decorative borders and watermarks */}
              <div className="absolute right-6 top-6 text-slate-300 pointer-events-none text-2xl font-black tracking-widest leading-none rotate-12 uppercase opacity-20 select-none">
                TRAITE COMMERCIALE<br/>ORIGINALE
              </div>

              {/* Traite Head */}
              <div className="grid grid-cols-4 gap-4 pb-6 border-b-2 border-slate-900 items-start">
                <div className="col-span-3">
                  <h2 className="text-lg font-black tracking-widest text-slate-950">LETTRE DE CHANGE / TRAITE COMMERCIALE</h2>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Réf d'enregistrement : N° {selectedTraiteToPrint.number}</p>
                </div>
                <div className="col-span-1 text-right bg-slate-100 p-2 border-2 border-slate-900 rounded">
                  <span className="text-[9px] font-bold block pb-0.5 text-slate-500">VALEUR EN DINARS</span>
                  <p className="text-sm font-black font-mono text-slate-950">{formatCurrency(selectedTraiteToPrint.amount)}</p>
                </div>
              </div>

              {/* Traite details section */}
              <div className="py-6 space-y-4 text-xs leading-relaxed text-slate-800">
                <p>
                  Contre cette Lettre de change, veuillez payer à l'échéance indiquée ci-dessous la somme à l'ordre du bénéficiaire.
                </p>

                <div className="grid grid-cols-2 gap-6 bg-white p-4 justify-between rounded-lg border-2 border-slate-300">
                  <div className="space-y-1.5 border-r border-slate-200 pr-4">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">🗓️ ÉCHÉANCES ET CRÉATION</span>
                    <p className="font-bold text-slate-950 font-sans">Créée à : <span className="text-blue-700">{selectedTraiteToPrint.city}</span>, le {selectedTraiteToPrint.dateIssue}</p>
                    <p className="font-bold text-rose-700">Maturité (Paiement final d'échéance) : le {selectedTraiteToPrint.dateDue}</p>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">🏦 DEBITEUR (TIRÉ) ET INFORMATIONS BANQUE</span>
                    <p className="font-bold text-slate-950">Tiré : {selectedTraiteToPrint.partnerName}</p>
                    {selectedTraiteToPrint.partnerPhone && <p className="text-slate-500">Tél: {selectedTraiteToPrint.partnerPhone}</p>}
                    <p className="text-emerald-700 font-bold">Banque : {selectedTraiteToPrint.bankName}</p>
                    <p className="text-[10px] text-slate-500 font-bold font-mono">RIB: {selectedTraiteToPrint.rib}</p>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <p className="font-bold text-slate-900">
                    Montant de la traite écrit textuellement : <span className="font-black underline italic">Cents Quatre-Vingts Cinq Mille Dinars Algériens (Valeur après-vente certifiée)</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Clause particulière : Sauf stipulation contraire, cette lettre de change constitue une reconnaissance légitime de créance déposable en cas de contentieux.
                  </p>
                </div>
              </div>

              {/* Signatures foot */}
              <div className="grid grid-cols-2 gap-6 pt-8 border-t-2 border-slate-900 text-xs items-start">
                <div>
                  <h4 className="font-bold text-slate-700 pb-1 uppercase text-[10px]">🖊️ Signature & Cachet du Tireur (Émetteur) :</h4>
                  <div className="h-20 border border-slate-300 bg-white rounded-lg flex items-end p-2 text-[9px] text-slate-400 font-bold italic">
                    MEGA GLOBAL LOGISTIQUE - Alger
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 pb-1 uppercase text-[10px]">🖊️ Acceptation du Tiré (Client / Débiteur) :</h4>
                  <div className="h-20 border border-slate-300 bg-white rounded-lg flex items-end p-2 text-[9px] text-slate-400 font-bold italic">
                    Bon pour acceptation à l'échéance
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
