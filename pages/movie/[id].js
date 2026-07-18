import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';

// حط هنا توكن حساب AllDebrid أو Real-Debrid الخاص بك للأفلام
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export async function getServerSideProps(context) {
  const { id, type } = context.query;
  
  if (type === 'live' || id === 'iptv-live') {
    return { 
      props: { 
        movieData: null,
        liveData: { 
          id: 'iptv-live', 
          url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', // رابط الـ IPTV الخاص بك يعمل هنا فقط
          streamType: 'video' 
        }, 
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
    if (isCustom && liveData) {
      setStreamUrl(liveData.url);
      setPlayerType('video');
      setIsLoading(false);
      return;
    }

    if (!movie) return;

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
              id: 'debrid-premium', 
              name: lang === 'ar' ? '💎 سيرفر بريميوم 4K صافي' : '💎 Premium 4K Pure Stream', 
              url: finalPremiumData.download, 
              type: 'video' 
            });
          }
        }
      } catch (err) {}

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
  }, [movie, isCustom, liveData, lang]);

  if (!isCustom && !movie) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>المحتوى غير متوفر.</div>;

  const displayTitle = isCustom ? 'البث الرياضي المباشر 📺' : (movie?.title || movie?.name);

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <button onClick={() => router.push('/')} style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
        ← العودة للرئيسية
      </button>

      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#fff' }}>
          {isLoading ? '🔍 جاري جلب البث المباشر المطور...' : `🔴 ${displayTitle}`}
        </h3>

        <div style={{ width: '100%', height: '60vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#e50914', fontSize: '20px', fontWeight: 'bold' }}>جاري التحميل...</div>
          ) : !streamUrl ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#aaa', fontSize: '18px' }}>
              ⚠️ تأكد من إضافة توكن فعال لتشغيل الأفلام بجودة صافية.
            </div>
          ) : (
            <video src={streamUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          )}
        </div>
      </div>
    </div>
  );
}
