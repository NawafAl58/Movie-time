export default async function handler(req, res) {
  // 1. Ensure method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { link } = req.body || {};
    const RD_API_KEY =
      process.env.NEXT_PUBLIC_REAL_DEBRID_API_KEY ||
      process.env.REAL_DEBRID_API_KEY;

    if (!link) {
      return res.status(400).json({ error: 'Missing stream link.' });
    }

    if (!RD_API_KEY) {
      return res.status(400).json({ error: 'Real-Debrid API Key is not configured in Vercel.' });
    }

    const authHeaders = {
      'Authorization': `Bearer ${RD_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Case A: Magnet Links
    if (typeof link === 'string' && link.startsWith('magnet:')) {
      const addMagnetBody = new URLSearchParams({ magnet: link });
      const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
        method: 'POST',
        headers: authHeaders,
        body: addMagnetBody.toString(),
      });

      const addData = await addRes.json().catch(() => ({}));

      if (!addRes.ok) {
        if (addData.error === 'infringing_file') {
          return res.status(400).json({ error: 'This file is blocked by Real-Debrid due to DMCA. Please try another server.' });
        }
        return res.status(400).json({ error: addData.error || 'Failed to add magnet to Real-Debrid.' });
      }

      const torrentId = addData.id;

      // Select all files
      const selectFileBody = new URLSearchParams({ files: 'all' });
      await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
        method: 'POST',
        headers: authHeaders,
        body: selectFileBody.toString(),
      });

      // Get torrent info
      const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
        headers: { 'Authorization': `Bearer ${RD_API_KEY}` },
      });

      const infoData = await infoRes.json().catch(() => ({}));

      if (infoData.links && infoData.links.length > 0) {
        const targetLink = infoData.links[0];
        const unrestrictBody = new URLSearchParams({ link: targetLink });
        const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
          method: 'POST',
          headers: authHeaders,
          body: unrestrictBody.toString(),
        });

        const finalData = await unrestrictRes.json().catch(() => ({}));
        if (!unrestrictRes.ok) {
          return res.status(400).json({ error: finalData.error || 'Failed to unrestrict link.' });
        }

        return res.status(200).json({ downloadUrl: finalData.download });
      } else {
        return res.status(400).json({ error: 'Torrent is still caching on Real-Debrid. Select another server.' });
      }
    } 
    
    // Case B: Direct HTTP/HTTPS Links
    else {
      const formData = new URLSearchParams({ link });
      const rdRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
        method: 'POST',
        headers: authHeaders,
        body: formData.toString(),
      });

      const data = await rdRes.json().catch(() => ({}));

      if (!rdRes.ok) {
        if (data.error === 'infringing_file') {
          return res.status(400).json({ error: 'This file is blocked by Real-Debrid due to DMCA. Please try another server.' });
        }
        return res.status(rdRes.status || 400).json({ error: data.error || 'Failed to unrestrict link.' });
      }

      return res.status(200).json({ downloadUrl: data.download });
    }

  } catch (err) {
    console.error('API Error:', err);
    // Always return valid JSON even on unexpected errors
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
