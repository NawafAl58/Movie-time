// pages/movie/[id].js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TMDB_API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export default function MovieDetail() {
  const router = useRouter();
  const { id, type } = router.query;
  
  const [movieData, setMovieData] = useState(null);
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState('');
  const [qualityOptions, setQualityOptions] = useState([]);
  const [rdStatus, setRdStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeServer, setActiveServer] = useState('debrid');
  const [loading, setLoading] = useState(true);

  // حالة الموسم والحلقة التفصيلية
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [episodesList, setEpisodesList] = useState([]);

  const videoRef = useRef(null);

  // 1️⃣ جلب تفاصيل المسلسل/الفيلم من TMDB باللغة الأصلية (en-US)
  useEffect(() => {
    if (!id) return;

    async function fetchMetadata() {
      const isTv = type === 'tv';
      const finalType = isTv ? 'tv' : 'movie';

      try {
        const res = await fetch(`${TMDB_BASE_URL}/${finalType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=en-US`);
        if (res.ok) {
          const data = await res.json();
          setMovieData(data);
        }
      } catch (e) {
        console.error("TMDB Fetch Error:", e);
      }
    }

    fetchMetadata();
  }, [id, type]);

  // 2️⃣ جلب حلقات الموسم باللغة الإنجليزية/الأصلية
  useEffect(() => {
    if (!id || (type !== 'tv' && movieData?.media_type_fixed !== 'tv')) return;

    async function fetchSeasonEpisodes() {
      try {
        const res = await fetch(`${TMDB_BASE_URL}/tv/${id}/season/${season}?api_key=${TMDB_API_KEY}&language=en-US`);
        if (res.ok) {
          const sData = await res.json();
          if (sData.episodes) {
            setEpisodesList(sData.episodes);
          }
        }
      } catch (e) {
        console.error("Season Episodes Error:", e);
      }
    }

    fetchSeasonEpisodes();
  }, [id, type, season, movieData]);

  // 3️⃣ جلب روابط Real-Debrid
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function fetchStreamData() {
      setLoading(true);
      setRdStatus('loading');
      setErrorMessage('');

      const isTv = type === 'tv' || movieData?.number_of_seasons > 0;
      const finalType = isTv ? 'tv' : 'movie';

      try {
        const imdbId = movieData?.external_ids?.imdb_id;

        if (imdbId) {
          const queryTarget = isTv ? `${imdbId}:${season}:${episode}` : imdbId;
          const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${DEBRID_API_TOKEN}/stream/${finalType}/${queryTarget}.json`;

          const tRes = await fetch(torrentioUrl);

          if (tRes.ok) {
            const tData = await tRes.json();
            if (tData?.streams?.length > 0) {
              const validStreams = tData.streams.filter(s => s.url && s.url.startsWith('http'));

              const mappedQualities = [];
              const seenLabels = new Set();

              const getQualityLabel = (stream) => {
                const text = ((stream.title || '') + " " + (stream.name || '')).toLowerCase();
                if (text.includes('4k') || text.includes('2160p')) return '4K';
                if (text.includes('1440p') || text.includes('2k')) return '2K (1440p)';
                if (text.includes('1080p')) return '1080p';
                if (text.includes('720p')) return '720p';
                return 'SD (أقل من 720p)';
              };

              validStreams.forEach(stream => {
                const label = getQualityLabel(stream);
                if (!seenLabels.has(label)) {
                  seenLabels.add(label);
                  mappedQualities.push({ label, url: stream.url });
                }
              });

              if (isMounted && mappedQualities.length > 0) {
                setQualityOptions(mappedQualities);
                setResolvedStreamUrl(mappedQualities[0].url);
                setRdStatus('ready');
                setActiveServer('debrid');
                setLoading(false);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.error("Stream Fetch Error:", err);
      }

      if (isMounted) {
        setRdStatus('failed');
        setErrorMessage('تعذر العثور على رابط Real-Debrid.');
        setActiveServer('vidsrc_cc');
        setLoading(false);
      }
    }

    if (movieData) {
      fetchStreamData();
    }

    return () => { isMounted = false; };
  }, [id, type, season, episode, movieData]);

  if (loading && !movieData) {
    return (
      <div style={{ color: 'white', backgroundColor: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl' }}>
        <h3 style={{ color: '#e50914' }}>🍿 Loading...</h3>
      </div>
    );
  }

  const isTvShow = (type === 'tv' || movieData?.number_of_seasons > 0);
  const displayTitle = movieData ? (movieData.title || movieData.name) : 'Watch Now 📺';

  const embedUrl = isTvShow 
    ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`
    : `https://vidsrc.cc/v2/embed/movie/${id}`;

  const servers = {
    vidsrc_cc: embedUrl,
    vidsrc_to: isTvShow ? `https://vidsrc.to/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.to/embed/movie/${id}`,
    vidlink: isTvShow ? `https://vidlink.pro/embed/tv/${id}/${season}/${episode}` : `https://vidlink.pro/embed/movie/${id}`,
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl', boxSizing: 'border-box' }}>
      <Head>
        <title>{displayTitle} - SimplStream</title>
        {/* إخفاء وتغميق شريط التمرير والحواف البيضاء */}
        <style>{`
          html, body {
            background-color: #050505 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden;
          }
          ::-webkit-scrollbar {
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #050505;
          }
          ::-webkit-scrollbar-thumb {
            background: #222;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #e50914;
          }
        `}</style>
      </Head>

      <button onClick={() => router.push('/')} style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
        ← العودة للرئيسية
      </button>

      {movieData && (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <img src={movieData.poster_path ? `https://image.tmdb.org/t/p/w300${movieData.poster_path}` : 'https://via.placeholder.com/300x450'} alt={displayTitle} style={{ borderRadius: '12px', width: '220px', objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{ fontSize: '36px', color: '#e50914', margin: '0 0 10px 0', fontWeight: 'bold' }}>{displayTitle}</h1>
            <p style={{ color: '#aaa', fontSize: '14px' }}>Release Date: {movieData.release_date || movieData.first_air_date} | ⭐ {movieData.vote_average?.toFixed(1)}</p>
            
            <div style={{ margin: '15px 0', padding: '10px 15px', backgroundColor: '#111', borderRight: '4px solid #e50914', fontSize: '13px', color: '#e50914', fontWeight: 'bold' }}>
              حقوق النشر والتشغيل محفوظة لـ: Anonymous
            </div>
            
            <p style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '10px', color: '#ddd' }}>{movieData.overview || "No description available."}</p>
          </div>
        </div>
      )}

      {/* 📺 اختيار الموسم والحلقة للمسلسلات */}
      {isTvShow && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #222', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#e50914' }}>📅 Season:</span>
            <select 
              value={season} 
              onChange={(e) => {
                setSeason(Number(e.target.value));
                setEpisode(1);
              }}
              style={{ padding: '8px 12px', backgroundColor: '#222', color: 'white', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {Array.from({ length: movieData?.number_of_seasons || 1 }, (_, i) => i + 1).map((sNum) => (
                <option key={sNum} value={sNum}>
                  Season {sNum}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#e50914' }}>🎬 Episode:</span>
            <select 
              value={episode} 
              onChange={(e) => setEpisode(Number(e.target.value))}
              style={{ padding: '8px 12px', backgroundColor: '#222', color: 'white', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {episodesList.length > 0 ? (
                episodesList.map((ep) => (
                  <option key={ep.episode_number} value={ep.episode_number}>
                    Episode {ep.episode_number} - {ep.name || `Episode ${ep.episode_number}`}
                  </option>
                ))
              ) : (
                <option value={1}>Episode 1</option>
              )}
            </select>
          </div>

        </div>
      )}

      {/* 🎬 اختيار الجودة */}
      {activeServer === 'debrid' && qualityOptions.length > 0 && (
        <div style={{ marginBottom: '15px', backgroundColor: '#111', padding: '12px 18px', borderRadius: '8px', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', color: '#e50914' }}>⚙️ Quality:</span>
          <select 
            value={resolvedStreamUrl}
            onChange={(e) => {
              const newUrl = e.target.value;
              setResolvedStreamUrl(newUrl);
              if (videoRef.current) {
                videoRef.current.src = newUrl;
                videoRef.current.play();
              }
            }}
            style={{ padding: '8px 16px', backgroundColor: '#222', color: 'white', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', outline: 'none' }}
          >
            {qualityOptions.map((q, idx) => (
              <option key={idx} value={q.url}>
                {q.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* أزرار السيرفرات */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
        <button 
          onClick={() => setActiveServer('debrid')}
          disabled={rdStatus !== 'ready'}
          style={{
            padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', 
            cursor: rdStatus === 'ready' ? 'pointer' : 'not-allowed',
            backgroundColor: activeServer === 'debrid' ? '#e50914' : '#111',
            color: rdStatus === 'ready' ? '#fff' : '#666',
            border: '1px solid #333'
          }}
        >
          💎 Premium {rdStatus === 'failed' && `(${errorMessage || 'غير متاح'})`}
        </button>
        
        <button onClick={() => setActiveServer('vidsrc_cc')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_cc' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 1</button>
        <button onClick={() => setActiveServer('vidsrc_to')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_to' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 2</button>
        <button onClick={() => setActiveServer('vidlink')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidlink' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 3</button>
      </div>

      {/* منطقة المشغل */}
      <div style={{ backgroundColor: '#000', padding: '15px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <div style={{ position: 'relative', width: '100%', minHeight: '60vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {activeServer === 'debrid' && resolvedStreamUrl ? (
            <video 
              ref={videoRef}
              controls 
              autoPlay
              playsInline 
              style={{ width: '100%', height: '60vh', borderRadius: '8px', backgroundColor: '#000' }}
            >
              <source src={resolvedStreamUrl} />
            </video>
          ) : (
            <iframe 
              src={servers[activeServer]} 
              style={{ width: '100%', height: '65vh', border: 'none' }} 
              allowFullScreen 
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          )}
        </div>
      </div>
    </div>
  );
}
