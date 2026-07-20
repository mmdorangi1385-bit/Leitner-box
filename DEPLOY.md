# راه‌اندازی پراکسی دستیار هوش مصنوعی (Cloudflare Workers)

با این کار، کلید Gemini سمت سرور (نه توی کد اپ) نگه داشته می‌شه و کاربرا هیچ‌وقت لازم نیست کلیدی وارد کنن.

## چیزهایی که لازم داری
- یه حساب رایگان Cloudflare: https://dash.cloudflare.com/sign-up
- Node.js نصب‌شده روی سیستمت (برای اجرای دستور `npx`)
- یه کلید Gemini رایگان از https://aistudio.google.com/apikey (همون که قبلاً داشتی هم کار می‌کنه)

## مراحل

### ۱) نصب Wrangler و ورود
```bash
npm install -g wrangler
wrangler login
```
یه تب مرورگر باز می‌شه؛ با حساب Cloudflare‌ت وارد شو.

### ۲) آماده‌سازی پوشه پروژه Worker
یه پوشه جدید (مثلاً `my-ai-proxy`) بساز و دو فایل `worker.js` و `wrangler.toml` رو داخلش بذار.

### ۳) آدرس اپت رو توی worker.js تنظیم کن
فایل `worker.js` رو باز کن و خط زیر رو با آدرس واقعی گیت‌هاب‌پیجزت جایگزین کن:
```js
const ALLOWED_ORIGINS = [
  'https://YOUR-GITHUB-USERNAME.github.io', // <-- اینجا
  'http://localhost:3000',
];
```
نکته: فقط `https://username.github.io` رو بنویس (بدون مسیر بعدش)، چون مرورگر برای Origin فقط پروتکل+دامنه رو می‌فرسته، نه مسیر ریپو.

### ۴) کلید Gemini رو به‌صورت secret اضافه کن
داخل همون پوشه:
```bash
wrangler secret put GEMINI_API_KEY
```
وقتی خواست، کلید Gemini‌ت رو پیست کن و Enter بزن. این کلید فقط سمت Cloudflare ذخیره می‌شه، هیچ‌جای کد دیده نمی‌شه.

### ۵) دیپلوی
```bash
wrangler deploy
```
در پایان یه آدرس شبیه این بهت می‌ده:
```
https://my-ai-proxy.YOUR-SUBDOMAIN.workers.dev
```
این آدرس رو کپی کن.

### ۶) آدرس رو توی اپ بذار
فایل `index.html` رو باز کن، دنبال این خط بگرد (نزدیک ابتدای فایل) و آدرس واقعی Worker رو جایگزین کن:
```js
const AI_PROXY_URL = 'https://my-ai-proxy.YOUR-SUBDOMAIN.workers.dev';
```

### ۷) آپلود روی GitHub Pages
تغییرات (`index.html` و `sw.js`) رو commit و push کن، مثل همیشه.

## تست
اپ رو باز کن، دستیار هوشمند رو بزن و یه پیام بفرست. اگه پیغام «تعداد درخواست‌ها زیاد بوده» دیدی یعنی محدودیت نرخ (پیش‌فرض ۳۰ درخواست در دقیقه به‌ازای هر IP) فعاله؛ توی `wrangler.toml` قابل تغییره.

## اگه چیزی خراب شد
- **خطای CORS توی کنسول مرورگر**: یعنی آدرس توی `ALLOWED_ORIGINS` با آدرس واقعی سایتت یکی نیست.
- **دیپلوی به‌خاطر بخش `[[ratelimits]]` خطا داد**: اون بلوک رو از `wrangler.toml` پاک کن و دوباره `wrangler deploy` بزن؛ محدودیت نرخ اختیاریه.
- **بعد از دیپلوی موفق، دستیار جواب نمی‌ده**: با `wrangler tail` لاگ زنده‌ی Worker رو ببین تا خطای دقیق رو پیدا کنی. همچنین مطمئن شو اسم پروژه توی `wrangler.toml` (فیلد `name`) با چیزی که توی `AI_PROXY_URL` داخل `index.html` نوشتی یکی باشه — چون آدرس Worker از همین اسم ساخته می‌شه.
