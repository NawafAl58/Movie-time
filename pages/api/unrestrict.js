export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { link } = req.body;
  const RD_API_KEY =
    process.env.NEXT_PUBLIC_REAL_DEBRID_API_KEY ||
    process.env.REAL_DEBRID_API_KEY;

  if (!link) {
    return res.status(400).json({ error: 'Missing stream link' });
  }

  if (!RD_API_KEY) {
    return res.status(400).json({ error: 'Real-Debrid API Key is missing' });
  }

  try {
    const authHeaders = {
      'Authorization': `Bearer ${RD_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // 1. إذا كان الرابط Magnet Link
    if (link.startsWith('magnet:')) {
      // أ) إضافة الـ Magnet إلى حساب Real-Debrid
      const addMagnetBody = new URLSearchParams({ magnet: link });
      const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
        method: 'POST',
        headers: authHeaders,
        body: addMagnetBody.toString(),
      });

      if (!addRes.ok) {
        const errData = await addRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to add magnet to Real-Debrid');
      }

      const addData = await addRes.json();
      const torrentId = addData.id;

      // ب) تحديد كل الملفات لبدء الكاش
      const selectFileBody = new URLSearchParams({ files: 'all' });
      await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
        method: 'POST',
        headers: authHeaders,
        body: selectFileBody.toString(),
      });

      // ج) جلب تفاصيل التورنت للحصول على رابط التحميل المفكوك
      const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
        headers: { 'Authorization': `Bearer ${RD_API_KEY}` },
      });

      const infoData = await infoRes.json();

      if (infoData.links && infoData.links.length > 0) {
        // فك تشفير أول رابط من التورنت
        const targetLink = infoData.links[0];
        const unrestrictBody = new URLSearchParams({ link: targetLink });
        const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
          method: 'POST',
          headers: authHeaders,
          body: unrestrictBody.toString(),
        });

        const finalData = await unrestrictRes.json();
        return res.status(200).json({ downloadUrl: finalData.download });
      } else {
        throw new Error('Torrent is still downloading or no downloadable links generated.');
      }
    } 
    
    // 2. إذا كان الرابط عادي (HTTP/HTTPS)
    else {
      const formData = new URLSearchParams({ link });
      const rdRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
        method: 'POST',
        headers: authHeaders,
        body: formData.toString(),
      });

      if (!rdRes.ok) {
        const errorData = await rdRes.json().catch(() => ({}));
        return res.status(rdRes.status).json({ error: errorData.error || 'Failed to unrestrict link' });
      }

      const data = await rdRes.json();
      return res.status(200).json({ downloadUrl: data.download });
    }

  } catch (error) {
    console.error('RD API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
