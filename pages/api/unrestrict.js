// رفع مهلة التنفيذ لـ Vercel للتعامل مع الـ Magnets بدون انقطاع
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
      return res.status(400).json({ error: 'REAL_DEBRID_API_KEY is not set in Vercel Environment Variables.' });
    }

    const authHeaders = {
      'Authorization': `Bearer ${RD_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // A. Magnet Links Handling
    if (typeof link === 'string' && link.startsWith('magnet:')) {
      const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
        method: 'POST',
        headers: authHeaders,
        body: new URLSearchParams({ magnet: link }).toString(),
      });

      const addData = await addRes.json().catch(() => ({}));

      if (!addRes.ok) {
        return res.status(400).json({ 
          error: addData.error === 'infringing_file' 
            ? 'This file is blocked by DMCA.' 
            : (addData.error || 'Failed to add magnet.') 
        });
      }

      const torrentId = addData.id;

      // Select files
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

      if (infoData.links && infoData.links.length > 0) {
        const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
          method: 'POST',
          headers: authHeaders,
          body: new URLSearchParams({ link: infoData.links[0] }).toString(),
        });

        const finalData = await unrestrictRes.json().catch(() => ({}));

        if (!unrestrictRes.ok) {
          return res.status(400).json({ error: finalData.error || 'Failed to unrestrict generated link.' });
        }

        return res.status(200).json({ downloadUrl: finalData.download });
      } else {
        return res.status(400).json({ error: 'Torrent is still downloading/caching on Real-Debrid.' });
      }
    } 
    
    // B. Direct Links Handling
    else {
      const rdRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
        method: 'POST',
        headers: authHeaders,
        body: new URLSearchParams({ link }).toString(),
      });

      const data = await rdRes.json().catch(() => ({}));

      if (!rdRes.ok) {
        return res.status(400).json({ 
          error: data.error === 'infringing_file' 
            ? 'This file is blocked by DMCA.' 
            : (data.error || 'Failed to unrestrict link.') 
        });
      }

      return res.status(200).json({ downloadUrl: data.download });
    }

  } catch (err) {
    console.error('Unhandled API Error:', err);
    return res.status(500).json({ error: err.message || 'Server Internal Error' });
  }
}
