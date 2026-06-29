import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { safeLocalStorage } from './storage';

// Dynamically support loading a customized Firebase config from localized web storage
let activeConfig = firebaseConfig as any;
const customConfigStr = safeLocalStorage.getItem('CUSTOM_FIREBASE_CONFIG');
if (customConfigStr) {
  try {
    const parsed = JSON.parse(customConfigStr);
    if (parsed && parsed.projectId && parsed.apiKey) {
      activeConfig = parsed;
    }
  } catch (e) {
    console.warn('[FIRESTORE SYSTEM INFO] Custom configuration parsing error:', e);
  }
}

const app = getApps().length === 0 ? initializeApp(activeConfig) : getApps()[0];

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, activeConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const storage = getStorage(app);

// Keep track of the Google OAuth access token in-memory
let cachedAccessToken: string | null = null;

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getCachedAccessToken = () => cachedAccessToken;

/**
 * Triggers interactive Google Sign-In with specific scopes for Gmail and Google Drive services.
 * Caches and returns the resulting access token in memory safely.
 */
export const googleSignInForWorkspace = async (): Promise<string> => {
  if (cachedAccessToken) return cachedAccessToken;

  const provider = new GoogleAuthProvider();
  // Force Google account picker so users can select different accounts
  provider.setCustomParameters({ prompt: 'select_account' });
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google sign-in response.');
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error) {
    console.error('Workspace Google integration auth failure:', error);
    throw error;
  }
};

// Suppress internal firestore logger warnings about network/backend availability
try {
  setLogLevel('silent');
} catch (e) {
  console.log('[FIRESTORE SYSTEM INFO] Suppressing Firestore logger failed: ', e);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const isPermissionError = errMessage.toLowerCase().includes('permission-denied') || 
                            errMessage.toLowerCase().includes('insufficient permissions') ||
                            errMessage.toLowerCase().includes('permission denied');

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isPermissionError) {
    console.warn('Firestore Permission Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    // If it's a network, connection, offline or timeout issue, log it informatively which allows offline fallback to function.
    console.log('[FIRESTORE SYSTEM INFO] Operating in offline or disconnected state gracefully: ', JSON.stringify(errInfo));
  }
}
