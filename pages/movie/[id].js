import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const TMDB_API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RD_API_BASE = 'https://api.real-debrid.com/rest/1.0';

// 💎 توكن Real-Debrid الشخصي
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export async function getServerSideProps(context) {
  const { id, type } = context.query;
  let finalType = type === 'tv' ? 'tv' : 'movie';
  
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

  try {
    let res = await fetch(`${TMDB_BASE_URL}/${finalType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=en-US`);
    if (res.ok) movieData = await res.json();
    
    if (!movieData || movieData.success === false) {
      finalType = finalType === 'movie' ? 'tv' : 'movie';
      res = await fetch(`${TMDB_BASE_URL}/${finalType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=en-US`);
      if (res.ok) movieData = await res.json();
    }

    if (movieData && movieData.success !== false) {
      movieData.media_type_fixed = finalType;
      imdbId = movieData.external_ids?.imdb_id;
    } else {
      movieData = null;
    }
  } catch (e) {
    movieData = null;
  }

  let resolvedStreamUrl = '';
  let playerType = 'none';

  if (movieData && imdbId) {
    try {
      const torrentioUrl = `https://torrentio.strem.fun/stream/${finalType}/${imdbId}.json`;
      const tRes = await fetch(torrentioUrl);
      
      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData && tData.streams && tData.streams.length > 0) {
          const streamTarget = tData.streams.find(s => s.infoHash || s.url);
          
          if (streamTarget) {
            if (streamTarget.infoHash) {
              const addRes = await fetch(`${RD_API_BASE}/torrents/addTorrent`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `host=real-debrid.com&infoHash=${streamTarget.infoHash}`
              });

              if (addRes.ok) {
                const addData = await addRes.json();
                const torrentId = addData.id;

                const infoRes = await fetch(`${RD_API_BASE}/torrents/info/${torrentId}`, {
                  headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` }
                });

                if (infoRes.ok) {
                  const infoData = await infoRes.json();
                  if (infoData.files && infoData.files.length > 0) {
                    await fetch(`${RD_API_BASE}/torrents/selectFiles/${torrentId}`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                      body: `files=all`
                    });

                    const finalInfoRes = await fetch(`${RD_API_BASE}/torrents/info/${torrentId}`, {
                      headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` }
                    });
                    const finalInfoData = await finalInfoRes.json();

                    if (finalInfoData.links && finalInfoData.links.length > 0) {
                      const unrestrictRes = await fetch(`${RD_API_BASE}/unrestrict/link`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `link=${encodeURIComponent(finalInfoData.links[0])}`
                      });

                      if (unrestrictRes.ok) {
                        const unrestrictData = await unrestrictRes.json();
                        resolvedStreamUrl = unrestrictData.download;
                        playerType = 'video';
                      }
                    }
                  }
                }
              }
            } else if (streamTarget.url && streamTarget.url.startsWith('http')) {
              resolvedStreamUrl = streamTarget.url;
              playerType = 'video';
            }
          }
        }
      }
    } catch (err) {
      console.error("Real-Debrid Resolution Error: ", err);
    }
  }

  return {
    props: {
      movieData,
      resolvedStreamUrl,
      playerType,
      isCustom: false,
      tmdbId: id || '',
      mediaTypeFixed: finalType
    }
  };
}

export default function MovieDetail({ movieData, resolvedStreamUrl, playerType, isCustom, tmdbId, mediaTypeFixed }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  const [activeServer, setActiveServer] = useState(resolvedStreamUrl ? 'debrid' : 'backup');
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    // تدمير الكائن السابق تنظيفاً للذاكرة ومنع التداخل
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setPlaybackError(false);

    if (activeServer === 'debrid' && resolvedStreamUrl && videoRef.current) {
      const video = videoRef.current;
      const isHlsUrl = resolvedStreamUrl.includes('.m3u8');

      if (isHlsUrl) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = resolvedStreamUrl;
        } else {
          // استدعاء آمن للمكتبة من CDN خارجي لتجنب أخطاء البناء في فيرسيل
          import('https://cdn.skypack.dev/hls.js').then((M) => {
            const HlsClass = M.default;
            if (HlsClass.isSupported()) {
              const hls = new HlsClass({ maxMaxBufferLength: 30, enableWorker: true });
              hlsRef.current = hls;
              hls.loadSource(resolvedStreamUrl);
              hls.attachMedia(video);
              hls.on(HlsClass.Events.ERROR, (_, data) => {
                if (data.fatal) setPlaybackError(true);
              });
            } else {
              video.src = resolvedStreamUrl;
            }
          }).catch(() => {
            video.src = resolvedStreamUrl;
          });
        }
      } else {
        video.src = resolvedStreamUrl;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeServer, resolvedStreamUrl]);

  if (!isCustom && !movieData) {
    return (
      <div style={{ color: 'white', padding: '50px', textAlign: 'center', direction: 'rtl' }}>
        <h2>⚠️ خطأ في البيانات</h2>
        <p>المحتوى غير موجود حالياً.</p>
        <button onClick={() => router.push('/')} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>العودة للرئيسية</button>
      </div>
    );
  }

  const displayTitle = isCustom ? 'كل قنوات البث الرياضي 📺' : (movieData?.title || movieData?.name || 'Unknown Content');
  const displayRelease = movieData?.release_date || movieData?.first_air_date || 'LIVE';
  const backupEmbedUrl = `https://vidlink.pro/embed/${mediaTypeFixed}/${tmdbId}`;

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
            💎 مشغل Real-Debrid الصافي النظيف {!resolvedStreamUrl && '(لم يكتمل فك التورنت)'}
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
            🔄 السيرفر الاحتياطي المتطور (VidLink)
          </button>
        </div>
      )}

      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#fff' }}>
          {isCustom ? `🔴 البث الحي المباشر: ${displayTitle}` : `🍿 المشغل الحالي: ${activeServer === 'debrid' ? 'Real-Debrid المباشر' : 'السيرفر الاحتياطي'}`}
        </h3>

        <div style={{ width: '100%', height: '65vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
          {playerType === 'iptv-player' ? (
            <iframe 
              src={`https://www.hlsplayer.net/mp4-player?src=${encodeURIComponent(resolvedStreamUrl)}`} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
            />
          ) : activeServer === 'debrid' && resolvedStreamUrl && !playbackError ? (
            <video 
              ref={videoRef}
              controls 
              autoPlay 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={() => setPlaybackError(true)}
            />
          ) : (
            <iframe 
              src={backupEmbedUrl}
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          )}

          {playbackError && activeServer === 'debrid' && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff', padding: '20px' }}>
              <p>⚠️ خطأ في فك ترميز الفيديو أو قيود CORS للمتصفح.</p>
              <button onClick={() => setActiveServer('backup')} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>التحويل التلقائي للسيرفر الاحتياطي</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
