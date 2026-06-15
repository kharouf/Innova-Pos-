// Safe storage wrapper that prevents SecurityErrors / crashes when localStorage is blocked (e.g., in iframe or incognito)
const inMemoryStore: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[INNOVA STORAGE] localStorage.getItem was blocked for key "${key}". Falling back to in-memory store.`, e);
    }
    return key in inMemoryStore ? inMemoryStore[key] : null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`[INNOVA STORAGE] localStorage.setItem was blocked for key "${key}". Falling back to in-memory store.`, e);
    }
    inMemoryStore[key] = String(value);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`[INNOVA STORAGE] localStorage.removeItem was blocked for key "${key}". Falling back to in-memory store.`, e);
    }
    delete inMemoryStore[key];
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      console.warn('[INNOVA STORAGE] localStorage.clear was blocked. Falling back to in-memory store.', e);
    }
    for (const key in inMemoryStore) {
      delete inMemoryStore[key];
    }
  }
};

// Robust function to check if the app is embedded in an iframe (e.g. AI Studio preview)
// Safe from cross-domain / cross-origin SecurityErrors by trapping standard compare exceptions
export function checkIsIframe(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return window.self !== window.top;
  } catch (e) {
    return true; // SecurityException indicates a cross-origin iframe environment
  }
}

