import React, { useState, useMemo } from 'react';
import { DatabaseState, Partner, StoreSettings } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { showToast } from '../utils/toast';
import { 
  PlusCircle, 
  Search, 
  Phone, 
  MapPin, 
  CreditCard, 
  CheckCircle,
  TrendingDown,
  TrendingUp,
  X,
  FileText,
  ExternalLink
} from 'lucide-react';
import PartnersMap from './PartnersMap';
import { checkIsIframe } from '../utils/storage';

interface PartnersProps {
  db: DatabaseState;
  onUpdateDb: (updatedDb: DatabaseState) => void;
}

export default function Partners({ db, onUpdateDb }: PartnersProps) {
  const { language, t, formatCurrency } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'client' | 'fournisseur' | 'map'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Settle balance modals
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [showCreditStatementPartner, setShowCreditStatementPartner] = useState<Partner | null>(null);

  // Register state
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerTypeToCreate, setPartnerTypeToCreate] = useState<'client' | 'fournisseur'>('client');

  // Form inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [nif, setNif] = useState('');
  const [rc, setRc] = useState('');
  const [ai, setAi] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [location, setLocation] = useState('');
  const [discountRate, setDiscountRate] = useState<string>('');
  const [loyaltyPoints, setLoyaltyPoints] = useState<string>('0');

  // Supply chain custom properties
  const [contactPerson, setContactPerson] = useState('');
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [supplyChainType, setSupplyChainType] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  // Loyalty Settings Editing State
  const [showLoyaltySettings, setShowLoyaltySettings] = useState(false);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(db.settings?.enableLoyaltyPoints ?? false);
  const [loyaltyXSpent, setLoyaltyXSpent] = useState(String(db.settings?.loyaltyXSpent ?? 10));
  const [loyaltyYPoints, setLoyaltyYPoints] = useState(String(db.settings?.loyaltyYPoints ?? 1));
  const [loyaltyPointValue, setLoyaltyPointValue] = useState(String(db.settings?.loyaltyPointValue ?? 0.1));

  const handleSaveLoyaltySettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: StoreSettings = {
      storeName: db.settings?.storeName ?? "INNOVA POS PRO",
      storePhone: db.settings?.storePhone ?? "",
      storeAddress: db.settings?.storeAddress ?? "",
      activitySector: db.settings?.activitySector ?? "general",
      ...(db.settings || {}),
      enableLoyaltyPoints: loyaltyEnabled,
      loyaltyXSpent: Number(loyaltyXSpent) || 10,
      loyaltyYPoints: Number(loyaltyYPoints) || 1,
      loyaltyPointValue: Number(loyaltyPointValue) || 0.1,
    };
    onUpdateDb({
      ...db,
      settings: updatedSettings
    });
    setShowLoyaltySettings(false);
    showToast(language === 'ar' ? "✅ تم حفظ إعدادات نظام الولاء بنجاح!" : "✅ Paramètres de fidélité enregistrés avec succès !", 'success');
  };

  const filteredPartners = useMemo(() => {
    return (db.partners || []).filter(p => {
      const matchType = activeTab === 'all' || activeTab === 'map' ? true : p.type === activeTab;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.phone && p.phone.includes(searchQuery)) ||
                          (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [db.partners, activeTab, searchQuery]);

  // Handle addition or modifying partners
  const handleOpenCreate = () => {
    setEditingPartner(null);
    setName('');
    setPhone('');
    setAddress('');
    setEmail('');
    setNif('');
    setRc('');
    setAi('');
    setInitialBalance(0);
    setLocation('');
    setDiscountRate('');
    setLoyaltyPoints('0');
    setContactPerson('');
    setCreditLimit('');
    setSupplyChainType('');
    setPaymentTerms('');
    setPartnerTypeToCreate(activeTab === 'fournisseur' ? 'fournisseur' : 'client');
    setShowPartnerModal(true);
  };

  const handleOpenEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setName(partner.name);
    setPhone(partner.phone);
    setAddress(partner.address);
    setEmail(partner.email || '');
    setNif(partner.nif || '');
    setRc(partner.rc || '');
    setAi(partner.ai || '');
    setInitialBalance(partner.currentBalance);
    setLocation(partner.location || '');
    setDiscountRate(partner.discountRate !== undefined ? String(partner.discountRate) : '');
    setLoyaltyPoints(partner.loyaltyPoints !== undefined ? String(partner.loyaltyPoints) : '0');
    setContactPerson(partner.contactPerson || '');
    setCreditLimit(partner.creditLimit !== undefined ? String(partner.creditLimit) : '');
    setSupplyChainType(partner.supplyChainType || '');
    setPaymentTerms(partner.paymentTerms || '');
    setPartnerTypeToCreate(partner.type);
    setShowPartnerModal(true);
  };

  const handlePartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updatedPartners = [...(db.partners || [])];
    const rateNum = discountRate.trim() ? parseFloat(discountRate) : undefined;
    const ptsNum = selectedTabIsClient ? (parseInt(loyaltyPoints, 10) || 0) : undefined;

    if (editingPartner) {
      updatedPartners = updatedPartners.map(p => {
        if (p.id === editingPartner.id) {
          return {
            ...p,
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            email: email.trim() || undefined,
            nif: nif.trim() || undefined,
            rc: rc.trim() || undefined,
            ai: ai.trim() || undefined,
            currentBalance: Number(initialBalance),
            location: location.trim() || undefined,
            discountRate: selectedTabIsClient ? rateNum : undefined,
            loyaltyPoints: ptsNum,
            contactPerson: !selectedTabIsClient && contactPerson.trim() ? contactPerson.trim() : undefined,
            creditLimit: creditLimit.trim() ? Number(creditLimit) : undefined,
            supplyChainType: !selectedTabIsClient && supplyChainType.trim() ? supplyChainType.trim() : undefined,
            paymentTerms: !selectedTabIsClient && paymentTerms.trim() ? paymentTerms.trim() : undefined
          };
        }
        return p;
      });
    } else {
      const newPartner: Partner = {
        id: `part-${Date.now()}`,
        type: partnerTypeToCreate,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim() || undefined,
        nif: nif.trim() || undefined,
        rc: rc.trim() || undefined,
        ai: ai.trim() || undefined,
        currentBalance: Number(initialBalance),
        location: location.trim() || undefined,
        discountRate: selectedTabIsClient ? rateNum : undefined,
        loyaltyPoints: ptsNum,
        contactPerson: !selectedTabIsClient && contactPerson.trim() ? contactPerson.trim() : undefined,
        creditLimit: creditLimit.trim() ? Number(creditLimit) : undefined,
        supplyChainType: !selectedTabIsClient && supplyChainType.trim() ? supplyChainType.trim() : undefined,
        paymentTerms: !selectedTabIsClient && paymentTerms.trim() ? paymentTerms.trim() : undefined
      };
      updatedPartners.unshift(newPartner);
    }

    onUpdateDb({ ...db, partners: updatedPartners });
    setShowPartnerModal(false);
    showToast(editingPartner 
      ? (language === 'ar' ? 'تم تعديل ملف الشريك' : 'Partenaire modifié avec succès') 
      : (language === 'ar' ? 'تم إضافة الشريك بنجاح' : 'Partenaire ajouté avec succès')
    );
  };

  // Balance settlement actions (Enregistrer versement / règlement)
  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast(language === 'ar' ? '⚠️ يرجى إدخال مبلغ صالح أكبر من 0 د.ت.' : '⚠️ Veuillez saisir un montant valide supérieur à 0 DT.', 'error');
      return;
    }

    // Determine balance changes based on client/supplier
    // Client has POSITIVE balance indicating they owe us. Versement from them REDUCES their imbalance.
    // Supplier has NEGATIVE balance indicating we owe them. Versement from us INCREASES/ADJUSTS balance closer to zero.
    let updatedBalance = selectedPartner.currentBalance;
    let paymentType: 'payment_received' | 'payment_sent' = 'payment_received';
    
    if (selectedTabIsClient) {
      updatedBalance = Math.max(0, selectedPartner.currentBalance - amount);
      paymentType = 'payment_received';
    } else {
      // Supplier negative. Paying them moves balance up towards zero.
      updatedBalance = Math.min(0, selectedPartner.currentBalance + amount);
      paymentType = 'payment_sent';
    }

    // Save payment ledger history
    const newPayment = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partnerId: selectedPartner.id,
      partnerName: selectedPartner.name,
      partnerType: selectedPartner.type,
      type: paymentType,
      amount: amount,
      notes: paymentNotes.trim() || (selectedTabIsClient ? 'Versement d\'acompte client' : 'Règlement de facture fournisseur')
    };

    const updatedPartners = (db.partners || []).map(p => {
      if (p.id === selectedPartner.id) {
        return {
          ...p,
          currentBalance: updatedBalance
        };
      }
      return p;
    });

    onUpdateDb({
      ...db,
      partners: updatedPartners,
      payments: [newPayment, ...(db.payments || [])]
    });

    setSelectedPartner(null);
    setPaymentAmount('');
    setPaymentNotes('');
    showToast("Versement enregistré et validé avec succès !", 'success');
  };

  const selectedTabIsClient = partnerTypeToCreate === 'client';

  // Compute loyalty program states
  const clientLoyaltyPointsTotal = useMemo(() => {
    return db.partners
      .filter(p => p.type === 'client')
      .reduce((sum, p) => sum + (p.loyaltyPoints || 0), 0);
  }, [db.partners]);

  const clientLoyaltyValueTotal = useMemo(() => {
    return clientLoyaltyPointsTotal * (db.settings?.loyaltyPointValue ?? 0.1);
  }, [clientLoyaltyPointsTotal, db.settings]);

  // Compute total credits/debits totals
  const totalOutstandingClientBalance = db.partners
    .filter(p => p.type === 'client' && p.currentBalance > 0)
    .reduce((sum, p) => sum + p.currentBalance, 0);

  const totalOutstandingSupplierBalance = db.partners
    .filter(p => p.type === 'fournisseur' && p.currentBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.currentBalance), 0);

  return (
    <div className="space-y-6">
      
      {/* Tab select and add actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Partenaires Commerciaux</h1>
          <p className="text-slate-500 text-sm">Base de données des Clients (Débi) et Fournisseurs (Créance), règlements d'acomptes et historiques.</p>
        </div>
        
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Fiche Partenaire (Nouveau)</span>
        </button>
      </div>

      {/* Credit summaries cards */}
      <div className={`grid grid-cols-1 ${activeTab === 'all' || activeTab === 'client' ? 'md:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
        <div className="bg-white p-5 border border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Créances Clients (Dettes à recouvrer)</span>
            <span className="text-2xl font-black text-slate-900 font-mono block">{formatCurrency(totalOutstandingClientBalance)}</span>
            <span className="text-[10px] text-emerald-600 font-medium block">Total attendu par versement ou virement</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Crédits Fournisseurs (Dettes à honorer)</span>
            <span className="text-2xl font-black text-rose-600 font-mono block">{formatCurrency(totalOutstandingSupplierBalance)}</span>
            <span className="text-[10px] text-slate-400 font-medium block">Encours factures d'achats impayées</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {(activeTab === 'all' || activeTab === 'client') && (
          <div className="bg-white p-5 border border-slate-200 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Fidélité Clients (Encours des Points)</span>
              <span className="text-2xl font-black text-indigo-600 font-mono block">{clientLoyaltyPointsTotal.toLocaleString()} pts</span>
              <span className="text-[10px] text-indigo-500 font-semibold block">Equivalent réduction: {formatCurrency(clientLoyaltyValueTotal)}</span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center">
              <span className="text-xl">🎁</span>
            </div>
          </div>
        )}
      </div>

      {/* loyalty settings toggler */}
      {(activeTab === 'all' || activeTab === 'client') && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-3xs">
          <button 
            type="button"
            onClick={() => setShowLoyaltySettings(!showLoyaltySettings)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all font-sans cursor-pointer text-left focus:outline-hidden"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">⚙️</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {language === 'ar' ? 'إعدادات برنامج ولاء العملاء' : 'Configuration du Programme de Fidélité'}
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  {db.settings?.enableLoyaltyPoints 
                    ? (language === 'ar' ? `نشط: كل ${db.settings.loyaltyXSpent || 10} د.ت تعطي ${db.settings.loyaltyYPoints || 1} نقطة (1 نقطة = ${db.settings.loyaltyPointValue || 0.1} د.ت)` : `Actif: Chaque ${db.settings.loyaltyXSpent || 10} DT d'achat = ${db.settings.loyaltyYPoints || 1} Pt(s) (1 Pt = ${db.settings.loyaltyPointValue || 0.1} DT)`)
                    : (language === 'ar' ? 'برنامج الولاء غير مفعل حالياً' : 'Le programme de fidélité est actuellement désactivé.')
                  }
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600 px-3 py-1 bg-indigo-50 rounded-lg">
              {showLoyaltySettings ? (language === 'ar' ? 'إغلاق' : 'Masquer') : (language === 'ar' ? 'تعديل القواعد' : 'Configurer')}
            </span>
          </button>

          {showLoyaltySettings && (
            <form onSubmit={handleSaveLoyaltySettings} className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 font-sans text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800">{language === 'ar' ? 'تفعيل نظام النقاط' : 'Activer le système de points de fidélité'}</span>
                  <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'تفعيل تسجيل النقاط تلقائياً عند تسجيل المبيعات للعملاء' : 'Permet de créditer et déduire des points lors du checkout'}</span>
                </div>
                <input 
                  type="checkbox"
                  checked={loyaltyEnabled}
                  onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    {language === 'ar' ? 'قيمة الإنفاق (X)' : 'Palier de dépense (X)'}
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={loyaltyXSpent}
                      onChange={(e) => setLoyaltyXSpent(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 focus:outline-hidden font-bold text-slate-800"
                      placeholder="e.g. 10"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-mono text-slate-400">DT</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    {language === 'ar' ? 'النقاط المكتسبة (Y)' : 'Points attribués (Y)'}
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      required
                      min="1"
                      value={loyaltyYPoints}
                      onChange={(e) => setLoyaltyYPoints(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 focus:outline-hidden font-bold text-slate-800"
                      placeholder="e.g. 1"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-mono text-slate-400 font-sans">pts</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                     {language === 'ar' ? 'قيمة النقطة الواحدة' : 'Valeur d\'un point'}
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      required
                      min="0.001"
                      step="0.001"
                      value={loyaltyPointValue}
                      onChange={(e) => setLoyaltyPointValue(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 focus:outline-hidden font-bold text-slate-800"
                      placeholder="e.g. 0.1"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-mono text-slate-400">DT</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200/60">
                <button 
                  type="button"
                  onClick={() => setShowLoyaltySettings(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold font-sans cursor-pointer transition-all"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-all"
                >
                  {language === 'ar' ? 'حفظ القواعد' : 'Appliquer'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Main switch box and search filters */}
      <div className="bg-white p-4 border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Toggle options */}
        <div className="flex bg-slate-100 p-1 rounded self-stretch sm:self-auto overflow-x-auto gap-1">
          <button
            onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🗂️ {language === 'ar' ? 'الكل' : 'Tous'} ({db.partners.length})
          </button>
          <button
            onClick={() => { setActiveTab('client'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'client' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            👥 {language === 'ar' ? 'الزبائن' : 'Clients'} ({db.partners.filter(p => p.type === 'client').length})
          </button>
          <button
            onClick={() => { setActiveTab('fournisseur'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'fournisseur' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🏭 {language === 'ar' ? 'الموردين' : 'Fournisseurs'} ({db.partners.filter(p => p.type === 'fournisseur').length})
          </button>
          <button
            onClick={() => { setActiveTab('map'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🗺️ {language === 'ar' ? 'خريطة الشركاء' : 'Carte des partenaires'} ({db.partners.filter(p => p.location).length})
          </button>
        </div>

        {/* Local text search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={`Filtrer par nom, téléphone...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all font-semibold"
          />
        </div>
      </div>

      {/* Grid listing partners cards or Interactive Map view */}
      {activeTab === 'map' ? (
        <PartnersMap partners={db.partners} formatCurrency={formatCurrency} />
      ) : filteredPartners.length === 0 ? (
        <div className="bg-white text-center py-20 border border-slate-200 text-slate-400">
          <Search className="w-12 h-12 stroke-1 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-800">
            {language === 'ar' ? 'لا يوجد أي سجل متاح حالياً' : 'Aucun profil enregistré'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ar' ? 'استخدم الخيار في الأعلى لإنشاء ملف جديد.' : 'Utilisez l\'option en haut pour créer un nouveau dossier.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPartners.map(p => {
            const isClient = p.type === 'client';
            const hasDebt = isClient ? p.currentBalance > 0 : p.currentBalance < 0;
            const absBalance = Math.abs(p.currentBalance);
            const associatedLogs = (db.payments || []).filter(l => l.partnerId === p.id);
            const partnerInvoices = (db.invoices || []).filter(inv => inv.partnerId === p.id);
            const partnerPayments = (db.payments || []).filter(pay => pay.partnerId === p.id);
            const allDates = [
              ...partnerInvoices.map(i => i.date),
              ...partnerPayments.map(pay => pay.date)
            ].filter(Boolean);
            const latestTransactionDate = allDates.length > 0 
              ? allDates.reduce((latest, current) => current > latest ? current : latest) 
              : null;

            return (
              <div key={p.id} className="bg-white rounded border border-slate-200 p-5 flex flex-col justify-between space-y-4">
                
                {/* Visual block Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.5 font-bold rounded uppercase mb-1">{p.type}</span>
                    {p.discountRate !== undefined && p.discountRate > 0 && (
                      <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1.5 px-1 py-0.5 font-extrabold rounded">
                        🏷️ -{p.discountRate}% {language === 'ar' ? 'خصم مسبق' : 'Remise'}
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{p.name}</h3>
                    
                    <div className="flex flex-col space-y-1 mt-2 text-slate-500">
                      {p.phone && (
                        <span className="flex items-center gap-1.5 text-xs font-mono">
                           <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.phone}</span>
                        </span>
                      )}
                      
                      {p.address && (
                        <span className="flex items-center gap-1.5 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.address}</span>
                        </span>
                      )}

                      {p.location && (
                        <span className="flex items-center gap-1.5 text-xs text-rose-600 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          {p.location.startsWith('http') ? (
                            <a 
                              href={p.location} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              referrerPolicy="no-referrer"
                              className="underline flex items-center gap-0.5 hover:text-rose-800"
                            >
                              <span>{language === 'ar' ? 'الموقع الجغرافي 🗺️' : 'Localisation 🗺️'}</span>
                              <ExternalLink className="w-2.5 h-2.5 inline" />
                            </a>
                          ) : (
                            <span>{p.location}</span>
                          )}
                        </span>
                      )}
                    </div>

                    {p.type === 'client' && db.settings?.enableLoyaltyPoints && (
                      <div className="mt-3 bg-indigo-50/60 border border-indigo-100 p-2.5 rounded-lg flex items-center justify-between gap-2 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎁</span>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-indigo-500 block tracking-wider leading-none">
                              {language === 'ar' ? 'نقاط برنامج الولاء' : 'Points Fidélité'}
                            </span>
                            <span className="text-sm font-mono font-black text-indigo-700 block mt-0.5">
                              {p.loyaltyPoints || 0} pts
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
                            {language === 'ar' ? 'قيمة التخفيض' : 'Réduction'}
                          </span>
                          <span className="text-xs font-bold text-emerald-600 font-mono block mt-0.5">
                            {formatCurrency((p.loyaltyPoints || 0) * (db.settings?.loyaltyPointValue ?? 0.1))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visual debts badges */}
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">
                      {language === 'ar' ? 'رصيد الحساب' : 'Solde de Compte'}
                    </p>
                    <p className={`text-base font-black font-mono mt-0.5 ${
                      isClient 
                        ? p.currentBalance > 0 
                          ? 'text-rose-600' 
                          : 'text-emerald-600'
                        : p.currentBalance < 0 
                          ? 'text-rose-600' 
                          : 'text-slate-650'
                    }`}>
                      {formatCurrency(absBalance)}
                    </p>
                    <span className={`text-[9px] font-bold px-1 rounded block mt-0.5 ${
                      isClient 
                        ? p.currentBalance > 0 
                          ? 'bg-rose-50 text-rose-800 border border-rose-100' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                        : p.currentBalance < 0 
                          ? 'bg-rose-50 text-rose-800 border border-rose-100' 
                          : 'bg-slate-100/80 text-slate-700 font-bold border border-slate-200'
                    }`}>
                      {isClient 
                        ? p.currentBalance > 0 
                          ? (language === 'ar' ? 'ديون مستحقة (عليه)' : 'Créance (Il nous doit)') 
                          : (language === 'ar' ? 'خالٍ من الديون (مسوّى)' : 'À jour (Aucune dette)')
                        : p.currentBalance < 0 
                          ? (language === 'ar' ? 'رصيد دائن (له)' : 'Crédit (On lui doit)') 
                          : (language === 'ar' ? 'مسوّى' : 'À jour')
                      }
                    </span>

                    {isClient && p.creditLimit !== undefined && p.creditLimit > 0 && (
                      <div className="mt-2 text-right">
                        <span className="text-[10px] text-slate-400 block font-bold leading-none">
                          {language === 'ar' ? 'سقف الائتمان:' : 'Limite de Crédit :'}
                        </span>
                        <span className="text-xs font-bold font-mono text-indigo-700 block mt-0.5">
                          {formatCurrency(p.creditLimit)}
                        </span>
                        {p.currentBalance > p.creditLimit && (
                          <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 block mt-1 animate-pulse">
                            ⚠️ {language === 'ar' ? 'تجاوز سقف الائتمان!' : 'Limite Dépassée !'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 📊 Résumé d'activité (Summary View) */}
                <div className="bg-slate-50 border border-slate-200/65 rounded-lg p-3 space-y-2 text-start">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📊</span>
                    <span>{language === 'ar' ? 'ملخص النشاط التجاري للمتعامل' : 'Résumé d\'activité'}</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide leading-tight">
                        {language === 'ar' ? 'الرصيد المستحق' : 'Solde outstanding'}
                      </span>
                      <span className={`text-[11px] font-black font-mono mt-1 ${
                        isClient 
                          ? p.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                          : p.currentBalance < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {formatCurrency(absBalance)}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide leading-tight">
                        {language === 'ar' ? 'عدد الفواتير' : 'Nombre de factures'}
                      </span>
                      <span className="text-xs font-black font-mono text-slate-700 mt-1">
                        {partnerInvoices.length} {language === 'ar' ? 'فواتير' : 'doc(s)'}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide leading-tight">
                        {language === 'ar' ? 'آخر معاملة' : 'Dernière transaction'}
                      </span>
                      <span className="text-[9.5px] font-bold font-mono text-slate-600 mt-1 truncate">
                        {latestTransactionDate ? latestTransactionDate : (language === 'ar' ? 'لا يوجد' : 'Aucune')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Supply Chain Details */}
                {!isClient && (p.contactPerson || p.supplyChainType || p.paymentTerms || p.creditLimit) && (
                  <div className="grid grid-cols-2 gap-3.5 py-2.5 border-t border-b border-dashed border-slate-200 text-[11px] bg-sky-50/20 p-3 rounded-lg font-sans">
                    {p.contactPerson && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                          {language === 'ar' ? 'المسؤول المباشر' : 'Contact Principal'}
                        </span>
                        <span className="text-slate-800 font-bold mt-0.5">👤 {p.contactPerson}</span>
                      </div>
                    )}
                    {p.supplyChainType && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                          {language === 'ar' ? 'فئة سلسلة التوريد' : 'Catégorie de la Chaîne'}
                        </span>
                        <span className="text-blue-600 font-bold mt-0.5">🏭 {p.supplyChainType}</span>
                      </div>
                    )}
                    {p.paymentTerms && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                          {language === 'ar' ? 'شروط وقنوات الدفع' : 'Conditions de Paiement'}
                        </span>
                        <span className="text-slate-705 font-bold mt-0.5">💳 {p.paymentTerms}</span>
                      </div>
                    )}
                    {p.creditLimit ? (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                          {language === 'ar' ? 'سقف الائتمان الأقصى' : 'Limite d\'Crédit Autorisé'}
                        </span>
                        <span className="text-rose-600 font-mono font-extrabold mt-0.5">⚠️ {formatCurrency(p.creditLimit)}</span>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Fiscal parameters details list */}
                {(p.nif || p.rc || p.ai) && (
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-150 text-[10px] font-mono text-slate-400 bg-slate-50/50 p-2 rounded">
                    <div>NIF: <span className="text-slate-700 font-bold block">{p.nif || 'N/A'}</span></div>
                    <div>RC: <span className="text-slate-705 font-bold block">{p.rc || 'N/A'}</span></div>
                    <div>AI: <span className="text-slate-705 font-bold block">{p.ai || 'N/A'}</span></div>
                  </div>
                )}

                {/* Sub logs list */}
                {associatedLogs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>Historique Règlements ({associatedLogs.length})</span>
                    </h5>
                    <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1 bg-slate-50 p-2 rounded border border-slate-150">
                      {associatedLogs.map(log => (
                        <div key={log.id} className="flex justify-between items-center text-[10px] border-b border-white last:border-0 pb-1 last:pb-0 font-mono">
                          <div className="truncate pr-2">
                            <span className="text-slate-400 block sm:inline mr-1">{log.date}</span>
                            <span className="text-slate-700">{log.notes}</span>
                          </div>
                          <span className={`font-bold whitespace-nowrap ${log.type === 'payment_received' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {log.type === 'payment_received' ? '+' : '-'} {formatCurrency(log.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settle option trigger buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-150">
                  {hasDebt && (
                    <button
                      onClick={() => { setSelectedPartner(p); setPaymentAmount(absBalance.toString()); }}
                      className="flex-1 min-w-[90px] bg-slate-900 hover:bg-slate-800 text-white py-1.5 rounded text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer font-mono"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>{language === 'ar' ? 'سداد الدين' : 'Saisir Versement'}</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowCreditStatementPartner(p)}
                    className="flex-1 min-w-[70px] bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 py-1.5 rounded text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                    title={language === 'ar' ? 'كشف الحساب التفصيلي والطباعة' : 'Relevé de compte détaillé & Impression'}
                  >
                    <FileText className="w-3 h-3" />
                    <span>{language === 'ar' ? 'كشف حساب' : 'Relevé'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="flex-1 min-w-[80px] border border-slate-205 hover:border-blue-300 hover:text-blue-600 py-1.5 rounded text-[11px] font-bold transition-all text-center text-slate-650 cursor-pointer"
                  >
                    {language === 'ar' ? 'تعديل' : 'Modifier'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RÈGLEMENTS DE CRÉDIT MODAL */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 md:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">✏️ Nouveau règlement / Versement</h3>
              <button onClick={() => setSelectedPartner(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Enregistrer un encaissement ou versement d'acompte pour le partenaire <strong className="text-slate-800">{selectedPartner.name}</strong>. Reste à comptabiliser actuellement : <strong className="text-indigo-600 font-mono">{formatCurrency(Math.abs(selectedPartner.currentBalance))}</strong>.
            </p>

            <form onSubmit={handleSettleSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  {language === 'ar' ? 'مبلغ القسط المالي (د.ت) *' : 'Montant Versement (DT) *'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={Math.abs(selectedPartner.currentBalance)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden font-bold font-mono text-slate-900 text-sm"
                  placeholder="Saisir montant reçu..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Désignation / Note</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden text-slate-800"
                  placeholder="Ex : Versé en espèces (Chéraga)"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-205">
                <button
                  type="button"
                  onClick={() => setSelectedPartner(null)}
                  className="px-4 py-2 bg-slate-50 text-slate-600 rounded text-xs font-bold cursor-pointer hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold cursor-pointer hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT PARTNER MODAL OVERLAY */}
      {showPartnerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 md:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingPartner ? `Modifier Fiche : ${editingPartner.name}` : 'Nouveau Partenaire'}
              </h3>
              <button onClick={() => setShowPartnerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePartnerSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Type de Partenaire *</label>
                <select
                  disabled={!!editingPartner}
                  value={partnerTypeToCreate}
                  onChange={(e) => setPartnerTypeToCreate(e.target.value as 'client' | 'fournisseur')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden text-slate-800 font-bold disabled:opacity-60"
                >
                  <option value="client">👥 Client (Co-auxiliaire débiteur)</option>
                  <option value="fournisseur">🏭 Fournisseur (Créditeur)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom Complet / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Sarl Algiers Distribution"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden text-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone</label>
                  <input
                    type="text"
                    placeholder="Ex : 0550 11 22 33"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="Ex : contact@boite.tn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Adresse Complète</label>
                  <input
                    type="text"
                    placeholder="Ex : Avenue Habib Bourguiba, Tunis"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {language === 'ar' ? 'الموقع الجغرافي (إحداثيات / خرائط)' : 'Localisation (GPS / Maps)'}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'ar' ? 'الرابط على خرائط جوجل أو الإحداثيات' : 'Lien ou coordonnées GPS (Google Maps)'}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden text-slate-800"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
                <p className="text-[10px] uppercase font-bold text-slate-400 font-sans">Identifications Fiscales (Facturation Pro)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-600 block mb-0.5">NIF</label>
                    <input
                      type="text"
                      placeholder="Identifiant"
                      value={nif}
                      onChange={(e) => setNif(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-600 block mb-0.5">RC</label>
                    <input
                      type="text"
                      placeholder="Registre"
                      value={rc}
                      onChange={(e) => setRc(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-600 block mb-0.5">AI</label>
                    <input
                      type="text"
                      placeholder="Imposition"
                      value={ai}
                      onChange={(e) => setAi(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              {selectedTabIsClient && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {language === 'ar' ? '🏷️ نسبة التخفيض التلقائي للزبون (%)' : '🏷️ Remise Client par Défaut (%)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="Ex : 5"
                      value={discountRate}
                      onChange={(e) => setDiscountRate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden font-mono text-emerald-700 font-bold"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {language === 'ar' ? 'سيتم تطبيق هذا التخفيض تلقائياً عند اختيار هذا الزبون في المبيعات.' : 'Sera appliquée automatiquement au POS lorsque ce client est sélectionné.'}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      🛑 {language === 'ar' ? 'سقف الائتمان الأقصى المسموح (د.ت)' : '🛑 Limite de Crédit Autorisée (DT)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Ex : 10000"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden font-mono text-rose-700 font-bold"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {language === 'ar' ? 'تنبيه في المبيعات إذا تجاوز الدين الحالي هذا الحد.' : 'Avertissement visuel au POS si le solde dépasse cette limite.'}
                    </span>
                  </div>
                </div>
              )}

              {selectedTabIsClient && db.settings?.enableLoyaltyPoints && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    🎁 {language === 'ar' ? 'رصيد نقاط الولاء' : 'Solde des Points de Fidélité'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={loyaltyPoints}
                    onChange={(e) => setLoyaltyPoints(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden font-mono text-indigo-700 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {language === 'ar' ? 'يمكن تعديل رصيد نقاط العميل يدوياً هنا.' : 'Vous pouvez ajuster ou initialiser le solde de points de fidélité de ce client.'}
                  </span>
                </div>
              )}

              {!selectedTabIsClient && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-150 space-y-3">
                  <p className="text-[10px] uppercase font-bold text-blue-600 font-sans tracking-wide">
                    {language === 'ar' ? 'سلسلة التوريد والخدمات اللوجستية' : 'Chaîne d\'Approvisionnement & Logistique'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        {language === 'ar' ? 'المسؤول المباشر' : 'Personne de Contact'}
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: M. Ahmed"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        {language === 'ar' ? 'شروط الدفع' : 'Conditions de Paiement'}
                      </label>
                      <select
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 font-sans text-[11px]"
                      >
                        <option value="">{language === 'ar' ? '-- اختر Option --' : '-- Choisir Option --'}</option>
                        <option value="Net 30">Net 30 jours</option>
                        <option value="Net 60">Net 60 jours</option>
                        <option value="Comptant">Au comptant (Cash)</option>
                        <option value="Virement">Virement Bancaire</option>
                        <option value="Traite">Traite / Chèque</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        {language === 'ar' ? 'فئة سلسلة التوريد' : 'Catégorie Supply Chain'}
                      </label>
                      <select
                        value={supplyChainType}
                        onChange={(e) => setSupplyChainType(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 font-sans text-[11px]"
                      >
                        <option value="">{language === 'ar' ? '-- اختر Option --' : '-- Choisir Option --'}</option>
                        <option value="Grossiste">{language === 'ar' ? 'مورد جملة (Wholesaler)' : 'Grossiste (Wholesaler)'}</option>
                        <option value="Direct">{language === 'ar' ? 'منتج مباشر (Direct Producer)' : 'Producteur Direct (Direct Producer)'}</option>
                        <option value="Importateur">{language === 'ar' ? 'مستورد (Importer)' : 'Importateur (Importer)'}</option>
                        <option value="Distributeur">{language === 'ar' ? 'موزع محلي (Local Distributor)' : 'Distributeur Local (Local Distributor)'}</option>
                        <option value="Logistique">{language === 'ar' ? 'حلول لوجستية (Logistics)' : 'Logistique & Transport (Logistics)'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        {language === 'ar' ? 'سقف الائتمان (د.ت)' : 'Limite d\'Crédit (DT)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 50000"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {selectedTabIsClient 
                    ? (language === 'ar' ? 'الرصيد الأولي المستحق على هذا الزبون (د.ت)' : 'Solde Initial dû par ce Client (DT)') 
                    : (language === 'ar' ? 'الرصيد الأولي المستحق لهذا المورد (د.ت)' : 'Solde Initial dû à ce Fournisseur (DT)')
                  }
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={selectedTabIsClient ? initialBalance : Math.abs(initialBalance)}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    const balValue = selectedTabIsClient ? parsed : -Math.abs(parsed); // supplier has negative balance represent debt
                    setInitialBalance(balValue);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-205">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  className="px-4 py-2 bg-slate-50 text-slate-600 rounded text-xs font-bold cursor-pointer hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold cursor-pointer hover:bg-blue-700 shadow-3xs"
                >
                  Soumettre Profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📊 ARCHITECTURALLY PREMIUM PRINTABLE CREDIT LEDGER STATEMENT SHEET */}
      {showCreditStatementPartner && (() => {
        const p = showCreditStatementPartner;
        const storeName = db.settings?.storeName || 'INNOVA POS';
        const storePhone = db.settings?.storePhone || '+216';
        const storeAddress = db.settings?.storeAddress || '';
        const storeMatricule = db.settings?.matriculeFiscal || '';
        const isClient = p.type === 'client';

        // Filter and merge invoices + payments into a single cronological ledger sheet
        const partnerInvoices = db.invoices.filter(inv => inv.partnerId === p.id);
        const partnerPayments = (db.payments || []).filter(pay => pay.partnerId === p.id);

        interface LedgerRow {
          id: string;
          date: string;
          ref: string;
          labelAr: string;
          labelFr: string;
          debit: number; // Purchased / increase debt
          credit: number; // Paid / reduce debt
        }

        const ledgerItems: LedgerRow[] = [];

        // 1. Initial entry row if any starting balance was defined
        // For client, positive initial balance is debit. For supplier, negative is credit.
        if (p.currentBalance !== 0 && partnerInvoices.length === 0 && partnerPayments.length === 0) {
          ledgerItems.push({
            id: 'init-0',
            date: '---',
            ref: 'INIT',
            labelAr: 'رصيد الفتح الأولي',
            labelFr: 'Solde d\'ouverture de compte',
            debit: isClient ? Math.max(0, p.currentBalance) : 0,
            credit: !isClient ? Math.max(0, Math.abs(p.currentBalance)) : 0
          });
        }

        // 2. Map Invoices
        partnerInvoices.forEach(inv => {
          ledgerItems.push({
            id: inv.id,
            date: inv.date,
            ref: inv.number,
            labelAr: inv.type === 'facture' ? `فاتورة بيع رقم ${inv.number}` : `وصل تسليم رقم ${inv.number}`,
            labelFr: inv.type === 'facture' ? `Facture ${inv.number}` : `Bon de Livraison ${inv.number}`,
            debit: isClient ? inv.total : 0,
            credit: isClient ? 0 : inv.total
          });
          
          if (isClient && inv.paidAmount > 0) {
            ledgerItems.push({
              id: `${inv.id}-paid`,
              date: inv.date,
              ref: `${inv.number}/RGL`,
              labelAr: `دفعة مرافقة للفاتورة ${inv.number}`,
              labelFr: `Acompte payé à la facture ${inv.number}`,
              debit: 0,
              credit: inv.paidAmount
            });
          }
        });

        // 3. Map Payments
        partnerPayments.forEach(pay => {
          ledgerItems.push({
            id: pay.id,
            date: pay.date,
            ref: 'REC-VT',
            labelAr: pay.type === 'payment_received' ? 'تحصيل دفعة مالية (وصل)' : 'صرف دفعة مالية للمورد',
            labelFr: pay.type === 'payment_received' ? 'Enregistrement Versement' : 'Paiement fournisseur',
            debit: (isClient ? 0 : pay.amount),
            credit: (isClient ? pay.amount : 0)
          });
        });

        // Sort items chronologically
        const sortedLedger = ledgerItems.sort((a, b) => {
          if (a.date === '---') return -1;
          if (b.date === '---') return 1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        // Calculate continuous totals
        const totalDebitOutput = sortedLedger.reduce((sum, item) => sum + item.debit, 0);
        const totalCreditOutput = sortedLedger.reduce((sum, item) => sum + item.credit, 0);
        const outstandingDueTotal = isClient ? (totalDebitOutput - totalCreditOutput) : (totalCreditOutput - totalDebitOutput);

        const handleStatementPrintAction = () => {
          try {
            const printContent = document.getElementById('print-credit-statement');
            const portal = document.getElementById('print-portal');
            const isIframe = checkIsIframe();

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
                console.log("[INNOVA PRINT] Statement print triggered in sandboxed preview.");
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
            console.warn("Robust statement print failed", err);
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-4 z-50 text-start overflow-y-auto">
            {stylePrintElements()}

            <div className="bg-white rounded-2xl max-w-4xl w-full p-5 md:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] my-auto">
              {/* Modal control bar header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📁</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {language === 'ar' ? 'كشف الحساب التفصيلي والسجل المحاسبي' : 'Relevé de Compte & Journal des Créances'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">
                      {p.name} • {isClient ? (language === 'ar' ? 'زبون' : 'Client') : (language === 'ar' ? 'مورد' : 'Fournisseur')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreditStatementPartner(null)}
                  className="p-1 px-2.5 bg-slate-50 border border-slate-200 text-slate-550 rounded hover:bg-slate-100 text-xs font-bold cursor-pointer transition-all"
                >
                  {language === 'ar' ? 'إغلاق المعالينة' : 'Fermer'}
                </button>
              </div>

              {/* Central ledger viewer workspace */}
              <div className="flex-1 overflow-y-auto py-5 pr-1 space-y-5">
                {/* Dashboard stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wider">
                      {language === 'ar' ? 'إجمالي المشتريات / السحوبات' : 'Total Débit (Facturé)'}
                    </span>
                    <span className="text-sm font-black font-mono text-slate-800 block mt-1">
                      {formatCurrency(totalDebitOutput)}
                    </span>
                  </div>

                  <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-center">
                    <span className="text-[9.5px] uppercase font-black text-slate-450 block tracking-wider">
                      {language === 'ar' ? 'إجمالي الدفعات المسددة' : 'Total Crédit (Payé)'}
                    </span>
                    <span className="text-sm font-black font-mono text-emerald-700 block mt-1">
                      {formatCurrency(totalCreditOutput)}
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border text-center ${outstandingDueTotal > 0 ? 'bg-amber-50 border-amber-250 text-amber-800' : 'bg-emerald-50 border-emerald-250 text-emerald-800'}`}>
                    <span className="text-[9.5px] uppercase font-black text-slate-450 block tracking-wider">
                      {language === 'ar' ? 'الرصيد المتبقي مستحق الدفع' : 'Solde Net dû / Restant'}
                    </span>
                    <span className="text-sm font-black font-mono block mt-1">
                      {formatCurrency(outstandingDueTotal)}
                    </span>
                  </div>
                </div>

                {/* Live ledger datagrid view */}
                <div className="border border-slate-150 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-xs text-slate-750">
                    <thead>
                      <tr className="bg-slate-100 font-black text-[9px] uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right">
                        <th className="p-3 text-left">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                        <th className="p-3 text-left">{language === 'ar' ? 'رقم الوصل' : 'Référence'}</th>
                        <th className="p-3 text-right">{language === 'ar' ? 'نوع العملية / البيان' : 'Opération'}</th>
                        <th className="p-3 text-right text-rose-700">{language === 'ar' ? 'مدين (+)' : 'Débit (+)'}</th>
                        <th className="p-3 text-right text-emerald-700">{language === 'ar' ? 'دائن (-)' : 'Crédit (-)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {sortedLedger.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                            {language === 'ar' ? 'لا توجد أي معاملات محاسبية مسجلة لهذا الحساب حالياً.' : 'Aucun historique relevé pour ce partenaire.'}
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          let runningBalance = 0;
                          return sortedLedger.map((row) => {
                            if (isClient) {
                              runningBalance += (row.debit - row.credit);
                            } else {
                              runningBalance += (row.credit - row.debit);
                            }
                            return (
                              <tr key={row.id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-mono font-medium text-slate-500 text-left">{row.date.includes('T') ? row.date.split('T')[0] : row.date}</td>
                                <td className="p-3 font-mono font-bold text-slate-800 text-left">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{row.ref}</span>
                                </td>
                                <td className="p-3 text-right font-semibold text-slate-700">
                                  {language === 'ar' ? row.labelAr : row.labelFr}
                                </td>
                                <td className="p-3 text-right font-mono text-rose-700 font-bold">
                                  {row.debit > 0 ? `+${formatCurrency(row.debit)}` : '—'}
                                </td>
                                <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                                  {row.credit > 0 ? `-${formatCurrency(row.credit)}` : '—'}
                                </td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[10.5px] font-medium leading-relaxed">
                  📢 {language === 'ar'
                    ? 'الطباعة المحسنة: كشف الحساب منسق مسبقاً ليتناسب مع قياس المطبوعات الرسمية ومستخرج A4 لمطالبة المتعامل بالديون بشكل قانوني.'
                    : 'Prêt pour facturation : Le relevé généré intègre des mentions fiscales pour servir d\'élément justificatif légal.'}
                </div>
              </div>

              {/* Modal footer action */}
              <div className="pt-3 border-t border-slate-150 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreditStatementPartner(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-250 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  {language === 'ar' ? 'تراجع' : 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={handleStatementPrintAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-3xs flex items-center justify-center gap-1.5"
                >
                  <span>{language === 'ar' ? '🖨️ طباعة كشف الحساب' : '🖨️ État de Compte'}</span>
                </button>
              </div>
            </div>

            {/* 📄 PHYSICAL PRINT SPRINT COMPONENT GENERATED FOR OS SPOOLING SYSTEM DIRECTLY */}
            <div id="print-credit-statement" className="hidden p-8 bg-white text-black font-sans w-[21cm] mx-auto">
              {/* Business Commercial Header block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '12px', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: '900', margin: '0' }}>🏰 {storeName}</h1>
                  <p style={{ fontSize: '10px', color: '#555', margin: '3px 0 0 0' }}>📞 Tel: {storePhone}</p>
                  <p style={{ fontSize: '10px', color: '#555', margin: '2px 0 0 0' }}>📍 {storeAddress}</p>
                  {storeMatricule && <p style={{ fontSize: '9px', color: '#444', fontFamily: 'monospace', margin: '2px 0 0 0' }}>MF ID: {storeMatricule}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '13px', fontStyle: 'italic', textDecoration: 'underline', color: '#111', margin: '0' }}>
                    {language === 'ar' ? 'كشف ذمة مالية تفصيلي للدين' : 'RELEVÉ DE CRÉANCE PARTENAIRE'}
                  </h2>
                  <p style={{ fontSize: '9px', color: '#555', margin: '5px 0 0 0' }}>Date d'émission: {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR').slice(0, 5)}</p>
                  <p style={{ fontSize: '9px', color: '#333', margin: '2px 0 0 0' }}>Statut: {outstandingDueTotal > 0 ? 'En suspens / Non Réglé' : 'À jour'}</p>
                </div>
              </div>

              {/* Person under ledger details */}
              <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px', backgroundColor: '#f9f9f9', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#777', textTransform: 'uppercase', display: 'block' }}>Renseignements Tiers :</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#000', display: 'block', marginTop: '3px' }}>👤 {p.name}</span>
                  {p.phone && <span style={{ fontSize: '10px', color: '#444', display: 'block', marginTop: '2px' }}>📞 Phone : {p.phone}</span>}
                  {p.address && <span style={{ fontSize: '10px', color: '#444', display: 'block', marginTop: '2px' }}>📍 Addr : {p.address}</span>}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#777', textTransform: 'uppercase', display: 'block' }}>Solde Synthétique :</span>
                  <p style={{ fontSize: '18px', fontWeight: 'black', color: '#000', margin: '4px 0 0 0', fontFamily: 'monospace' }}>
                    {formatCurrency(outstandingDueTotal)}
                  </p>
                  <span style={{ fontSize: '9px', color: '#555', fontStyle: 'italic', display: 'block' }}>
                    {isClient ? '* Client doit payer le montant ci-dessus *' : '* Compte fournisseur à régler *'}
                  </span>
                </div>
              </div>

              {/* Large transactions overview table list styled for paper printable ink matches */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'right', marginBottom: '30px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid black', paddingBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px' }}>Réf</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Opération</th>
                    <th style={{ textAlign: 'right', padding: '6px', color: '#900' }}>Débit (+)</th>
                    <th style={{ textAlign: 'right', padding: '6px', color: '#080' }}>Crédit (-)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLedger.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ textAlign: 'left', padding: '7px 0', fontFamily: 'monospace' }}>{row.date}</td>
                      <td style={{ textAlign: 'left', padding: '7px 10px', fontFamily: 'monospace', fontWeight: 'bold' }}>{row.ref}</td>
                      <td style={{ textAlign: 'right', padding: '7px', fontWeight: '600' }}>
                        {language === 'ar' ? row.labelAr : row.labelFr}
                      </td>
                      <td style={{ textAlign: 'right', padding: '7px', color: '#a00', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {row.debit > 0 ? `+${formatCurrency(row.debit)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '7px', color: '#070', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {row.credit > 0 ? `-${formatCurrency(row.credit)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Stamp and signatures zones */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '40px', fontSize: '11px', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0 0 45px 0' }}>Signature Tierce (Client/Membres) :</p>
                  <span style={{ fontSize: '10px', color: '#888' }}>* Mention manuscrite obligatoire "lu et approuvé" *</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0 0 45px 0' }}>Cachet commercial et signature de l'Établissement :</p>
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>INNOVA POS PRO SYSTEM - Tunis</span>
                </div>
              </div>
            </div>

          </div>
        );
      })()}

    </div>
  );
}

// Separate print helper strictly keeping variables tidy and avoiding duplication
function stylePrintElements() {
  return (
    <style>{`
      @media print {
        body * {
          visibility: hidden !important;
        }
        #print-credit-statement, #print-credit-statement * {
          visibility: visible !important;
        }
        #print-credit-statement {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: white !important;
          color: black !important;
          padding: 2.5cm !important;
          margin: 0 !important;
          box-sizing: border-box !important;
        }
        #print-credit-statement table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        #print-credit-statement th, #print-credit-statement td {
          border-bottom: 1px solid #000000 !important;
          padding: 8px !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `}</style>
  );
}
