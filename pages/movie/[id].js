import React from 'react';
import { useRouter } from 'next/router';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';

// 💎 توكن Real-Debrid الشخصي الخاص بك
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export async function getServerSideProps(context) {
  const { id, type } = context.query;
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  
  // 1. تشغيل البث المباشر IPTV الخاص بك
  if (type === 'live' || id === 'iptv-custom-live') {
    return { 
      props: { 
        movieData: null, 
        resolvedStreamUrl: `https://www.hlsplayer.net/mp4-player?src=${encodeURIComponent("https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8")}`, 
        playerType: 'iptv-player',
        isCustom: true 
      } 
    };
  }

  // 2. جلب بيانات الفيلم من TMDB
  let movieData = null;
  let imdbId = null;
  try {
    const res = await fetch(`${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&append_to_response=external_ids&language=en-US`);
    movieData = await res.json();
    if (movieData && movieData.success === false) {
      movieData = null;
    } else {
      movieData.media_type_fixed = mediaType;
      imdbId = movieData.external_ids?.imdb_id;
    }
  } catch (e) {}

  if (!movieData) {
    return { props: { movieData: null, resolvedStreamUrl: '', playerType: 'none', isCustom: false } };
  }

  let resolvedStreamUrl = '';
  let playerType = 'none';

  if (imdbId) {
    try {
      const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${DEBRID_API_TOKEN}/stream/${mediaType}/${imdbId}.json`;
      const tRes = await fetch(torrentioUrl);
      const tData = await tRes.json();

      if (tData && tData.streams && tData.streams.length > 0) {
        const validStream = tData.streams.find(stream => stream.url);
        if (validStream) {
          resolvedStreamUrl = validStream.url;
          playerType = 'video';
        }
      }
    } catch (err) {
      console.error("Torrentio Engine Error: ", err);
    }
  }

  return {
    props: {
      movieData,
      resolvedStreamUrl,
      playerType,
      isCustom: false
    }
  };
}

export default function MovieDetail({ movieData, resolvedStreamUrl, playerType, isCustom }) {
  const router = useRouter();

  if (!isCustom && !movieData) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>المحتوى غير موجود.</div>;

  const displayTitle = isCustom ? 'كل قنوات البث الرياضي 📺' : (movieData?.title || movieData?.name || 'Unknown Content');
  const displayRelease = movieData?.release_date || movieData?.first_air_date || 'LIVE';

  // 🚀 تحويل رابط التحميل المباشر إلى رابط مشغل ويب متوافق يمنع التحميل التلقائي ويشغل الفيلم فوراً داخل الموقع
  const embedPlayerUrl = resolvedStreamUrl 
    ? `https://vidlink.pro/embed/${movieData?.media_type_fixed || 'movie'}/${movieData?.id}?custom_link=${encodeURIComponent(resolvedStreamUrl)}`
    : '';

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      
      <style jsx global>{`
        html, body, #__next { margin: 0 !important; padding: 0 !important; background-color: #050505 !important; }
      `}</style>

      <button onClick={() => router.push('/')} style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
        ← العودة للرئيسية
      </button>

      {!isCustom && movieData && (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '30px' }}>
          <img src={movieData.poster_path ? `https://image.tmdb.org/t/p/w300${movieData.poster_path}` : 'https://via.placeholder.com/300x450'} alt={displayTitle} style={{ borderRadius: '12px', width: '220px', objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 style={{ fontSize: '36px', color: '#e50914', margin: '0 0 10px 0', fontWeight: 'bold' }}>{displayTitle}</h1>
            <p style={{ color: '#aaa', fontSize: '14px' }}>تاريخ الإصدار: {displayRelease} | ⭐ {movieData.vote_average?.toFixed(1)}</p>
            <div style={{ margin: '15px 0', padding: '10px 15px', backgroundColor: '#111', borderRight: '4px solid #e50914', fontSize: '13px', color: '#e50914', fontWeight: 'bold' }}>
              حقوق النشر والتشغيل محفوظة لـ: نواف النزاوي
            </div>
            <p style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '10px', color: '#ddd' }}>{movieData.overview || "لا يوجد وصف متاح حالياً."}</p>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#fff' }}>
          {isCustom ? `🔴 البث الحي المباشر: ${displayTitle}` : `🍿 مشغل Real-Debrid الداخلي الصافي`}
        </h3>

        <div style={{ width: '100%', height: '65vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {playerType === 'iptv-player' ? (
            <iframe 
              src={resolvedStreamUrl} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
              allow="autoplay; encrypted-media"
            />
          ) : embedPlayerUrl ? (
            <iframe 
              src={embedPlayerUrl}
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
              allow="autoplay; encrypted-media"
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#aaa', fontSize: '18px', padding: '0 20px', textAlign: 'center' }}>
              ⚠️ لم يتم العثور على روابط كاش جاهزة متوافقة داخل الموقع حالياً.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
