import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export async function getServerSideProps(context) {
  const { id } = context.query;
  try {
    // جلب بيانات الفيلم المحدد من TMDB باستخدام الـ ID القادم من الرابط
    const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=ar-SA`);
    const movieData = await res.json();
    return { props: { movie: movieData } };
  } catch (error) {
    return { props: { movie: null } };
  }
}

export default function MovieDetail({ movie }) {
  const router = useRouter();
  const [streamUrl, setStreamUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (!movie) return;

    const getStream = async () => {
      setIsLoading(true);
      const currentType = 'movie';
      
      // إذا كان الفيلم عربي، يروح مباشرة للسيرفر العربي vidsrc.cc
      if (movie.original_language === 'ar') {
        setStreamUrl(`https://vidsrc.cc/v2/embed/${currentType}/${movie.id}?autoPlay=true`);
        setUseFallback(true);
        setIsLoading(false);
        return;
      }

      // للأفلام الأجنبية: نبحث في التورنت كالعادة
      const queryName = movie.original_title || movie.title;
      const year = movie.release_date?.split('-')[0] || '';
      const fallbackUrl = `https://vidsrc.to/embed/${currentType}/${movie.id}`;

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

  if (!movie) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>Movie not found.</div>;

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <button 
        onClick={() => router.push('/')} 
        style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}
      >
        ← Back to Home
      </button>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <img 
          src={movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/300x450'} 
          alt={movie.title} 
          style={{ borderRadius: '12px', width: '250px', objectFit: 'cover' }}
        />
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h1 style={{ fontSize: '36px', color: '#e50914', margin: '0 0 10px 0' }}>{movie.title}</h1>
          <p style={{ color: '#aaa', fontSize: '14px' }}>Release Date: {movie.release_date} | ⭐ {movie.vote_average?.toFixed(1)}</p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '15px', color: '#ddd' }}>{movie.overview || "لا يوجد وصف متوفر للفيلم."}</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#000', padding: '15px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px' }}>
          {isLoading ? '🔍 Loading Stream...' : useFallback ? '📺 Playing via Fallback/Arabic Server' : '💎 Now Playing Premium 4K (Debrid)'}
        </h3>
        <div style={{ width: '100%', height: '60vh', backgroundColor: '#000' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#e50914', fontSize: '20px' }}>Searching Streams...</div>
          ) : useFallback ? (
            <iframe src={streamUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen></iframe>
          ) : (
            <video src={streamUrl} controls autoPlay style={{ width: '100%', height: '100%' }} />
          )}
        </div>
      </div>
    </div>
  );
}
