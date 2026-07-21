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
  const [subtitleSrc, setSubtitleSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Loading movie...');

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

  // 1. Fetch Movie Info & Subtitles
  useEffect(() => {
    if (!id) return;

    async function fetchMovieDetails() {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`
        );
        if (!res.ok) throw new Error('Failed to fetch movie details');
        const data = await res.json();
        setMovie(data);
        
        if (data.imdb_id) {
          fetchSubtitles(data.imdb_id);
        }

        fetchStreams(data.imdb_id || id);
      } catch (err) {
        console.error(err);
        setStatusText('Failed to load movie details.');
        setLoading(false);
      }
    }

    fetchMovieDetails();
  }, [id]);

  // Arabic Subtitles Fetcher
  async function fetchSubtitles(imdbId) {
    try {
      const subRes = await fetch(`https://v3-cinemeta.strem.fun/subtitles/movie/${imdbId}.json`);
      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.subtitles && subData.subtitles.length > 0) {
          const arSub = subData.subtitles.find(
            (s) => s.lang === 'ara' || s.lang === 'ar' || s.id?.includes('ara')
          );
          if (arSub && arSub.url) {
            setSubtitleSrc(arSub.url);
          }
        }
      }
    } catch (e) {
      console.log('Subtitles search error:', e);
    }
  }

  // 2. Fetch Clean Single-Movie Streams Only
  async function fetchStreams(imdbId) {
    try {
      setStatusText('Finding web-compatible servers...');
      const torrentioUrl = `https://torrentio.strem.fun/qualityfilter=4k,scr,cam|sort=quality/stream/movie/${imdbId}.json`;

      const res = await fetch(torrentioUrl);
      const data = await res.json();

      if (data.streams && data.streams.length > 0) {
        // فلترة النسخ التي تحتوي على حزم كاملة أو أكياس تسبب مشاكل
        const cleanStreams = data.streams.filter(s => {
          const title = (s.title || s.name || '').toLowerCase();
          return !title.includes('pack') && !title.includes('collection') && !title.includes('nominees');
        });

        const finalStreamsList = cleanStreams.length > 0 ? cleanStreams : data.streams;
        setStreams(finalStreamsList);
        handleSelectStream(finalStreamsList[0], 0, finalStreamsList);
      } else {
        setStatusText('No streams found for this title.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setStatusText('Error loading streams.');
      setLoading(false);
    }
  }

  // 3. Unrestrict Link (Limited Retries to Prevent Rate Limit)
  async function handleSelectStream(stream, currentIndex = 0, currentStreamsList = streams, retryCount = 0) {
    const listToUse = currentStreamsList.length > 0 ? currentStreamsList : streams;
    setSelectedStream(stream);
    setLoading(true);
    setVideoSrc('');
    setStatusText(`Connecting to server ${currentIndex + 1}...`);

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

      if (!res.ok) {
        // تجربة بحد أقصى 3 سيرفرات متتالية فقط لتجنب الـ Rate Limit
        if (retryCount < 2 && currentIndex + 1 < listToUse.length) {
          setStatusText(`Server ${currentIndex + 1} unavailable. Trying next server...`);
          setTimeout(() => {
            handleSelectStream(listToUse[currentIndex + 1], currentIndex + 1, listToUse, retryCount + 1);
          }, 1500); // مهلة 1.5 ثانية للـ API
          return;
        } else {
          throw new Error('Server unavailable. Please manually select another server below.');
        }
      }

      setVideoSrc(data.downloadUrl);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setStatusText(err.message || 'Error preparing video.');
      setLoading(false);
    }
  }

  // 4. Attach Stream to HTML5 Video
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', background: '#222', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: '20px', color: '#e50914', margin: 0, fontWeight: '700' }}>
            {movie?.title || movie?.original_title}
          </h1>
        </div>

        {/* Video Player Frame */}
        <div style={{ width: '100%', height: '540px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #222', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎬</div>
              <p style={{ margin: 0, fontSize: '15px', color: '#ccc' }}>{statusText}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            >
              {subtitleSrc && (
                <track
                  kind="subtitles"
                  src={subtitleSrc}
                  srcLang="ar"
                  label="العربية"
                  default
                />
              )}
            </video>
          )}
        </div>

        {/* External Player Buttons */}
        {!loading && videoSrc && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
            <a
              href={`vlc://${videoSrc}`}
              style={{ backgroundColor: '#ff8800', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px' }}
            >
              ▶ Open in VLC
            </a>
            <a
              href={`infuse://x-callback-url/play?url=${encodeURIComponent(videoSrc)}`}
              style={{ backgroundColor: '#0070f3', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px' }}
            >
              ▶ Open in Infuse (iPad)
            </a>
          </div>
        )}

        {/* Available Servers Grid */}
        <div style={{ marginTop: '25px' }}>
          <h3 style={{ fontSize: '15px', color: '#ccc', marginBottom: '12px' }}>
            Available Servers ({streams.length}):
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {streams.map((stream, idx) => {
              const isSelected = selectedStream === stream;
              const title = stream.title || stream.name || `Server ${idx + 1}`;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectStream(stream, idx, streams, 0)}
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
