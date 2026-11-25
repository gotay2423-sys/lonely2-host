const CACHE_NAME = 'lonely-ps4-v1.0-god-of-war';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './gow_bg.jpg',
  './kratos_crest.png',
  './prestige.jpg',
  './src/main.js',
  './src/site.js',
  './src/misc.js',
  './src/thread.js',
  './src/userland.js',
  './src/kernel.js',
  './src/lapse.js',
  './src/worker.js',
  './src/ps4/impl.js',
  './src/ps4/payload.bin',
  './src/ps5/impl.js',
  './src/ps5/kexp.bin',
  './src/ps5/elfldr.elf',
  './src/ps5/nexHEN.elf',
  './src/ps5/relapse.js'
];

self.addEventListener('install', (event) => {
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
  // Pass local payload loader requests (:9021) straight through to network
  if (event.request.url.includes(':9021')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }).catch(() => {
      return caches.match('./index.html');
    })
  );
});
