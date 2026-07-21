import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function MoviePlayer() {
  const router = useRouter();
  const { id } = router.query;

  const [movie, setMovie] = useState(null);
  const [streams, setStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [isHls, setIsHls] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Loading movie data...');

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const RD_API_KEY = process.env.NEXT_PUBLIC_REAL_DEBRID_API_KEY;

  // 1. Fetch Movie Details (En-US)
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

  // 2. Fetch Torrentio Streams (Filtered for better compatibility)
  async function fetchStreams(imdbId) {
    try {
      setStatusText('Fetching available servers...');
      // Filter out heavy formats to get web-compatible streams first
      const TORRENTIO_CONFIG = 'qualityfilter=scr,cam,3d';
      const torrentioUrl = `https://torrentio.strem.fun/${TORRENTIO_CONFIG}|realdebrid=${RD_API_KEY}/stream/movie/${imdbId}.json`;

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

  // 3. Process Stream with Real-Debrid Transcode / Direct Fallback
  async function handleSelectStream(stream) {
    setSelectedStream(stream);
    setLoading(true);
    setStatusText('Unrestricting stream link...');

    try {
      const rawStreamLink = stream.url || stream.externalUrl;

      // 3.1 Unrestrict Raw Link
      const targetApi = encodeURIComponent('https://api.real-debrid.com/rest/1.0/unrestrict/link');
      const formData = new FormData();
      formData.append('link', rawStreamLink);

      const unrestrictRes = await fetch(`https://corsproxy.io/?${targetApi}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RD_API_KEY}` },
        body: formData
      });

      if (!unrestrictRes.ok) throw new Error(`Real-Debrid Unrestrict Error: ${unrestrictRes.status}`);

      const rdData = await unrestrictRes.json();
      const fileId = rdData.id;
      const directLink = rdData.download;

      // 3.2 Try to Fetch H.264 Transcoded Streaming Endpoint (Fixes Black Screen)
      try {
        setStatusText('Preparing web-compatible video stream...');
        const transcodeApi = encodeURIComponent(`https://api.real-debrid.com/rest/1.0/streaming/transcode/${fileId}`);
        const transRes = await fetch(`https://corsproxy.io/?${transcodeApi}`, {
          headers: { 'Authorization': `Bearer ${RD_API_KEY}` }
        });

        if (transRes.ok) {
          const transData = await transRes.json();
          // Pick H.264 compatible live MP4 stream
          const webPlayableUrl = 
            transData.fullHD?.liveMP4 || 
            transData.hd?.liveMP4 || 
            transData.apple?.fullHD || 
            transData.liveMP4;

          if (webPlayableUrl) {
            setActiveUrl(webPlayableUrl);
            setIsHls(webPlayableUrl.includes('.m3u8'));
            setLoading(false);
            return;
          }
        }
      } catch (transcodeErr) {
        console.warn('Transcode unavailable, falling back to direct link:', transcodeErr);
      }

      // 3.3 Fallback to direct link
      setActiveUrl(directLink);
      setIsHls(directLink.endsWith('.m3u8'));
      setLoading(false);

    } catch (err) {
      console.error('Streaming Error:', err);
      setStatusText(`Playback Error: ${err.message}`);
      setLoading(false);
    }
  }

  // 4. Attach Player & Handle HLS
  useEffect(() => {
    if (!activeUrl || !videoRef.current) return;

    if (isHls) {
      import('hls.js').then((HlsModule) => {
        const Hls = HlsModule.default;
        if (Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();

          const hls = new Hls({ enableWorker: true });
          hls.loadSource(activeUrl);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoRef.current.play().catch(() => {});
          });

          hlsRef.current = hls;
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = activeUrl;
          videoRef.current.play().catch(() => {});
        }
      });
    } else {
      videoRef.current.src = activeUrl;
      videoRef.current.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [activeUrl, isHls]);

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Head>
        <title>{movie ? (movie.title || movie.original_title) : 'Cinematrix'}</title>
        <style>{`
          html, body { margin: 0; padding: 0; background-color: #0a0a0a; }
          * { box-sizing: border-box; }
        `}</style>
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', background: '#222', padding: '10px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: '22px', color: '#e50914', margin: 0, fontWeight: '700' }}>
            {movie?.title || movie?.original_title}
          </h1>
        </div>

        {/* Video Player */}
        <div style={{ width: '100%', height: '560px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid #222' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>⏳</div>
              <p style={{ margin: 0, fontSize: '14px' }}>{statusText}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* Server Selection */}
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
