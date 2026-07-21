// pages/api/stream.js
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing stream URL' });
  }

  try {
    const response = await fetch(decodeURIComponent(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch stream');
    }

    // نقل الـ Headers الخاصة بالفيديو للمتصفح
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    if (response.headers.get('content-length')) {
      res.setHeader('Content-Length', response.headers.get('content-length'));
    }
    res.setHeader('Accept-Ranges', 'bytes');

    // تحويل الـ Stream مباشرة للمتصفح
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Stream proxy failed' });
  }
}
