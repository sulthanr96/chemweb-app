// ChemWebApp Service Worker for Offline Assets & Fast PWA Loading
const CACHE_NAME = 'chemwebapp-v2';

self.addEventListener('install', (event) => {
  const scope = self.registration.scope;
  const ASSETS_TO_CACHE = [
    scope,
    scope + 'public/nav-theme.css',
    scope + 'public/nav-theme.js',
    scope + 'public/manifest.json'
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests and skip API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  const url = event.request.url;
  const isCacheable = url.includes(self.location.origin) || 
                      url.includes('unpkg.com') || 
                      url.includes('cdnjs.cloudflare.com') || 
                      url.includes('jsdelivr.net') || 
                      url.includes('fonts.googleapis.com') || 
                      url.includes('fonts.gstatic.com') ||
                      url.includes('3Dmol.org');

  if (!isCacheable) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses (cross-origin opaque responses have status 0, which is also fine to cache)
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});
