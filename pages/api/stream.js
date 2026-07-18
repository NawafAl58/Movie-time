// pages/api/stream.js
export const config = {
  api: {
    responseLimit: false, // إلغاء قيود حجم البيانات لضمان استمرار بث الأفلام الطويلة
  },
};

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing stream URL' });
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    // جلب الـ IP الحقيقي الخاص بجهازك (العميل) لمنع حظر Real-Debrid
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // إرسال الطلب إلى Real-Debrid وكأننا المتصفح الخاص بك تماماً
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'X-Forwarded-For': clientIp,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch stream from source' });
    }

    // تمرير الهيدرز الأساسية للفيديو وحقن الـ CORS للسماح للمتصفح بالقراءة
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    const acceptRanges = response.headers.get('accept-ranges');
    if (acceptRanges) {
      res.setHeader('Accept-Ranges', acceptRanges);
    }

    // عمل Pipe للبث المباشر من سيرفر ديبريد إلى متصفحك مباشرة
    if (response.body) {
      const reader = response.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        }
      });

      // تحويل الـ ReadableStream إلى Buffer وإرساله
      const nodeStream = require('stream').Readable.from(stream);
      nodeStream.pipe(res);
    } else {
      res.status(500).json({ error: 'No response body available' });
    }

  } catch (error) {
    console.error('Proxy Stream Error:', error);
    res.status(500).json({ error: 'Internal server error during streaming' });
  }
}
