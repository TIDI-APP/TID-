const CACHE_NAME = 'tidi-v1';
const STATIC_ASSETS = [
  '/public/views/dashboard.html',
  '/public/views/login.html',
  '/public/css/dashboard.css',
  '/public/js/auth.js',
  '/public/js/dashboard.js',
  '/public/assets/icons/icon-192.png',
  '/public/assets/icons/icon-512.png',
  '/public/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Las rutas de API siempre van a la red
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
