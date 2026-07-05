import { DatabaseState, Product, Partner, Invoice, PaymentTransaction, Traite, DailyExpense, StoreSettings } from '../types';
import { safeLocalStorage } from './storage';

// Default sample data of a Tunisian Superette (Grocery / مواد غذائية)
const INITIAL_DATABASE: DatabaseState = {
  products: [
    {
      id: 'prod-1',
      code: '6191002003001',
      name: 'Couscous Fin Diari 1kg (كسكسي دياري جويد)',
      category: 'Céréales & Pâtes',
      purchasePrice: 0.850,
      sellingPrice: 1.100,
      stock: 120,
      minAlertQty: 20,
      unit: 'Pcs'
    },
    {
      id: 'prod-2',
      code: '6192403104523',
      name: 'Lait Demi-Écrémé Délice UHT 1L (حليب دليس)',
      category: 'Produits Laitiers',
      purchasePrice: 1.350,
      sellingPrice: 1.450,
      stock: 145,
      minAlertQty: 30,
      unit: 'Pcs'
    },
    {
      id: 'prod-3',
      code: '6194512001122',
      name: 'Thon Entier à l\'Huile d\'Olive Sidi Daoud 160g (تن سيدي داود)',
      category: 'Conserves',
      purchasePrice: 4.200,
      sellingPrice: 4.900,
      stock: 65,
      minAlertQty: 15,
      unit: 'Pcs'
    },
    {
      id: 'prod-4',
      code: '6198502214433',
      name: 'Harissa Traditionnelle Sicam 135g (هريسة سيكام)',
      category: 'Conserves',
      purchasePrice: 0.950,
      sellingPrice: 1.250,
      stock: 80,
      minAlertQty: 15,
      unit: 'Pcs'
    },
    {
      id: 'prod-5',
      code: '6190015022354',
      name: 'Eau Minérale Safia Naturelle 1.5L (ماء معدني صافية)',
      category: 'Boissons',
      purchasePrice: 0.650,
      sellingPrice: 0.850,
      stock: 180,
      minAlertQty: 40,
      unit: 'Pcs'
    },
    {
      id: 'prod-6',
      code: '6191501004112',
      name: 'Double Concentré de Tomate Sicam 400g (طماطم معلبة سيكام)',
      category: 'Conserves',
      purchasePrice: 1.850,
      sellingPrice: 2.150,
      stock: 85,
      minAlertQty: 20,
      unit: 'Pcs'
    },
    {
      id: 'prod-7',
      code: '6191114002341',
      name: 'Spaghetti N°2 Randa 500g (معكرونة رندة)',
      category: 'Céréales & Pâtes',
      purchasePrice: 0.680,
      sellingPrice: 0.850,
      stock: 200,
      minAlertQty: 30,
      unit: 'Pcs'
    },
    {
      id: 'prod-8',
      code: '6192224018872',
      name: 'Café Moulu Ben Yedder Tradition 250g (قهوة بن يدر)',
      category: 'Café & Thé',
      purchasePrice: 3.100,
      sellingPrice: 3.800,
      stock: 40,
      minAlertQty: 10,
      unit: 'Pcs'
    },
    {
      id: 'prod-9',
      code: '6191002003002',
      name: 'Couscous Moyen Warda 1kg (كسكسي وردة وسط)',
      category: 'Céréales & Pâtes',
      purchasePrice: 0.840,
      sellingPrice: 1.050,
      stock: 95,
      minAlertQty: 20,
      unit: 'Pcs'
    },
    {
      id: 'prod-10',
      code: '6192003004005',
      name: 'Yaourt Brassé Délice Fraise (ياغورت دليس فراولة)',
      category: 'Produits Laitiers',
      purchasePrice: 0.480,
      sellingPrice: 0.550,
      stock: 120,
      minAlertQty: 25,
      unit: 'Pcs'
    },
    {
      id: 'prod-11',
      code: '6192404001258',
      name: 'Cheese Giga Carré 24 Pcs (جبن قيقا 24 قطعة)',
      category: 'Produits Laitiers',
      purchasePrice: 4.800,
      sellingPrice: 5.400,
      stock: 35,
      minAlertQty: 8,
      unit: 'Pcs'
    },
    {
      id: 'prod-12',
      code: '6193001004521',
      name: 'Fromage Râpé Président 100g (جبن مرحي بريزيدن)',
      category: 'Produits Laitiers',
      purchasePrice: 3.200,
      sellingPrice: 3.800,
      stock: 48,
      minAlertQty: 10,
      unit: 'Pcs'
    },
    {
      id: 'prod-13',
      code: '6194002005612',
      name: 'Huile de Tournesol Safia 1L (زيت صافية)',
      category: 'Boissons',
      purchasePrice: 4.800,
      sellingPrice: 5.500,
      stock: 60,
      minAlertQty: 15,
      unit: 'Pcs'
    },
    {
      id: 'prod-14',
      code: '6195003006721',
      name: 'Huile d\'Olive Extra Vierge Châal 1L (زيت زيتون شعال)',
      category: 'Boissons',
      purchasePrice: 22.000,
      sellingPrice: 25.000,
      stock: 20,
      minAlertQty: 5,
      unit: 'Pcs'
    },
    {
      id: 'prod-15',
      code: '6196004007832',
      name: 'Margarine Goldina 250g (مارغرين غولدينا)',
      category: 'Produits Laitiers',
      purchasePrice: 1.400,
      sellingPrice: 1.700,
      stock: 75,
      minAlertQty: 15,
      unit: 'Pcs'
    },
    {
      id: 'prod-16',
      code: '6197005008943',
      name: 'Thon Entier à l\'Huile El Manar 160g (تن المنار)',
      category: 'Conserves',
      purchasePrice: 4.300,
      sellingPrice: 5.100,
      stock: 50,
      minAlertQty: 12,
      unit: 'Pcs'
    },
    {
      id: 'prod-17',
      code: '6198006009054',
      name: 'Sardines à l\'Huile Piquante El Manar 125g (سردينة المنار حارة)',
      category: 'Conserves',
      purchasePrice: 1.800,
      sellingPrice: 2.200,
      stock: 90,
      minAlertQty: 15,
      unit: 'Pcs'
    },
    {
      id: 'prod-18',
      code: '6199007010165',
      name: 'Chamia Ghazala Nature 350g (شامية الغزالة حلوى)',
      category: 'Café & Thé',
      purchasePrice: 4.200,
      sellingPrice: 5.100,
      stock: 42,
      minAlertQty: 8,
      unit: 'Pcs'
    },
    {
      id: 'prod-19',
      code: '6190008011276',
      name: 'Soda Coca-Cola Original 1.5L (كوكاكولا)',
      category: 'Boissons',
      purchasePrice: 2.650,
      sellingPrice: 3.100,
      stock: 150,
      minAlertQty: 30,
      unit: 'Pcs'
    },
    {
      id: 'prod-20',
      code: '6190109012387',
      name: 'Soda Boga Blanche 1.5L (بوغا بيضاء)',
      category: 'Boissons',
      purchasePrice: 2.300,
      sellingPrice: 2.700,
      stock: 120,
      minAlertQty: 25,
      unit: 'Pcs'
    },
    {
      id: 'prod-21',
      code: '6190201013498',
      name: 'Chocolat Saida El Baka Bleue 100g (شوكولا الباقة زرقاء)',
      category: 'Café & Thé',
      purchasePrice: 1.900,
      sellingPrice: 2.400,
      stock: 85,
      minAlertQty: 15,
      unit: 'Pcs'
    },
    {
      id: 'prod-22',
      code: '6190302014509',
      name: 'Biscuits Major Chocolat Saida (بسكويت ماجور شوكولا)',
      category: 'Café & Thé',
      purchasePrice: 0.700,
      sellingPrice: 0.850,
      stock: 240,
      minAlertQty: 40,
      unit: 'Pcs'
    },
    {
      id: 'prod-23',
      code: '6190403015610',
      name: 'Lessive Poudre Omo Machine 1.5kg (أوموو غسيل)',
      category: 'Céréales & Pâtes',
      purchasePrice: 8.500,
      sellingPrice: 9.800,
      stock: 30,
      minAlertQty: 8,
      unit: 'Pcs'
    },
    {
      id: 'prod-24',
      code: '6190504016721',
      name: 'Eau de Javel Sany Sica 3L (جافيل سيكا)',
      category: 'Céréales & Pâtes',
      purchasePrice: 2.400,
      sellingPrice: 2.900,
      stock: 70,
      minAlertQty: 15,
      unit: 'Pcs'
    },
    {
      id: 'prod-25',
      code: '6190605017832',
      name: 'Papier Toilette Rose Lilas 4 Rouleaux (ورق صحي مريح ليلا)',
      category: 'Boissons',
      purchasePrice: 2.100,
      sellingPrice: 2.650,
      stock: 65,
      minAlertQty: 10,
      unit: 'Pcs'
    },
    {
      id: 'prod-26',
      code: '6190706018943',
      name: 'Sucre Blanc cristallisé Tunisien 1kg (سكر مائدة أبيض)',
      category: 'Épices & Condiments',
      purchasePrice: 1.200,
      sellingPrice: 1.400,
      stock: 300,
      minAlertQty: 50,
      unit: 'Pcs'
    }
  ],
  partners: [
    {
      id: 'part-1',
      type: 'client',
      name: 'Sami Ben Hassine (Alimentation L\'Olivier)',
      phone: '22 123 456',
      address: 'Avenue Habib Bourguiba, Sousse',
      currentBalance: 85.500, // Client owes us
      email: 'sami.olivier@gmail.tn',
      nif: '0012345MAM000',
      rc: 'RC-SOU-10294',
      ai: 'AI-SOU-9908'
    },
    {
      id: 'part-2',
      type: 'client',
      name: 'Amel Mansour (Cité El Ghazala)',
      phone: '98 765 432',
      address: 'Route de Raoued, Ariana',
      currentBalance: 12.450, // Client owes us
      email: 'amel.mans@yahoo.com'
    },
    {
      id: 'part-3',
      type: 'fournisseur',
      name: 'Société Tunisienne de Distribution Al-Barka Grossiste',
      phone: '71 443 210',
      address: 'Zone Industrielle Charguia II, Tunis',
      currentBalance: -350.000, // We owe supplier (represented as negative)
      email: 'contact@barka-distribution.tn',
      nif: '9876543PBM000'
    },
    {
      id: 'part-4',
      type: 'fournisseur',
      name: 'Chocolaterie Saida Distribution Sfax',
      phone: '74 200 900',
      address: 'Zone Industrielle Poudrière, Sfax',
      currentBalance: 0, // Paid off
      email: 'sfax.saida@outlook.tn'
    }
  ],
  invoices: [
    {
      id: 'inv-1',
      number: 'FAC-2026-0001',
      date: '2026-05-10',
      partnerId: 'part-1',
      partnerName: 'Sami Ben Hassine (Alimentation L\'Olivier)',
      type: 'facture',
      items: [
        {
          productId: 'prod-3',
          productName: 'Thon Entier à l\'Huile d\'Olive Sidi Daoud 160g (تن سيدي داود)',
          qty: 20,
          purchasePrice: 4.200,
          sellingPrice: 4.900,
          total: 98.000
        },
        {
          productId: 'prod-4',
          productName: 'Harissa Traditionnelle Sicam 135g (هريسة سيكام)',
          qty: 10,
          purchasePrice: 0.950,
          sellingPrice: 1.250,
          total: 12.500
        }
      ],
      subTotal: 110.500,
      discount: 5.000,
      taxRate: 19,
      taxAmount: 20.000,
      total: 125.500,
      paidAmount: 40.000,
      balance: 85.500, // Debt remaining
      dueDate: '2026-06-10',
      notes: 'Livraison Chariot'
    },
    {
      id: 'inv-2',
      number: 'BL-2026-0002',
      date: '2026-05-20',
      partnerId: 'part-2',
      partnerName: 'Amel Mansour (Cité El Ghazala)',
      type: 'bl',
      items: [
        {
          productId: 'prod-1',
          productName: 'Couscous Fin Tunisie Diari 1kg (كسكسي دياري)',
          qty: 10,
          purchasePrice: 0.850,
          sellingPrice: 1.100,
          total: 11.000
        },
        {
          productId: 'prod-5',
          productName: 'Eau Minérale Safia Naturelle 1.5L (ماء معدني صافية)',
          qty: 12,
          purchasePrice: 0.650,
          sellingPrice: 0.850,
          total: 10.200
        }
      ],
      subTotal: 21.200,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 21.200,
      paidAmount: 8.750,
      balance: 12.450,
      dueDate: '2026-05-30'
    }
  ],
  payments: [
    {
      id: 'pay-1',
      date: '2026-05-12',
      partnerId: 'part-1',
      partnerName: 'Sami Ben Hassine (Alimentation L\'Olivier)',
      partnerType: 'client',
      type: 'payment_received',
      amount: 40.000,
      notes: 'Acompte en espèces au comptoir',
      invoiceId: 'inv-1'
    },
    {
      id: 'pay-2',
      date: '2026-05-22',
      partnerId: 'part-3',
      partnerName: 'Société Tunisie Distrib Al-Barka',
      partnerType: 'fournisseur',
      type: 'payment_sent',
      amount: 150.000,
      notes: 'Acompte par chèque bancaire BIAT'
    }
  ],
  traites: [
    {
      id: 'tra-1',
      number: 'TR-26-4402',
      dateIssue: '2026-05-15',
      dateDue: '2026-07-15',
      partnerId: 'part-1',
      partnerName: 'Sami Ben Hassine (Alimentation L\'Olivier)',
      partnerPhone: '22 123 456',
      amount: 85.500,
      bankName: 'BIAT Agence Tunis Alain Savary',
      rib: '03045012345678901234',
      city: 'Tunis',
      status: 'pending',
      notes: 'Règlement de garantie pour factures'
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      date: '2026-05-23',
      description: 'Achat de cartons et sacs plastiques d\'emballage',
      amount: 35.000,
      category: 'Fournitures'
    },
    {
      id: 'exp-2',
      date: '2026-05-24',
      description: 'Paiement facture STEG électricité Magasin',
      amount: 120.000,
      category: 'Factures'
    }
  ]
};

const STORAGE_KEY = 'commercial_management_db';

export const DEFAULT_SETTINGS = {
  storeName: 'Innova POS',
  storePhone: '+216 24260711',
  storeAddress: 'AVENU HABIB BORGIBA GHANNOUCHE GABES',
  activitySector: 'superette' as const,
  matriculeFiscal: '1234567/A/M/000',
  storeLogo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="g-ring" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2302b0df"/><stop offset="100%" stop-color="%2310b981"/></linearGradient><linearGradient id="g-ip" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="%2338bdf8"/><stop offset="50%" stop-color="%230284c7"/><stop offset="100%" stop-color="%23059669"/></linearGradient></defs><rect width="100%" height="100%" rx="24" fill="%230b1329"/><circle cx="50" cy="50" r="38" fill="none" stroke="url(%23g-ring)" stroke-width="2.5" opacity="0.3"/><circle cx="50" cy="50" r="34" fill="none" stroke="url(%23g-ring)" stroke-width="4" stroke-dasharray="80 20" stroke-linecap="round"/><path d="M38 48 L46 72" stroke="url(%23g-ip)" stroke-width="5.5" stroke-linecap="round"/><circle cx="43" cy="40" r="3.5" fill="%2338bdf8"/><path d="M43 48 C 65 44, 65 64, 46 64" fill="none" stroke="url(%23g-ip)" stroke-width="5.5" stroke-linecap="round"/><path d="M 46 64 L 54 48" stroke="%2310b981" stroke-width="3" stroke-linecap="round" opacity="0.8"/></svg>',
  adminEmail: 'innovapospro@gmail.com',
  enableCriticalStockEmailAlerts: true,
  enableIndividualProductEmailAlerts: true,
  enableDailyLowStockEmail: true,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpUser: 'innovapospro@gmail.com',
  smtpPass: 'jkoe fwep mqxi gkck',
  smtpSecure: true,
  smtpSenderName: 'InnovaPos Alerts',
  customTvaRates: [0, 7, 13, 19],
  users: [
    { id: 'user-1', name: 'Administrateur', pin: '0000', role: 'admin' as const, isActive: true, avatar: '👑' },
    { id: 'user-2', name: 'Agent de Vente', pin: '1111', role: 'sales' as const, isActive: true, avatar: '💼' },
    { id: 'user-3', name: 'Agent de Stock', pin: '2222', role: 'inventory' as const, isActive: true, avatar: '📦' }
  ]
};

export const SAMPLE_PRODUCTS: Record<'superette' | 'pharmacie' | 'materiaux' | 'general', Product[]> = {
  superette: [
    { id: 'sup-1', code: '6191002003001', name: 'Couscous Fin Diari 1kg (كسكسي دياري جويد)', category: 'Céréales & Pâtes', purchasePrice: 0.850, sellingPrice: 1.100, stock: 120, minAlertQty: 20, unit: 'Pcs' },
    { id: 'sup-2', code: '6192403104523', name: 'Lait Demi-Écrémé Délice UHT 1L (حليب دليس)', category: 'Produits Laitiers', purchasePrice: 1.350, sellingPrice: 1.450, stock: 145, minAlertQty: 30, unit: 'Pcs' },
    { id: 'sup-3', code: '6194512001122', name: 'Thon Entier à l\'Huile d\'Olive Sidi Daoud 160g (تن سيدي داود)', category: 'Conserves', purchasePrice: 4.200, sellingPrice: 4.900, stock: 65, minAlertQty: 15, unit: 'Pcs' },
    { id: 'sup-4', code: '6198502214433', name: 'Harissa Traditionnelle Sicam 135g (هريسة سيكام)', category: 'Conserves', purchasePrice: 0.950, sellingPrice: 1.250, stock: 80, minAlertQty: 15, unit: 'Pcs' },
    { id: 'sup-5', code: '6190015022354', name: 'Eau Minérale Safia Naturelle 1.5L (ماء معدني صافية)', category: 'Boissons', purchasePrice: 0.650, sellingPrice: 0.850, stock: 180, minAlertQty: 40, unit: 'Pcs' },
    { id: 'sup-6', code: '6191501004112', name: 'Double Concentré de Tomate Sicam 400g (طماطم معلبة سيكام)', category: 'Conserves', purchasePrice: 1.850, sellingPrice: 2.150, stock: 85, minAlertQty: 20, unit: 'Pcs' },
    { id: 'sup-7', code: '6191114002341', name: 'Spaghetti N°2 Randa 500g (معكرونة رندة)', category: 'Céréales & Pâtes', purchasePrice: 0.680, sellingPrice: 0.850, stock: 200, minAlertQty: 30, unit: 'Pcs' },
    { id: 'sup-8', code: '6192224018872', name: 'Café Moulu Ben Yedder Tradition 250g (قهوة بن يدر)', category: 'Café & Thé', purchasePrice: 3.100, sellingPrice: 3.800, stock: 40, minAlertQty: 10, unit: 'Pcs' },
    { id: 'sup-9', code: '6191002003002', name: 'Couscous Moyen Warda 1kg (كسكسي وردة وسط)', category: 'Céréales & Pâtes', purchasePrice: 0.840, sellingPrice: 1.050, stock: 95, minAlertQty: 20, unit: 'Pcs' },
    { id: 'sup-10', code: '6192003004005', name: 'Yaourt Brassé Délice Fraise (ياغورت دليس فراولة)', category: 'Produits Laitiers', purchasePrice: 0.480, sellingPrice: 0.550, stock: 120, minAlertQty: 25, unit: 'Pcs' },
    { id: 'sup-11', code: '6192404001258', name: 'Cheese Giga Carré 24 Pcs (جبن قيقا 24 قطعة)', category: 'Produits Laitiers', purchasePrice: 4.800, sellingPrice: 5.400, stock: 35, minAlertQty: 8, unit: 'Pcs' },
    { id: 'sup-12', code: '6193001004521', name: 'Fromage Râpé Président 100g (جبن مرحي بريزيدن)', category: 'Produits Laitiers', purchasePrice: 3.200, sellingPrice: 3.800, stock: 48, minAlertQty: 10, unit: 'Pcs' },
    { id: 'sup-13', code: '6194002005612', name: 'Huile de Tournesol Safia 1L (زيت صافية)', category: 'Boissons', purchasePrice: 4.800, sellingPrice: 5.500, stock: 60, minAlertQty: 15, unit: 'Pcs' },
    { id: 'sup-14', code: '6195003006721', name: 'Huile d\'Olive Extra Vierge Châal 1L (زيت زيتون شعال)', category: 'Boissons', purchasePrice: 22.000, sellingPrice: 25.000, stock: 20, minAlertQty: 5, unit: 'Pcs' },
    { id: 'sup-15', code: '6196004007832', name: 'Margarine Goldina 250g (مارغرين غولدينا)', category: 'Produits Laitiers', purchasePrice: 1.400, sellingPrice: 1.700, stock: 75, minAlertQty: 15, unit: 'Pcs' },
    { id: 'sup-16', code: '6197005008943', name: 'Thon Entier à l\'Huile El Manar 160g (تن المنار)', category: 'Conserves', purchasePrice: 4.300, sellingPrice: 5.100, stock: 50, minAlertQty: 12, unit: 'Pcs' },
    { id: 'sup-17', code: '6198006009054', name: 'Sardines à l\'Huile Piquante El Manar 125g (سردينة المنار حارة)', category: 'Conserves', purchasePrice: 1.800, sellingPrice: 2.200, stock: 90, minAlertQty: 15, unit: 'Pcs' },
    { id: 'sup-18', code: '6199007010165', name: 'Chamia Ghazala Nature 350g (شامية الغزالة حلوى)', category: 'Café & Thé', purchasePrice: 4.200, sellingPrice: 5.100, stock: 42, minAlertQty: 8, unit: 'Pcs' },
    { id: 'sup-19', code: '6190008011276', name: 'Soda Coca-Cola Original 1.5L (كوكاكولا)', category: 'Boissons', purchasePrice: 2.650, sellingPrice: 3.100, stock: 150, minAlertQty: 30, unit: 'Pcs' },
    { id: 'sup-20', code: '6190109012387', name: 'Soda Boga Blanche 1.5L (بوغا بيضاء)', category: 'Boissons', purchasePrice: 2.300, sellingPrice: 2.700, stock: 120, minAlertQty: 25, unit: 'Pcs' },
    { id: 'sup-21', code: '6190201013498', name: 'Chocolat Saida El Baka Bleue 100g (شوكولا الباقة زرقاء)', category: 'Café & Thé', purchasePrice: 1.900, sellingPrice: 2.400, stock: 85, minAlertQty: 15, unit: 'Pcs' },
    { id: 'sup-22', code: '6190302014509', name: 'Biscuits Major Chocolat Saida (بسكويت ماجور شوكولا)', category: 'Café & Thé', purchasePrice: 0.700, sellingPrice: 0.850, stock: 240, minAlertQty: 40, unit: 'Pcs' },
    { id: 'sup-23', code: '6190403015610', name: 'Lessive Poudre Omo Machine 1.5kg (أوموو غسيل)', category: 'Céréales & Pâtes', purchasePrice: 8.500, sellingPrice: 9.800, stock: 30, minAlertQty: 8, unit: 'Pcs' },
    { id: 'sup-24', code: '6190504016721', name: 'Eau de Javel Sany Sica 3L (جافيل سيكا)', category: 'Céréales & Pâtes', purchasePrice: 2.400, sellingPrice: 2.900, stock: 70, minAlertQty: 15, unit: 'Pcs' },
    { id: 'sup-25', code: '6190605017832', name: 'Papier Toilette Rose Lilas 4 Rouleaux (ورق صحي مريح ليلا)', category: 'Boissons', purchasePrice: 2.100, sellingPrice: 2.650, stock: 65, minAlertQty: 10, unit: 'Pcs' },
    { id: 'sup-26', code: '6190706018943', name: 'Sucre Blanc cristallisé Tunisien 1kg (سكر مائدة أبيض)', category: 'Épices & Condiments', purchasePrice: 1.200, sellingPrice: 1.400, stock: 300, minAlertQty: 50, unit: 'Pcs' }
  ],
  pharmacie: [
    { id: 'ph-1', code: '3024501112234', name: 'Amoxicilline Biogaran 1g (أموكسيسيلين مضاد حيوي)', category: 'Antibiotiques', purchasePrice: 3.200, sellingPrice: 4.500, stock: 40, minAlertQty: 10, unit: 'Boîte' },
    { id: 'ph-2', code: '3024502223345', name: 'Paracétamol Saiph 500mg (باراسيتامول مسكن)', category: 'Analgésiques', purchasePrice: 1.100, sellingPrice: 1.600, stock: 150, minAlertQty: 20, unit: 'Boîte' },
    { id: 'ph-3', code: '3024503334456', name: 'Vitamine C Effervescente 1000mg (فيتامين سي فوار)', category: 'Vitamines & Compléments', purchasePrice: 2.500, sellingPrice: 3.400, stock: 80, minAlertQty: 15, unit: 'Boîte' },
    { id: 'ph-4', code: '3024504445567', name: 'Sirop Maxilase Maux de Gorge (ماكسيلاز دواء التهاب الظهر والبلعوم)', category: 'Sirops & Voies Orales', purchasePrice: 3.800, sellingPrice: 4.900, stock: 30, minAlertQty: 8, unit: 'Flacon' },
    { id: 'ph-5', code: '3024505556678', name: 'Gel Hydroalcoolique Sanytol 250ml (جيل معقم)', category: 'Hygiène & Soins', purchasePrice: 1.500, sellingPrice: 2.200, stock: 100, minAlertQty: 15, unit: 'Flacon' },
    { id: 'ph-6', code: '3024506667789', name: 'Crème Solaire Protectrice SPF55+ SVR (واقي شمس طبي)', category: 'Dermocosmétique', purchasePrice: 18.000, sellingPrice: 24.500, stock: 12, minAlertQty: 5, unit: 'Tube' },
    { id: 'ph-7', code: '3024507778890', name: 'Thermomètre Digital Médical Bébé (ميزان حرارة الكتروني)', category: 'Matériel Médical', purchasePrice: 10.500, sellingPrice: 15.000, stock: 25, minAlertQty: 5, unit: 'Pcs' },
    { id: 'ph-8', code: '3024508889901', name: 'Doliprane 1000mg Adulte (دوليبران مسكن أوجاع)', category: 'Analgésiques', purchasePrice: 1.900, sellingPrice: 2.700, stock: 110, minAlertQty: 25, unit: 'Boîte' }
  ],
  materiaux: [
    { id: 'mat-1', code: 'Qu-10020', name: 'Sac de Ciment Gris Jbel Oust II 50kg (إسمنت جبل الوسط رمادي)', category: 'Gros Œuvre', purchasePrice: 9.500, sellingPrice: 11.200, stock: 250, minAlertQty: 30, unit: 'Sac' },
    { id: 'mat-2', code: 'Qu-20035', name: 'Brique Rouge Standard 8 Trous Cité (ياجور أحمر تونسي)', category: 'Maçonnerie', purchasePrice: 0.450, sellingPrice: 0.580, stock: 1200, minAlertQty: 150, unit: 'Pcs' },
    { id: 'mat-3', code: 'Qu-30046', name: 'Fer Rond de Construction 12mm Barre 12m (حديد بناء 12 مم)', category: 'Métaux & Ferraille', purchasePrice: 3.200, sellingPrice: 3.900, stock: 350, minAlertQty: 50, unit: 'Barre' },
    { id: 'mat-4', code: 'Qu-40057', name: 'Peinture Blanche Astral Hydrofuge Mate 20kg (دهن أسترال أبيض)', category: 'Peinture & Enduits', purchasePrice: 48.000, sellingPrice: 62.000, stock: 25, minAlertQty: 5, unit: 'Seau' },
    { id: 'mat-5', code: 'Qu-50068', name: 'Boîte de Tournevis Professionnel 12pcs Tolsen (مفك براغي كامل)', category: 'Outillage à Main', purchasePrice: 14.500, sellingPrice: 21.000, stock: 18, minAlertQty: 3, unit: 'Pcs' },
    { id: 'mat-6', code: 'Qu-60079', name: 'Tuyau PVC Assainissement Rigide Ø110 4m (أنبوب بلاستيك صحي)', category: 'Sanitaire & Plomberie', purchasePrice: 8.500, sellingPrice: 11.550, stock: 45, minAlertQty: 10, unit: 'Tube' },
    { id: 'mat-7', code: 'Qu-70080', name: 'Prise Électrique Murale Double Simon Blanche (مأخد كهرباء ثنائي سيمون)', category: 'Électricité', purchasePrice: 2.100, sellingPrice: 3.200, stock: 120, minAlertQty: 15, unit: 'Pcs' },
    { id: 'mat-8', code: 'Qu-80091', name: 'Mitigeur Professionnel Évier Cuisine Inox (خلات ماء سانتيار مطبخ)', category: 'Sanitaire & Plomberie', purchasePrice: 24.000, sellingPrice: 32.500, stock: 15, minAlertQty: 4, unit: 'Pcs' }
  ],
  general: [
    { id: 'gen-1', code: 'GEN-001', name: 'Câble USB de Charge Rapide Type-C 1m (شاحن هاتف سريع)', category: 'Électronique & Accessoires', purchasePrice: 3.500, sellingPrice: 5.500, stock: 140, minAlertQty: 20, unit: 'Pcs' },
    { id: 'gen-2', code: 'GEN-002', name: 'Sac à Dos Écolier Confort Noir (محفظة ظهر دراسة وجامعة)', category: 'Bureautique & Fournitures', purchasePrice: 14.000, sellingPrice: 22.000, stock: 35, minAlertQty: 5, unit: 'Pcs' },
    { id: 'gen-3', code: 'GEN-003', name: 'Montre Quartz Homme Sport (ساعة يد كلاسيك سبورت رجالية)', category: 'Général', purchasePrice: 25.000, sellingPrice: 39.900, stock: 10, minAlertQty: 2, unit: 'Pcs' }
  ]
};

/**
 * Checks if a store logo is a custom user logo (emoji or uploaded image/custom SVG)
 * rather than the default Innova POS logo, old text logos, or old fallbacks.
 */
export function isCustomLogo(logo?: string): boolean {
  if (!logo) return false;
  const cleaned = logo.trim();
  if (cleaned === '') return false;
  
  // The current default vector SVG logo
  if (cleaned.includes('linearGradient id="g-ring"') || cleaned.includes('linearGradient id="g-ip"')) {
    return false;
  }
  
  // Old default logos or specific fallback image URLs
  if (cleaned.includes('innova_pos_logo') || cleaned.includes('app-icon')) {
    // Keep base64 custom uploaded images starting with data:image even if they have coincidental keywords
    if (!cleaned.startsWith('data:image')) {
      return false;
    }
  }
  if (cleaned === '/innova_pos_logo.jpg' || cleaned === 'innova_pos_logo.jpg') {
    return false;
  }
  
  return true;
}

export function getDatabase(): DatabaseState {
  if (typeof window === 'undefined') return INITIAL_DATABASE;
  const data = safeLocalStorage.getItem(STORAGE_KEY);
  if (!data) {
    const initialWithSettings = { ...INITIAL_DATABASE, settings: DEFAULT_SETTINGS };
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(initialWithSettings));
    return initialWithSettings;
  }
  try {
    const parsed = JSON.parse(data);
    let settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    
    // Auto-upgrade old preset text-based logo or missing logo to the fresh, majestic vector logo
    if (settings && !isCustomLogo(settings.storeLogo)) {
      settings.storeLogo = DEFAULT_SETTINGS.storeLogo;
    }
    
    // Ensure storeName is initialized if empty
    if (settings && !settings.storeName) {
      settings.storeName = DEFAULT_SETTINGS.storeName;
      settings.storePhone = settings.storePhone || DEFAULT_SETTINGS.storePhone;
      settings.storeAddress = settings.storeAddress || DEFAULT_SETTINGS.storeAddress;
      settings.matriculeFiscal = settings.matriculeFiscal || DEFAULT_SETTINGS.matriculeFiscal;
    }

    return {
      products: parsed.products || INITIAL_DATABASE.products,
      partners: parsed.partners || INITIAL_DATABASE.partners,
      invoices: parsed.invoices || INITIAL_DATABASE.invoices,
      payments: parsed.payments || INITIAL_DATABASE.payments,
      traites: parsed.traites || INITIAL_DATABASE.traites,
      expenses: parsed.expenses || INITIAL_DATABASE.expenses,
      settings
    };
  } catch (e) {
    console.error('Failed parsing localStorage database, resetting to default.', e);
    return { ...INITIAL_DATABASE, settings: DEFAULT_SETTINGS };
  }
}

export function saveDatabase(db: DatabaseState): void {
  if (typeof window === 'undefined') return;
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// Utility functions for calculation and reports

export function getStockStatus(products: Product[]) {
  const alertsList = products.filter(p => p.stock <= p.minAlertQty);
  const okList = products.filter(p => p.stock > p.minAlertQty);
  return {
    alertsCount: alertsList.length,
    alerts: alertsList,
    okCount: okList.length,
    totalStockValue: products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0),
    totalPotentialRevenue: products.reduce((sum, p) => sum + (p.stock * p.sellingPrice), 0),
    potentialBenefit: products.reduce((sum, p) => sum + (p.stock * (p.sellingPrice - p.purchasePrice)), 0)
  };
}

export function getTurnoverAndBenefits(invoices: Invoice[], expenses: DailyExpense[], settings?: StoreSettings) {
  const sales = invoices;
  
  let totalRevenue = 0;
  let totalCostOfGoodsSold = 0;
  let totalDiscounts = 0;
  
  sales.forEach(inv => {
    totalRevenue += inv.total;
    totalDiscounts += inv.discount;
    
    inv.items.forEach(item => {
      totalCostOfGoodsSold += item.qty * item.purchasePrice;
    });
  });

  const rawBenefit = totalRevenue - totalCostOfGoodsSold;
  // Apply manual expenses offset
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0) + (settings?.manualExpensesOffset || 0);
  // Apply manual net profits offset
  const netBenefit = rawBenefit - totalExpenses + (settings?.manualProfitsOffset || 0);

  return {
    totalRevenue,
    totalCostOfGoodsSold,
    totalDiscounts,
    rawBenefit,
    totalExpenses,
    netBenefit
  };
}

export function getFinancialBalances(partners: Partner[], settings?: StoreSettings) {
  // Apply manual credit offset to client debits
  const clientDebits = partners
    .filter(p => p.type === 'client' && p.currentBalance > 0)
    .reduce((sum, p) => sum + p.currentBalance, 0) + (settings?.manualCreditOffset || 0);
    
  const supplierCredits = partners
    .filter(p => p.type === 'fournisseur' && p.currentBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.currentBalance), 0);

  return {
    clientDebits,
    supplierCredits
  };
}

export interface LowStockNotification {
  isAlertActive: boolean;
  criticalCount: number;
  ruptureCount: number;
  items: Product[];
  messageAr: string;
  messageFr: string;
}

export function checkLowStockAlerts(products: Product[]): LowStockNotification {
  const lowStockItems = products.filter(p => p.stock <= p.minAlertQty);
  const ruptureCount = lowStockItems.filter(p => p.stock === 0).length;
  const criticalCount = lowStockItems.length - ruptureCount;
  
  let messageAr = '';
  let messageFr = '';
  
  if (lowStockItems.length > 0) {
    messageAr = `⚠️ تنبيه المخزون: هناك ${lowStockItems.length} سلع مخزونها ضعيف أو منفذ (${ruptureCount} نفذت بالكامل 🚫 و ${criticalCount} قاربت على النفاد). يرجى الاتصال بالمزودين للتوريد.`;
    messageFr = `⚠️ Alerte Stock : ${lowStockItems.length} article(s) à niveau critique ou épuisé (${ruptureCount} en rupture totale 🚫 et ${criticalCount} en niveau faible). Veuillez planifier un réapprovisionnement.`;
  } else {
    messageAr = `✅ حالة المخزون ممتازة! جميع السلع متوفرة بكميات كافية فوق حد الأمان.`;
    messageFr = `✅ État du stock excellent ! Tous les articles sont en quantité suffisante au-dessus du seuil de sécurité.`;
  }
  
  return {
    isAlertActive: lowStockItems.length > 0,
    criticalCount,
    ruptureCount,
    items: lowStockItems,
    messageAr,
    messageFr
  };
}

export function getProductVisual(prod: { name: string; category?: string; image?: string }): { type: 'image' | 'emoji'; value: string } {
  if (prod.image) {
    if (prod.image.startsWith('data:image') || prod.image.startsWith('http') || prod.image.length > 30) {
      return { type: 'image', value: prod.image };
    }
    return { type: 'emoji', value: prod.image };
  }

  // Fallback to name-based or category-based emoji
  const name = prod.name.toLowerCase();
  const cat = (prod.category || '').toLowerCase();

  // Keyword lookup
  if (name.includes('couscous') || name.includes('pâte') || name.includes('spaghetti') || name.includes('makrouna') || name.includes('riz')) {
    return { type: 'emoji', value: '🍝' };
  }
  if (name.includes('lait') || name.includes('hlib') || name.includes('dairy') || cat.includes('laitier')) {
    return { type: 'emoji', value: '🥛' };
  }
  if (name.includes('fromage') || name.includes('jbn') || name.includes('mozzarella') || name.includes('ricotta')) {
    return { type: 'emoji', value: '🧀' };
  }
  if (name.includes('thon') || name.includes('sardine') || name.includes('fish') || name.includes('poisson')) {
    return { type: 'emoji', value: '🐟' };
  }
  if (name.includes('harissa') || name.includes('sauce') || name.includes('tomate') || name.includes('sicam') || cat.includes('conserve') || name.includes('boite')) {
    return { type: 'emoji', value: '🥫' };
  }
  if (name.includes('eau') || name.includes('safia') || name.includes('sabrine') || name.includes('fourat') || name.includes('mineral')) {
    return { type: 'emoji', value: '💧' };
  }
  if (name.includes('coca') || name.includes('fanta') || name.includes('boga') || name.includes('soda') || name.includes('jus') || name.includes('drink') || name.includes('boisson')) {
    return { type: 'emoji', value: '🥤' };
  }
  if (name.includes('huile') || name.includes('zit') || name.includes('olive')) {
    return { type: 'emoji', value: '🫒' };
  }
  if (name.includes('pain') || name.includes('khobz') || name.includes('boulangerie') || name.includes('cake') || name.includes('croissant') || name.includes('toast')) {
    return { type: 'emoji', value: '🍞' };
  }
  if (name.includes('chocolat') || name.includes('biscuit') || name.includes('chips') || name.includes('gofre') || name.includes('oreo') || name.includes('bonbon') || name.includes('candy') || name.includes('sweet') || name.includes('kakou')) {
    return { type: 'emoji', value: '🍫' };
  }
  if (name.includes('café') || name.includes('coffee') || name.includes('nescafe') || name.includes('the') || name.includes('shay') || name.includes('lipton')) {
    return { type: 'emoji', value: '☕' };
  }
  if (name.includes('savon') || name.includes('shampooing') || name.includes('colgate') || name.includes('dentifrice') || name.includes('brosse') || cat.includes('hygiène') || cat.includes('hygiene') || cat.includes('entretien')) {
    return { type: 'emoji', value: '🧼' };
  }
  if (name.includes('javel') || name.includes('lessive') || name.includes('detergent') || name.includes('liquide') || name.includes('propre') || name.includes('jort')) {
    return { type: 'emoji', value: '🧴' };
  }
  if (name.includes('sucre') || name.includes('sel') || name.includes('epice') || name.includes('farine') || name.includes('smida')) {
    return { type: 'emoji', value: '🧂' };
  }
  if (name.includes('œuf') || name.includes('oeuf') || name.includes('dama') || name.includes('egg')) {
    return { type: 'emoji', value: '🥚' };
  }
  if (name.includes('fruit') || name.includes('pomme') || name.includes('banane') || name.includes('orange') || name.includes('fraise')) {
    return { type: 'emoji', value: '🍎' };
  }
  if (name.includes('legume') || name.includes('tomate') || name.includes('pdt') || name.includes('oignon') || name.includes('poivron')) {
    return { type: 'emoji', value: '🥕' };
  }
  if (name.includes('medicament') || name.includes('pansement') || name.includes('paracetamol') || name.includes('doliprane') || cat.includes('pharmacie') || name.includes('pill') || name.includes('comprime')) {
    return { type: 'emoji', value: '💊' };
  }
  if (name.includes('ciment') || name.includes('mortier') || name.includes('brique') || cat.includes('materiaux') || name.includes('peinture') || name.includes('fer')) {
    return { type: 'emoji', value: '🧱' };
  }
  if (name.includes('marteau') || name.includes('tournevis') || name.includes('vis') || name.includes('clou') || name.includes('outil')) {
    return { type: 'emoji', value: '🔨' };
  }

  // Category based matchers fallback
  if (cat.includes('pâte') || cat.includes('pain') || cat.includes('cereal') || cat.includes('cereale')) return { type: 'emoji', value: '🌾' };
  if (cat.includes('boiss') || cat.includes('eau') || cat.includes('jus')) return { type: 'emoji', value: '🥤' };
  if (cat.includes('conserv')) return { type: 'emoji', value: '🥫' };
  if (cat.includes('frais') || cat.includes('legum') || cat.includes('fruit')) return { type: 'emoji', value: '🍏' };
  if (cat.includes('pharm') || cat.includes('sant') || cat.includes('soin')) return { type: 'emoji', value: '💊' };
  if (cat.includes('mater') || cat.includes('outill') || cat.includes('brico')) return { type: 'emoji', value: '🔨' };
  if (cat.includes('hygi') || cat.includes('entr') || cat.includes('nettoy')) return { type: 'emoji', value: '🧼' };

  // Global default based on first letter or packaging
  return { type: 'emoji', value: '📦' };
}

/**
 * Checks if a product has an active promotion based on today's local date.
 */
export function isProductInPromo(product: Product): boolean {
  if (!product.promoPrice || product.promoPrice <= 0 || !product.promoStartDate || !product.promoEndDate) {
    return false;
  }
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  return todayStr >= product.promoStartDate && todayStr <= product.promoEndDate;
}

/**
 * Gets the current active selling price of a product, reverting to regular sellingPrice if no active promotion exists.
 */
export function getActiveProductPrice(product: Product): number {
  if (isProductInPromo(product)) {
    return product.promoPrice!;
  }
  return product.sellingPrice;
}

/**
 * Gets database for a specific superette and user. Fallbacks to default if not found and not owned by another user.
 */
export function getSuperetteDatabase(userId: string, superetteId: string): DatabaseState {
  if (typeof window === 'undefined') return INITIAL_DATABASE;
  const key = `commercial_management_db_${userId}_${superetteId}`;
  let data = safeLocalStorage.getItem(key);
  if (!data && superetteId === 'default') {
    data = safeLocalStorage.getItem('commercial_management_db');
  }
  if (!data) {
    if (userId && userId !== 'default') {
      // For first-time registered users, initialize all product stocks and partner balances to zero
      return {
        products: INITIAL_DATABASE.products.map(p => ({ ...p, stock: 0 })),
        partners: INITIAL_DATABASE.partners.map(p => ({ ...p, currentBalance: 0 })),
        invoices: [],
        payments: [],
        traites: [],
        expenses: [],
        settings: { ...DEFAULT_SETTINGS, storeName: superetteId === 'default' ? DEFAULT_SETTINGS.storeName : `Superette ${superetteId.toUpperCase()}` }
      };
    }
    return { ...INITIAL_DATABASE, settings: { ...DEFAULT_SETTINGS, storeName: superetteId === 'default' ? DEFAULT_SETTINGS.storeName : `Superette ${superetteId.toUpperCase()}` } };
  }
  try {
    const parsed = JSON.parse(data);
    const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    
    // Safely fallback to empty lists or zeroed data for registered users if properties are absent
    const fallbackProducts = userId && userId !== 'default' 
      ? INITIAL_DATABASE.products.map(p => ({ ...p, stock: 0 })) 
      : INITIAL_DATABASE.products;
    
    const fallbackPartners = userId && userId !== 'default' 
      ? INITIAL_DATABASE.partners.map(p => ({ ...p, currentBalance: 0 })) 
      : INITIAL_DATABASE.partners;

    return {
      products: parsed.products || fallbackProducts,
      partners: parsed.partners || fallbackPartners,
      invoices: parsed.invoices || [],
      payments: parsed.payments || [],
      traites: parsed.traites || [],
      expenses: parsed.expenses || [],
      settings
    };
  } catch (e) {
    if (userId && userId !== 'default') {
      return {
        products: INITIAL_DATABASE.products.map(p => ({ ...p, stock: 0 })),
        partners: INITIAL_DATABASE.partners.map(p => ({ ...p, currentBalance: 0 })),
        invoices: [],
        payments: [],
        traites: [],
        expenses: [],
        settings: DEFAULT_SETTINGS
      };
    }
    return { ...INITIAL_DATABASE, settings: DEFAULT_SETTINGS };
  }
}

/**
 * Saves database for a specific superette and user.
 */
export function saveSuperetteDatabase(userId: string, superetteId: string, db: DatabaseState): void {
  if (typeof window === 'undefined') return;
  const key = `commercial_management_db_${userId}_${superetteId}`;
  safeLocalStorage.setItem(key, JSON.stringify(db));
  
  // Only write to the shared 'commercial_management_db' key if there is no logged-in user
  if (!userId || userId === 'default') {
    safeLocalStorage.setItem('commercial_management_db', JSON.stringify(db));
  }
}



