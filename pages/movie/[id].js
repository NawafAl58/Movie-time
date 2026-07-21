// pages/movie/[id].js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TMDB_API_KEY = 'fe4b6ec1a6183fddf681565506956216';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default function MoviePlayerPage() {
  const router = useRouter();
  const { id, type } = router.query; // type: 'movie' or 'tv' or 'live'

  const [details, setDetails] = useState(null);
  const [imdbId, setImdbId] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  // السيرفرات والجودات
  const [streams, setStreams] = useState([]);
  const [activeStreamUrl, setActiveStreamUrl] = useState('');
  const [activeQuality, setActiveQuality] = useState('');
  const [loadingStreams, setLoadingStreams] = useState(false);

  // الترجمات (عربي + إنجليزي)
  const [arabicSubUrl, setArabicSubUrl] = useState('');
  const [englishSubUrl, setEnglishSubUrl] = useState('');
  const videoRef = useRef(null);

  // 1️⃣ جلب تفاصيل الفيلم/المسلسل لمعرفة IMDb ID
  useEffect(() => {
    if (!id || type === 'live') return;

    async function fetchDetails() {
      const mediaType = type === 'tv' ? 'tv' : 'movie';
      try {
        const res = await fetch(`${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`);
        const data = await res.json();
        setDetails(data);

        const fetchedImdbId = data.external_ids?.imdb_id || data.imdb_id;
        setImdbId(fetchedImdbId);

        if (mediaType === 'tv' && data.seasons) {
          setSeasons(data.seasons.filter(s => s.season_number > 0));
        }
      } catch (err) {
        console.error("Error fetching media details:", err);
      }
    }

    fetchDetails();
  }, [id, type]);

  // 2️⃣ جلب حلقات الموسم المحدد للمسلسلات
  useEffect(() => {
    if (type !== 'tv' || !id || !selectedSeason) return;

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
  }, [id, type, selectedSeason]);

  // 3️⃣ جلب روابط Real-Debrid وتصفيتها لتفادي بطء الفريمات
  useEffect(() => {
    if (!imdbId && type !== 'live') return;

    async function fetchRDStreams() {
      setLoadingStreams(true);
      setStreams([]);
      setActiveStreamUrl('');

      let endpoint = '';
      if (type === 'tv') {
        endpoint = `https://torrentio.strem.fun/stream/series/${imdbId}:${selectedSeason}:${selectedEpisode}.json`;
      } else {
        endpoint = `https://torrentio.strem.fun/stream/movie/${imdbId}.json`;
      }

      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data && data.streams && data.streams.length > 0) {
          // ترتيب السيرفرات لتقديم H.264 لتشغيل سلس بدون تقطيع فريمات
          const sortedStreams = [...data.streams].sort((a, b) => {
            const titleA = (a.name + ' ' + (a.title || '')).toLowerCase();
            const titleB = (b.name + ' ' + (b.title || '')).toLowerCase();
            
            const isHevcA = titleA.includes('hevc') || titleA.includes('h265') || titleA.includes('x265');
            const isHevcB = titleB.includes('hevc') || titleB.includes('h265') || titleB.includes('x265');

            if (isHevcA && !isHevcB) return 1;
            if (!isHevcA && isHevcB) return -1;
            return 0;
          });

          setStreams(sortedStreams);
          const firstStream = sortedStreams[0];
          const url = firstStream.url || (firstStream.infoHash ? `https://torrentio.strem.fun/realdebrid/${firstStream.infoHash}` : '');
          setActiveStreamUrl(url);
          setActiveQuality(firstStream.name || firstStream.title || 'Auto');
        }
      } catch (err) {
        console.error("Error fetching RD streams:", err);
      }
      setLoadingStreams(false);
    }

    fetchRDStreams();
  }, [imdbId, type, selectedSeason, selectedEpisode]);

  // 4️⃣ جلب الترجمات العربية والإنجليزية تلقائياً
  useEffect(() => {
    if (!imdbId) return;

    async function fetchSubtitles() {
      try {
        let subEndpoint = `https://opensubtitles-v3.strem.fun/subtitles/movie/${imdbId}.json`;
        if (type === 'tv') {
          subEndpoint = `https://opensubtitles-v3.strem.fun/subtitles/series/${imdbId}:${selectedSeason}:${selectedEpisode}.json`;
        }

        const res = await fetch(subEndpoint);
        const data = await res.json();

        if (data && data.subtitles) {
          // البحث عن الترجمة العربية
          const arabicSub = data.subtitles.find(s => s.lang === 'ara' || s.lang === 'ar');
          if (arabicSub && arabicSub.url) {
            setArabicSubUrl(arabicSub.url);
          } else {
            setArabicSubUrl('');
          }

          // البحث عن الترجمة الإنجليزية
          const englishSub = data.subtitles.find(s => s.lang === 'eng' || s.lang === 'en');
          if (englishSub && englishSub.url) {
            setEnglishSubUrl(englishSub.url);
          } else {
            setEnglishSubUrl('');
          }
        }
      } catch (err) {
        console.error("Subtitles fetch error:", err);
        setArabicSubUrl('');
        setEnglishSubUrl('');
      }
    }

    fetchSubtitles();
  }, [imdbId, type, selectedSeason, selectedEpisode]);

  const handleSelectStream = (stream) => {
    const url = stream.url || (stream.infoHash ? `https://torrentio.strem.fun/realdebrid/${stream.infoHash}` : '');
    setActiveStreamUrl(url);
    setActiveQuality(stream.name || stream.title || 'Selected');
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px' }}>
      <Head>
        <title>{details ? (details.title || details.name) : 'Player'} - CINEMA MATRIX</title>
      </Head>

      {/* الهيدر وزر العودة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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

      {/* مشغل الفيديو الرئيسي */}
      <div style={{ width: '100%', height: '65vh', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', border: '1px solid #222', position: 'relative', marginBottom: '20px' }}>
        {type === 'live' ? (
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
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          >
            <source src={activeStreamUrl} type="video/mp4" />
            
            {/* 🔴 مسار الترجمة العربية */}
            {arabicSubUrl && (
              <track 
                kind="subtitles" 
                src={arabicSubUrl} 
                srcLang="ar" 
                label="العربية (Arabic)" 
                default 
              />
            )}

            {/* 🔵 مسار الترجمة الإنجليزية */}
            {englishSubUrl && (
              <track 
                kind="subtitles" 
                src={englishSubUrl} 
                srcLang="en" 
                label="English" 
              />
            )}
            Your browser does not support HTML5 video.
          </video>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#888' }}>
            {loadingStreams ? 'Loading Streams & Subtitles...' : 'No stream available. Select a quality below.'}
          </div>
        )}
      </div>

      {/* التحكم بالمواسم والحلقات للمسلسلات */}
      {type === 'tv' && seasons.length > 0 && (
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

      {/* اختيارات الجودة وسيرفرات Real-Debrid المتاحة */}
      {type !== 'live' && (
        <div style={{ backgroundColor: '#111', padding: '15px', borderRadius: '10px', border: '1px solid #222' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#aaa' }}>
            Available Qualities & Servers:
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {streams.map((stream, idx) => {
              const qualityLabel = stream.name || stream.title || `Server ${idx + 1}`;
              const isSelected = activeQuality === qualityLabel;

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectStream(stream)}
                  style={{
                    backgroundColor: isSelected ? '#e50914' : '#141414',
                    color: 'white',
                    border: '1px solid #333',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  {qualityLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
