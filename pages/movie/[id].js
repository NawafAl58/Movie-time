import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';

// 💎 توكن Real-Debrid الشخصي
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export async function getServerSideProps(context) {
  const { id, type } = context.query;
  const finalType = type === 'tv' ? 'tv' : 'movie';
  
  if (type === 'live' || id === 'iptv-custom-live') {
    return { 
      props: { 
        movieData: null, 
        resolvedStreamUrl: "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8", 
        playerType: 'iptv-player',
        isCustom: true,
        tmdbId: id || '',
        mediaTypeFixed: 'movie'
      } 
    };
  }

  let movieData = null;
  let imdbId = null;
  let detectedType = finalType;

  try {
    let res = await fetch(`${BASE_URL}/${detectedType}/${id}?api_key=${API_KEY}&append_to_response=external_ids&language=en-US`);
    movieData = await res.json();
    
    if (!movieData || movieData.success === false) {
      detectedType = 'tv';
      res = await fetch(`${BASE_URL}/${detectedType}/${id}?api_key=${API_KEY}&append_to_response=external_ids&language=en-US`);
      movieData = await res.json();
    }

    if (movieData && movieData.success !== false) {
      movieData.media_type_fixed = detectedType;
      imdbId = movieData.external_ids?.imdb_id;
    } else {
      movieData = null;
    }
  } catch (e) {
    movieData = null;
  }

  if (!movieData) {
    return { props: { movieData: null, resolvedStreamUrl: '', playerType: 'none', isCustom: false, tmdbId: '', mediaTypeFixed: '' } };
  }

  let resolvedStreamUrl = '';
  let playerType = 'none';

  if (imdbId) {
    try {
      const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${DEBRID_API_TOKEN}/stream/${detectedType}/${imdbId}.json`;
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
      isCustom: false,
      tmdbId: id,
      mediaTypeFixed: detectedType
    }
  };
}

export default function MovieDetail({ movieData, resolvedStreamUrl, playerType, isCustom, tmdbId, mediaTypeFixed }) {
  const router = useRouter();
  const videoRef = useRef(null);
  
  // التحكم الافتراضي في السيرفر: التوجه لـ Real-Debrid إن وجد رابط، وإلا فالسيرفر الاحتياطي
  const [activeServer, setActiveServer] = useState(resolvedStreamUrl ? 'debrid' : 'backup');

  useEffect(() => {
    // تشغيل مكتبة HLS.js برمجياً للتعامل مع صيغ البث المباشر والملفات المعقدة داخل المتصفح
    if (activeServer === 'debrid' && resolvedStreamUrl && videoRef.current) {
      const video = videoRef.current;
      
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = resolvedStreamUrl;
      } else if (typeof window !== 'undefined') {
        // استدعاء ديناميكي للمكتبة لضمان التوافق الكامل مع الحاويات المختلفة
        import('hls.js').then((Hls) => {
          if (Hls.default.isSupported()) {
            const hls = new Hls.default();
            hls.loadSource(resolvedStreamUrl);
            hls.attachMedia(video);
          } else {
            video.src = resolvedStreamUrl;
          }
        }).catch(() => {
          video.src = resolvedStreamUrl;
        });
      }
    }
  }, [activeServer, resolvedStreamUrl]);

  if (!isCustom && !movieData) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>المحتوى غير موجود.</div>;

  const displayTitle = isCustom ? 'كل قنوات البث الرياضي 📺' : (movieData?.title || movieData?.name || 'Unknown Content');
  const displayRelease = movieData?.release_date || movieData?.first_air_date || 'LIVE';

  // رابط السيرفر الاحتياطي الدائم لضمان تشغيل أي محتوى لا يتوفر له كاش
  const backupEmbedUrl = `https://vidsrc.to/embed/${mediaTypeFixed}/${tmdbId}`;

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

      {/* أزرار التنقل الدائمة بين السيرفرين */}
      {!isCustom && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            onClick={() => setActiveServer('debrid')}
            disabled={!resolvedStreamUrl}
            style={{
              flex: 1, padding: '12px', borderRadius: '8px', fontWeight: 'bold', 
              cursor: resolvedStreamUrl ? 'pointer' : 'not-allowed',
              backgroundColor: activeServer === 'debrid' ? '#e50914' : '#111',
              color: resolvedStreamUrl ? '#fff' : '#555',
              border: activeServer === 'debrid' ? '1px solid #e50914' : '1px solid #333'
            }}
          >
            💎 مشغل Real-Debrid الأصيل {!resolvedStreamUrl && '(غير متوفر كاش)'}
          </button>
          
          <button 
            onClick={() => setActiveServer('backup')}
            style={{
              flex: 1, padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
              backgroundColor: activeServer === 'backup' ? '#e50914' : '#111',
              color: '#fff',
              border: activeServer === 'backup' ? '1px solid #e50914' : '1px solid #333'
            }}
          >
            🔄 السيرفر الاحتياطي الدائم (VidSrc)
          </button>
        </div>
      )}

      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#fff' }}>
          {isCustom ? `🔴 البث الحي المباشر: ${displayTitle}` : `🍿 المشغل الحالي: ${activeServer === 'debrid' ? 'Real-Debrid الداخلي' : 'السيرفر الاحتياطي'}`}
        </h3>

        <div style={{ width: '100%', height: '65vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {playerType === 'iptv-player' ? (
            <iframe 
              src={`https://www.hlsplayer.net/mp4-player?src=${encodeURIComponent(resolvedStreamUrl)}`} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
            />
          ) : activeServer === 'debrid' && resolvedStreamUrl ? (
            /* مشغل الفيديو الداخلي المدعوم بـ HLS لفك قيود التشفير والـ IP */
            <video 
              ref={videoRef}
              controls 
              autoPlay 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            /* السيرفر الاحتياطي الذي يعمل بشكل مستقل تماماً داخل iframe كخطة بديلة آمنة */
            <iframe 
              src={backupEmbedUrl}
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
              allow="autoplay; encrypted-media"
            />
          )}
        </div>
      </div>
    </div>
  );
}
