export type PartnerType = 'client' | 'fournisseur';

export interface Product {
  id: string;
  code: string; // Barcode or internal SKU
  name: string;
  category: string;
  purchasePrice: number; // Prix d'achat
  sellingPrice: number; // Prix de vente
  stock: number;
  minAlertQty: number; // Seuil d'alerte stock
  unit: string; // Unité: Pcs, Kg, Litre, etc.
  image?: string; // Image representation: Base64, emoji or URL
  emailAlertsEnabled?: boolean; // Toggle per-product email notifications
  isFoodProduct?: boolean;
  expiryDate?: string; // format YYYY-MM-DD
  dateExpiration?: string; // format YYYY-MM-DD
  weightVolume?: string;
  tvaRate?: number; // Taux de TVA: 0, 7, 19
  promoPrice?: number; // Prix promotionnel s'il y a lieu
  promoStartDate?: string; // format YYYY-MM-DD
  promoEndDate?: string; // format YYYY-MM-DD
  priceHistory?: {
    id: string;
    timestamp: string;
    oldSellingPrice: number;
    newSellingPrice: number;
    oldPurchasePrice: number;
    newPurchasePrice: number;
  }[];
}

export interface Partner {
  id: string;
  type: PartnerType;
  name: string;
  phone: string;
  address: string;
  currentBalance: number; // Positive means they owe us (client credit), negative means we owe them (fournisseur credit) or vice-versa
  email?: string;
  nif?: string; // Numéro d'Identifiant Fiscal (useful in Algeria/Tunisia)
  rc?: string; // Registre de commerce
  ai?: string; // Article d'imposition
  location?: string; // GPS Coordinates or Google Maps URL
  discountRate?: number; // Custom discount percentage specifically for this partner (client)
  loyaltyPoints?: number; // Client loyalty score accumulator
  contactPerson?: string; // Contact person for supply chain
  creditLimit?: number; // Maximum allowed credit with this partner
  supplyChainType?: string; // Wholesaler, direct producer, importer, logistics partner
  paymentTerms?: string; // e.g. Net 30, Cash, Bank Transfer
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  qty: number;
  purchasePrice: number; // We track purchase price at the time of sale to compute exact net benefits even if product prices change later!
  sellingPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string; // Custom readable number e.g. FAC-2026-0001 or BL-2026-0001
  date: string;
  partnerId?: string; // Can be anonymous cash client
  partnerName: string; // Captured in case partner is deleted or anonymous
  type: 'facture' | 'bl'; // Facture or Bon de Livraison
  isReturn?: boolean; // True if this document is a Return Credit Note / Refund
  items: InvoiceItem[];
  subTotal: number;
  discount: number;
  taxRate: number; // e.g. 19%
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number; // total - paidAmount (credit)
  dueDate?: string;
  notes?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
}

export interface PaymentTransaction {
  id: string;
  date: string;
  partnerId: string;
  partnerName: string;
  partnerType: PartnerType;
  type: 'payment_received' | 'payment_sent' | 'credit_adjust';
  amount: number;
  notes: string;
  invoiceId?: string;
}

export interface Traite {
  id: string;
  number: string;
  dateIssue: string;
  dateDue: string;
  partnerId: string;
  partnerName: string;
  partnerPhone?: string;
  amount: number;
  bankName: string;
  rib: string;
  city: string;
  status: 'pending' | 'cleared' | 'cancelled';
  notes?: string;
}

export interface DailyExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

export type UserRole = 'admin' | 'sales' | 'inventory';

export interface AppUser {
  id: string;
  name: string;
  pin: string; // PIN code for login switching
  role: UserRole;
  isActive: boolean;
  avatar?: string; // profile emoji or initials
  email?: string; // optional user email for accounts or reset actions
}

export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  activitySector: 'superette' | 'pharmacie' | 'materiaux' | 'general';
  matriculeFiscal?: string;
  storeLogo?: string; // Base64 image, icon, or emoji representation
  ownerPin?: string; // 4-digit PIN for locks/restrictions
  databaseSecurityPin?: string; // Master administrative PIN for general database security gate and Settings tab
  enableBiometricOrCodeBypass?: boolean; // Enable Secret Code or Face ID Bypass login
  bypassSecretCode?: string; // Optional custom secret code just for bypass
  manualExpensesOffset?: number;
  manualProfitsOffset?: number;
  manualCreditOffset?: number;
  customCapitalValue?: number;
  users?: AppUser[]; // Multiple users with roles and permissions

  // Sector-specific detailed parameters
  tvaAlimentaire?: number; // default VAT for foods
  enableExpiryAlerts?: boolean; // alerts for expiring goods
  expiryAlertDays?: number; // days count threshold for expiry alert

  conventionCnam?: string; // CNAM ID for pharmacy
  tauxRemboursementCnam?: number; // pharmacy CNAM refund percentage
  requiresPrescriptionByDefault?: boolean; // force prescription toggle

  defaultDeliveryCharge?: number; // default dispatch/kilometer rate
  wholesaleThreshold?: number; // wholesale rate eligibility limit
  chargeClientTVA?: boolean; // automatic materials VAT charge

  defaultWarrantyMonths?: number; // electronics warranty period
  enableLoyaltyPoints?: boolean; // client loyalty score accumulator
  loyaltyXSpent?: number; // Every X amount spent
  loyaltyYPoints?: number; // earns Y points
  loyaltyPointValue?: number; // each point can be redeemed for this discount value

  // 🎫 Receipt Thermal Customizer parameters
  receiptShowLogo?: boolean;
  receiptShowStoreDetails?: boolean;
  receiptCustomThankYou?: string;
  receiptShowCommercialTerms?: boolean;
  receiptCompactSize?: boolean;
  receiptCustomLogo?: string; // Custom Base64 logo specifically for thermal receipts
  invoiceCustomLogo?: string; // Custom Base64 logo specifically for A4 invoices
  receiptMarginTop?: number;
  receiptMarginBottom?: number;
  receiptMarginLeft?: number;
  receiptMarginRight?: number;
  invoiceMarginTop?: number;
  invoiceMarginBottom?: number;
  invoiceMarginLeft?: number;
  invoiceMarginRight?: number;

  // 📧 Administrative Email Notifications
  adminEmail?: string;
  enableCriticalStockEmailAlerts?: boolean;
  enableIndividualProductEmailAlerts?: boolean;
  enableDailyLowStockEmail?: boolean;

  // ⚙️ Custom SMTP Mail Server parameters for actual real emails
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  smtpSenderName?: string;
  themeMode?: 'light' | 'dark';
  useGmailApi?: boolean;
  vpnEnabled?: boolean;
  vpnProtocol?: 'wireguard' | 'openvpn' | 'zerotier' | 'tailscale' | 'ipsec';
  vpnServerAddress?: string;
  vpnPort?: number;
  vpnPublicKey?: string;
  vpnPrivateKey?: string;
  vpnClientIp?: string;
  vpnIpRange?: string;

  // 🛡️ Security compliance session automatic timeout durations (in minutes, 0 means disabled)
  adminSessionTimeout?: number;
  salesSessionTimeout?: number;
  inventorySessionTimeout?: number;

  // 🏷️ Custom TVA Rates
  customTvaRates?: number[];
}

export interface DatabaseState {
  products: Product[];
  partners: Partner[];
  invoices: Invoice[];
  payments: PaymentTransaction[];
  traites: Traite[];
  expenses: DailyExpense[];
  settings?: StoreSettings;
}

export interface SystemUpdate {
  id: string; // unique version like 'v1.2.0'
  date: string; // e.g., '24/05/2026 - 15:40'
  titleAr: string;
  titleFr: string;
  descriptionAr: string[];
  descriptionFr: string[];
  type: 'major' | 'feature' | 'patch';
}

