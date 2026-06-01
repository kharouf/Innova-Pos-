import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Nav items
    nav_dashboard: 'Tableau de Bord',
    nav_pos: 'Caisse Tactile (POS)',
    nav_products: 'Stock & Articles',
    nav_invoices: 'Factures & BL',
    nav_partners: 'Clients & Fournisseurs',
    nav_finance: 'Traites & Trésorerie',
    nav_backup: 'Base de Données',
    nav_principal: 'Principal',

    // Header / Footer
    status_online: 'Système Opérationnel',
    last_update: 'Dernière Mise à Jour',
    stable_version: 'Version Stable v4.2.1',
    tech_support: 'Support Technique Tunisie',
    unauthenticated: 'Non Connecté',
    logout: 'Déconnexion',
    login_title: 'Connexion Boutique - Superette Tunisienne',
    login_subtitle: 'Accédez à votre espace sécurisé de gestion de point de vente et stock',
    login_google: 'Se connecter avec Google',
    login_demo: 'Accéder en mode Démo (Hors-ligne)',
    loading: 'Chargement en cours...',

    // Dashboard
    db_title: 'Tableau de Bord',
    db_subtitle: "Vue d'ensemble de l'activité, bilan financier et rapports de stock en temps réel.",
    db_revenue: 'Chiffre d\'Affaires',
    db_net_benefit: 'Bénéfice Net',
    db_outstanding: 'Créances Clients',
    db_stock_val: 'Valeur du Stock',
    db_sales_history: 'Historique des Ventes',
    db_details: 'Voir Détails',
    db_benefit_alert: 'Statistiques de Bénéfice Intégrées',
    db_total_rev: 'Total Chiffre d\'Affaires',
    db_cogs: 'Coût d\'Achat des Marchandises',
    db_gross_margin: 'Marge Brute',
    db_expenses_tot: 'Total des Dépenses Opérationnelles',
    db_net_profit: 'Bénéfice Net Réel',
    db_recent_alerts: 'Articles en Alerte Stock',
    db_no_alerts: 'Aucun article en alerte de stock.',
    db_potential_benefit: 'Bénéfice Restant Estimé en Stock',
    db_outstanding_debt: 'Créances Clients Actuels',

    // POS
    pos_title: 'Caisse de Vente Tactile',
    pos_all_cats: 'Toutes catégories',
    pos_search_product: 'Chercher par désignation ou code à barres...',
    pos_anonymous: 'Client Comptoir Anonyme',
    pos_select_client: 'Sélectionner un Client (Crédit)',
    pos_cart: 'Panier de vente',
    pos_empty_cart: 'Le panier est vide. Cliquez sur un article pour l\'ajouter.',
    pos_item: 'Art.',
    pos_qty: 'Qté',
    pos_price: 'Prix',
    pos_total: 'Total',
    pos_discount: 'Remise Globale',
    pos_tax: 'TVA (%)',
    pos_to_pay: 'Total Net à Payer',
    pos_paid_amt: 'Montant Reçu (Règlement Client)',
    pos_change_due: 'Monnaie à Rendre',
    pos_debt_amt: 'Reste à Crédit',
    pos_validate_print: 'Valider & Imprimer Ticket',
    pos_warn_anonymous: 'Client comptoir anonyme : impossible de reporter une dette à crédit. Veuillez sélectionner un Client enregistré d\'abord.',
    pos_quick_client: 'Nouveau Client Rapide',
    pos_add: 'Ajouter',

    // Products
    prod_title: 'Stock & Articles de la Superette',
    prod_subtitle: 'Consultez, modifiez les articles d\'alimentation générale et ajustez les stocks.',
    prod_add: 'Saisir un nouvel Article',
    prod_ref: 'Référence / Code',
    prod_name: 'Désignation',
    prod_category: 'Catégorie',
    prod_purchase_price: 'Prix d\'Achat',
    prod_selling_price: 'Prix de Vente',
    prod_margin: 'Marge',
    prod_stock: 'Stock',
    prod_alert_threshold: 'Seuil Alerte',
    prod_unit: 'Unité',
    prod_actions: 'Actions',
    prod_low_stock: 'Stock Faible',
    prod_search: 'Recherche article...',
    prod_edit: 'Modifier Article',
    prod_save: 'Enregistrer',

    // Invoices list
    inv_title: 'Factures & Bons de Livraison (BL)',
    inv_subtitle: 'Journal historique des transactions de vente au comptoir ou à crédit.',
    inv_search: 'Chercher N° de pièce ou Nom Client...',
    inv_all_docs: 'Tout Type de Document',
    inv_only_invoice: 'Facture Uniquement',
    inv_only_bl: 'Bons de Livraison (BL)',
    inv_all_payments: 'Tous Règlements',
    inv_fully_paid: 'Payé intégralement',
    inv_has_debt: 'Non Payé / Crédit Restant',
    inv_ref: 'Référence',
    inv_date: 'Date de pièce',
    inv_partner: 'Client / Partenaire',
    inv_total_amt: 'Montant Total',
    inv_paid_amt_col: 'Montant Réglé',
    inv_balance_col: 'Reste à Payer',
    inv_view: 'Voir Document',
    inv_print: 'Imprimer (Page)',
    inv_close: 'Fermer',
    inv_apply_payment: 'Enregistrer un versement sur cette facture (DT)',

    // Partners
    part_title: 'Registre des Clients & Fournisseurs',
    part_subtitle: 'Suivis des comptes clients (crédits à recevoir) et fournisseurs (dettes de gros).',
    part_outstanding_clients: 'Total Créances à Recevoir (Clients)',
    part_outstanding_suppliers: 'Total Dettes à Régler (Fournisseurs)',
    part_tabs_clients: 'Clients',
    part_tabs_suppliers: 'Fournisseurs de Gros',
    part_add: 'Saisir un Partenaire',
    part_phone: 'Téléphone',
    part_address: 'Adresse de livraison',
    part_balance: 'Solde Comptable',
    part_debtor: 'Doit (Débiteur)',
    part_creditor: 'Créditeur',
    part_settled: 'Solde Nul',
    part_history: 'Historique des opérations',
    part_settle_btn: 'Enregistrer un Versement/Acompte',

    // Finance (Traites)
    fin_title: 'Traites Bancaires & Journal des Dépenses',
    fin_subtitle: 'Emissez des lettres de change (traites) et suivez vos charges opérationnelles tunisiennes.',
    fin_add_expense: 'Saisir une Dépense',
    fin_add_traite: 'Nouvelle Traite / Lettre de Change',
    fin_tab_traites: 'Traites Commerciales',
    fin_tab_expenses: 'Journal des Dépenses',
    fin_tab_payments: 'Journal des Encaissements',
    fin_issue_date: 'Date d\'émission',
    fin_due_date: 'Maturité / Échéance',
    fin_amount: 'Montant de Traite',
    fin_bank_rib: 'Banque & Code RIB / IBAN',
    fin_city: 'Lieu d\'émission',
    fin_status: 'État de traite',
    fin_status_pending: 'En attente d\'échéance',
    fin_status_cleared: 'Validée Payée / Encaissée',
    fin_status_cancelled: 'Annulée / Retournée',
    fin_print_traite: 'Imprimer Lettre de Change',
    fin_confirm_expense: 'Confirmer Dépense',
    fin_expense_desc: 'Libellé de la Dépense',
    fin_expense_cat: 'Catégorie de la charge',

    // Database
    db_sync_title: 'Synchronisation Cloud & Sauvegardes',
    db_sync_desc: "Vos données de vente et de stock sont synchronisées en temps réel sur votre base de données sécurisée Firebase.",
    db_export: 'Exporter Sauvegarde Local',
    db_import: 'Importer / Restaurer Sauvegarde',
    db_tip: "La base de données fonctionne de manière locale et dynamique à l'intérieur du navigateur de votre appareil. Pour garantir la sécurité en cas d'effacement accidentel ou de panne d'ordinateur, prenez l'habitude de télécharger une sauvegarde hebdomadaire."
  },
  ar: {
    // Nav items
    nav_dashboard: 'لوحة القيادة والمؤشرات',
    nav_pos: 'شاشة البيع والنقد (POS)',
    nav_products: 'المخزون والسلع',
    nav_invoices: 'الفواتير والوصولات',
    nav_partners: 'الزبائن والمزودين',
    nav_finance: 'الكمبيالات والمصاريف',
    nav_backup: 'قاعدة البيانات والتخزين',
    nav_principal: 'الأقسام الأساسية',

    // Header / Footer
    status_online: 'النظام متصل ويشتغل',
    last_update: 'آخر تحديث للبيانات',
    stable_version: 'النسخة المستقرة v4.2.1',
    tech_support: 'الدعم الفني والتقني بتونس',
    unauthenticated: 'غير متصل بالخساب',
    logout: 'تسجيل الخروج',
    login_title: 'تسجيل الدخول - واجهة تسيير مغازة مواد غذائية تونسية',
    login_subtitle: 'الولوج الآمن لنظام البيع السريع وإدارة المخزون والتجارة',
    login_google: 'الدخول السريع عبر حساب Google',
    login_demo: 'الدخول في الوضع التجريبي (بدون انترنت)',
    loading: 'جاري تحميل البيانات...',

    // Dashboard
    db_title: 'لوحة القيادة والمؤشرات العامة',
    db_subtitle: 'متابعة المبيعات الإجمالية، الأرباح الصافية، الديون وقيمة السلع المتوفرة مباشرة وبكل دقة.',
    db_revenue: 'رقم المعاملات الإجمالي',
    db_net_benefit: 'الأرباح الصافية الحالية',
    db_outstanding: 'الديون المتبقية عند الزبائن',
    db_stock_val: 'القيمة المالية للمخازن',
    db_sales_history: 'سجل وتطور المبيعات اليومية',
    db_details: 'عرض التفاصيل',
    db_benefit_alert: 'مؤشرات حساب الأرباح الدقيقة متوفرة',
    db_total_rev: 'رقم المعاملات الإجمالي',
    db_cogs: 'تكلفة شراء السلع الأصلية',
    db_gross_margin: 'هامش الربح الخام',
    db_expenses_tot: 'مجموع المصاريف والتحملات التشغيلية',
    db_net_profit: 'صافي الربح الفعلي',
    db_recent_alerts: 'السلع التي قاربت على النفاد',
    db_no_alerts: 'لا يوجد سلع تحت عتبة التنبيه حالياً.',
    db_potential_benefit: 'الأرباح المتوقعة من السلع الموجودة بالمخزن',
    db_outstanding_debt: 'الديون الحالية المطالب بها الزبائن',

    // POS
    pos_title: 'شاشة تسجيل النقد والبيع السريع',
    pos_all_cats: 'جميع الأصناف',
    pos_search_product: 'ابحث باسم السلعة أو برمز الباركود...',
    pos_anonymous: 'زبون عادي (بدون حساب)',
    pos_select_client: 'اختيار زبون مسجل (مبيعات بالدين)',
    pos_cart: 'سلة المشتريات الحالية',
    pos_empty_cart: 'السلة فارغة. اضغط على أي سلعة لإضافتها هنا.',
    pos_item: 'السلعة',
    pos_qty: 'الكمية',
    pos_price: 'السعر',
    pos_total: 'الإجمالي',
    pos_discount: 'تخفيض إجمالي',
    pos_tax: 'الأداء على القيمة المضافة (%)',
    pos_to_pay: 'المبلغ الإجمالي الصافي للدفع',
    pos_paid_amt: 'المبلغ المقبوض من الحريف',
    pos_change_due: 'المبلغ المرجوع (الفائض)',
    pos_debt_amt: 'المبلغ المتبقي بالدين',
    pos_validate_print: 'تأكيد العملية وطباعة التوصيل',
    pos_warn_anonymous: 'تنبيه: حريف عابر وبدون حساب، لا يمكن تسجيل باقي المبلغ بالدين له. الرجاء تسجيل أو دعوة حريف أولاً.',
    pos_quick_client: 'إضافة حريف سريع',
    pos_add: 'تأكيد الإضافة',

    // Products
    prod_title: 'قائمة ومخزون السلع المعروضة',
    prod_subtitle: 'تسيير وتحديث مخازن السلع الغذائية الاستهلاكية وتحديد الأسعار والتنبيهات.',
    prod_add: 'أضف سلعة جديدة للمغازة',
    prod_ref: 'الرمز / باركود السلعة',
    prod_name: 'اسم وتسمية السلعة',
    prod_category: 'التصنيف / الفئة',
    prod_purchase_price: 'سعر الشراء الفعلي',
    prod_selling_price: 'سعر البيع المقترح',
    prod_margin: 'هامش الربح',
    prod_stock: 'المخزون المتوفر',
    prod_alert_threshold: 'عتبة التنبيه لطلب التوريد',
    prod_unit: 'وحدة القياس',
    prod_actions: 'العمليات المتاحة',
    prod_low_stock: 'مخزون قليل جداً',
    prod_search: 'بحث سلعة في المخزن...',
    prod_edit: 'تعديل بيانات السلعة',
    prod_save: 'حفظ التعديلات',

    // Invoices list
    inv_title: 'سجل فواتير البيع ومذكرات التسليم',
    inv_subtitle: 'متابعة أرشيف ووصولات وعمليات بيع السلع والتحصيلات النقدية والآجلة.',
    inv_search: 'البحث برقم الوصل أو باسم الحريف...',
    inv_all_docs: 'جرد بجميع المعاملات والوصولات',
    inv_only_invoice: 'فواتير رسمية فقط',
    inv_only_bl: 'وصولات تسليم سلع فقط (BL)',
    inv_all_payments: 'جميع حالات الخلاص والتحصيل',
    inv_fully_paid: 'مستخلصة ومدفوعة بالكامل',
    inv_has_debt: 'غير مدفوعة بالكامل / متبقية بالدين',
    inv_ref: 'رقم الوصل',
    inv_date: 'تاريخ الإصدار',
    inv_partner: 'الحريف / الشريك',
    inv_total_amt: 'مجموع الفاتورة الإجمالي',
    inv_paid_amt_col: 'المبلغ المدفوع سابقا',
    inv_balance_col: 'المبلغ المتبقي للدفع',
    inv_view: 'عرض ومعاينة الوصل',
    inv_print: 'طباعة الوصل الحالي',
    inv_close: 'إغلاق المعالجة',
    inv_apply_payment: 'تسجيل وتنزيل دفعة مالية جديدة لهذه الفاتورة (د.ت)',

    // Partners
    part_title: 'قائمة الزبائن ومزودي المغازة',
    part_subtitle: 'تنظيم ديون الحرفاء المستحقة للمغازة، وحساب المبالغ المطالبين بها من كبار مزودي السلع بالجملة.',
    part_outstanding_clients: 'مجموع مبالغ ديون الزباءن (المستحقات)',
    part_outstanding_suppliers: 'مجموع الديون لفائدة المزودين (الالتزامات)',
    part_tabs_clients: 'الزبائن المسجلين',
    part_tabs_suppliers: 'شركاء ومزودو الجملة بتراب الجمهورية',
    part_add: 'تسجيل وإضافة حريف أو مزود جديد',
    part_phone: 'رقم هاتف الاتصال',
    part_address: 'مقر السكنى أو التوصيل',
    part_balance: 'الحساب الحالي',
    part_debtor: 'مطالب بالدفع (مدين)',
    part_creditor: 'صاحب حق (دائن)',
    part_settled: 'حساب مخلص',
    part_history: 'تاريخ ودفتر العمليات المنجزة',
    part_settle_btn: 'تسجيل تحصيل أو تنزيل قسط مالي جديد',

    // Finance (Traites)
    fin_title: 'دفتر الكمبيالات والتحكم في مصاريف المغازة',
    fin_subtitle: 'إعداد الكمبيالات التونسية الموثقة للبنك مع التحكم في مصاريف التشغيل العادية.',
    fin_add_expense: 'تسجيل وبث مصروف إداري جديد',
    fin_add_traite: 'إنشاء كمبيالة / ورقة بنكية جديدة',
    fin_tab_traites: 'الأوراق البنكية والكمبيالات المتبادلة',
    fin_tab_expenses: 'سجل المبالغ والمصاريف اليومية الصادرة',
    fin_tab_payments: 'دفتر عمليات المقبوضات المالية',
    fin_issue_date: 'تاريخ كتابة ورقة الكمبيالة',
    fin_due_date: 'تاريخ حلول الأجل والاستحقاق',
    fin_amount: 'مبلغ الكمبيالة الكامل',
    fin_bank_rib: 'البنك المسحوب عليه (رقم الحساب RIB / IBAN)',
    fin_city: 'مكان كتابة الكمبيالة والمصادقة للبنك',
    fin_status: 'الحالة الحالية للكمبيالة',
    fin_status_pending: 'في الانتظار ومفتوحة للصرف',
    fin_status_cleared: 'مقبوضة ومسددة بالكامل بحساب البنك',
    fin_status_cancelled: 'ملغاة أو مسترجعة بدون خلاص',
    fin_print_traite: 'طباعة نموذج الكمبيالة القانوني والبنكي',
    fin_confirm_expense: 'تأكيد تسجيل المصروف',
    fin_expense_desc: 'طبيعة وموضوع التنزيل المالي للمصروف',
    fin_expense_cat: 'فئة وتبويب نوع المصاريف التجارية',

    // Database
    db_sync_title: 'السيرفر والنسخ الاحتياطي في السحاب',
    db_sync_desc: "البيانات الخاصة بنشاط مجارتك يتم حفظها وتزامنها بشكل مرئي ودقيق مباشرة في مستودع Firebase المخصص والمحمي.",
    db_export: 'تحميل sauvegarde مخزن للجهاز',
    db_import: 'استرجاع وسحب قاعدة بيانات محفوظة سابقاً',
    db_tip: "قاعدة البيانات مخزنة محلياً في متصفح جهازك لتقديم أسرع أداء بيع للجمهور وبدون أي بطء. ننصحك بتحميل نسخة احتياطية دورية أسبوعياً لحماية أعمالك من الضياع في حال تلف الحاسوب."
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('gp_app_lang') as Language) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('gp_app_lang', language);
    // Add direction rules to document element automatically
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'fr' ? 'ar' : 'fr'));
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['fr'][key] || key;
  };

  // Tunisian Dinar (TND) formatted precisely with 3 decimals (Millimes)
  const formatCurrency = (amount: number): string => {
    const formatted = new Intl.NumberFormat('fr-TN', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);

    if (language === 'ar') {
      return `${formatted} د.ت`;
    }
    return `${formatted} DT`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, formatCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage should be executed inside LanguageProvider');
  }
  return context;
}
