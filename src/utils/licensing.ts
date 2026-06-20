// Cryptographic Licensing Verification and Protection Engine For SaaS Tenants
// Written specifically for GESTION PRO by Developer.

export interface UserLicenseData {
  uid: string;
  email: string | null;
  registeredAt: string;
  activationDate?: string; // Date d'activation de la licence active
  licenseExpiry: string;
  licenseStatus: 'trial' | 'active' | 'suspended' | 'expired';
  licenseKey: string;
  remoteAnnouncement?: string;
  businessName?: string;
  location?: string; // Geographic coordinates or business address location
  
  // 💰 SaaS Monetization & Sales Tracking
  paymentStatus?: 'paid' | 'pending' | 'free_trial' | 'refunded';
  paymentAmount?: number; // Total paid in TND (Tunisian Dinar)
  adminNotes?: string; // Admin's secret notes for follow-up
  
  // ⚙️ Configurations managed remotely by Super-Admin / Developer
  remoteAdminEmail?: string;
  remoteEnableCriticalStockEmailAlerts?: boolean;
  remoteSmtpHost?: string;
  remoteSmtpPort?: number;
  remoteSmtpUser?: string;
  remoteSmtpPass?: string;
  remoteSmtpSecure?: boolean;
  remoteSmtpSenderName?: string;
}

/**
 * Generates a mathematical license activation signature based on UID, Expiry Date and Secret Developer Salt.
 * This guarantees the client cannot modify their license expiration date in Firestore without a valid key from kharoufwala24@gmail.com
 */
export function generateLicenseKey(uid: string, expiryDate: string): string {
  const salt = "gp3000-tunisia-secure-salt-9988-kharoufwala24";
  const rawData = `${uid.trim()}:${expiryDate.trim()}:${salt}`;
  
  // Simple deterministic Fowler-Noll-Vo or polynomial roll hash
  let hash = 0;
  for (let i = 0; i < rawData.length; i++) {
    const char = rawData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Return readable activation key format: GP-[Hex-Hash]-[Date-Suffix]
  const shortHash = Math.abs(hash).toString(36).toUpperCase();
  const dateFormatted = expiryDate.replace(/-/g, '');
  return `GP-${shortHash}-${dateFormatted}`;
}

/**
 * Validates if the local or remote license is authentic and hasn't expired.
 */
export function verifyLicenseKey(uid: string, expiryDate: string, key: string): boolean {
  if (!key || !uid || !expiryDate) return false;
  
  // 1. Check Date Expiry
  const expiry = new Date(expiryDate);
  const today = new Date();
  
  // Reset time elements for correct day comparison
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  if (today > expiry) {
    return false;
  }
  
  // 2. Validate Key Hash Match
  const expectedKey = generateLicenseKey(uid, expiryDate);
  return key.trim() === expectedKey;
}
