import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeLocalStorage } from './storage';

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
    db_tip: "La base de données fonctionne de manière locale et dynamique à l'intérieur du navigateur de votre appareil. Pour garantir la sécurité en cas d'anomalie, nous vous conseillons de télécharger une copie hebdomadaire."
  },
  ar: {
    // Nav items
    nav_dashboard: 'لوحة القيادة و الإحصائيات',
    nav_pos: 'شاشة البيع و الكاسة (POS)',
    nav_products: 'السلع و الستوك',
    nav_invoices: 'الفواتير و البونوات',
    nav_partners: 'الكليونات و الفورنيسورات',
    nav_finance: 'الكمبيالات و المصاريف',
    nav_backup: 'قاعدة البيانات و السوفغارد',
    nav_principal: 'الأقسام الرئيسية',

    // Header / Footer
    status_online: 'السيستام يخدم مريغل',
    last_update: 'آخر ميزاجور للبيانات',
    stable_version: 'النسخة المستقرة v4.2.1',
    tech_support: 'الدعم الفني في تونس',
    unauthenticated: 'مش كونكتي',
    logout: 'تسجيل الخروج',
    login_title: 'تسجيل الدخول - إدارة سوبرماركت تونسية',
    login_subtitle: 'دخول آمن لسيستام الكاسة و الستوك',
    login_google: 'دخول سريع بحساب Google',
    login_demo: 'دخول ديمو (بلاش إنترنات)',
    loading: 'قاعد يشارجي في البيانات...',

    // Dashboard
    db_title: 'لوحة القيادة و الإحصائيات',
    db_subtitle: 'تبع الفلوس، الأرباح، الكريدي و قيمة الستوك متاعك بكل دقة ولحظة بلحظة.',
    db_revenue: 'المدخول الإجمالي (الروسيت)',
    db_net_benefit: 'الربح الصافي',
    db_outstanding: 'الكريدي اللي سالوه للناس',
    db_stock_val: 'قيمة الستوك في الحانوت',
    db_sales_history: 'تطور الروسيت اليومية',
    db_details: 'شوف التفاصيل',
    db_benefit_alert: 'حساب الأرباح الصافية مريغل',
    db_total_rev: 'المدخول الإجمالي',
    db_cogs: 'سوم شراء السلعة الأصلي',
    db_gross_margin: 'هامش الربح الخام',
    db_expenses_tot: 'مجموع المصاريف و الخسائر',
    db_net_profit: 'الربح الصافي الفعلي',
    db_recent_alerts: 'سلع وفات والا قربت توفي',
    db_no_alerts: 'ما ثمة حتى سلعة ناقصة حالياً.',
    db_potential_benefit: 'الأرباح المنتظرة من الستوك الحالي',
    db_outstanding_debt: 'الكريديات الصالحة عند الكليونات',

    // POS
    pos_title: 'كاسة البيع السريع',
    pos_all_cats: 'الأصناف الكل',
    pos_search_product: 'لوج على سلعة بالإسم وإلا بالباركود...',
    pos_anonymous: 'كليون باساجي (بلاش حساب)',
    pos_select_client: 'اختار كليون مسجل (بيع بالكريدي)',
    pos_cart: 'قضية الكليون توة',
    pos_empty_cart: 'الكردونة فارغة. انزل على أي سلعة باش تزيدها.',
    pos_item: 'السلعة',
    pos_qty: 'الكونتيتي',
    pos_price: 'السوم',
    pos_total: 'المجموع',
    pos_discount: 'تخفيض (Remise)',
    pos_tax: 'التيفيا TVA (%)',
    pos_to_pay: 'المبلغ الصافي اللي يلزم يخلص',
    pos_paid_amt: 'الفلوس اللي عطاها الكليون',
    pos_change_due: 'الصرف اللي ترجعو للكليون',
    pos_debt_amt: 'الباقي كريدي',
    pos_validate_print: 'فاليدي و إطبع التيكيت',
    pos_warn_anonymous: 'رد بالك: كليون باساجي، ما تنجمش تقيدلو كريدي. لازم تختار كليون مقيد عندك قبل.',
    pos_quick_client: 'زيد كليون فيسع',
    pos_add: 'زيد توة',

    // Products
    prod_title: 'قائمة وستوك السلع',
    prod_subtitle: 'إدارة الستوك، تعديل الأسوام وتواريخ الصلاحية والكونتيتي.',
    prod_add: 'زيد سلعة جديدة',
    prod_ref: 'الباركود (Code barre)',
    prod_name: 'إسم السلعة',
    prod_category: 'الكاتيغوري',
    prod_purchase_price: 'سوم الشراء (H.T.)',
    prod_selling_price: 'سوم البيع (TTC)',
    prod_margin: 'المارج (الربح)',
    prod_stock: 'الستوك المتوفر',
    prod_alert_threshold: 'حد التنبيه (Alerte)',
    prod_unit: 'الوحدة (كغ/قطعة)',
    prod_actions: 'التحكم',
    prod_low_stock: 'ستوك ناقص!',
    prod_search: 'لوج على سلعة في الستوك...',
    prod_edit: 'بدل بيانات السلعة',
    prod_save: 'قيد التعديلات',

    // Invoices list
    inv_title: 'بونوات وفواتير البيع',
    inv_subtitle: 'أرشيف البونوات، فواتير الكليونات والفلوس اللي دخلت وخرجت.',
    inv_search: 'لوج برقم البون أو باسم الكليون...',
    inv_all_docs: 'البونوات الكل',
    inv_only_invoice: 'فواتير بركة',
    inv_only_bl: 'البونوات بركة (BL)',
    inv_all_payments: 'كل حالات الخلاص',
    inv_fully_paid: 'خالصة بالكامل',
    inv_has_debt: 'مش خالصة / بالكريدي',
    inv_ref: 'رقم البون',
    inv_date: 'تاريخ البون',
    inv_partner: 'الكليون',
    inv_total_amt: 'المجموع (TTC)',
    inv_paid_amt_col: 'اللي تخلص منه',
    inv_balance_col: 'الباقي اللي سالوه',
    inv_view: 'شوف البون',
    inv_print: 'إطبع البون',
    inv_close: 'سكر',
    inv_apply_payment: 'قيد خلاص جديد على البون هذا (د.ت)',

    // Partners
    part_title: 'الكليونات و الفورنيسورات',
    part_subtitle: 'تبع الكريديات متاع الكليونات وفلوس الفورنيسورات اللي يسالوهالك.',
    part_outstanding_clients: 'إجمالي الكريدي عند الكليونات',
    part_outstanding_suppliers: 'إجمالي الفلوس اللي نسالوها للفورنيسورات',
    part_tabs_clients: 'الكليونات',
    part_tabs_suppliers: 'الفورنيسورات (الجمّالة)',
    part_add: 'زيد كليون وإلا فورنيسور',
    part_phone: 'رقم التليفون',
    part_address: 'العنوان',
    part_balance: 'الصولد الحالي',
    part_debtor: 'نسالوه (كريدي لبرة)',
    part_creditor: 'يسالنا (ديون علينا)',
    part_settled: 'مخلص',
    part_history: 'جورنال العمليات والكريدي',
    part_settle_btn: 'قيد خلاص أو دفعة جديدة',

    // Finance (Traites)
    fin_title: 'الكمبيالات ومصاريف المحل',
    fin_subtitle: 'إدارة الكمبيالات والبانكة مع تسجيل مصاريف الحانوت اليومية.',
    fin_add_expense: 'قيد مصروف جديد للـمحل',
    fin_add_traite: 'أعمل كمبيالة جديدة',
    fin_tab_traites: 'الكمبيالات والبانكة',
    fin_tab_expenses: 'جورنال المصاريف والخرجة',
    fin_tab_payments: 'جورنال المداخيل و المقبوضات',
    fin_issue_date: 'تاريخ إخراج الكمبيالة',
    fin_due_date: 'أجل الخلاص',
    fin_amount: 'مبلغ الكمبيالة',
    fin_bank_rib: 'البانكة ورقم الحساب (RIB)',
    fin_city: 'بلاصة إصدار الكمبيالة',
    fin_status: 'وضعية الكمبيالة',
    fin_status_pending: 'تستنى في وقتها',
    fin_status_cleared: 'خالصة ومصروفة في البانكة',
    fin_status_cancelled: 'ملغاة وإلا رجعت بلاش خلاص',
    fin_print_traite: 'إطبع الكمبيالة القانونية',
    fin_confirm_expense: 'أقيد المصروف',
    fin_expense_desc: 'بيان المصروف (شنوة شرينا)',
    fin_expense_cat: 'نوعية المصروف',

    // Database
    db_sync_title: 'السيرفر و السوفغارد في السحاب',
    db_sync_desc: "بيانات الحانوت والبيوعات متاعك تتسيف وتتزامن لحظة بلحظة في سيرفر Firebase المحمي.",
    db_export: 'تيليشارجي سوفغارد (Sauvegarde) في الكمبيوتر',
    db_import: 'رجع سوفغارد قديم (Restauration)',
    db_tip: "البيانات مسيفة في المتصفح باش يخدم السيستام بأسرع وقت وبلاش قصان. ننصحك ديما تيليشارجي كوبي (Sauvegarde) كل جمعة باش تحمي خدمتك كان تضرب الكمبيوتر."
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (safeLocalStorage.getItem('gp_app_lang') as Language) || 'fr';
  });

  useEffect(() => {
    safeLocalStorage.setItem('gp_app_lang', language);
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
      <div dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </div>
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
