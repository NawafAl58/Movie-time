// pages/movie/[id].js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TMDB_API_KEY = 'fe4b6ec1a6183fddf681565506956216';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// 🔴 ضع الـ API Token الخاص بك هنا
const RD_API_KEY = 'YOUR_REAL_DEBRID_API_KEY';
const TORRENTIO_BASE_URL = RD_API_KEY && RD_API_KEY !== 'YOUR_REAL_DEBRID_API_KEY'
  ? `https://torrentio.strem.fun/realdebrid=${RD_API_KEY}`
  : 'https://torrentio.strem.fun';

export default function MoviePlayerPage() {
  const router = useRouter();
  const { id, type } = router.query;

  const [mediaType, setMediaType] = useState(type === 'tv' ? 'tv' : 'movie');
  const [details, setDetails] = useState(null);
  const [imdbId, setImdbId] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  // إدارة الجودات والسيرفرات المفلترة
  const [groupedQualityStreams, setGroupedQualityStreams] = useState({});
  const [availableQualities, setAvailableQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('');
  const [activeStreamUrl, setActiveStreamUrl] = useState('');
  const [loadingStreams, setLoadingStreams] = useState(false);

  // الترجمات المحولة إلى Blob URLs
  const [arabicSubBlob, setArabicSubBlob] = useState('');
  const [englishSubBlob, setEnglishSubBlob] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    if (type) setMediaType(type === 'tv' ? 'tv' : 'movie');
  }, [type]);

  // 1️⃣ جلب تفاصيل المادة
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

  // 3️⃣ جلب وتصفية وتجميع السيرفرات حسب الجودة تلقائياً
  useEffect(() => {
    if (!imdbId && mediaType !== 'live') return;

    async function fetchRDStreams() {
      setLoadingStreams(true);
      setGroupedQualityStreams({});
      setAvailableQualities([]);
      setActiveStreamUrl('');

      let endpoint = mediaType === 'tv'
        ? `${TORRENTIO_BASE_URL}/stream/series/${imdbId}:${selectedSeason}:${selectedEpisode}.json`
        : `${TORRENTIO_BASE_URL}/stream/movie/${imdbId}.json`;

      try {
        const res = await fetch(endpoint);
        const data = await res.json();

        if (data && data.streams && data.streams.length > 0) {
          const qualityGroups = {};

          data.streams.forEach(stream => {
            const fullText = `${stream.name || ''} ${stream.title || ''}`.toLowerCase();
            
            // تحديد الجودة
            let quality = '720p';
            if (fullText.includes('4k') || fullText.includes('2160p')) quality = '4K';
            else if (fullText.includes('1440p') || fullText.includes('2k')) quality = '2K';
            else if (fullText.includes('1080p')) quality = '1080p';
            else if (fullText.includes('720p')) quality = '720p';
            else if (fullText.includes('480p') || fullText.includes('360p')) quality = '480p';

            // تجنب صيغ DV المصنوعة خصيصاً للشاشات المعقدة إن أمكن لتفادي الشاشة السوداء
            const isDV = fullText.includes(' dv ') || fullText.includes('dolby vision');
            
            if (!qualityGroups[quality]) {
              qualityGroups[quality] = [];
            }

            // ترتيب السيرفرات داخل الجودة بتفضيل السريعة (Cached Real-Debrid)
            if (!isDV) {
              qualityGroups[quality].unshift(stream);
            } else {
              qualityGroups[quality].push(stream);
            }
          });

          const qualitiesOrder = ['4K', '2K', '1080p', '720p', '480p'];
          const existingQualities = qualitiesOrder.filter(q => qualityGroups[q] && qualityGroups[q].length > 0);

          setGroupedQualityStreams(qualityGroups);
          setAvailableQualities(existingQualities);

          // اختيار أفضل جودة وسيرفر تلقائياً (تفضيل 1080p أو 4K)
          const defaultQuality = existingQualities.includes('1080p') ? '1080p' : existingQualities[0];
          if (defaultQuality) {
            setSelectedQuality(defaultQuality);
            const bestStream = qualityGroups[defaultQuality][0];
            const url = bestStream.url || (bestStream.infoHash ? `https://torrentio.strem.fun/realdebrid/${bestStream.infoHash}` : '');
            setActiveStreamUrl(url);
          }
        }
      } catch (err) {
        console.error("Error fetching streams:", err);
      }
      setLoadingStreams(false);
    }

    fetchRDStreams();
  }, [imdbId, mediaType, selectedSeason, selectedEpisode]);

  // 4️⃣ جلب وتحويل الترجمات إلى Blob WebVTT لتشغيلها المباشر بدون مشاكل CORS
  useEffect(() => {
    if (!imdbId) return;

    async function fetchAndConvertSubtitles() {
      try {
        let subEndpoint = mediaType === 'tv'
          ? `https://opensubtitles-v3.strem.fun/subtitles/series/${imdbId}:${selectedSeason}:${selectedEpisode}.json`
          : `https://opensubtitles-v3.strem.fun/subtitles/movie/${imdbId}.json`;

        const res = await fetch(subEndpoint);
        const data = await res.json();

        if (data && data.subtitles) {
          const loadSubBlob = async (subObj, setBlobState) => {
            if (!subObj || !subObj.url) {
              setBlobState('');
              return;
            }
            try {
              const subRes = await fetch(subObj.url);
              let text = await subRes.text();

              // تحويل صيغة SRT إلى WebVTT إذا تطلب الأمر
              if (!text.startsWith('WEBVTT')) {
                text = 'WEBVTT\n\n' + text
                  .replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2')
                  .replace(/\{\\([a-zA-Z0-9]+)\}/g, '');
              }

              const blob = new Blob([text], { type: 'text/vtt;charset=utf-8' });
              const blobUrl = URL.createObjectURL(blob);
              setBlobState(blobUrl);
            } catch (e) {
              console.error("Failed to load subtitle content:", e);
              setBlobState('');
            }
          };

          const arSub = data.subtitles.find(s => s.lang === 'ara' || s.lang === 'ar');
          const enSub = data.subtitles.find(s => s.lang === 'eng' || s.lang === 'en');

          await loadSubBlob(arSub, setArabicSubBlob);
          await loadSubBlob(enSub, setEnglishSubBlob);
        }
      } catch (err) {
        console.error("Subtitles error:", err);
      }
    }

    fetchAndConvertSubtitles();
  }, [imdbId, mediaType, selectedSeason, selectedEpisode]);

  // التبديل بين الجودات المتاحة
  const handleQualityChange = (quality) => {
    setSelectedQuality(quality);
    const streamsList = groupedQualityStreams[quality];
    if (streamsList && streamsList.length > 0) {
      const bestStream = streamsList[0];
      const url = bestStream.url || (bestStream.infoHash ? `https://torrentio.strem.fun/realdebrid/${bestStream.infoHash}` : '');
      setActiveStreamUrl(url);
    }
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

      {/* مشغل الفيديو الشامل مع شاشات الجودة والترجمة المصححة */}
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
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
          >
            <source src={activeStreamUrl} type="video/mp4" />
            
            {/* 🔴 الترجمة العربية المصححة عبر Blob VTT */}
            {arabicSubBlob && (
              <track 
                kind="subtitles" 
                src={arabicSubBlob} 
                srcLang="ar" 
                label="العربية (Arabic)" 
                default 
              />
            )}

            {/* 🔵 الترجمة الإنجليزية المصححة */}
            {englishSubBlob && (
              <track 
                kind="subtitles" 
                src={englishSubBlob} 
                srcLang="en" 
                label="English" 
              />
            )}
            Your browser does not support HTML5 video.
          </video>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#888' }}>
            {loadingStreams ? 'Finding Best Fast Stream...' : 'No streams available.'}
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

      {/* أزرار اختيار الجودة النظيفة (بدون تكرار أو ازدحام) */}
      {mediaType !== 'live' && availableQualities.length > 0 && (
        <div style={{ backgroundColor: '#111', padding: '15px', borderRadius: '10px', border: '1px solid #222' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#aaa' }}>
            Select Quality (Auto-selected Best Server):
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {availableQualities.map((quality) => {
              const isSelected = selectedQuality === quality;
              return (
                <button
                  key={quality}
                  onClick={() => handleQualityChange(quality)}
                  style={{
                    backgroundColor: isSelected ? '#e50914' : '#141414',
                    color: 'white',
                    border: isSelected ? '1px solid #e50914' : '1px solid #333',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: '0.2s'
                  }}
                >
                  {quality} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
