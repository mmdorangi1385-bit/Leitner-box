const CACHE_NAME = 'leitner-cache-v19';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-hero.png', './icon-header.png', './icon-badge.png', './words_beginner.json', './words_a1.json', './words_a2.json', './words_b1.json'];

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
  // فقط فایل‌های خود اپ رو کش کن؛ درخواست‌های دامنه‌های دیگه (مثل دانلود مدل هوش مصنوعی
  // آفلاین از CDN) رو دست‌نخورده بذار چون خودشون جداگانه در Cache Storage مدیریت می‌شن.
  if (new URL(event.request.url).origin !== self.location.origin) return;
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

const REMINDER_MESSAGES = [
  'پاشو بیا تنبل خان وقت حفظ کردنه',
  'یه سرم به ما بزن بذار یکم خوش بگذره',
  'موفقیت رو از دست نده، از همین الان شروع کن',
];
function pickReminderMessage() { return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)]; }

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'leitner-daily-reminder') {
    event.waitUntil(
      self.registration.showNotification('جعبه لایتنر', {
        body: pickReminderMessage(),
        icon: 'icon-192.png',
        badge: 'icon-badge.png',
        vibrate: [300, 150, 300]
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
