import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export async function getServerSideProps(context) {
  const { id, type } = context.query;
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  try {
    const res = await fetch(`${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&language=en-US`);
    const movieData = await res.json();
    movieData.media_type_fixed = mediaType;
    return { props: { movieData } };
  } catch (error) {
    return { props: { movieData: null } };
  }
}

export default function MovieDetail({ movieData }) {
  const router = useRouter();
  const { type } = router.query;
  const [movie, setMovie] = useState(movieData);
  const [lang, setLang] = useState('en');
  const [streamUrl, setStreamUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [isNativePlayer, setIsNativePlayer] = useState(false); // نظام التشغيل الأصيل بدون iframe

  const mediaType = movieData?.media_type_fixed || type || 'movie';

  useEffect(() => {
    const savedLang = localStorage.getItem('site_lang') || 'en';
    setLang(savedLang);

    const updateMovieLanguage = async () => {
      if (!movieData) return;
      if (movieData.original_language === 'ar' || movieData.origin_country?.includes('SA')) {
        const arRes = await fetch(`${BASE_URL}/${mediaType}/${movieData.id}?api_key=${API_KEY}&language=ar-SA`);
        const arData = await arRes.json();
        arData.media_type_fixed = mediaType;
        setMovie(arData);
      } else if (savedLang === 'ar') {
        const arRes = await fetch(`${BASE_URL}/${mediaType}/${movieData.id}?api_key=${API_KEY}&language=ar-SA`);
        const arData = await arRes.json();
        arData.media_type_fixed = mediaType;
        setMovie(arData);
      } else {
        setMovie(movieData);
      }
    };
    updateMovieLanguage();
  }, [lang, movieData]);

  useEffect(() => {
    if (!movie) return;

    const getStream = async () => {
      setIsLoading(true);
      setUseFallback(false);
      setIsNativePlayer(false);
      
      // 🚨 سكريبت نظام جلب البث المباشر المصلح للمحتوى العربي والسعودي
      if (movie.original_language === 'ar' || movie.origin_country?.includes('SA')) {
        try {
          // محرك فحص ذكي يجلب الرابط المباشر الصافي لملف الفيديو المترجم أو العربي
          const response = await fetch(`https://api.vidsrc.pm/v1/${mediaType}/${movie.id}`);
          const data = await response.json();
          
          if (data && data.url) {
            setStreamUrl(data.url);
            setIsNativePlayer(true); // تشغيل المشغل الداخلي الآمن
          } else {
            // كخطة احتياطية مستقرة جداً لا تحجب فيرسيل
            setStreamUrl(`https://vidsrc.in/embed/${mediaType}/${movie.id}`);
            setUseFallback(true);
          }
        } catch (e) {
          // سيرفر طوارئ مفتوح ومستقر
          setStreamUrl(`https://vidsrc.in/embed/${mediaType}/${movie.id}`);
          setUseFallback(true);
        }
        setIsLoading(false);
        return;
      }

      // 🌐 مسار المحتوى الأجنبي الصافي (تورنت + ديبريد / سيرفر احتياطي)
      const queryName = movie.original_title || movie.original_name || movie.title || movie.name;
      const year = (movie.release_date || movie.first_air_date)?.split('-')[0] || '';
      const fallbackUrl = `https://vidsrc.to/embed/${mediaType}/${movie.id}`;

      try {
        const searchQueries = [`${queryName} ${year} 4K`, `${queryName} ${year} 1080p`];
        let hash = null;
        let torrentName = '';

        for (let q of searchQueries) {
          const res = await fetch(`https://api.apibay.org/q.php?q=${encodeURIComponent(q)}`);
          const torrents = await res.json();
          if (torrents && torrents.length > 0 && torrents[0].info_hash !== "0000000000000000000000000000000000000000") {
            hash = torrents[0].info_hash;
            torrentName = torrents[0].name;
            break;
          }
        }

        if (!hash) {
          setStreamUrl(fallbackUrl);
          setUseFallback(true);
          setIsLoading(false);
          return;
        }

        const magnetLink = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(torrentName)}`;
        const addTorrentRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` },
          body: new URLSearchParams({ magnet: magnetLink })
        });
        const torrentInfo = await addTorrentRes.json();

        await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentInfo.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` },
          body: new URLSearchParams({ files: 'all' })
        });

        const getFilesRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentInfo.id}`, {
          headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` }
        });
        const finalInfo = await getFilesRes.json();
        
        if (finalInfo && finalInfo.links && finalInfo.links.length > 0) {
          const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` },
            body: new URLSearchParams({ link: finalInfo.links[0] })
          });
          const finalPremiumData = await unrestrictRes.json();
          setStreamUrl(finalPremiumData.download);
        } else {
          setStreamUrl(fallbackUrl);
          setUseFallback(true);
        }
      } catch (err) {
        setStreamUrl(fallbackUrl);
        setUseFallback(true);
      }
      setIsLoading(false);
    };

    getStream();
  }, [movie]);

  if (!movie) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>Content not found.</div>;

  const displayTitle = movie.title || movie.name;
  const displayRelease = movie.release_date || movie.first_air_date;

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      
      <style jsx global>{`
        html, body, #__next { margin: 0 !important; padding: 0 !important; background-color: #050505 !important; background: #050505 !important; }
      `}</style>

      <button 
        onClick={() => router.push('/')} 
        style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}
      >
        {lang === 'ar' ? '← العودة للرئيسية' : '← Back to Home'}
      </button>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <img 
          src={movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/300x450'} 
          alt={displayTitle} 
          style={{ borderRadius: '12px', width: '220px', objectFit: 'cover' }}
        />
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h1 style={{ fontSize: '36px', color: '#e50914', margin: '0 0 10px 0', fontWeight: 'bold' }}>{displayTitle}</h1>
          <p style={{ color: '#aaa', fontSize: '14px' }}>{lang === 'ar' ? 'تاريخ الإصدار:' : 'Release Date:'} {displayRelease} | ⭐ {movie.vote_average?.toFixed(1)}</p>
          
          <div style={{ margin: '15px 0', padding: '10px 15px', backgroundColor: '#111', borderLeft: '4px solid #e50914', borderRight: lang === 'ar' ? '4px solid #e50914' : 'none', fontSize: '13px', color: '#e50914', fontWeight: 'bold', letterSpacing: '1px' }}>
            {lang === 'ar' ? 'حقوق النشر والتشغيل محفوظة لـ: نواف النزاوي' : 'Streaming Rights Reserved to: Nawaf Al-Nazawi'}
          </div>

          <p style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '10px', color: '#ddd' }}>
            {movie.overview || (lang === 'ar' ? "لا يوجد وصف متوفر." : "No overview available.")}
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: '#000', padding: '15px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>
          {isLoading ? (lang === 'ar' ? '🔍 جاري جلب السيرفر المباشر...' : '🔍 Loading Stream...') : isNativePlayer ? (lang === 'ar' ? '🍿 تشغيل البث المباشر المباشر والآمن 100%' : '🍿 Playing Safe Direct Native Stream') : (lang === 'ar' ? `📺 يتم التشغيل عبر سيرفر احتياطي مفتوح` : `📺 Playing via Standby Server`)}
        </h3>

        <div style={{ width: '100%', height: '60vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#e50914', fontSize: '20px', fontWeight: 'bold' }}>Searching Streams...</div>
          ) : isNativePlayer ? (
            /* 🍿 المشغل الداخلي الأصيل - آمن 100% وبدون إعلانات أو شاشة سوداء */
            <video 
              src={streamUrl} 
              controls 
              autoPlay 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          ) : (
            <iframe 
              src={streamUrl} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen
            ></iframe>
          )}
        </div>
      </div>
    </div>
  );
}
