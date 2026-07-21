// pages/api/stream.js
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing stream URL' });
  }

  try {
    const targetUrl = decodeURIComponent(url);
    
    // إرسال طلب Range لتوفير التشغيل المباشر والسريع دون انتظار
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await fetch(targetUrl, { headers });

    if (!response.ok && response.status !== 206) {
      return res.status(response.status).send('Failed to fetch stream');
    }

    // تمرير الـ Headers الخاصة بالبث المباشر
    res.status(response.status);
    
    const headersToForward = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
    headersToForward.forEach((h) => {
      if (response.headers.get(h)) {
        res.setHeader(h, response.headers.get(h));
      }
    });

    // تحويل البث مباشرة (Piping/Node Stream) لمنع تعليق الذاكرة والبدء فوراً
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      return res.end();
    } else {
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (error) {
    console.error('Proxy Stream Error:', error);
    return res.status(500).json({ error: 'Stream failed' });
  }
}
