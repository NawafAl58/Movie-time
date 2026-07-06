import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export async function getServerSideProps(context) {
  const { id, type, url } = context.query;
  if (type === 'live') {
    return { props: { liveData: { id, name: id === 'ch-quran' ? 'قناة القرآن الكريم 🕋' : id === 'ch-sunnah' ? 'قناة السنة النبوية 🕌' : id === 'ch-ekhbariya' ? 'قناة الإخبارية السعودية 🇸🇦' : 'قناة السعودية الأولى 📺', url: url || '' }, isLive: true } };
  }
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  try {
    const res = await fetch(`${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&language=en-US`);
    const movieData = await res.json();
    movieData.media_type_fixed = mediaType;
    return { props: { movieData, isLive: false } };
  } catch (error) {
    return { props: { movieData: null, isLive: false } };
  }
}

export default function MovieDetail({ movieData, liveData, isLive }) {
  const router = useRouter();
  const { type, url } = router.query;
  const [movie, setMovie] = useState(movieData);
  const [lang, setLang] = useState('en');
  const [streamUrl, setStreamUrl] = useState(url || '');
  const [isLoading, setIsLoading] = useState(!isLive);
  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState(isLive ? 'live-main' : '');

  const mediaType = movieData?.media_type_fixed || type || 'movie';

  useEffect(() => {
    const savedLang = localStorage.getItem('site_lang') || 'en';
    setLang(savedLang);
    if (isLive) return;

    const updateMovieLanguage = async () => {
      if (!movieData) return;
      if (movieData.original_language === 'ar' || movieData.origin_country?.includes('SA')) {
        const arRes = await fetch(`${BASE_URL}/${mediaType}/${movieData.id}?api_key=${API_KEY}&language=ar-SA`);
        const arData = await arRes.json();
        arData.media_type_fixed = mediaType;
        setMovie(arData);
      } else {
        setMovie(movieData);
      }
    };
    updateMovieLanguage();
  }, [lang, movieData, isLive]);

  useEffect(() => {
    if (isLive || !movie) return;

    const buildFullServersList = async () => {
      setIsLoading(true);
      const list = [];

      if (movie.original_language === 'ar' || movie.origin_country?.includes('SA')) {
        list.push({ id: 'su-ar', name: 'سيرفر عربي 1 (SU)', url: `https://vidsrc.su/embed/${mediaType}/${movie.id}`, type: 'iframe' });
        list.push({ id: 'me-ar', name: 'سيرفر عربي 2 (ME)', url: `https://vidsrc.me/embed/${mediaType}/${movie.id}`, type: 'iframe' });
        list.push({ id: 'autoembed-ar', name: 'سيرفر عربي 3 (AutoEmbed)', url: `https://autoembed.to/${mediaType}/tmdb/${movie.id}`, type: 'iframe' });
        setServers(list);
        if (list.length > 0) { setActiveServerId(list[0].id); setStreamUrl(list[0].url); }
        setIsLoading(false);
        return;
      }

      // أجنبي
      const queryName = movie.original_title || movie.title;
      const year = movie.release_date?.split('-')[0] || '';
      list.push({ id: 'vidsrc-su', name: 'Server SU (HQ)', url: `https://vidsrc.su/embed/${mediaType}/${movie.id}`, type: 'iframe' });
      list.push({ id: 'vidsrc-me', name: 'Server ME (Fast)', url: `https://vidsrc.me/embed/${mediaType}/${movie.id}`, type: 'iframe' });
      setServers(list);
      if (list.length > 0) { setActiveServerId(list[0].id); setStreamUrl(list[0].url); }
      setIsLoading(false);
    };
    buildFullServersList();
  }, [movie, isLive]);

  const displayTitle = isLive ? liveData?.name : (movie?.title || movie?.name);

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <button onClick={() => router.push('/')} style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
        {lang === 'ar' ? '← العودة للرئيسية' : '← Back to Home'}
      </button>

      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#fff' }}>
          {isLoading ? '🔍 جاري الاتصال...' : `🔴 البث المباشر: ${displayTitle}`}
        </h3>

        <div style={{ width: '100%', height: '60vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {isLive ? (
            <iframe src={streamUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="autoplay; encrypted-media"></iframe>
          ) : isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#e50914' }}>Loading...</div>
          ) : (
            <iframe src={streamUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen></iframe>
          )}
        </div>
      </div>
    </div>
  );
}
