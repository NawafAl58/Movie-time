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
  const [streamsList, setStreamsList] = useState([]);
  const [selectedStreamIndex, setSelectedStreamIndex] = useState(0);
  const [subtitles, setSubtitles] = useState([]);
  const [rdStatus, setRdStatus] = useState('loading');
  const [activeServer, setActiveServer] = useState('debrid');
  const [loading, setLoading] = useState(true);

  const videoRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    async function fetchAllData() {
      setLoading(true);
      setRdStatus('loading');
      
      let finalType = type === 'tv' ? 'tv' : 'movie';

      let mData = null;
      let imdbId = null;

      try {
        let res = await fetch(`${TMDB_BASE_URL}/${finalType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=ar-SA`);
        if (res.ok) mData = await res.json();
        
        if (!mData || mData.success === false) {
          finalType = finalType === 'movie' ? 'tv' : 'movie';
          res = await fetch(`${TMDB_BASE_URL}/${finalType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=ar-SA`);
          if (res.ok) mData = await res.json();
        }

        if (mData && mData.success !== false) {
          mData.media_type_fixed = finalType;
          imdbId = mData.external_ids?.imdb_id;
          setMovieData(mData);
        }
      } catch (e) {
        console.error("TMDB Error:", e);
      }

      if (mData && imdbId) {
        try {
          // 1. جلب قائمة السيرفرات المتاحة من Real-Debrid عبر Torrentio
          const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${DEBRID_API_TOKEN}/stream/${finalType}/${imdbId}.json`;
          const tRes = await fetch(torrentioUrl);
          
          if (tRes.ok) {
            const tData = await tRes.json();
            
            if (tData && tData.streams && tData.streams.length > 0) {
              const validStreams = tData.streams.filter(s => s.url && s.url.startsWith('http'));
              if (validStreams.length > 0) {
                setStreamsList(validStreams);
                setRdStatus('ready');
                setActiveServer('debrid');
              } else {
                setRdStatus('failed');
                setActiveServer('vidsrc_cc');
              }
            } else {
              setRdStatus('failed');
              setActiveServer('vidsrc_cc');
            }
          }

          // 2. جلب الترجمات المتاحة (Subtitles)
          const subRes = await fetch(`https://opensubtitles-v3.strem.fun/subtitles/${finalType}/${imdbId}.json`);
          if (subRes.ok) {
            const subData = await subRes.json();
            if (subData && subData.subtitles) {
              const arabicAndEngSubs = subData.subtitles.filter(s => s.lang === 'ara' || s.lang === 'eng');
              setSubtitles(arabicAndEngSubs);
            }
          }

        } catch (err) {
          console.error("Fetch Exception:", err);
          setRdStatus('failed');
          setActiveServer('vidsrc_cc');
        }
      } else {
        setRdStatus('failed');
        setActiveServer('vidsrc_cc');
      }
      setLoading(false);
    }

    fetchAllData();
  }, [id, type]);

  useEffect(() => {
    if (activeServer === 'debrid' && streamsList.length > 0 && videoRef.current) {
      videoRef.current.load();
    }
  }, [activeServer, selectedStreamIndex, streamsList]);

  if (loading) {
    return (
      <div style={{ color: 'white', backgroundColor: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl' }}>
        <h3 style={{ color: '#e50914' }}>🍿 جاري تحميل الميديا والترجمات...</h3>
      </div>
    );
  }

  const mediaTypeFixed = type === 'tv' ? 'tv' : 'movie';
  const displayTitle = movieData ? (movieData.title || movieData.name) : 'مشاهدة 📺';
  const currentStream = streamsList[selectedStreamIndex];

  const servers = {
    vidsrc_cc: `https://vidsrc.cc/v2/embed/${mediaTypeFixed}/${id}`,
    vidsrc_to: `https://vidsrc.to/embed/${mediaTypeFixed}/${id}`,
    vidlink: `https://vidlink.pro/embed/${mediaTypeFixed}/${id}`,
    smashy: `https://embed.smashystream.com/playere.php?tmdb=${id}`
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <button onClick={() => router.push('/')} style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
        ← العودة للرئيسية
      </button>

      {movieData && (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '30px' }}>
          <img src={movieData.poster_path ? `https://image.tmdb.org/t/p/w300${movieData.poster_path}` : 'https://via.placeholder.com/300x450'} alt={displayTitle} style={{ borderRadius: '12px', width: '220px', objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{ fontSize: '36px', color: '#e50914', margin: '0 0 10px 0', fontWeight: 'bold' }}>{displayTitle}</h1>
            <p style={{ color: '#aaa', fontSize: '14px' }}>تاريخ الإصدار: {movieData.release_date || movieData.first_air_date} | ⭐ {movieData.vote_average?.toFixed(1)}</p>
            <div style={{ margin: '15px 0', padding: '10px 15px', backgroundColor: '#111', borderRight: '4px solid #e50914', fontSize: '13px', color: '#e50914', fontWeight: 'bold' }}>
              حقوق النشر والتشغيل محفوظة لـ: نواف النزاوي
            </div>
            <p style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '10px', color: '#ddd' }}>{movieData.overview || "لا يوجد وصف متاح حالياً."}</p>
          </div>
        </div>
      )}

      {/* أزرار السيرفرات المتاحة من Real-Debrid */}
      {activeServer === 'debrid' && streamsList.length > 0 && (
        <div style={{ marginBottom: '15px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #222' }}>
          <label style={{ color: '#aaa', fontSize: '14px', display: 'block', marginBottom: '8px' }}>💬 اختر سيرفر Real-Debrid المفضل:</label>
          <select 
            value={selectedStreamIndex} 
            onChange={(e) => setSelectedStreamIndex(Number(e.target.value))}
            style={{ width: '100%', padding: '10px', backgroundColor: '#000', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
          >
            {streamsList.map((stream, idx) => (
              <option key={idx} value={idx}>
                سيرفر Real-Debrid #{idx + 1} - {stream.title || stream.name || 'رابط مباشر'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* أزرار المشغلات والسيرفرات الاحتياطية */}
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
          💎 Real-Debrid (بدون إعلانات)
        </button>
        
        <button onClick={() => setActiveServer('vidsrc_cc')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_cc' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 1</button>
        <button onClick={() => setActiveServer('vidsrc_to')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_to' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 2</button>
        <button onClick={() => setActiveServer('vidlink')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidlink' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 3</button>
      </div>

      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <div style={{ width: '100%', height: '65vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {activeServer === 'debrid' && currentStream ? (
            <video 
              ref={videoRef}
              controls 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            >
              <source src={currentStream.url} />
              {/* حقن قائمة الترجمات المباشرة داخل المشغل */}
              {subtitles.map((sub, index) => (
                <track 
                  key={index}
                  kind="subtitles"
                  src={sub.url}
                  srcLang={sub.lang === 'ara' ? 'ar' : 'en'}
                  label={sub.lang === 'ara' ? 'العربية 🇸🇦' : 'English 🇬🇧'}
                  default={index === 0 && sub.lang === 'ara'}
                />
              ))}
              متصفحك لا يدعم تشغيل هذا الفيديو.
            </video>
          ) : (
            <iframe 
              src={servers[activeServer]} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          )}
        </div>
      </div>
    </div>
  );
}
