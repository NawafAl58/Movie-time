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
  const [videoSrc, setVideoSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Loading movie...');

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

  // 1. Fetch Movie Info
  useEffect(() => {
    if (!id) return;

    async function fetchMovieDetails() {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`
        );
        if (!res.ok) throw new Error('Failed to fetch movie');
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

  // 2. Fetch Compatible Web Streams Only (Filtered for 1080p/720p)
  async function fetchStreams(imdbId) {
    try {
      setStatusText('Finding web-compatible servers (1080p/720p)...');
      
      // Filter out heavy 4K/x265 formats that break browser playback
      const torrentioUrl = `https://torrentio.strem.fun/qualityfilter=4k,scr,cam|sort=quality/stream/movie/${imdbId}.json`;

      const res = await fetch(torrentioUrl);
      const data = await res.json();

      if (data.streams && data.streams.length > 0) {
        setStreams(data.streams);
        handleSelectStream(data.streams[0]);
      } else {
        setStatusText('No web-compatible streams found.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setStatusText('Error loading streams.');
      setLoading(false);
    }
  }

  // 3. Unrestrict Link for Direct Web Playback
  async function handleSelectStream(stream) {
    setSelectedStream(stream);
    setLoading(true);
    setVideoSrc('');
    setStatusText('Preparing video for in-browser playback...');

    try {
      let rawStreamLink = stream.url || stream.externalUrl;
      if (!rawStreamLink && stream.infoHash) {
        rawStreamLink = `magnet:?xt=urn:btih:${stream.infoHash}`;
      }

      const res = await fetch('/api/unrestrict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: rawStreamLink }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to unrestrict');

      setVideoSrc(data.downloadUrl);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setStatusText(err.message || 'Error preparing video.');
      setLoading(false);
    }
  }

  // 4. Attach Stream to Native HTML5 Player
  useEffect(() => {
    if (!videoSrc || !videoRef.current) return;

    if (videoSrc.endsWith('.m3u8')) {
      import('hls.js').then((HlsModule) => {
        const Hls = HlsModule.default;
        if (Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();
          const hls = new Hls();
          hls.loadSource(videoSrc);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoRef.current.play().catch(() => {});
          });
          hlsRef.current = hls;
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = videoSrc;
          videoRef.current.play().catch(() => {});
        }
      });
    } else {
      videoRef.current.src = videoSrc;
      videoRef.current.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [videoSrc]);

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Head>
        <title>{movie ? (movie.title || movie.original_title) : 'Cinematrix'}</title>
        <style>{`
          html, body { margin: 0; padding: 0; background-color: #0a0a0a; }
          * { box-sizing: border-box; }
        `}</style>
      </Head>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', background: '#222', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: '20px', color: '#e50914', margin: 0, fontWeight: '700' }}>
            {movie?.title || movie?.original_title}
          </h1>
        </div>

        {/* Browser Video Player Frame */}
        <div style={{ width: '100%', height: '540px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #222', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎬</div>
              <p style={{ margin: 0, fontSize: '15px' }}>{statusText}</p>
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

        {/* Web Compatible Servers List */}
        <div style={{ marginTop: '25px' }}>
          <h3 style={{ fontSize: '15px', color: '#ccc', marginBottom: '12px' }}>
            Available Web Servers ({streams.length}):
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    maxWidth: '260px',
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
