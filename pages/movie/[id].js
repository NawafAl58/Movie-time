import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';

// 🚨 حط هنا توكن الـ Debrid الخاص بك (سواءً Real-Debrid أو AllDebrid بعد تفعيله)
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

// 🔴 لوحة تحكم القنوات الرياضية والبث المباشر الصافي الخاصة بك
const customData = {
  "live_channels": [
    {
      "id": "sports-live-1",
      "name": "الرياضية مباشر - سيرفر أصيل ⚽",
      "stream_url": "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8",
      "stream_type": "video" // تشغيل مباشر داخل مشغل الموقع بدون إعلانات
    }
  ]
};

export async function getServerSideProps(context) {
  const { id, type, url, streamType } = context.query;
  
  if (type === 'live') {
    return { 
      props: { 
        movieData: null,
        liveData: { id: id || '', url: url || '', streamType: streamType || 'video' }, 
        isCustom: true 
      } 
    };
  }

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  try {
    const res = await fetch(`${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&language=en-US`);
    const movieData = await res.json();
    if (movieData && !movieData.success && movieData.status_message) {
      return { props: { movieData: null, liveData: null, isCustom: false } };
    }
    movieData.media_type_fixed = mediaType;
    return { props: { movieData, liveData: null, isCustom: false } };
  } catch (error) {
    return { props: { movieData: null, liveData: null, isCustom: false } };
  }
}

export default function MovieDetail({ movieData, liveData, isCustom }) {
  const router = useRouter();
  const { id, type } = router.query;
  const [movie, setMovie] = useState(movieData);
  const [lang, setLang] = useState('en');
  const [streamUrl, setStreamUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState('');
  const [playerType, setPlayerType] = useState('video'); 

  const mediaType = movieData?.media_type_fixed || type || 'movie';
  const currentId = id || liveData?.id;

  useEffect(() => {
    const savedLang = localStorage.getItem('site_lang') || 'en';
    setLang(savedLang);
    if (isCustom) return;

    const updateMovieLanguage = async () => {
      if (!movieData) return;
      if (savedLang === 'ar') {
        const arRes = await fetch(`${BASE_URL}/${mediaType}/${movieData.id}?api_key=${API_KEY}&language=ar-SA`);
        const arData = await arRes.json();
        arData.media_type_fixed = mediaType;
        setMovie(arData);
      } else {
        setMovie(movieData);
      }
    };
    updateMovieLanguage();
  }, [lang, movieData, isCustom, mediaType]);

  useEffect(() => {
    // 📺 1. نظام تشغيل البث الرياضي المباشر الصافي
    if (isCustom && liveData) {
      const localChannel = customData.live_channels?.find(ch => ch.id === currentId);
      const targetUrl = localChannel ? localChannel.stream_url : liveData.url;
      const targetType = localChannel ? localChannel.stream_type : 'video';

      setStreamUrl(targetUrl);
      setPlayerType(targetType);
      setIsLoading(false);
      return;
    }

    if (!movie) return;

    // 🌐 2. نظام جلب الأفلام والمسلسلات العالمية بجودة 4K الصافية عبر Debrid
    const buildFullServersList = async () => {
      setIsLoading(true);
      const list = [];
      const queryName = movie.original_title || movie.original_name || movie.title || movie.name;
      const year = (movie.release_date || movie.first_air_date)?.split('-')[0] || '';

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
            list.push({ 
              id: 'debrid-4k', 
              name: lang === 'ar' ? '💎 سيرفر صافي عالي الجودة 4K (Premium)' : '💎 Premium 4K Pure Stream', 
              url: finalPremiumData.download, 
              type: 'video' 
            });
          }
        }
      } catch (err) {}

      // في حال لم يتوفر رابط Debrid، يتم عرض رسالة جاري البحث أو سيرفر احتياطي نظيف
      setServers(list);
      if (list.length > 0) {
        setActiveServerId(list[0].id);
        setStreamUrl(list[0].url);
        setPlayerType(list[0].type);
      } else {
        setStreamUrl('');
      }
      setIsLoading(false);
    };

    buildFullServersList();
  }, [movie, isCustom, currentId, lang]);

  const handleServerChange = (serverId, serverUrl, srvType) => {
    setActiveServerId(serverId);
    setStreamUrl(serverUrl);
    setPlayerType(srvType || 'video');
  };

  if (!isCustom && !movie) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>Content not found.</div>;

  const displayTitle = isCustom ? (customData.live_channels?.find(ch => ch.id === currentId)?.name || 'بث مباشر الرياضية ⚽') : (movie?.title || movie?.name || 'Premium Movie');
  const displayRelease = movie?.release_date || movie?.first_air_date || 'LIVE';
  const currentActiveServer = servers.find(s => s.id === activeServerId);

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      
      <style jsx global>{`
        html, body, #__next { margin: 0 !important; padding: 0 !important; background-color: #050505 !important; background: #050505 !important; }
      `}</style>

      <button onClick={() => router.push('/')} style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
        {lang === 'ar' ? '← العودة للرئيسية' : '← Back to Home'}
      </button>

      {!isCustom && movie && (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '30px' }}>
          <img src={movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/300x450'} alt={displayTitle} style={{ borderRadius: '12px', width: '220px', objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{ fontSize: '36px', color: '#e50914', margin: '0 0 10px 0', fontWeight: 'bold' }}>{displayTitle}</h1>
            <p style={{ color: '#aaa', fontSize: '14px' }}>{lang === 'ar' ? 'تاريخ الإصدار:' : 'Release Date:'} {displayRelease} | ⭐ {movie.vote_average?.toFixed(1)}</p>
            <div style={{ margin: '15px 0', padding: '10px 15px', backgroundColor: '#111', borderLeft: '4px solid #e50914', borderRight: lang === 'ar' ? '4px solid #e50914' : 'none', fontSize: '13px', color: '#e50914', fontWeight: 'bold' }}>
              {lang === 'ar' ? 'حقوق النشر والتشغيل محفوظة لـ: نواف النزاوي' : 'Streaming Rights Reserved to: Nawaf Al-Nazawi'}
            </div>
            <p style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '10px', color: '#ddd' }}>{movie.overview || "No overview available."}</p>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#fff' }}>
          {isLoading ? '🔍 جاري تهيئة مشغل الفيديو النظيف...' : isCustom ? `🔴 ${displayTitle}` : `🍿 ${currentActiveServer?.name || 'سيرفر بريميوم تلقائي'}`}
        </h3>

        <div style={{ width: '100%', height: '60vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#e50914', fontSize: '20px', fontWeight: 'bold' }}>Connecting to Premium Streams...</div>
          ) : !streamUrl ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#aaa', fontSize: '18px' }}>
              {lang === 'ar' ? '⚠️ عذراً، لم يتم العثور على رابط مباشر صافي لهذا المحتوى حالياً.' : '⚠️ Sorry, no direct premium stream found for this content.'}
            </div>
          ) : playerType === 'video' ? (
            /* 🎥 المشغل المباشر الصافي الحامي من الإعلانات تماماً */
            <video src={streamUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <iframe src={streamUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="autoplay; encrypted-media"></iframe>
          )}
        </div>

        {!isCustom && !isLoading && servers.length > 1 && (
          <div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {servers.map((srv) => (
                <button key={srv.id} onClick={() => handleServerChange(srv.id, srv.url, srv.type)} style={{ backgroundColor: activeServerId === srv.id ? '#e50914' : '#111', color: '#fff', border: activeServerId === srv.id ? '1px solid #e50914' : '1px solid #333', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
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
