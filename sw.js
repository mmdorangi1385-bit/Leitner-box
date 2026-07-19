const CACHE_NAME = 'leitner-cache-v7';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-hero.png', './icon-header.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'leitner-daily-reminder') {
    event.waitUntil(
      self.registration.showNotification('جعبه لایتنر', {
        body: 'وقتشه یه دوره تمرین آلمانی داشته باشی!',
        icon: 'icon-192.png',
        badge: 'icon-192.png'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) { if ('focus' in client) return client.focus(); }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
