export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { link } = req.body;

  // جلب المفتاح بأي صيغة تم حفظه بها في Vercel
  const RD_API_KEY = 
    process.env.NEXT_PUBLIC_REAL_DEBRID_API_KEY || 
    process.env.REAL_DEBRID_API_KEY;

  if (!link) {
    return res.status(400).json({ error: 'Missing stream link' });
  }

  if (!RD_API_KEY) {
    return res.status(400).json({ error: 'Real-Debrid API Key is not configured in Vercel environment variables' });
  }

  try {
    const formData = new URLSearchParams();
    formData.append('link', link);

    const rdRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RD_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!rdRes.ok) {
      const errorData = await rdRes.json().catch(() => ({}));
      return res.status(rdRes.status).json({ error: errorData.error || 'Failed to unrestrict link' });
    }

    const data = await rdRes.json();
    return res.status(200).json({ downloadUrl: data.download });
  } catch (error) {
    console.error('RD API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
