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
  const [statusText, setStatusText] = useState('جاري تحميل بيانات الفيلم والسيرفرات...');

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // مفاتيح API الخاصة بك
  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const RD_API_KEY = process.env.NEXT_PUBLIC_REAL_DEBRID_API_KEY;

  // 1. جلب تفاصيل الفيلم من TMDB
  useEffect(() => {
    if (!id) return;

    async function fetchMovieDetails() {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=ar-SA`
        );
        if (!res.ok) throw new Error('فشل جلب بيانات الفيلم');
        const data = await res.json();
        setMovie(data);
        fetchStreams(data.imdb_id || id);
      } catch (err) {
        console.error(err);
        setStatusText('تعذر جلب تفاصيل الفيلم.');
        setLoading(false);
      }
    }

    fetchMovieDetails();
  }, [id]);

  // 2. جلب سيرفرات Torrentio مع تصفية جودات 4K/Cam لإظهار 1080p المتوافقة
  async function fetchStreams(imdbId) {
    try {
      setStatusText('جاري البحث عن السيرفرات المتاحة...');
      
      // استبعاد الكاميرا والجودات الثقيلة لضمان ظهور 1080p و 720p السريعة
      const TORRENTIO_CONFIG = 'qualityfilter=scr,cam,3d,4k';
      const torrentioUrl = `https://torrentio.strem.fun/${TORRENTIO_CONFIG}|realdebrid=${RD_API_KEY}/stream/movie/${imdbId}.json`;

      const res = await fetch(torrentioUrl);
      const data = await res.json();

      if (data.streams && data.streams.length > 0) {
        setStreams(data.streams);
        // اختيار أول سيرفر تلقائياً
        handleSelectStream(data.streams[0]);
      } else {
        setStatusText('لم يتم العثور على سيرفرات متاحة لهذا الفيلم.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setStatusText('حدث خطأ أثناء البحث عن السيرفرات.');
      setLoading(false);
    }
  }

  // 3. معالجة السيرفر المختار وفك تشفيره من جانب العميل لتفادي IP-Lock
  async function handleSelectStream(stream) {
    setSelectedStream(stream);
    setLoading(true);
    setStatusText('جاري فك تشفير الرابط وتحضير البث المباشر...');

    try {
      const rawStreamLink = stream.url || stream.externalUrl;

      // استخدام corsproxy لتفادي حظر الـ CORS من المتصفح
      const targetApi = encodeURIComponent('https://api.real-debrid.com/rest/1.0/unrestrict/link');
      const formData = new FormData();
      formData.append('link', rawStreamLink);

      const unrestrictRes = await fetch(`https://corsproxy.io/?${targetApi}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RD_API_KEY}`
        },
        body: formData
      });

      if (!unrestrictRes.ok) throw new Error(`خطأ سيرفر Real-Debrid: ${unrestrictRes.status}`);

      const rdData = await unrestrictRes.json();
      const fileId = rdData.id;
      const directLink = rdData.download;

      // محاولة جلب رابط Transcode (H.264/LiveMP4) لضمان التشغيل على جميع المتصفحات
      try {
        const transcodeApi = encodeURIComponent(`https://api.real-debrid.com/rest/1.0/streaming/transcode/${fileId}`);
        const transcodeRes = await fetch(`https://corsproxy.io/?${transcodeApi}`, {
          headers: {
            'Authorization': `Bearer ${RD_API_KEY}`
          }
        });

        if (transcodeRes.ok) {
          const transData = await transcodeRes.json();
          // اختيار صيغة MP4 المباشرة والمتوافقة
          const compatibleUrl = transData.fullHD?.liveMP4 || transData.apple?.fullHD || transData.liveMP4 || transData.hd?.liveMP4;

          if (compatibleUrl) {
            setActiveUrl(compatibleUrl);
            setIsHls(compatibleUrl.includes('.m3u8'));
            setLoading(false);
            return;
          }
        }
      } catch (transcodeErr) {
        console.warn('Transcode fallback:', transcodeErr);
      }

      // في حال عدم توفر Transcode يتم تشغيل الرابط المباشر
      setActiveUrl(directLink);
      setIsHls(directLink.includes('.m3u8'));
      setLoading(false);

    } catch (err) {
      console.error('Streaming Error:', err);
      setStatusText(`تعذر تشغيل الفيديو: ${err.message}`);
      setLoading(false);
    }
  }

  // 4. إعداد مشغل HLS.js
  useEffect(() => {
    if (!activeUrl || !videoRef.current) return;

    if (isHls) {
      import('hls.js').then((HlsModule) => {
        const Hls = HlsModule.default;
        if (Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });

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
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [activeUrl, isHls]);

  return (
    <div style={{ backgroundColor: '#111', color: '#fff', minHeight: '100vh', padding: '20px' }}>
      <Head>
        <title>{movie ? movie.title : 'جاري التحميل...'} - Cinematrix</title>
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', background: '#222', padding: '8px 16px', borderRadius: '4px' }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: '20px', color: '#e50914', margin: 0 }}>
            {movie?.title || movie?.original_title}
          </h1>
        </div>

        {/* مشغل الفيديو */}
        <div style={{ width: '100%', height: '500px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#ccc', padding: '20px' }}>
              <p>{statusText}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              controls
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* قائمة السيرفرات */}
        <div style={{ marginTop: '20px' }}>
          <h3>Real-Debrid Servers ({streams.length}):</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
            {streams.map((stream, idx) => {
              const isSelected = selectedStream === stream;
              const title = stream.title || stream.name || `Server ${idx + 1}`;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectStream(stream)}
                  style={{
                    backgroundColor: isSelected ? '#e50914' : '#222',
                    color: '#fff',
                    border: '1px solid #444',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    maxWidth: '300px',
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
