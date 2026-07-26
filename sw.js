// نکته‌ی مهم درباره‌ی آپدیت شدن این فایل: مرورگر فقط وقتی چرخه‌ی نصب/فعال‌سازی سرویس‌ورکر رو
// دوباره اجرا می‌کنه که خودِ همین فایل (sw.js) بایت‌به‌بایت عوض بشه. اگه فقط index.html عوض بشه
// ولی این فایل دست‌نخورده بمونه، کاربرهایی که قبلاً اپ رو باز کرده‌ن همچنان نسخه‌ی قدیمیِ
// کش‌شده رو می‌بینن. پس هر بار که تغییر مهمی توی اپ می‌دیم (مثل همین آپدیت نوتیفیکیشن‌ها)،
// باید CACHE_NAME رو عوض کنیم تا کش قدیمی پاک بشه و نسخه‌ی تازه جایگزینش بشه.
const CACHE_NAME = 'leitner-cache-v39';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-hero.png', './icon-header.png', './icon-badge.png', './words_a1.json', './words_a2.json', './words_b1.json', './marketplace.js', './marketplace.css'];

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

// آدرس دیتابیس برای چک‌کردن پیام‌های مدیر در پس‌زمینه (بدون نیاز به لود کامل صفحه/فایربیس SDK).
// نکته: مسیر broadcastNotifications باید توی Security Rules فایربیس اجازه‌ی خوندن عمومی
// (".read": true) داشته باشه، وگرنه این فچ همیشه شکست می‌خوره.
const DB_URL = 'https://leitner-box-644ca-default-rtdb.firebaseio.com';

async function checkBroadcastsInBackground() {
  try {
    const now = Date.now();
    const res = await fetch(`${DB_URL}/broadcastNotifications.json?orderBy=%22sendAt%22&endAt=${now}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;
    const entries = Object.keys(data).map((id) => ({ id, ...data[id] })).filter((x) => x.message);
    for (const item of entries) {
      await self.registration.showNotification('پیام از تیم جعبه لایتنر', {
        body: item.message,
        icon: 'icon-192.png',
        badge: 'icon-badge.png',
        vibrate: [300, 150, 300],
        tag: 'broadcast-' + item.id, // با همین tag، اگه قبلاً نشون داده شده فقط جایگزین می‌شه نه دوباره زنگ/لرزش
        renotify: false,
        data: { url: './index.html' }
      });
    }
  } catch (e) { /* آفلاین یا هر خطای دیگه؛ دفعه‌ی بعد دوباره امتحان می‌شه */ }
}

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
  } else if (event.tag === 'leitner-broadcast-check') {
    event.waitUntil(checkBroadcastsInBackground());
  }
});

// --- نوتیفیکیشن‌های همگانی مدیر (broadcastNotifications) ---
// نکته‌ی مهم: این اپ سرور Push/FCM اختصاصی نداره، پس این‌جا event «push» واقعی هیچ‌وقت شلیک
// نمی‌شه (اون فقط برای وقتیه که یه سرور با Web Push به مرورگر پیام بفرسته حتی وقتی تب/اپ کاملاً
// بسته‌ست). نوتیفیکیشن‌های مدیر فعلاً از داخل صفحه (وقتی اپ باز/در پس‌زمینه‌ی تب فعاله) با
// self.registration.showNotification صدا زده می‌شن — نگاه کن به deliverBroadcast در index.html.
// این handler فقط برای سازگاری با آینده (اگه یه‌روز سرویس Push واقعی اضافه شد) نگه داشته شده.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch (e) { payload = { body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'پیام از تیم جعبه لایتنر', {
      body: payload.body || '',
      icon: 'icon-192.png',
      badge: 'icon-badge.png',
      vibrate: [300, 150, 300],
      data: { url: payload.url || './index.html' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) { if ('focus' in client) return client.focus(); }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
