// pages/movie/[id].js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Hls from 'hls.js';

// 🔑 مفاتيح الـ API الخاصة بك
const TMDB_API_KEY = 'fe4b6ec1a6183fddf681565506956216';
const RD_API_KEY = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RD_API_BASE = 'https://api.real-debrid.com/rest/1.0';

const TORRENTIO_CONFIG = 'sort=qualitysize|qualityfilter=scr,cam,3d';
const TORRENTIO_BASE_URL = `https://torrentio.strem.fun/${TORRENTIO_CONFIG}|realdebrid=${RD_API_KEY}`;

// ---------------------------------------------------------------------------
// 🎥 مشغل الفيديو المحسّن (Client-Side RD + H.264 Transcode + HLS Tuning)
// ---------------------------------------------------------------------------
function DedicatedMediaPlayer({ rdApiKey, rawStreamLink, subtitleSrc }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('جاري تهيئة البث...');
  const [activeUrl, setActiveUrl] = useState(null);
  const [isHls, setIsHls] = useState(false);

  // 1. طلب البث من جانب العميل ليتطابق مع الـ IP وتحويل الترميز إلى H.264
  useEffect(() => {
    if (!rawStreamLink || !rdApiKey) return;

    async function processStreamClientSide() {
      try {
        setLoading(true);
        setStatusText('جاري فك تشفير الرابط عبر اتصال الجهاز...');

        const formData = new FormData();
        formData.append('link', rawStreamLink);

        const unrestrictRes = await fetch(`${RD_API_BASE}/unrestrict/link`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${rdApiKey}` },
          body: formData
        });

        if (!unrestrictRes.ok) throw new Error(`خطأ في السيرفر: ${unrestrictRes.status}`);

        const rdData = await unrestrictRes.json();
        const fileId = rdData.id;
        const directLink = rdData.download;

        setStatusText('جاري اختيار أفضل ترميز للتسريع العتادي (60fps)...');

        try {
          const transcodeRes = await fetch(`${RD_API_BASE}/streaming/transcode/${fileId}`, {
            headers: { 'Authorization': `Bearer ${rdApiKey}` }
          });

          if (transcodeRes.ok) {
            const transData = await transcodeRes.json();
            const h264Url = transData.fullHD?.liveMP4 || transData.apple?.fullHD || transData.liveMP4;

            if (h264Url) {
              setActiveUrl(h264Url);
              setIsHls(true);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Transcode fallback:', e);
        }

        setActiveUrl(directLink);
        setIsHls(directLink.includes('.m3u8'));
        setLoading(false);

      } catch (err) {
        console.error('Streaming Error:', err);
        setStatusText(`تعذر تشغيل الفيديو: ${err.message}`);
        setLoading(false);
      }
    }

    processStreamClientSide();
  }, [rawStreamLink, rdApiKey]);

  // 2. إعدادات HLS.JS وضبط المسار الصوتي لـ AAC Stereo
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !activeUrl) return;

    videoElement.preload = 'metadata';

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        const tracks = hls.audioTracks;
        if (tracks && tracks.length > 0) {
          const stereoIndex = tracks.findIndex(t =>
            (t.name && t.name.toLowerCase().includes('stereo')) ||
            (t.lang && t.lang.toLowerCase().includes('2ch')) ||
            t.channels === 2
          );
          hls.audioTrack = stereoIndex !== -1 ? stereoIndex : 0;
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play().catch(() => {});
      });

      return () => hls.destroy();
    } else {
      videoElement.src = activeUrl;
      videoElement.play().catch(() => {});
    }
  }, [activeUrl, isHls]);

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#000000', position: 'relative' }}>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
          <p style={{ fontSize: '1rem', fontWeight: 'bold' }}>{statusText}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          controls
          playsInline
          webkit-playsinline="true"
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
  );
}

// ---------------------------------------------------------------------------
// 📄 الصفحة الرئيسية للمحتوى
// ---------------------------------------------------------------------------
export default function MoviePlayerPage() {
  const router = useRouter();
  const { id, type } = router.query;

  const [mediaType, setMediaType] = useState(type === 'tv' ? 'tv' : 'movie');
  const [details, setDetails] = useState(null);
  const [imdbId, setImdbId] = useState(null);

  // المسلسلات
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  // السيرفرات
  const [streams, setStreams] = useState([]);
  const [activeRawStreamUrl, setActiveRawStreamUrl] = useState('');
  const [loadingStreams, setLoadingStreams] = useState(false);

  // الترجمة
  const [arabicSubBlob, setArabicSubBlob] = useState('');

  useEffect(() => {
    if (type) setMediaType(type === 'tv' ? 'tv' : 'movie');
  }, [type]);

  // 1️⃣ جلب بيانات الفيلم/المسلسل من TMDB
  useEffect(() => {
    if (!id || mediaType === 'live') return;

    async function fetchDetails() {
      try {
        const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`);
        const data = await res.json();
        setDetails(data);

        const fetchedImdbId = data.external_ids?.imdb_id || data.imdb_id;
        setImdbId(fetchedImdbId);

        if (mediaType === 'tv' && data.seasons) {
          const validSeasons = data.seasons.filter(s => s.season_number > 0);
          setSeasons(validSeasons);
          if (validSeasons.length > 0) setSelectedSeason(validSeasons[0].season_number);
        }
      } catch (err) {
        console.error("Error fetching TMDB details:", err);
      }
    }

    fetchDetails();
  }, [id, mediaType]);

  // 2️⃣ جلب حلقات المسلسل
  useEffect(() => {
    if (mediaType !== 'tv' || !id || !selectedSeason) return;

    async function fetchEpisodes() {
      try {
        const res = await fetch(`${TMDB_BASE_URL}/tv/${id}/season/${selectedSeason}?api_key=${TMDB_API_KEY}`);
        const data = await res.json();
        setEpisodes(data.episodes || []);
        if (data.episodes && data.episodes.length > 0) {
          setSelectedEpisode(data.episodes[0].episode_number);
        }
      } catch (err) {
        console.error("Error fetching episodes:", err);
      }
    }

    fetchEpisodes();
  }, [id, mediaType, selectedSeason]);

  // 3️⃣ جلب سيرفرات Torrentio/Real-Debrid
  useEffect(() => {
    if (!imdbId && mediaType !== 'live') return;

    async function fetchRDStreams() {
      setLoadingStreams(true);
      setStreams([]);
      setActiveRawStreamUrl('');

      let endpoint = mediaType === 'tv'
        ? `${TORRENTIO_BASE_URL}/stream/series/${imdbId}:${selectedSeason}:${selectedEpisode}.json`
        : `${TORRENTIO_BASE_URL}/stream/movie/${imdbId}.json`;

      try {
        const res = await fetch(endpoint);
        const data = await res.json();

        if (data && data.streams && data.streams.length > 0) {
          const cleanStreams = data.streams.filter(s => s.url || s.externalUrl).slice(0, 8);
          setStreams(cleanStreams);

          if (cleanStreams.length > 0) {
            setActiveRawStreamUrl(cleanStreams[0].url || cleanStreams[0].externalUrl);
          }
        }
      } catch (err) {
        console.error("Error fetching RD streams:", err);
      }
      setLoadingStreams(false);
    }

    fetchRDStreams();
  }, [imdbId, mediaType, selectedSeason, selectedEpisode]);

  // 4️⃣ جلب الترجمة وتحويلها إلى VTT Blob
  useEffect(() => {
    if (!imdbId) return;

    async function fetchSubtitles() {
      try {
        let subEndpoint = mediaType === 'tv'
          ? `https://opensubtitles.strem.fun/subtitles/series/${imdbId}:${selectedSeason}:${selectedEpisode}.json`
          : `https://opensubtitles.strem.fun/subtitles/movie/${imdbId}.json`;

        const res = await fetch(subEndpoint);
        if (!res.ok) return;
        const data = await res.json();

        if (data && data.subtitles) {
          const ar = data.subtitles.find(s => s.lang === 'ara' || s.lang === 'ar');
          if (ar?.url) {
            const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(ar.url)}`;
            const subRes = await fetch(corsProxyUrl);
            let text = await subRes.text();

            if (!text.startsWith('WEBVTT')) {
              text = 'WEBVTT\n\n' + text.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
            }

            const blob = new Blob([text], { type: 'text/vtt;charset=utf-8' });
            setArabicSubBlob(URL.createObjectURL(blob));
          }
        }
      } catch (err) {
        console.warn("Subtitles warning:", err);
      }
    }

    fetchSubtitles();
  }, [imdbId, mediaType, selectedSeason, selectedEpisode]);

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px' }}>
      <Head>
        <title>{details ? (details.title || details.name) : 'Player'} - CINEMA MATRIX</title>
      </Head>

      {/* الهيدر */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← Back
        </button>
        <h1 style={{ color: '#e50914', margin: 0, fontSize: '22px' }}>
          {details ? (details.title || details.name) : 'Live Stream'}
        </h1>
      </div>

      {/* حاوية الفيديو والمشغل المحسّن */}
      <div style={{ width: '100%', height: '68vh', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1c1c1c', marginBottom: '20px' }}>
        {activeRawStreamUrl ? (
          <DedicatedMediaPlayer 
            rdApiKey={RD_API_KEY} 
            rawStreamLink={activeRawStreamUrl} 
            subtitleSrc={arabicSubBlob} 
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#888' }}>
            {loadingStreams ? 'جاري جلب السيرفرات...' : 'لم يتم اختيار سيرفر.'}
          </div>
        )}
      </div>

      {/* اختيار مواسم وحلقات المسلسل */}
      {mediaType === 'tv' && seasons.length > 0 && (
        <div style={{ marginBottom: '20px', backgroundColor: '#111', padding: '15px', borderRadius: '10px', border: '1px solid #222' }}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 'bold', color: '#e50914' }}>Season:</label>
            <select 
              value={selectedSeason} 
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              style={{ backgroundColor: '#141414', color: 'white', border: '1px solid #333', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}
            >
              {seasons.map(s => (
                <option key={s.id} value={s.season_number}>{s.name || `Season ${s.season_number}`}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
            {episodes.map(e => (
              <button 
                key={e.id}
                onClick={() => setSelectedEpisode(e.episode_number)}
                style={{ 
                  backgroundColor: selectedEpisode === e.episode_number ? '#e50914' : '#141414', 
                  color: 'white', 
                  border: '1px solid #333', 
                  padding: '8px 14px', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                E{e.episode_number}: {e.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* قائمة السيرفرات */}
      {mediaType !== 'live' && streams.length > 0 && (
        <div style={{ backgroundColor: '#111', padding: '15px', borderRadius: '10px', border: '1px solid #222' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#aaa' }}>
            Real-Debrid Servers ({streams.length}):
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {streams.map((s, idx) => {
              const rawUrl = s.url || s.externalUrl;
              const isSelected = activeRawStreamUrl === rawUrl;
              const name = (s.name || '').replace('\n', ' ');
              const title = (s.title || '').split('\n')[0];

              return (
                <button
                  key={idx}
                  onClick={() => setActiveRawStreamUrl(rawUrl)}
                  style={{
                    backgroundColor: isSelected ? '#e50914' : '#141414',
                    color: 'white',
                    border: '1px solid #333',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {name} - {title.slice(0, 25)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
