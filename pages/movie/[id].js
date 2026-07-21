// pages/movie/[id].js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TMDB_API_KEY = 'fe4b6ec1a6183fddf681565506956216';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// 🔑 API Key الخاص بك في Real-Debrid
const RD_API_KEY = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';
const TORRENTIO_BASE_URL = `https://torrentio.strem.fun/realdebrid=${RD_API_KEY}`;

export default function MoviePlayerPage() {
  const router = useRouter();
  const { id, type } = router.query;

  const videoRef = useRef(null);

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
  const [activeStreamUrl, setActiveStreamUrl] = useState('');
  const [loadingStreams, setLoadingStreams] = useState(false);

  // الترجمات
  const [arabicSub, setArabicSub] = useState('');
  const [englishSub, setEnglishSub] = useState('');

  useEffect(() => {
    if (type) setMediaType(type === 'tv' ? 'tv' : 'movie');
  }, [type]);

  // 1️⃣ جلب تفاصيل المادة من TMDB
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
        console.error("Error fetching media details:", err);
      }
    }

    fetchDetails();
  }, [id, mediaType]);

  // 2️⃣ جلب حلقات المسلسلات
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

  // 3️⃣ جلب سيرفرات Real-Debrid وتغليفها برابط الـ Proxy الداخلي
  useEffect(() => {
    if (!imdbId && mediaType !== 'live') return;

    async function fetchRDStreams() {
      setLoadingStreams(true);
      setStreams([]);
      setActiveStreamUrl('');

      let endpoint = mediaType === 'tv'
        ? `${TORRENTIO_BASE_URL}/stream/series/${imdbId}:${selectedSeason}:${selectedEpisode}.json`
        : `${TORRENTIO_BASE_URL}/stream/movie/${imdbId}.json`;

      try {
        const res = await fetch(endpoint);
        const data = await res.json();

        if (data && data.streams && data.streams.length > 0) {
          // تفضيل روابط MP4/H264 وتصفية DV
          const validStreams = data.streams.filter(s => s.url || s.externalUrl);
          setStreams(validStreams);

          if (validStreams.length > 0) {
            const rawUrl = validStreams[0].url || validStreams[0].externalUrl;
            // توجيه الرابط عبر الـ Proxy الداخلي لموقعك
            const proxiedUrl = `/api/stream?url=${encodeURIComponent(rawUrl)}`;
            setActiveStreamUrl(proxiedUrl);
          }
        }
      } catch (err) {
        console.error("Error fetching RD streams:", err);
      }
      setLoadingStreams(false);
    }

    fetchRDStreams();
  }, [imdbId, mediaType, selectedSeason, selectedEpisode]);

  // 4️⃣ جلب الترجمات
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
          const en = data.subtitles.find(s => s.lang === 'eng' || s.lang === 'en');

          setArabicSub(ar?.url || '');
          setEnglishSub(en?.url || '');
        }
      } catch (err) {
        console.warn("Subtitles fetch warning:", err);
      }
    }

    fetchSubtitles();
  }, [imdbId, mediaType, selectedSeason, selectedEpisode]);

  const handleSelectStream = (s) => {
    const rawUrl = s.url || s.externalUrl;
    const proxiedUrl = `/api/stream?url=${encodeURIComponent(rawUrl)}`;
    setActiveStreamUrl(proxiedUrl);
  };

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

      {/* مشغل الفيديو */}
      <div style={{ width: '100%', height: '68vh', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1c1c1c', position: 'relative', marginBottom: '20px' }}>
        {mediaType === 'live' ? (
          <iframe 
            src="https://vidsrc.me/embed/tv" 
            style={{ width: '100%', height: '100%', border: 'none' }} 
            allowFullScreen 
          />
        ) : activeStreamUrl ? (
          <video 
            key={activeStreamUrl}
            ref={videoRef}
            controls 
            autoPlay 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
          >
            <source src={activeStreamUrl} type="video/mp4" />
            
            {arabicSub && (
              <track 
                kind="subtitles" 
                src={arabicSub} 
                srcLang="ar" 
                label="العربية (Arabic)" 
                default 
              />
            )}

            {englishSub && (
              <track 
                kind="subtitles" 
                src={englishSub} 
                srcLang="en" 
                label="English" 
              />
            )}
            Your browser does not support HTML5 video.
          </video>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#888' }}>
            {loadingStreams ? 'Loading Real-Debrid Stream...' : 'No Stream Loaded.'}
          </div>
        )}
      </div>

      {/* التحكم بالمواسم والحلقات للمسلسلات */}
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

      {/* قائمة السيرفرات المتاحة */}
      {mediaType !== 'live' && streams.length > 0 && (
        <div style={{ backgroundColor: '#111', padding: '15px', borderRadius: '10px', border: '1px solid #222' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#aaa' }}>
            Real-Debrid Available Streams ({streams.length}):
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {streams.map((s, idx) => {
              const name = (s.name || '').replace('\n', ' ');
              const title = (s.title || '').split('\n')[0];

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectStream(s)}
                  style={{
                    backgroundColor: '#141414',
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
