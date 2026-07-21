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

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  const videoRef = useRef(null);
  const plyrInstance = useRef(null);

  // تهيئة وربط مشغل Plyr مع معالجة الأخطاء
  useEffect(() => {
    if (activeServer === 'debrid' && resolvedStreamUrl && videoRef.current) {
      if (!document.getElementById('plyr-css')) {
        const link = document.createElement('link');
        link.id = 'plyr-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.plyr.io/3.7.8/plyr.css';
        document.head.appendChild(link);
      }

      const initPlyr = () => {
        if (window.Plyr && videoRef.current) {
          if (plyrInstance.current) plyrInstance.current.destroy();
          plyrInstance.current = new window.Plyr(videoRef.current, {
            controls: [
              'play-large', 'play', 'progress', 'current-time', 
              'duration', 'mute', 'volume', 'captions', 'settings', 
              'pip', 'fullscreen'
            ],
            settings: ['captions', 'quality', 'speed']
          });
        }
      };

      if (window.Plyr) {
        initPlyr();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.plyr.io/3.7.8/plyr.polyfilled.js';
        script.onload = initPlyr;
        document.body.appendChild(script);
      }
    }

    return () => {
      if (plyrInstance.current) {
        plyrInstance.current.destroy();
        plyrInstance.current = null;
      }
    };
  }, [resolvedStreamUrl, activeServer]);

  // جلب البيانات معالجة أخطاء جلب البث
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function fetchStreamData() {
      setLoading(true);
      setRdStatus('loading');
      setErrorMessage('');

      const isTv = type === 'tv';
      const finalType = isTv ? 'tv' : 'movie';

      try {
        // 1. جلب بيانات TMDB
        let res = await fetch(`${TMDB_BASE_URL}/${finalType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=en-US`);
        let mData = null;
        if (res.ok) mData = await res.json();

        if (!mData || mData.success === false) {
          const altType = finalType === 'movie' ? 'tv' : 'movie';
          res = await fetch(`${TMDB_BASE_URL}/${altType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=en-US`);
          if (res.ok) mData = await res.json();
        }

        if (isMounted && mData) {
          setMovieData(mData);
        }

        const imdbId = mData?.external_ids?.imdb_id;

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
        console.error("Fetch Error:", err);
      }

      if (isMounted) {
        setRdStatus('failed');
        setErrorMessage('تعذر العثور على رابط Real-Debrid مباشر.');
        setActiveServer('vidsrc_cc');
        setLoading(false);
      }
    }

    fetchStreamData();

    return () => { isMounted = false; };
  }, [id, type, season, episode]);

  if (loading) {
    return (
      <div style={{ color: 'white', backgroundColor: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl' }}>
        <h3 style={{ color: '#e50914' }}>🍿 جاري التحقق وجلب رابط البث...</h3>
      </div>
    );
  }

  const isTvShow = (type === 'tv' || movieData?.media_type_fixed === 'tv');
  const displayTitle = movieData ? (movieData.title || movieData.name) : 'عرض مباشر 📺';

  const embedUrl = isTvShow 
    ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`
    : `https://vidsrc.cc/v2/embed/movie/${id}`;

  const servers = {
    vidsrc_cc: embedUrl,
    vidsrc_to: isTvShow ? `https://vidsrc.to/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.to/embed/movie/${id}`,
    vidlink: isTvShow ? `https://vidlink.pro/embed/tv/${id}/${season}/${episode}` : `https://vidlink.pro/embed/movie/${id}`,
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <Head>
        <title>{displayTitle} - SimplStream</title>
      </Head>

      <button onClick={() => router.push('/')} style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
        ← العودة للرئيسية
      </button>

      {movieData && (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <img src={movieData.poster_path ? `https://image.tmdb.org/t/p/w300${movieData.poster_path}` : 'https://via.placeholder.com/300x450'} alt={displayTitle} style={{ borderRadius: '12px', width: '220px', objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{ fontSize: '36px', color: '#e50914', margin: '0 0 10px 0', fontWeight: 'bold' }}>{displayTitle}</h1>
            <p style={{ color: '#aaa', fontSize: '14px' }}>تاريخ الإصدار: {movieData.release_date || movieData.first_air_date} | ⭐ {movieData.vote_average?.toFixed(1)}</p>
            
            <div style={{ margin: '15px 0', padding: '10px 15px', backgroundColor: '#111', borderRight: '4px solid #e50914', fontSize: '13px', color: '#e50914', fontWeight: 'bold' }}>
              حقوق النشر والتشغيل محفوظة لـ: Anonymous
            </div>
            
            <p style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '10px', color: '#ddd' }}>{movieData.overview || "لا يوجد وصف متاح حالياً."}</p>
          </div>
        </div>
      )}

      {/* اختيار الموسم والحلقة للمسلسلات */}
      {isTvShow && (
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #222', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            الموسم:
            <input 
              type="number" 
              min="1" 
              value={season} 
              onChange={(e) => setSeason(Math.max(1, Number(e.target.value)))} 
              style={{ width: '60px', padding: '8px', backgroundColor: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', textAlign: 'center' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            الحلقة:
            <input 
              type="number" 
              min="1" 
              value={episode} 
              onChange={(e) => setEpisode(Math.max(1, Number(e.target.value)))} 
              style={{ width: '60px', padding: '8px', backgroundColor: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', textAlign: 'center' }}
            />
          </label>
        </div>
      )}

      {/* اختيار الجودة */}
      {activeServer === 'debrid' && qualityOptions.length > 0 && (
        <div style={{ marginBottom: '15px', backgroundColor: '#111', padding: '12px 18px', borderRadius: '8px', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', color: '#e50914' }}>🎬 اختر الجودة:</span>
          <select 
            value={resolvedStreamUrl}
            onChange={(e) => setResolvedStreamUrl(e.target.value)}
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
          💎 Real-Debrid الأصيل {rdStatus === 'failed' && `(${errorMessage || 'غير متاح'})`}
        </button>
        
        <button onClick={() => setActiveServer('vidsrc_cc')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_cc' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 1</button>
        <button onClick={() => setActiveServer('vidsrc_to')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_to' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 2</button>
        <button onClick={() => setActiveServer('vidlink')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidlink' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 3</button>
      </div>

      {/* منطقة المشغل الحاوية */}
      <div style={{ backgroundColor: '#000', padding: '15px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <div style={{ position: 'relative', width: '100%', minHeight: '60vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {activeServer === 'debrid' && resolvedStreamUrl ? (
            <video 
              key={resolvedStreamUrl}
              ref={videoRef}
              controls 
              autoPlay
              playsInline 
              style={{ width: '100%', height: '100%' }}
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
