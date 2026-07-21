import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function MoviePlayer() {
  const router = useRouter();
  const { id } = router.query;

  const [movie, setMovie] = useState(null);
  const [streams, setStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Loading movie details...');
  const [copied, setCopied] = useState(false);

  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

  // 1. Fetch Movie Details
  useEffect(() => {
    if (!id) return;

    async function fetchMovieDetails() {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`
        );
        if (!res.ok) throw new Error('Failed to fetch movie data');
        const data = await res.json();
        setMovie(data);
        fetchStreams(data.imdb_id || id);
      } catch (err) {
        console.error(err);
        setStatusText('Failed to load movie details.');
        setLoading(false);
      }
    }

    fetchMovieDetails();
  }, [id]);

  // 2. Fetch Streams from Torrentio
  async function fetchStreams(imdbId) {
    try {
      setStatusText('Searching for streams on Real-Debrid...');
      const torrentioUrl = `https://torrentio.strem.fun/stream/movie/${imdbId}.json`;

      const res = await fetch(torrentioUrl);
      const data = await res.json();

      if (data.streams && data.streams.length > 0) {
        setStreams(data.streams);
        handleSelectStream(data.streams[0]);
      } else {
        setStatusText('No streams available for this movie.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setStatusText('Error fetching streams.');
      setLoading(false);
    }
  }

  // 3. Unrestrict Link via Internal API Route
  async function handleSelectStream(stream) {
    setSelectedStream(stream);
    setLoading(true);
    setDownloadUrl('');
    setStatusText('Unrestricting stream on Real-Debrid...');

    try {
      // استخراج الرابط سواء كان URL جاهز أو Magnet Hash
      let rawStreamLink = stream.url || stream.externalUrl;

      if (!rawStreamLink && stream.infoHash) {
        // تحويل الـ infoHash إلى Magnet Link يفهمه Real-Debrid
        rawStreamLink = `magnet:?xt=urn:btih:${stream.infoHash}`;
      }

      if (!rawStreamLink) {
        throw new Error('No valid URL or Magnet hash found for this stream.');
      }

      const res = await fetch('/api/unrestrict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: rawStreamLink }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to unrestrict link');

      setDownloadUrl(data.downloadUrl);
      setLoading(false);
    } catch (err) {
      console.error('Unrestrict Error:', err);
      setStatusText(`Error: ${err.message}`);
      setLoading(false);
    }
  }

  const copyToClipboard = () => {
    if (!downloadUrl) return;
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Head>
        <title>{movie ? (movie.title || movie.original_title) : 'Cinematrix'}</title>
        <style>{`
          html, body { margin: 0; padding: 0; background-color: #0a0a0a; }
          * { box-sizing: border-box; }
        `}</style>
      </Head>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', background: '#222', padding: '10px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: '22px', color: '#e50914', margin: 0, fontWeight: '700' }}>
            {movie?.title || movie?.original_title}
          </h1>
        </div>

        {/* External Player Control Panel */}
        <div style={{ width: '100%', minHeight: '320px', backgroundColor: '#121212', borderRadius: '12px', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid #222', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
              <p style={{ margin: 0, fontSize: '16px' }}>{statusText}</p>
            </div>
          ) : downloadUrl ? (
            <div style={{ textAlign: 'center', width: '100%', maxWidth: '600px' }}>
              <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Stream Ready!</h2>
              <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '25px' }}>
                Select an external media player to start watching seamlessly without browser limitations.
              </p>

              {/* Player Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                {/* VLC Player */}
                <a
                  href={`vlc://${downloadUrl}`}
                  style={{ backgroundColor: '#ff8800', color: '#fff', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  ▶ Open in VLC
                </a>

                {/* Infuse (iOS / Mac) */}
                <a
                  href={`infuse://x-callback-url/play?url=${encodeURIComponent(downloadUrl)}`}
                  style={{ backgroundColor: '#0070f3', color: '#fff', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  ▶ Open in Infuse
                </a>

                {/* MX Player (Android) */}
                <a
                  href={`intent:${downloadUrl}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;end`}
                  style={{ backgroundColor: '#2e7d32', color: '#fff', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  ▶ Open in MX Player
                </a>
              </div>

              {/* Direct Link / Copy Option */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#aaa', textDecoration: 'underline', fontSize: '13px' }}
                >
                  Direct Stream Link
                </a>
                <span style={{ color: '#444' }}>|</span>
                <button
                  onClick={copyToClipboard}
                  style={{ background: 'none', border: 'none', color: '#e50914', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                >
                  {copied ? '✓ Copied!' : 'Copy Stream URL'}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: '#e50914' }}>{statusText}</p>
          )}
        </div>

        {/* Servers Selection */}
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ fontSize: '16px', color: '#ccc', marginBottom: '15px' }}>
            Available Servers ({streams.length}):
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {streams.map((stream, idx) => {
              const isSelected = selectedStream === stream;
              const title = stream.title || stream.name || `Server ${idx + 1}`;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectStream(stream)}
                  style={{
                    backgroundColor: isSelected ? '#e50914' : '#181818',
                    color: isSelected ? '#fff' : '#aaa',
                    border: isSelected ? '1px solid #e50914' : '1px solid #333',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    maxWidth: '280px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {title.split('\n')[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
