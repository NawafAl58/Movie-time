export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { link } = req.body || {};
    const RD_API_KEY =
      process.env.REAL_DEBRID_API_KEY ||
      process.env.NEXT_PUBLIC_REAL_DEBRID_API_KEY;

    if (!link) {
      return res.status(400).json({ error: 'Missing stream link' });
    }

    if (!RD_API_KEY) {
      return res.status(400).json({ error: 'REAL_DEBRID_API_KEY is not set.' });
    }

    const authHeaders = {
      'Authorization': `Bearer ${RD_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // A. Magnet Links
    if (typeof link === 'string' && link.startsWith('magnet:')) {
      const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
        method: 'POST',
        headers: authHeaders,
        body: new URLSearchParams({ magnet: link }).toString(),
      });

      const addData = await addRes.json().catch(() => ({}));

      if (!addRes.ok) {
        return res.status(400).json({ error: addData.error || 'Failed to add magnet.' });
      }

      const torrentId = addData.id;

      // Select all files
      await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
        method: 'POST',
        headers: authHeaders,
        body: new URLSearchParams({ files: 'all' }).toString(),
      });

      // Get torrent details
      const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
        headers: { 'Authorization': `Bearer ${RD_API_KEY}` },
      });

      const infoData = await infoRes.json().catch(() => ({}));

      if (infoData.files && infoData.files.length > 0) {
        // البحث عن أكبر ملف فيديو داخل التورنت (لتجنب ملفات العينات Sample أو الملفات الملحقة)
        const videoFiles = infoData.files.filter(f => 
          f.path.match(/\.(mp4|mkv|avi|mov)$/i)
        );
        
        // فرز الملفات حسب الحجم تنازلياً
        videoFiles.sort((a, b) => b.bytes - a.bytes);

        const targetFile = videoFiles[0] || infoData.files[0];
        
        // البحث عن الرابط المقابل للملف المطلوب
        const fileIndex = infoData.files.findIndex(f => f.id === targetFile.id);
        const targetLink = infoData.links[fileIndex] || infoData.links[0];

        if (targetLink) {
          const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
            method: 'POST',
            headers: authHeaders,
            body: new URLSearchParams({ link: targetLink }).toString(),
          });

          const finalData = await unrestrictRes.json().catch(() => ({}));

          if (!unrestrictRes.ok) {
            return res.status(400).json({ error: finalData.error || 'Failed to unrestrict link.' });
          }

          return res.status(200).json({ downloadUrl: finalData.download });
        }
      }

      return res.status(400).json({ error: 'No streamable video files found in torrent.' });
    } 
    
    // B. Direct Links
    else {
      const rdRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
        method: 'POST',
        headers: authHeaders,
        body: new URLSearchParams({ link }).toString(),
      });

      const data = await rdRes.json().catch(() => ({}));

      if (!rdRes.ok) {
        return res.status(400).json({ error: data.error || 'Failed to unrestrict link.' });
      }

      return res.status(200).json({ downloadUrl: data.download });
    }

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
