import React, { useState, useEffect, useMemo } from 'react';
import { DatabaseState } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { showToast } from '../utils/toast';
import { safeLocalStorage } from '../utils/storage';
import { jsPDF } from 'jspdf';
import { 
  Smartphone, 
  Printer, 
  Copy, 
  Plus, 
  Trash2, 
  Check, 
  Share2, 
  Clock, 
  HelpCircle,
  FileText,
  DollarSign,
  User,
  Hash,
  Download
} from 'lucide-react';

interface TelecomRechargeProps {
  db: DatabaseState;
  onUpdateDb?: (updatedDb: DatabaseState) => void;
}

interface RechargeTicket {
  id: string;
  operator: 'ooredoo' | 'telecom' | 'orange';
  amount: number;
  pin: string;
  serialNumber: string;
  expiryDate: string;
  dateCreated: string;
  customerPhone?: string;
}

export default function TelecomRecharge({ db, onUpdateDb }: TelecomRechargeProps) {
  const { language, formatCurrency } = useLanguage();
  
  // Local active state
  const [operator, setOperator] = useState<'ooredoo' | 'telecom' | 'orange'>('ooredoo');
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // History list
  const [tickets, setTickets] = useState<RechargeTicket[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('innova_telecom_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected ticket for preview
  const [selectedTicket, setSelectedTicket] = useState<RechargeTicket | null>(null);

  // Sync tickets to local storage
  useEffect(() => {
    safeLocalStorage.setItem('innova_telecom_tickets', JSON.stringify(tickets));
  }, [tickets]);

  // Handle setting selected preset amounts
  const amountPresets = [1, 2, 5, 10, 20, 50];

  // Helper to format PIN code
  const formatPin = (pin: string) => {
    // splits 14 or 16 digits in groups of 4-4-4-2 or 4-4-4-4 for readability
    const clean = pin.replace(/\D/g, '');
    const chunks: string[] = [];
    for (let i = 0; i < clean.length; i += 4) {
      chunks.push(clean.substring(i, i + 4));
    }
    return chunks.join(' - ');
  };

  // Generate realistic PIN and Serial Number
  const handleGenerateTicket = (e: React.FormEvent) => {
    e.preventDefault();

    const finalAmount = isCustomAmount ? parseFloat(customAmount) : selectedAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      showToast(
        language === 'ar' 
          ? 'الرجاء إدخال مبلغ شحن صحيح أكبر من الصفر' 
          : 'Veuillez saisir un montant de recharge valide supérieur à zéro.',
        'error'
      );
      return;
    }

    // Generate random PIN
    // Ooredoo/Orange standard: 14 digits. TT: 14 or 16. Let's make Ooredoo/Orange 14, TT 16.
    const pinLength = operator === 'telecom' ? 16 : 14;
    let generatedPin = '';
    for (let i = 0; i < pinLength; i++) {
      generatedPin += Math.floor(Math.random() * 10).toString();
    }

    // Generate Serial Number
    // Prefix based on operator: Ooredoo=10..., TT=20..., Orange=30...
    const prefix = operator === 'ooredoo' ? '10' : operator === 'telecom' ? '20' : '30';
    let generatedSerial = prefix;
    for (let i = 0; i < 11; i++) {
      generatedSerial += Math.floor(Math.random() * 10).toString();
    }

    // Expiry Date (2 years from now)
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 2);
    const expiryStr = expDate.toISOString().split('T')[0];

    const newTicket: RechargeTicket = {
      id: `ticket_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      operator,
      amount: finalAmount,
      pin: generatedPin,
      serialNumber: generatedSerial,
      expiryDate: expiryStr,
      dateCreated: new Date().toISOString(),
      customerPhone: customerPhone.trim() || undefined
    };

    setTickets(prev => [newTicket, ...prev]);
    setSelectedTicket(newTicket);
    
    // Clear custom input & phone optionally
    setCustomerPhone('');
    if (isCustomAmount) {
      setCustomAmount('');
    }

    showToast(
      language === 'ar' 
        ? 'تم توليد تذكرة الشحن ومطابقتها بنجاح!' 
        : 'Ticket de recharge généré et validé avec succès !',
      'success'
    );
  };

  // Delete a ticket from the local log
  const handleDeleteTicket = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTicket?.id === id) {
      setSelectedTicket(null);
    }
    setTickets(prev => prev.filter(t => t.id !== id));
    showToast(
      language === 'ar' ? 'تم حذف التذكرة من السجل.' : 'Ticket supprimé de l\'historique.',
      'info'
    );
  };

  // Clear entire telecom card history
  const handleClearHistory = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من رغبتك في مسح كل تذاكر الشحن المولدة؟' : 'Voulez-vous vraiment effacer tout l\'historique des tickets ?')) {
      setTickets([]);
      setSelectedTicket(null);
      showToast(
        language === 'ar' ? 'تم تصفير سجلات الشحن بالكامل.' : 'Historique des recharges entièrement réinitialisé.',
        'info'
      );
    }
  };

  // Custom high precision PDF download using jsPDF (80mm width thermal simulation)
  const downloadTicketPDF = (ticket: RechargeTicket) => {
    const storeName = db.settings?.storeName ?? "INNOVA POS PRO";
    const storePhone = db.settings?.storePhone ?? "+216 24 260 711";
    const storeAddress = db.settings?.storeAddress ?? "AVENU HABIB BOURGUIBA GHANNOUCHE GABES";

    // Standard 80mm thermal receipt dimensions in mm: 80 width x 140 height
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 140]
    });

    const opName = ticket.operator === 'ooredoo' ? 'OOREDOO' : ticket.operator === 'telecom' ? 'TUNISIE TELECOM' : 'ORANGE';
    const cleanPin = formatPin(ticket.pin);

    // Styling background details (thermal tickets are black and white, highly readable)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(storeName.toUpperCase(), 40, 10, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(storeAddress, 40, 14, { align: 'center' });
    doc.text(`Tél: ${storePhone}`, 40, 18, { align: 'center' });

    // Perforation line separator
    doc.setDrawColor(186, 195, 208);
    doc.setLineWidth(0.2);
    doc.line(5, 22, 75, 22);

    // Operator Title section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(220, 38, 38); // Brand Red defaults
    if (ticket.operator === 'ooredoo') {
      doc.setTextColor(220, 38, 38);
    } else if (ticket.operator === 'telecom') {
      doc.setTextColor(59, 130, 246);
    } else {
      doc.setTextColor(249, 115, 22);
    }
    doc.text(opName, 40, 29, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`TICKET DE RECHARGE`, 40, 35, { align: 'center' });

    // Value Section
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 40, 60, 14, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.rect(10, 40, 60, 14, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    const amountStr = `${ticket.amount.toLocaleString()} DT`;
    doc.text(amountStr, 40, 49, { align: 'center' });

    // PIN Number Highlight
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("CODE DE RECHARGE (PIN) :", 40, 60, { align: 'center' });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanPin, 40, 67, { align: 'center' });

    // Barcode Simulation logic (lines)
    let barX = 14;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    for (let i = 0; i < 26; i++) {
      const w = Math.random() > 0.4 ? 0.35 : 0.8;
      doc.setLineWidth(w);
      doc.line(barX, 74, barX, 84);
      barX += w + (Math.random() > 0.5 ? 0.4 : 1.1);
    }

    // Metadata details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`S/N: ${ticket.serialNumber}`, 40, 89, { align: 'center' });
    doc.text(`Valide jusqu'au: ${ticket.expiryDate}`, 40, 93, { align: 'center' });

    // separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(5, 97, 75, 97);

    // Operator specific instructions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text("INSTRUCTIONS DE RECHARGE :", 40, 103, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    if (ticket.operator === 'ooredoo') {
      doc.text("Composer : *101*CODE_PIN#", 40, 108, { align: 'center' });
      doc.text("Suivi de solde : *100#", 40, 112, { align: 'center' });
    } else if (ticket.operator === 'telecom') {
      doc.text("Composer : *101*CODE_PIN#", 40, 108, { align: 'center' });
      doc.text("Suivi de solde : *102#", 40, 112, { align: 'center' });
    } else {
      doc.text("Composer : *100*CODE_PIN#", 40, 108, { align: 'center' });
      doc.text("Suivi de solde : *101#", 40, 112, { align: 'center' });
    }

    // Customer reference if provided
    if (ticket.customerPhone) {
      doc.setFont("helvetica", "bold");
      doc.text(`Destinataire mobile: ${ticket.customerPhone}`, 40, 118, { align: 'center' });
    }

    // Footer lines
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    const dateFormatted = new Date(ticket.dateCreated).toLocaleString('fr-FR');
    doc.text(`Généré le: ${dateFormatted}`, 40, 126, { align: 'center' });
    doc.text("Merci pour votre visite !", 40, 130, { align: 'center' });

    doc.save(`TICKET_${opName}_${ticket.amount}DT_${ticket.serialNumber.slice(-5)}.pdf`);
    
    showToast(
      language === 'ar' ? 'جاري تحميل ملف التذكرة PDF...' : 'Téléchargement du ticket PDF commencé...',
      'success'
    );
  };

  // Set initial selected ticket if empty but tickets exist
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicket) {
      setSelectedTicket(tickets[0]);
    }
  }, [tickets, selectedTicket]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans space-y-6">
      
      {/* Upper header segment */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black font-display text-slate-900 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-blue-600 shrink-0" />
            <span>
              {language === 'ar' ? 'توليد وصولات شحن الرصيد (Tickets Telecom)' : 'Générateur de Tickets de Recharge'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {language === 'ar' 
              ? 'قم بتوليد أكواد وتذاكر التعبئة وحسابات الاتصال الفورية لشبكات Ooredoo, Tunisie Telecom و Orange.' 
              : 'Émettez des dockets professionnels de recharge pour Ooredoo Tunisie, Tunisie Telecom et Orange.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        
        {/* LEFT COLUMN: Input Form and Preset Configurations (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Configuration Panel */}
          <div className="bg-white rounded-2xl border border-slate-150 p-5 md:p-6 shadow-xs relative overflow-hidden">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-5 flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-400" />
              <span>{language === 'ar' ? 'إعدادات بطاقة الشحن الجديدة' : 'Configuration de la recharge'}</span>
            </h2>

            <form onSubmit={handleGenerateTicket} className="space-y-5">
              
              {/* Operator cards selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                  {language === 'ar' ? '١. حدد مشغل شبكة الاتصالات :' : '1. Choisir l\'opérateur télécom :'}
                </label>
                
                <div className="grid grid-cols-3 gap-3">
                  
                  {/* Ooredoo Operator */}
                  <button
                    type="button"
                    onClick={() => setOperator('ooredoo')}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all relative cursor-pointer ${
                      operator === 'ooredoo'
                        ? 'border-red-600 bg-red-50/50 text-red-700 font-black shadow-inner'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-extrabold text-xs mb-2 shadow-xs transition-transform hover:scale-105">
                      Oo
                    </div>
                    <span className="text-xs">Ooredoo</span>
                    <span className="text-[9px] text-slate-450 mt-0.5 font-mono">Code: *101*</span>
                    {operator === 'ooredoo' && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-red-600 flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>

                  {/* Tunisie Telecom Operator */}
                  <button
                    type="button"
                    onClick={() => setOperator('telecom')}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all relative cursor-pointer ${
                      operator === 'telecom'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-black shadow-inner'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-xs mb-2 shadow-xs transition-transform hover:scale-105">
                      TT
                    </div>
                    <span className="text-xs">Telecom</span>
                    <span className="text-[9px] text-slate-450 mt-0.5 font-mono">Code: *101*</span>
                    {operator === 'telecom' && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>

                  {/* Orange Operator */}
                  <button
                    type="button"
                    onClick={() => setOperator('orange')}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all relative cursor-pointer ${
                      operator === 'orange'
                        ? 'border-orange-500 bg-orange-50/20 text-orange-700 font-black shadow-inner'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-extrabold text-xs mb-2 shadow-xs transition-transform hover:scale-105">
                      Or
                    </div>
                    <span className="text-xs">Orange</span>
                    <span className="text-[9px] text-slate-450 mt-0.5 font-mono">Code: *100*</span>
                    {operator === 'orange' && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>

                </div>
              </div>

              {/* Amount Pre-sets and values selections */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                    {language === 'ar' ? '٢. القيمة الاسمية (دينار تونسي) :' : '2. Valeur faciale (DT) :'}
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomAmount(!isCustomAmount);
                    }}
                    className="text-[10.5px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {isCustomAmount 
                      ? (language === 'ar' ? 'استخدام الفئات الجاهزة' : 'Choisir une valeur fixe') 
                      : (language === 'ar' ? 'إدخال رقم مخصص' : 'Saisir un montant libre')}
                  </button>
                </div>

                {!isCustomAmount ? (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {amountPresets.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSelectedAmount(amt)}
                        className={`py-3 px-1 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                          selectedAmount === amt
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-xs block">{amt} DT</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل مبلغ الشحن المخصص...' : 'Saisir le montant en Dinars Tunisien (Ex: 3.5)...'}
                      className="w-full text-xs font-semibold border pr-14 border-slate-250 p-3 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-black text-slate-400">
                      DT
                    </span>
                  </div>
                )}
              </div>

              {/* Extra details (optional customer info) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                    {language === 'ar' ? 'رقم هاتف الزبون (اختياري) :' : 'Tél. Client (Optionnel) :'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Ex: 24 260 711"
                      className="w-full text-xs font-semibold pl-9 border border-slate-250 p-3 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors text-slate-800"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">
                    {language === 'ar' ? 'التسجيل والأرشفة :' : 'Archivage Système :'}
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10.5px] text-slate-500 font-medium">
                    {language === 'ar' 
                      ? 'سيتم تسجيل هذا الكود محلياً في أرشيف النقد لتبسيط الإيصال والاستعراض.' 
                      : 'Le code généré est indexé localement dans votre registre de caisse.'}
                  </div>
                </div>
              </div>

              {/* Generation submit button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-slate-900 border border-slate-850 text-white hover:bg-slate-800 font-sans text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <Smartphone className="w-4 h-4 shrink-0 text-slate-300" />
                <span>
                  {language === 'ar' ? 'توليد تذكرة الشحن الفورية' : 'Générer le Ticket de Recharge'}
                </span>
              </button>

            </form>
          </div>

          {/* List: Generated history log */}
          <div className="bg-white rounded-2xl border border-slate-150 p-5 md:p-6 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-450" />
                <span>{language === 'ar' ? 'سجل تذاكر الشحن المولدة' : 'Historique des dockets émis'}</span>
              </h3>
              {tickets.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors bg-rose-50 px-2.5 py-1 rounded-md"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{language === 'ar' ? 'مسح السجل' : 'Effacer tout'}</span>
                </button>
              )}
            </div>

            {tickets.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-slate-200 bg-slate-50 rounded-xl text-xs text-slate-450 font-medium">
                {language === 'ar' 
                  ? 'لم يتم توليد أي بطاقة شحن رصيد بعد.' 
                  : 'Aucun ticket de recharge n\'a été émis pour le moment.'}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-0.5">
                {tickets.map((tck) => {
                  const isActive = selectedTicket?.id === tck.id;
                  const dateStr = new Date(tck.dateCreated).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'});
                  return (
                    <div
                      key={tck.id}
                      onClick={() => setSelectedTicket(tck)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isActive
                          ? 'border-slate-800 bg-slate-50 shadow-xs'
                          : 'border-slate-150 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Operator badge indicator */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold text-xs shrink-0 select-none ${
                          tck.operator === 'ooredoo' ? 'bg-red-600' : tck.operator === 'telecom' ? 'bg-blue-600' : 'bg-orange-500'
                        }`}>
                          {tck.operator === 'ooredoo' ? 'Oo' : tck.operator === 'telecom' ? 'TT' : 'Or'}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs">
                            {tck.operator === 'ooredoo' ? 'Ooredoo' : tck.operator === 'telecom' ? 'Telecom' : 'Orange'}
                            <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[9.5px] font-black text-slate-600">
                              {tck.amount} DT
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-450 font-mono truncate mt-0.5">
                            S/N: {tck.serialNumber} | Pin: {tck.pin.slice(0, 4)}...
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 font-mono font-bold shrink-0">
                          {dateStr}
                        </span>
                        
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTicket(tck.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Thermal Ticket Live Preview Canvas (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {selectedTicket ? (
            <div className="space-y-4">
              
              {/* Head line */}
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 font-mono">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>{language === 'ar' ? 'معاينة تذكرة الشحن الفورية' : 'Visuel Ticket de Recharge'}</span>
                </span>
                
                <span className="text-[10px] px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-100 animate-pulse">
                  {language === 'ar' ? 'جاهز للطبع' : 'Validé & Prêt'}
                </span>
              </div>

              {/* Thermal ticket container model */}
              <div className="relative bg-slate-900 border border-slate-950 p-4 rounded-3xl shadow-xl overflow-hidden text-start">
                
                {/* Paper circle edge punch effect tops */}
                <div className="absolute top-0 left-0 right-0 h-1.5 flex justify-around overflow-hidden px-2 z-10">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-100 -mt-1.5 shrink-0" />
                  ))}
                </div>

                {/* Simulated Roll Content */}
                <div className="bg-white text-slate-900 p-5 pt-8 pb-8 rounded-xl font-sans relative">
                  
                  {/* Shop Details */}
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black uppercase text-slate-900 tracking-tight">
                      {db.settings?.storeName || 'INNOVA POS PRO'}
                    </p>
                    <p className="text-[8.5px] text-slate-450 leading-tight">
                      {db.settings?.storeAddress || 'AVENU HABIB BOURGUIBA GHANNOUCHE GABES'}
                    </p>
                    <p className="text-[8.5px] text-slate-450 font-bold">
                      Tél : {db.settings?.storePhone || '+216 24 260 711'}
                    </p>
                  </div>

                  {/* Perforation line */}
                  <div className="border-b border-dashed border-slate-300 my-4" />

                  {/* Network Operator details */}
                  <div className="text-center space-y-1">
                    <h4 className={`text-sm font-black tracking-widest ${
                      selectedTicket.operator === 'ooredoo' ? 'text-red-600' : selectedTicket.operator === 'telecom' ? 'text-blue-600' : 'text-orange-500'
                    }`}>
                      {selectedTicket.operator === 'ooredoo' ? 'OOREDOO TUNISIE' : selectedTicket.operator === 'telecom' ? 'TUNISIE TELECOM' : 'ORANGE TUNISIE'}
                    </h4>
                    <p className="text-[9.5px] font-bold text-slate-700 uppercase tracking-wider">
                      {language === 'ar' ? 'تذكرة تعبئة الرصيد الإلكترونية' : 'TICKET DE RECHARGE'}
                    </p>
                  </div>

                  {/* Main Amount Card Box */}
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 my-4 text-center">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">
                      {language === 'ar' ? 'القيمة الإجمالية للتعبئة' : 'VALEUR DE LA RECHARGE'}
                    </span>
                    <span className="text-lg font-black text-slate-900 tracking-tight block mt-0.5">
                      {selectedTicket.amount.toLocaleString()} DT
                    </span>
                  </div>

                  {/* Recharge PIN Block */}
                  <div className="space-y-1 text-center bg-slate-50 border-r-2 border-l-2 py-2 px-1 border-slate-350 rounded my-3">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase">
                      {language === 'ar' ? 'رقم الشحن السري (PIN)' : 'CODE DE RECHARGE (PIN)'}
                    </span>
                    <span className="text-[12.5px] font-black text-slate-950 font-mono tracking-widest block select-all">
                      {formatPin(selectedTicket.pin)}
                    </span>
                  </div>

                  {/* Barcode representation */}
                  <div className="pt-2 pb-3 flex flex-col items-center">
                    <div className="h-9 w-40 flex items-stretch gap-[1.5px] justify-center bg-white px-1">
                      {Array.from({ length: 30 }).map((_, i) => {
                        const widthClass = i % 3 === 0 ? 'w-[2.5px]' : i % 5 === 0 ? 'w-[1.2px]' : 'w-[0.6px]';
                        return (
                          <div
                            key={i}
                            className={`bg-slate-950 ${widthClass}`}
                            style={{ opacity: i % 7 === 1 ? 0 : 1 }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[7.5px] text-slate-450 font-mono mt-1">
                      S/N : {selectedTicket.serialNumber}
                    </span>
                  </div>

                  {/* Instructions Block based on operator */}
                  <div className="bg-slate-50/50 rounded-lg p-2.5 border border-slate-100 text-[8px] text-slate-500 leading-normal space-y-1 text-center font-medium">
                    <p className="font-bold text-slate-700">
                      {language === 'ar' ? 'طريقة الاستعمال :' : 'INSTRUCTIONS DE RECHARGE :'}
                    </p>
                    
                    {selectedTicket.operator === 'ooredoo' && (
                      <>
                        <p>{language === 'ar' ? 'لتعبئة رصيدك اطلب : *101* الرقم السري #' : 'Pour effectuer la recharge: Composez *101*CODE#'}</p>
                        <p>{language === 'ar' ? 'لمعرفة الرصيد المتبقي اطلب : *100#' : 'Pour consulter votre solde restant: Composez *100#'}</p>
                      </>
                    )}

                    {selectedTicket.operator === 'telecom' && (
                      <>
                        <p>{language === 'ar' ? 'لتعبئة رصيدك اطلب : *101* الرقم السري #' : 'Pour effectuer la recharge: Composez *101*CODE_PIN#'}</p>
                        <p>{language === 'ar' ? 'لمعرفة الرصيد المتبقي اطلب : *102#' : 'Pour consulter votre solde restant: Composez *102#'}</p>
                      </>
                    )}

                    {selectedTicket.operator === 'orange' && (
                      <>
                        <p>{language === 'ar' ? 'لتعبئة رصيدك اطلب : *100* الرقم السري #' : 'Pour effectuer la recharge: Composez *100*CODE#'}</p>
                        <p>{language === 'ar' ? 'لمعرفة الرصيد المتبقي اطلب : *101#' : 'Pour consulter votre solde restant: Composez *101#'}</p>
                      </>
                    )}
                  </div>

                  {/* Expire Meta */}
                  <div className="text-center pt-3 mt-3 border-t border-dashed border-slate-200 space-y-0.5">
                    <p className="text-[7.5px] text-slate-400 font-mono">
                      {language === 'ar' ? `تاريخ انتهاء الصلاحية : ${selectedTicket.expiryDate}` : `Valide jusqu'au : ${selectedTicket.expiryDate}`}
                    </p>
                    {selectedTicket.customerPhone && (
                      <p className="text-[8px] text-slate-800 font-bold font-mono">
                        {language === 'ar' ? `لهاتف العميل: ${selectedTicket.customerPhone}` : `Acheteur Tél: ${selectedTicket.customerPhone}`}
                      </p>
                    )}
                    <p className="text-[7.5px] text-slate-405 italic pt-1">
                      {language === 'ar' ? 'شكراً لثقتكم ومرحباً بكم دائماً !' : 'Merci pour votre confiance !'}
                    </p>
                  </div>

                </div>

                {/* Paper circle edge punch effect bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 flex justify-around overflow-hidden px-2 z-10">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-100 -mb-1 shrink-0" />
                  ))}
                </div>

              </div>

              {/* Action Buttons for downloading PDF or copying */}
              <div className="grid grid-cols-2 gap-3" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedTicket.pin);
                    showToast(
                      language === 'ar' ? '📋 تم نسخ كود الشحن السري!' : '📋 Code PIN copié dans le presse-papiers !',
                      'success'
                    );
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'نسخ كود الشحن' : 'Copier le Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadTicketPDF(selectedTicket)}
                  className="py-2.5 px-5 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-350" />
                  <span>{language === 'ar' ? 'تحميل كملف PDF' : 'Télécharger PDF'}</span>
                </button>

              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 bg-slate-50 rounded-2xl min-h-[400px]">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                {language === 'ar' ? 'المعاينة الفورية للتذكرة' : 'Aperçu du ticket'}
              </h4>
              <p className="text-[11px] text-slate-450 max-w-xs leading-normal font-medium">
                {language === 'ar' 
                  ? 'اختر تذكرة من السجل أو قم بتوليد تذكرة شحن جديدة لعرض التصميم الرسومي والتحميل.' 
                  : 'Générez un nouveau code ou sélectionnez-en un dans votre historique pour afficher son aperçu imprimable.'}
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
