import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { DatabaseState, Product, Partner, Invoice, PaymentTransaction, Traite, DailyExpense, SystemUpdate } from '../types';
import { UserLicenseData, generateLicenseKey } from './licensing';

/**
 * Recursively removes all undefined fields from an object so that it can be safely saved to Firestore.
 */
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = cleanUndefined(value);
        }
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Loads the complete database for a given user from Firestore.
 * If Firestore is empty, it returns null (indicating we should seed it with initial data).
 */
export interface SuperetteMeta {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Loads list of all registered superettes/workspaces under a given user.
 */
export async function loadUserSuperettesList(userId: string): Promise<SuperetteMeta[]> {
  const colRef = collection(db, 'users', userId, 'superettes_meta');
  try {
    const snap = await getDocs(colRef);
    const list: SuperetteMeta[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        name: data.name || 'Superette',
        createdAt: data.createdAt || new Date().toISOString().split('T')[0]
      });
    });

    // Automatically register and seed the default database metadata if it does not exist
    if (list.length === 0 || !list.some(s => s.id === 'default')) {
      const defaultMeta = {
        id: 'default',
        name: 'Superette Principale',
        createdAt: new Date().toISOString().split('T')[0]
      };
      await setDoc(doc(db, 'users', userId, 'superettes_meta', 'default'), defaultMeta);
      list.push(defaultMeta);
    }
    return list;
  } catch (err) {
    console.warn("Could not load superettes list. Using fallback default local.", err);
    return [{ id: 'default', name: 'Superette Principale', createdAt: '' }];
  }
}

/**
 * Saves or updates a superette's basic metadata in Firestore.
 */
export async function saveUserSuperetteMeta(userId: string, meta: SuperetteMeta): Promise<void> {
  const docRef = doc(db, 'users', userId, 'superettes_meta', meta.id);
  try {
    await setDoc(docRef, meta, { merge: true });
  } catch (err) {
    console.error("Failed storing superette metadata", err);
  }
}

/**
 * Deletes a superette workspace's metadata and data.
 */
export async function deleteUserSuperetteMeta(userId: string, superetteId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'superettes_meta', superetteId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Failed deleting superette metadata", err);
  }
}

/**
 * Loads the complete database for a given user and superette from Firestore.
 * If Firestore is empty, it returns null (indicating we should seed it with initial data).
 */
export async function loadUserDatabase(userId: string, superetteId: string = 'default'): Promise<DatabaseState | null> {
  const baseUserPath = superetteId === 'default' ? `users/${userId}` : `users/${userId}/superettes/${superetteId}`;
  
  try {
    const [
      productsSnap,
      partnersSnap,
      invoicesSnap,
      paymentsSnap,
      traitesSnap,
      expensesSnap,
      userDocSnap
    ] = await Promise.all([
      getDocs(collection(db, baseUserPath, 'products')),
      getDocs(collection(db, baseUserPath, 'partners')),
      getDocs(collection(db, baseUserPath, 'invoices')),
      getDocs(collection(db, baseUserPath, 'payments')),
      getDocs(collection(db, baseUserPath, 'traites')),
      getDocs(collection(db, baseUserPath, 'expenses')),
      superetteId === 'default'
        ? getDoc(doc(db, 'users', userId))
        : getDoc(doc(db, 'users', userId, 'superettes', superetteId))
    ]);

    const products: Product[] = [];
    productsSnap.forEach(doc => products.push(doc.data() as Product));

    const partners: Partner[] = [];
    partnersSnap.forEach(doc => partners.push(doc.data() as Partner));

    const invoices: Invoice[] = [];
    invoicesSnap.forEach(doc => invoices.push(doc.data() as Invoice));

    const payments: PaymentTransaction[] = [];
    paymentsSnap.forEach(doc => payments.push(doc.data() as PaymentTransaction));

    const traites: Traite[] = [];
    traitesSnap.forEach(doc => traites.push(doc.data() as Traite));

    const expenses: DailyExpense[] = [];
    expensesSnap.forEach(doc => expenses.push(doc.data() as DailyExpense));

    let settings = undefined;
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData && userData.storeSettings) {
        settings = userData.storeSettings;
      }
    }

    // If everything is empty AND there are no custom settings configured in Firestore, return null so we can seed with Tunisian superette default data
    if (
      productsSnap.empty &&
      partnersSnap.empty &&
      invoicesSnap.empty &&
      paymentsSnap.empty &&
      traitesSnap.empty &&
      expensesSnap.empty &&
      !settings
    ) {
      return null;
    }

    return {
      products,
      partners,
      invoices,
      payments,
      traites,
      expenses,
      settings
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, baseUserPath);
    return null;
  }
}

/**
 * Seeds a new user's Firestore with default Tunisian superette database
 */
export async function seedUserDatabase(userId: string, initialDb: DatabaseState, superetteId: string = 'default'): Promise<void> {
  const baseUserPath = superetteId === 'default' ? `users/${userId}` : `users/${userId}/superettes/${superetteId}`;
  
  try {
    const batch = writeBatch(db);

    // Seed products
    initialDb.products.forEach(item => {
      const docRef = doc(db, baseUserPath, 'products', item.id);
      batch.set(docRef, cleanUndefined(item));
    });

    // Seed partners
    initialDb.partners.forEach(item => {
      const docRef = doc(db, baseUserPath, 'partners', item.id);
      batch.set(docRef, cleanUndefined(item));
    });

    // Seed invoices
    initialDb.invoices.forEach(item => {
      const docRef = doc(db, baseUserPath, 'invoices', item.id);
      batch.set(docRef, cleanUndefined(item));
    });

    // Seed payments
    initialDb.payments.forEach(item => {
      const docRef = doc(db, baseUserPath, 'payments', item.id);
      batch.set(docRef, cleanUndefined(item));
    });

    // Seed traites
    initialDb.traites.forEach(item => {
      const docRef = doc(db, baseUserPath, 'traites', item.id);
      batch.set(docRef, cleanUndefined(item));
    });

    // Seed expenses
    initialDb.expenses.forEach(item => {
      const docRef = doc(db, baseUserPath, 'expenses', item.id);
      batch.set(docRef, cleanUndefined(item));
    });

    await batch.commit();

    // Seed storeSettings inside user document matching the key
    if (initialDb.settings) {
      if (superetteId === 'default') {
        await setDoc(doc(db, 'users', userId), { storeSettings: cleanUndefined(initialDb.settings) }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', userId, 'superettes', superetteId), { storeSettings: cleanUndefined(initialDb.settings) }, { merge: true });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${baseUserPath}/[SEED]`);
  }
}

/**
 * Syncs changes from memory back to Firestore incrementally by identifying diffs.
 */
export async function syncDatabaseDiff(
  userId: string,
  oldDb: DatabaseState,
  newDb: DatabaseState,
  superetteId: string = 'default'
): Promise<void> {
  const baseUserPath = superetteId === 'default' ? `users/${userId}` : `users/${userId}/superettes/${superetteId}`;

  try {
    // Helper to diff collections and execute writes/deletes
    const syncCollection = async <T extends { id: string }>(
      colName: string,
      oldItems: T[],
      newItems: T[]
    ) => {
      const oldMap = new Map(oldItems.map(i => [i.id, cleanUndefined(i)]));
      const newMap = new Map(newItems.map(i => [i.id, cleanUndefined(i)]));

      const writes: Promise<void>[] = [];

      // Find creations & updates
      for (const [id, newItem] of newMap.entries()) {
        const oldItem = oldMap.get(id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
          // Changed or new
          writes.push(
            setDoc(doc(db, baseUserPath, colName, id), newItem).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `${baseUserPath}/${colName}/${id}`);
            })
          );
        }
      }

      // Find deletions
      for (const id of oldMap.keys()) {
        if (!newMap.has(id)) {
          writes.push(
            deleteDoc(doc(db, baseUserPath, colName, id)).catch(err => {
              handleFirestoreError(err, OperationType.DELETE, `${baseUserPath}/${colName}/${id}`);
            })
          );
        }
      }

      await Promise.all(writes);
    };

    // Parallel sync for all subcollections
    await Promise.all([
      syncCollection('products', oldDb.products, newDb.products),
      syncCollection('partners', oldDb.partners, newDb.partners),
      syncCollection('invoices', oldDb.invoices, newDb.invoices),
      syncCollection('payments', oldDb.payments, newDb.payments),
      syncCollection('traites', oldDb.traites, newDb.traites),
      syncCollection('expenses', oldDb.expenses, newDb.expenses)
    ]);

    // Also sync settings if they changed
    if (newDb.settings && JSON.stringify(oldDb.settings) !== JSON.stringify(newDb.settings)) {
      if (superetteId === 'default') {
        await setDoc(doc(db, 'users', userId), { storeSettings: cleanUndefined(newDb.settings) }, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}/[SETTINGS]`);
        });
      } else {
        await setDoc(doc(db, 'users', userId, 'superettes', superetteId), { storeSettings: cleanUndefined(newDb.settings) }, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}/superettes/${superetteId}/[SETTINGS]`);
        });
      }
    }
  } catch (err) {
    console.log('[FIRESTORE SYSTEM INFO] Failure inside incremental sync database helper. Operating offline.', err);
  }
}

/**
 * Loads the user license metadata.
 * If not exists, creates a default trial license.
 */
export async function loadUserLicense(userId: string, email: string | null, storeName?: string): Promise<UserLicenseData> {
  const docRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      
      // Auto-backfill matching email or businessName if missing on login to maintain clean SaaS logs
      if ((!data.email && email) || (!data.businessName && storeName)) {
        const updatePayload: Partial<UserLicenseData> = {};
        if (!data.email && email) updatePayload.email = email;
        if (!data.businessName && storeName) updatePayload.businessName = storeName;
        await setDoc(docRef, updatePayload, { merge: true });
      }

      return {
        uid: userId,
        email: data.email || email,
        registeredAt: data.registeredAt || new Date().toISOString().split('T')[0],
        activationDate: data.activationDate || '',
        licenseExpiry: data.licenseExpiry || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        licenseStatus: data.licenseStatus || 'trial',
        licenseKey: data.licenseKey || '',
        remoteAnnouncement: data.remoteAnnouncement || '',
        businessName: data.businessName || storeName || '',
        location: data.location || '',
        isOnboarded: data.isOnboarded || false,
        phone: data.phone || '',
        
        // Monetization parameters
        paymentStatus: data.paymentStatus || 'free_trial',
        paymentAmount: data.paymentAmount || 0,
        adminNotes: data.adminNotes || '',
        
        remoteAdminEmail: data.remoteAdminEmail || undefined,
        remoteEnableCriticalStockEmailAlerts: data.remoteEnableCriticalStockEmailAlerts ?? undefined,
        remoteSmtpHost: data.remoteSmtpHost || undefined,
        remoteSmtpPort: data.remoteSmtpPort || undefined,
        remoteSmtpUser: data.remoteSmtpUser || undefined,
        remoteSmtpPass: data.remoteSmtpPass || undefined,
        remoteSmtpSecure: data.remoteSmtpSecure ?? undefined,
        remoteSmtpSenderName: data.remoteSmtpSenderName || undefined
      };
    } else {
      // Create default Trial License (14 days)
      const trialExpiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const defaultLicense: UserLicenseData = {
        uid: userId,
        email: email,
        registeredAt: new Date().toISOString().split('T')[0],
        activationDate: '',
        licenseExpiry: trialExpiryDate,
        licenseStatus: 'trial',
        licenseKey: generateLicenseKey(userId, trialExpiryDate),
        remoteAnnouncement: 'مرحباً بك في النسخة التجريبية لـ INNOVA POS. اتصل بنا للتنشيط النهائي.',
        businessName: storeName || 'محل تجاري جديد',
        location: '',
        paymentStatus: 'free_trial',
        paymentAmount: 0,
        adminNotes: 'Nouveau compte inscrit.',
        isOnboarded: false,
        phone: ''
      };
      
      await setDoc(docRef, defaultLicense);
      return defaultLicense;
    }
  } catch (error) {
    console.log("[FIRESTORE SYSTEM INFO] Failed to load user license. Using default safety instance.", error);
    // Return a default safety instance
    const trialExpiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let localIsOnboarded = false;
    if (typeof window !== 'undefined') {
      localIsOnboarded = localStorage.getItem(`innova_pos_onboarded_${userId}`) === 'true';
      if (!localIsOnboarded) {
        const savedActiveId = localStorage.getItem('active_superette_id_' + userId) || 'default';
        const localDbStr = localStorage.getItem(`commercial_management_db_${userId}_${savedActiveId}`) || localStorage.getItem('commercial_management_db');
        if (localDbStr) {
          try {
            const parsed = JSON.parse(localDbStr);
            if (parsed?.settings?.storeName && parsed?.settings?.storeName !== 'INNOVA POS PRO' && parsed?.settings?.storeName !== 'Superette Principale') {
              localIsOnboarded = true;
              localStorage.setItem(`innova_pos_onboarded_${userId}`, 'true');
            }
          } catch (e) {}
        }
      }
    }

    return {
      uid: userId,
      email: email,
      registeredAt: new Date().toISOString().split('T')[0],
      activationDate: '',
      licenseExpiry: trialExpiryDate,
      licenseStatus: 'trial',
      licenseKey: generateLicenseKey(userId, trialExpiryDate),
      remoteAnnouncement: 'ملاحظة: فشل التحميل من السيرفر. تم تفعيل النظام محلياً.',
      businessName: storeName || 'محل تجاري جديد',
      location: '',
      isOnboarded: localIsOnboarded,
      paymentStatus: 'free_trial',
      paymentAmount: 0,
      adminNotes: 'Failsafe recovery',
      phone: ''
    };
  }
}

/**
 * Saves a Partial of UserLicenseData to user meta document.
 */
export async function saveUserLicense(userId: string, data: Partial<UserLicenseData>): Promise<void> {
  const docRef = doc(db, 'users', userId);
  try {
    await setDoc(docRef, cleanUndefined(data), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Loads all registered tenants' licensing configurations.
 * Only accessible to super-admin (kharoufwala24@gmail.com).
 */
export async function loadAllTenantLicenses(): Promise<UserLicenseData[]> {
  const colRef = collection(db, 'users');
  try {
    const snap = await getDocs(colRef);
    const licenses: UserLicenseData[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      const storeSettings = data.storeSettings || {};
      
      licenses.push({
        uid: doc.id,
        email: data.email || storeSettings.email || null,
        registeredAt: data.registeredAt || '24/05/2026',
        activationDate: data.activationDate || '',
        licenseExpiry: data.licenseExpiry || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        licenseStatus: data.licenseStatus || 'trial',
        licenseKey: data.licenseKey || '',
        remoteAnnouncement: data.remoteAnnouncement || '',
        businessName: data.businessName || storeSettings.storeName || 'Superette',
        location: data.location || storeSettings.storeAddress || '',
        
        // Monetization parameters
        paymentStatus: data.paymentStatus || 'free_trial',
        paymentAmount: Number(data.paymentAmount) || 0,
        adminNotes: data.adminNotes || '',
        
        remoteAdminEmail: data.remoteAdminEmail || '',
        remoteEnableCriticalStockEmailAlerts: data.remoteEnableCriticalStockEmailAlerts ?? undefined,
        remoteSmtpHost: data.remoteSmtpHost || '',
        remoteSmtpPort: data.remoteSmtpPort || undefined,
        remoteSmtpUser: data.remoteSmtpUser || '',
        remoteSmtpPass: data.remoteSmtpPass || '',
        remoteSmtpSecure: data.remoteSmtpSecure ?? undefined,
        remoteSmtpSenderName: data.remoteSmtpSenderName || ''
      });
    });
    return licenses;
  } catch (error) {
    console.log("[FIRESTORE SYSTEM INFO] Failed to load global tenant list. Returning empty list.", error);
    return [];
  }
}

/**
 * Deletes a tenant and all of their subcollections from Firestore completely (Supprimer de SaaS console).
 */
export async function deleteTenantCompletely(userId: string): Promise<void> {
  const baseUserPath = `users/${userId}`;
  const subdirs = ['products', 'partners', 'invoices', 'payments', 'traites', 'expenses'];
  
  try {
    const batch = writeBatch(db);
    
    // 1. Queue all products, partners, invoices, etc. for deletion
    for (const sub of subdirs) {
      const snap = await getDocs(collection(db, baseUserPath, sub));
      snap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
    }
    
    // 2. Queue the main user document for deletion
    batch.delete(doc(db, 'users', userId));
    
    // 3. Commit the deletions
    await batch.commit();
  } catch (error) {
    console.error(`Failed to delete tenant completely for uid ${userId}:`, error);
    throw error;
  }
}

/**
 * Wipes all SaaS tenant accounts and databases from Firestore completely.
 */
export async function wipeAllSaaSTenantsAndDatabases(): Promise<void> {
  try {
    const colRef = collection(db, 'users');
    const snap = await getDocs(colRef);
    const deletePromises: Promise<void>[] = [];
    
    snap.forEach(docSnap => {
      // Deletes each user document and its subcollections completely
      deletePromises.push(deleteTenantCompletely(docSnap.id));
    });
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Wiping all SaaS database collections failed:", error);
    throw error;
  }
}

/**
 * Loads list of system updates from Firestore.
 * Falls back to hardcoded history if collection is empty or unreachable.
 */
export async function loadSystemUpdates(): Promise<SystemUpdate[]> {
  const collectionRef = collection(db, 'updates');
  try {
    const snap = await getDocs(collectionRef);
    const list: SystemUpdate[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as SystemUpdate);
    });

    if (list.length > 0) {
      // Sort descending by date/id
      return list.sort((a, b) => b.id.localeCompare(a.id));
    }
  } catch (error) {
    console.warn("Could not query updates collection in Firestore, using defaults", error);
  }

  // Seed / default updates list to ensure they have information offline or at startup
  const defaults: SystemUpdate[] = [
    {
      id: 'v1.2.5',
      date: '26/05/2026 - 16:15',
      titleFr: 'Carte interactive & Alignement Géographique',
      titleAr: 'الخريطة التفاعلية والتحجيم الجغرافي للشركاء',
      descriptionFr: [
        'Intégration d’un module de géolocalisation haute performance pour l’ensemble des partenaires.',
        'Affichage dynamique avec marqueurs colorés (Bleu pour Clients, Violet Indigo pour Fournisseurs).',
        'Lancement rapide d’itinéraires de livraison et navigation via Google Maps dans l’infobulle.',
        'Accès instantané aux fiches financières, coordonnées téléphoniques et soldes depuis la carte.'
      ],
      descriptionAr: [
        'دمج لوحة التتبع الجغرافي والخرائط المتكاملة لمتابعة نطاق تسليم العملاء والطلبيات.',
        'إشارات وتصاميم مخصصة على الخريطة (اللون الأزرق للزبائن واللون البنفسجي للموردين).',
        'ملاحة وتوجيه فوري لسيارات الشحن والتوزيع عبر الربط المباشر مع خرائط جوجل.',
        'عرض كامل وفوري لمعلومات الاتصال والديون المستحقة بمجرد لمس أي موقع للشركاء.'
      ],
      type: 'feature'
    },
    {
      id: 'v1.2.0',
      date: '24/05/2026 - 15:40',
      titleFr: 'Mise à jour du système & Consolidation SaaS',
      titleAr: 'تحديث النظام البرمجي وتوطيد خادم السحاب',
      descriptionFr: [
        'Optimisation majeure de la vitesse de calcul de l’encaissement et de la facturation.',
        'Amélioration de l’architecture du noyau et allègement de la base locale.',
        'Refonte cosmétique de l’en-tête de la Console Développeur pour un meilleur suivi commercial.',
        'Optimisation des flux de synchronisation Firestore en arrière-plan pour économiser la bande passante.'
      ],
      descriptionAr: [
        'تحسين سرعة معالجة الحسابات والفواتير في صناديق المحاسبة ونقاط البيع السريعة.',
        'تحديث وتطوير النواة البرمجية الأساسية للنظام ليكون أخف وزناً على الأجهزة القديمة.',
        'تعديل وإضافة ملخص تحديثات النظام مباشرة داخل لوحة تحكم مطور SaaS عن بعد.',
        'تخفيض حجم استهلاك حزم الإنترنت عبر تحسين معالجة فروق البيانات المرفوعة للسيرفر.'
      ],
      type: 'major'
    },
    {
      id: 'v1.1.0',
      date: '10/05/2026 - 11:30',
      titleFr: 'Impression Thermique & Personnalisation des Tickets',
      titleAr: 'التحكم في نموذج وطباعة فواتير وإيصالات المبيعات',
      descriptionFr: [
        'Ajout du support complet d’impression pour les imprimantes thermiques 80mm et 58mm.',
        'Personnalisation du nom de la boutique, adresse, téléphone et salutations au bas du ticket.',
        'Ajout d’un code-barres automatique pour chaque reçu de vente.'
      ],
      descriptionAr: [
        'دعم متكامل ومباشر للطباعة الحرارية بمقاس 80 مم أو 58 مم من المتصفح.',
        'تخصيص كامل للشعار واسم المحل، العناوين، الهواتف، وملاحظات الترحيب أسفل التذكرة.',
        'توليد تلقائي للرموز الشريطية (Barcode) لكل إيصال بيع مسجل.'
      ],
      type: 'feature'
    }
  ];

  return defaults;
}

/**
 * Publishes or saves a SystemUpdate to Firestore.
 */
export async function saveSystemUpdate(update: SystemUpdate): Promise<void> {
  const docRef = doc(db, 'updates', update.id);
  try {
    await setDoc(docRef, cleanUndefined(update));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `updates/${update.id}`);
  }
}

/**
 * Deletes a SystemUpdate from Firestore.
 */
export async function deleteSystemUpdate(id: string): Promise<void> {
  const docRef = doc(db, 'updates', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `updates/${id}`);
  }
}


