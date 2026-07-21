// pages/movie/[id].js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'fe4b6ec1a6183fddf681565506956216'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RD_API_BASE = 'https://api.real-debrid.com/rest/1.0';
const DEBRID_API_TOKEN = process.env.NEXT_PUBLIC_REAL_DEBRID_API_KEY || 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

export default function MovieDetail() {
  const router = useRouter();
  const { id, type } = router.query;
  
  const [movieData, setMovieData] = useState(null);
  const [resolvedStreamUrl, setResolvedStreamUrl] = useState('');
  const [rdStatus, setRdStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeServer, setActiveServer] = useState('debrid');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  // المتغيرات الخاصة بالمسلسلات (افتراضياً الموسم 1 الحلقة 1)
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  const videoRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    async function fetchAllData() {
      setLoading(true);
      setRdStatus('loading');
      setErrorMessage('');
      
      let finalType = type === 'tv' ? 'tv' : 'movie';
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
        console.error("TMDB Fetch Error:", e);
      }

      if (mData && imdbId) {
        try {
          const queryTarget = finalType === 'tv' ? `${imdbId}:${season}:${episode}` : imdbId;

          // 1. طلب Torrentio المباشر مع Real-Debrid
          const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${DEBRID_API_TOKEN}/stream/${finalType}/${queryTarget}.json`;
          const tRes = await fetch(torrentioUrl);
          
          if (tRes.ok) {
            const tData = await tRes.json();
            
            if (tData && tData.streams && tData.streams.length > 0) {
              const compatibleStream = tData.streams.find(s => 
                s.url && (s.url.includes('.mp4') || s.name?.includes('x264') || s.title?.includes('x264'))
              ) || tData.streams.find(s => s.url && s.url.startsWith('http'));

              if (compatibleStream && compatibleStream.url) {
                setResolvedStreamUrl(compatibleStream.url);
                setRdStatus('ready');
                setActiveServer('debrid');
                setLoading(false);
                return;
              }
            }
          }

          // 2. المحاولة الاحتياطية
          const fbRes = await fetch(`https://torrentio.strem.fun/stream/${finalType}/${queryTarget}.json`);
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            if (fbData && fbData.streams && fbData.streams.length > 0) {
              const firstHash = fbData.streams.find(s => s.infoHash)?.infoHash;
              
              if (firstHash) {
                const formData = new URLSearchParams();
                formData.append('magnet', `magnet:?xt=urn:btih:${firstHash}`);

                const addRes = await fetch(`${RD_API_BASE}/torrents/addMagnet`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` },
                  body: formData
                });

                if (addRes.ok) {
                  const addData = await addRes.json();
                  const selectData = new URLSearchParams();
                  selectData.append('files', 'all');

                  await fetch(`${RD_API_BASE}/torrents/selectFiles/${addData.id}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` },
                    body: selectData
                  });

                  const infoRes = await fetch(`${RD_API_BASE}/torrents/info/${addData.id}`, {
                    headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` }
                  });

                  if (infoRes.ok) {
                    const infoData = await infoRes.json();
                    if (infoData.links && infoData.links.length > 0) {
                      const unrestrictData = new URLSearchParams();
                      unrestrictData.append('link', infoData.links[0]);

                      const unRes = await fetch(`${RD_API_BASE}/unrestrict/link`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` },
                        body: unrestrictData
                      });

                      if (unRes.ok) {
                        const unData = await unRes.json();
                        if (unData.download) {
                          setResolvedStreamUrl(unData.download);
                          setRdStatus('ready');
                          setActiveServer('debrid');
                          setLoading(false);
                          return;
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          setRdStatus('failed');
          setErrorMessage('لم يتم العثور على كاش جاهز لهذه الحلقة.');
          setActiveServer('vidsrc_cc');

        } catch (err) {
          console.error("RD Fetch Error:", err);
          setRdStatus('failed');
          setErrorMessage('خطأ في الاتصال بالسيرفر.');
          setActiveServer('vidsrc_cc');
        }
      } else {
        setRdStatus('failed');
        setErrorMessage('تعذر جلب معرّف المحتوى.');
        setActiveServer('vidsrc_cc');
      }
      setLoading(false);
    }

    fetchAllData();
  }, [id, type, season, episode]);

  useEffect(() => {
    if (activeServer === 'debrid' && resolvedStreamUrl && videoRef.current) {
      videoRef.current.load();
    }
  }, [activeServer, resolvedStreamUrl]);

  // دالة الإضافة للمفضلة وقوائم المشاهدة في Supabase
  const saveToLibrary = async (listType) => {
    setActionMsg('');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('يرجى تسجيل الدخول أولاً لإضافة العروض إلى مكتبتك!');
      router.push('/login');
      return;
    }

    const { error } = await supabase.from('user_library').upsert({
      user_id: user.id,
      media_id: String(id),
      media_type: type || (movieData?.media_type_fixed || 'movie'),
      title: movieData?.title || movieData?.name || 'محتوى بدون عنوان',
      poster_path: movieData?.poster_path || '',
      vote_average: movieData?.vote_average || 0,
      list_type: listType
    });

    if (error) {
      setActionMsg('❌ حدث خطأ أثناء الحفظ');
    } else {
      setActionMsg(listType === 'favorites' ? '❤️ تمت الإضافة للمفضلة!' : '📌 تمت الإضافة لقائمة المشاهدة!');
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'white', backgroundColor: '#050505', minHeight: '100vh', direction: 'rtl' }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <h3 style={{ color: '#e50914' }}>🍿 جاري جلب البث المباشر...</h3>
        </div>
      </div>
    );
  }

  const isTvShow = (type === 'tv' || movieData?.media_type_fixed === 'tv');
  const displayTitle = movieData ? (movieData.title || movieData.name) : 'بث مباشر 📺';

  const embedUrl = isTvShow 
    ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`
    : `https://vidsrc.cc/v2/embed/movie/${id}`;

  const servers = {
    vidsrc_cc: embedUrl,
    vidsrc_to: isTvShow ? `https://vidsrc.to/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.to/embed/movie/${id}`,
    vidlink: isTvShow ? `https://vidlink.pro/embed/tv/${id}/${season}/${episode}` : `https://vidlink.pro/embed/movie/${id}`,
    smashy: `https://embed.smashystream.com/playere.php?tmdb=${id}`
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <Head>
        <title>{displayTitle} - CINEMATRIX</title>
      </Head>

      {/* Navbar الموحد */}
      <Navbar />

      <div style={{ padding: '20px' }}>
        <button onClick={() => router.push('/')} style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
          ← العودة للرئيسية
        </button>

        {movieData && (
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <img src={movieData.poster_path ? `https://image.tmdb.org/t/p/w300${movieData.poster_path}` : 'https://via.placeholder.com/300x450'} alt={displayTitle} style={{ borderRadius: '12px', width: '220px', objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h1 style={{ fontSize: '36px', color: '#e50914', margin: '0 0 10px 0', fontWeight: 'bold' }}>{displayTitle}</h1>
              <p style={{ color: '#aaa', fontSize: '14px' }}>تاريخ الإصدار: {movieData.release_date || movieData.first_air_date} | ⭐ {movieData.vote_average?.toFixed(1)}</p>

              {/* أزرار الإضافة للمفضلة وقوائم المشاهدة */}
              <div style={{ display: 'flex', gap: '12px', margin: '15px 0', flexWrap: 'wrap' }}>
                <button
                  onClick={() => saveToLibrary('favorites')}
                  style={{ padding: '10px 18px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ❤️ إضافة للمفضلة
                </button>

                <button
                  onClick={() => saveToLibrary('watchlist')}
                  style={{ padding: '10px 18px', backgroundColor: '#141414', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  📌 مشاهدة لاحقاً
                </button>
              </div>

              {actionMsg && <p style={{ color: '#4caf50', fontSize: '14px', fontWeight: 'bold', marginBottom: '15px' }}>{actionMsg}</p>}

              <div style={{ margin: '15px 0', padding: '10px 15px', backgroundColor: '#111', borderRight: '4px solid #e50914', fontSize: '13px', color: '#e50914', fontWeight: 'bold' }}>
                حقوق النشر والتشغيل محفوظة لـ: نواف النزاوي
              </div>
              <p style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '10px', color: '#ddd' }}>{movieData.overview || "لا يوجد وصف متاح حالياً."}</p>
            </div>
          </div>
        )}

        {/* خيارات المواسم والحلقات عند اختيار مسلسل */}
        {isTvShow && (
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', backgroundColor: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #222' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              الموسم:
              <input 
                type="number" 
                min="1" 
                value={season} 
                onChange={(e) => setSeason(Number(e.target.value))} 
                style={{ width: '60px', padding: '8px', backgroundColor: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              الحلقة:
              <input 
                type="number" 
                min="1" 
                value={episode} 
                onChange={(e) => setEpisode(Number(e.target.value))} 
                style={{ width: '60px', padding: '8px', backgroundColor: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
              />
            </label>
          </div>
        )}

        {/* أزرار السيرفرات */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <button 
            onClick={() => setActiveServer('debrid')}
            disabled={rdStatus !== 'ready'}
            style={{
              padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', 
              cursor: rdStatus === 'ready' ? 'pointer' : 'not-allowed',
              backgroundColor: activeServer === 'debrid' ? '#e50914' : '#111',
              color: rdStatus === 'ready' ? '#fff' : '#666',
              border: '1px solid #333'
            }}
          >
            💎 Real-Debrid الأصيل (بدون إعلانات 🛡️) {rdStatus === 'failed' && `(${errorMessage || 'غير متاح'})`}
          </button>
          
          <button onClick={() => setActiveServer('vidsrc_cc')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_cc' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 1</button>
          <button onClick={() => setActiveServer('vidsrc_to')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidsrc_to' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 2</button>
          <button onClick={() => setActiveServer('vidlink')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'vidlink' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 3</button>
          <button onClick={() => setActiveServer('smashy')} style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeServer === 'smashy' ? '#e50914' : '#111', color: '#fff', border: '1px solid #333' }}>سيرفر احتياطي 4</button>
        </div>

        <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
          <div style={{ width: '100%', height: '65vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            {activeServer === 'debrid' && resolvedStreamUrl ? (
              <video 
                ref={videoRef}
                controls 
                autoPlay 
                playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              >
                <source src={resolvedStreamUrl} />
              </video>
            ) : (
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
    </div>
  );
}
