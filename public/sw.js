const CACHE_NAME = 'innova-pos-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app-icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Pass through firestore / external backend calls cleanly
  if (e.request.url.includes('/api/') || e.request.url.includes('firestore.googleapis.com')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    }).catch(() => {
      // Fallback to offline index if possible for subpages
      if (e.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});
