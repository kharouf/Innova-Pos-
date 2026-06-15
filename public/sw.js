const CACHE_NAME = 'innova-pos-v2';
const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app-icon.svg'
];

// Helper to determine if the request is for a completely static asset
function isStaticAsset(url) {
  // Google Fonts, etc.
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    return true;
  }
  
  // Any standard static files, media, or Vite build assets
  const path = url.split('?')[0]; // strip query string if any
  return (
    path.includes('/assets/') ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|eot|ttf|json|webmanifest)$/i.test(path)
  );
}

// Helper to determine if a request should skip the service worker cache (network-only)
function shouldBypassCache(request) {
  const url = request.url;
  
  // Cache supports GET requests only
  if (request.method !== 'GET') {
    return true;
  }
  
  // Bypass Firestore database client connections, session management, dynamic API routes, and OAuth
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('/api/') ||
    url.includes('googleapis.com/oauth') ||
    url.includes('www.googleapis.com/gmail') ||
    url.includes('www.googleapis.com/drive') ||
    url.includes('google-analytics.com') ||
    url.includes('chrome-extension://')
  ) {
    return true;
  }
  
  return false;
}

// Install Event - Pre-cache vital shell elements
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[INNOVA POS SW] Pre-caching application shell assets');
      return cache.addAll(ASSETS_TO_PRECACHE);
    })
  );
});

// Activate Event - Clean up stale caches from previous versions (e.g. innova-pos-v1)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[INNOVA POS SW] Cleaning up obsolete cache store:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[INNOVA POS SW] Claiming clients for immediate control');
      return self.clients.claim();
    })
  );
});

// Cache-First Strategy with dynamic caching for static assets
function cacheFirst(request) {
  return caches.match(request).then((cachedResponse) => {
    if (cachedResponse) {
      // Return cached asset immediately for maximum speed
      return cachedResponse;
    }
    
    return fetch(request).then((networkResponse) => {
      if (!networkResponse || networkResponse.status !== 200) {
        return networkResponse;
      }
      
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseToCache);
      });
      
      return networkResponse;
    }).catch((err) => {
      console.error('[INNOVA POS SW] Fetch failed for uncached static asset:', request.url, err);
      // Fallback for subpages or missing static resources
      if (request.mode === 'navigate') {
        return caches.match('/');
      }
      throw err;
    });
  });
}

// Network-First Strategy with quick timeout before falling back on cache (for navigations and pages)
function networkFirstWithTimeout(request, timeoutMs = 2000) {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve('TIMEOUT'), timeoutMs);
  });

  return Promise.race([
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    }),
    timeoutPromise
  ]).then((result) => {
    if (result === 'TIMEOUT') {
      console.warn('[INNOVA POS SW] Network response slow. Falling back to cached copy for page:', request.url);
      return caches.match(request).then((cached) => {
        if (cached) return cached;
        // If not in cache, fallback to main fetch promise that we let continue
        return fetch(request);
      });
    }
    return result;
  }).catch(() => {
    console.log('[INNOVA POS SW] Offline mode detected. Navigating from cached page:', request.url);
    return caches.match(request).then((cached) => {
      return cached || caches.match('/');
    });
  });
}

// Intercept Network Requests
self.addEventListener('fetch', (e) => {
  if (shouldBypassCache(e.request)) {
    return; // Let native browser fetch handle standard API / DB traffic
  }
  
  const url = e.request.url;
  
  if (isStaticAsset(url)) {
    // Serve static files cache-first
    e.respondWith(cacheFirst(e.request));
  } else {
    // Serve navigate items, HTML, or routing URLs network-first with a fallback timeout
    const timeout = e.request.mode === 'navigate' ? 2500 : 1500;
    e.respondWith(networkFirstWithTimeout(e.request, timeout));
  }
});

