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
  
  // نظام إدارة القوائم والسيرفرات المتاحة
  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState('');

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

    const buildServersList = async () => {
      setIsLoading(true);
      const list = [];

      // 🚨 1. إذا كان المحتوى عربي أو سعودي
      if (movie.original_language === 'ar' || movie.origin_country?.includes('SA')) {
        // نحاول جلب الرابط المباشر الأصيل أولاً كخيار أول مفضل
        try {
          const response = await fetch(`https://api.vidsrc.pm/v1/${mediaType}/${movie.id}`);
          const data = await response.json();
          if (data && data.url) {
            list.push({ id: 'native-ar', name: lang === 'ar' ? '🚀 سيرفر مباشر فائق السرعة' : '🚀 Direct Native Stream', url: data.url, type: 'video' });
          }
        } catch (e) {}

        // سيرفرات الـ Embed الاحتياطية المفتوحة للعربي
        list.push({ id: 'su-ar', name: lang === 'ar' ? '📺 سيرفر خليجي مستقر (SU)' : '📺 Stable Khaleej Server (SU)', url: `https://vidsrc.su/embed/${mediaType}/${movie.id}`, type: 'iframe' });
        list.push({ id: 'me-ar', name: lang === 'ar' ? '🌐 سيرفر عربي بديل (ME)' : '🌐 Alternative Arab Server (ME)', url: `https://vidsrc.me/embed/${mediaType}/${movie.id}`, type: 'iframe' });
        
        setServers(list);
        // اختيار أفضل سيرفر تلقائياً (الأول في القائمة)
        if (list.length > 0) {
          setActiveServerId(list[0].id);
          setStreamUrl(list[0].url);
        }
        setIsLoading(false);
        return;
      }

      // 🌐 2. إذا كان المحتوى أجنبي (نبحث عن التورنت Premium 4K أولاً)
      const queryName = movie.original_title || movie.original_name || movie.title || movie.name;
      const year = (movie.release_date || movie.first_air_date)?.split('-')[0] || '';

      // إضافة السيرفرات الاحتياطية المفتوحة للأجنبي دائماً في القائمة
      const fallbackSU = `https://vidsrc.su/embed/${mediaType}/${movie.id}`;
      const fallbackME = `https://vidsrc.me/embed/${mediaType}/${movie.id}`;

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

        if (hash) {
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
            
            // إضافة سيرفر ديبريد كخيار أول مفضل 4K
            list.push({ id: 'debrid-4k', name: lang === 'ar' ? '💎 سيرفر بريميوم صـافي 4K (Debrid)' : '💎 Premium 4K Stream (Debrid)', url: finalPremiumData.download, type: 'video' });
          }
        }
      } catch (err) {}

      // إضافة السيرفرات المفتوحة للقائمة
      list.push({ id: 'vidsrc-su', name: lang === 'ar' ? '🎬 سيرفر رئيسي عالي الجودة (SU)' : '🎬 Main High Quality (SU)', url: fallbackSU, type: 'iframe' });
      list.push({ id: 'vidsrc-me', name: lang === 'ar' ? '🍿 سيرفر احتياطي سريع (ME)' : '🍿 Fast Backup Stream (ME)', url: fallbackME, type: 'iframe' });

      setServers(list);
      // الاختيار التلقائي لأفضل سيرفر متاح
      if (list.length > 0) {
        setActiveServerId(list[0].id);
        setStreamUrl(list[0].url);
      }
      setIsLoading(false);
    };

    buildServersList();
  }, [movie]);

  // دالة التبديل اليدوي بين السيرفرات عند ضغط المستخدم
  const handleServerChange = (serverId, serverUrl) => {
    setActiveServerId(serverId);
    setStreamUrl(serverUrl);
  };

  if (!movie) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>Content not found.</div>;

  const displayTitle = movie.title || movie.name;
  const displayRelease = movie.release_date || movie.first_air_date;
  const currentActiveServer = servers.find(s => s.id === activeServerId);

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

      {/* منطقة المشغل وقائمة السيرفرات */}
      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#fff' }}>
          {isLoading ? (lang === 'ar' ? '🔍 جاري جلب السيرفر المباشر...' : '🔍 Loading Stream...') : `🍿 ${currentActiveServer?.name}`}
        </h3>

        {/* 📺 مشغل الفيديو */}
        <div style={{ width: '100%', height: '60vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#e50914', fontSize: '20px', fontWeight: 'bold' }}>Searching Streams...</div>
          ) : currentActiveServer?.type === 'video' ? (
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
              allow="autoplay; encrypted-media"
            ></iframe>
          )}
        </div>

        {/* 🎛️ أزرار قوائم السيرفرات التفاعلية */}
        {!isLoading && servers.length > 0 && (
          <div>
            <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px', fontWeight: 'bold' }}>
              {lang === 'ar' ? 'اختر سيرفر يدوي إذا واجهت مشكلة:' : 'Select a server manually if you face issues:'}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {servers.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => handleServerChange(srv.id, srv.url)}
                  style={{
                    backgroundColor: activeServerId === srv.id ? '#e50914' : '#111',
                    color: '#fff',
                    border: activeServerId === srv.id ? '1px solid #e50914' : '1px solid #333',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => { if(activeServerId !== srv.id) e.target.style.borderColor = '#e50914'; }}
                  onMouseOut={(e) => { if(activeServerId !== srv.id) e.target.style.borderColor = '#333'; }}
                >
                  {srv.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
