// pages/movie/[id].js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TMDB_API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RD_API_BASE = 'https://api.real-debrid.com/rest/1.0';
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export default function MovieDetail() {
  const router = useRouter();
  const { id, type } = router.query;
  
  const [movieData, setMovieData] = useState(null);
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState('');
  const [playerType, setPlayerType] = useState('none');
  const [rdStatus, setRdStatus] = useState('loading');
  const [activeServer, setActiveServer] = useState('debrid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchAllData() {
      setLoading(true);
      let finalType = type === 'tv' ? 'tv' : 'movie';
      
      if (type === 'live' || id === 'iptv-custom-live') {
        setResolvedStreamUrl("https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8");
        setPlayerType('iptv-player');
        setRdStatus('none');
        setActiveServer('debrid');
        setLoading(false);
        return;
      }

      let mData = null;
      let imdbId = null;

      try {
        let res = await fetch(`${TMDB_BASE_URL}/${finalType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=en-US`);
        if (res.ok) mData = await res.json();
        
        if (!mData || mData.success === false) {
          finalType = finalType === 'movie' ? 'tv' : 'movie';
          res = await fetch(`${TMDB_BASE_URL}/${finalType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids&language=en-US`);
          if (res.ok) mData = await res.json();
        }

        if (mData && mData.success !== false) {
          mData.media_type_fixed = finalType;
          imdbId = mData.external_ids?.imdb_id;
          setMovieData(mData);
        }
      } catch (e) {
        console.error(e);
      }

      if (mData && imdbId) {
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
                      
                      await fetch(`${RD_API_BASE}/torrents/selectFiles/${torrentId}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `files=all`
                      });

                      if (infoData.links && infoData.links.length > 0) {
                        const unrestrictRes = await fetch(`${RD_API_BASE}/unrestrict/link`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                          body: `link=${encodeURIComponent(infoData.links[0])}`
                        });

                        if (unrestrictRes.ok) {
                          const unrestrictData = await unrestrictRes.json();
                          setResolvedStreamUrl(unrestrictData.download);
                          setPlayerType('video');
                          setRdStatus('ready');
                          setActiveServer('debrid');
                        }
                      } else {
                        setRdStatus('no_cache');
                        setActiveServer('vidsrc_cc');
                      }
                    }
                  }
                } else if (streamTarget.url && streamTarget.url.startsWith('http')) {
                  setResolvedStreamUrl(streamTarget.url);
                  setPlayerType('video');
                  setRdStatus('ready');
                  setActiveServer('debrid');
                }
              }
            } else {
              setRdStatus('no_cache');
              setActiveServer('vidsrc_cc');
            }
          }
        } catch (err) {
          setRdStatus('no_cache');
          setActiveServer('vidsrc_cc');
        }
      } else {
        setRdStatus('no_cache');
        setActiveServer('vidsrc_cc');
      }
      setLoading(false);
    }

    fetchAllData();
  }, [id, type]);

  useEffect(() => {
    let plyrInstance = null;
    if (activeServer === 'debrid' && resolvedStreamUrl && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.polyfilled.min.js';
      script.async = true;
      script.onload = () => {
        if (window.Plyr && document.getElementById('rd-native-player')) {
          plyrInstance = new window.Plyr('#rd-native-player', {
            controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'],
            ratio: '16:9'
          });
        }
      };
      document.body.appendChild(script);
      return () => {
        if (plyrInstance) plyrInstance.destroy();
        if (script.parentNode) script.parentNode.removeChild(script);
      };
    }
  }, [activeServer, resolvedStreamUrl]);

  if (loading) {
    return (
      <div style={{ color: 'white', backgroundColor: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', direction: 'rtl' }}>
        <h3>🍿 جاري تجهيز المشغل...</h3>
      </div>
    );
  }

  const mediaTypeFixed = type === 'tv' ? 'tv' : 'movie';
  const displayTitle = movieData ? (movieData.title || movieData.name) : 'بث مباشر 📺';

  const servers = {
    vidsrc_cc: `https://vidsrc.cc/v2/embed/${mediaTypeFixed}/${id}`,
    vidsrc_to: `https://vidsrc.to/embed/${mediaTypeFixed}/${id}`,
    vidlink: `https://vidlink.pro/embed/${mediaTypeFixed}/${id}`,
    smashy: `https://embed.smashystream.com/playere.php?tmdb=${id}`
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <Head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css" />
      </Head>
      
      <style jsx global>{`
        html, body, #__next { margin: 0 !important; padding: 0 !important; background-color: #050505 !important; }
        .plyr { border-radius: 8px; height: 100%; width: 100%; }
      `}</style>

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

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
        <button 
          onClick={() => setActiveServer('debrid')}
          disabled={rdStatus !== 'ready' && id !== 'iptv-custom-live'}
          style={{
            padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: (rdStatus === 'ready' || id === 'iptv-custom-live') ? 'pointer' : 'not-allowed',
            backgroundColor: activeServer === 'debrid' ? '#e50914' : '#111',
            color: (rdStatus === 'ready' || id === 'iptv-custom-live') ? '#fff' : '#555',
            border: '1px solid #333'
          }}
        >
          💎 Real-Debrid الأصيل {rdStatus === 'no_cache' && '(بدون كاش)'}
        </button>
        
        <button onClick={() => setActiveServer('vidsrc_cc')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_cc' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 1</button>
        <button onClick={() => setActiveServer('vidsrc_to')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_to' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 2</button>
        <button onClick={() => setActiveServer('vidlink')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidlink' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 3</button>
        <button onClick={() => setActiveServer('smashy')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'smashy' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 4</button>
      </div>

      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <div style={{ width: '100%', height: '65vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {playerType === 'iptv-player' && activeServer === 'debrid' ? (
            <iframe src={`https://www.hlsplayer.net/mp4-player?src=${encodeURIComponent(resolvedStreamUrl)}`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
          ) : activeServer === 'debrid' && resolvedStreamUrl ? (
            <video id="rd-native-player" playsInline controls autoPlay style={{ width: '100%', height: '100%' }}>
              <source src={resolvedStreamUrl} type="video/mp4" />
            </video>
          ) : (
            /* تم إزالة قيود الـ Sandbox لتعود السيرفرات الاحتياطية للعمل فوراً وبدون رسالة الخطأ */
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
