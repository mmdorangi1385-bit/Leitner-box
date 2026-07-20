// پراکسی دستیار هوش مصنوعی «جعبه لایتنر»
// این Worker کلید Gemini رو سمت سرور نگه می‌داره؛ کد اپ (index.html) دیگه هیچ کلیدی نداره.
// دیپلوی: با Wrangler روی Cloudflare Workers (رایگان).

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

// آدرس (های) واقعی که این اپ روشون سرو می‌شه رو اینجا بذار (بدون اسلش آخر).
// فقط درخواست‌هایی که Origin شون توی همین لیسته پاسخ می‌گیرن.
const ALLOWED_ORIGINS = [
  'https://mmdorangi1385-bit.github.io', // <-- این رو با آدرس واقعی گیت‌هاب‌پیجزت عوض کن
  'http://localhost:3000', // برای تست لوکال؛ اگه لازم نیست حذفش کن
];

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function errorJson(message, status, origin) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // درخواست preflight مرورگر
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return errorJson('فقط درخواست POST پشتیبانی می‌شه.', 405, origin);
    }

    // محدودیت نرخ ساده به‌ازای هر IP (ضد سوءاستفاده؛ بایندینگ AI_RATE_LIMITER توی wrangler.toml تعریف شده)
    if (env.AI_RATE_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.AI_RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return errorJson('تعداد درخواست‌ها زیاد بوده؛ کمی صبر کن و دوباره امتحان کن.', 429, origin);
      }
    }

    if (!env.GEMINI_API_KEY) {
      return errorJson('کلید Gemini روی سرور تنظیم نشده (wrangler secret put GEMINI_API_KEY).', 500, origin);
    }

    let body;
    try {
      body = await request.text();
    } catch (e) {
      return errorJson('درخواست نامعتبر بود.', 400, origin);
    }

    let geminiRes;
    try {
      geminiRes = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body,
      });
    } catch (e) {
      return errorJson('ارتباط با سرویس هوش مصنوعی برقرار نشد.', 502, origin);
    }

    // پاسخ Gemini رو عیناً (همون شکل JSON) به کلاینت برمی‌گردونیم تا کد فعلی اپ بدون تغییر بمونه.
    const responseBody = await geminiRes.text();
    return new Response(responseBody, {
      status: geminiRes.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  },
};
