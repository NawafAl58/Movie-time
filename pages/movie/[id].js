import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';

// 💎 تم وضع توكن حسابك الفعال هنا لتشغيل الأفلام بجودة بريميوم صافية
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

const customData = {
  "live_channels": [
    {
      "id": "bein-1",
      "name": "beIN SPORTS HD 1 (Main Stream) ⚽",
      "stream_url": "https://top.bodr.online/investing-in-emerging-markets-identifying-high-growth-opportunitiessss/",
      "stream_type": "iframe"
    },
    {
      "id": "bein-2",
      "name": "beIN SPORTS HD 2 (Backup Stream) ⚽",
      "stream_url": "https://top.bodr.online/investing-in-emerging-markets-identifying-high-growth-opportunitiessss/",
      "stream_type": "iframe"
    },
    {
      "id": "iptv-custom-live",
      "name": "📺 قائمة كل بثوث وقنوات سيرفر IPTV الخاص بك",
      "stream_url": "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8", 
      "stream_type": "iptv-player"
    }
  ],
  "arabic_movies": [],
  "arabic_series": []
};

export async function getServerSideProps(context) {
  const { id, type, url, streamType } = context.query;
  
  if (type === 'live' || id === 'iptv-custom-live') {
    return { 
      props: { 
        movieData: null, 
        liveData: { id: id || 'iptv-custom-live', url: url || '', streamType: streamType || 'iptv-player' }, 
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
  const [playerType, setPlayerType] = useState('iframe'); 

  const mediaType = movieData?.media_type_fixed || type || 'movie';
  const currentId = id || liveData?.id;

  useEffect(() => {
    const savedLang = localStorage.getItem('site_lang') || 'en';
    setLang(savedLang);
    if (isCustom) return;

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
  }, [lang, movieData, isCustom, mediaType]);

  useEffect(() => {
    if (isCustom && liveData) {
      const localChannel = customData.live_channels?.find(ch => ch.id === currentId);
      let targetUrl = localChannel ? localChannel.stream_url : liveData.url;
      let targetType = localChannel ? localChannel.stream_type : 'iframe';

      if (currentId === 'iptv-custom-live') {
        targetUrl = `https://www.hlsplayer.net/mp4-player?src=${encodeURIComponent("https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8")}`;
        targetType = 'iptv-player';
      }

      setStreamUrl(targetUrl);
      setPlayerType(targetType);
      setIsLoading(false);
      return;
    }

    if (!movie) return;

    const buildFullServersList = async () => {
      setIsLoading(true);
      const list = [];

      const customMovie = customData.arabic_movies?.find(m => m.id === currentId);
      const customSeries = customData.arabic_series?.find(s => s.id === currentId);
      const customUrl = customMovie?.stream_url || customSeries?.stream_url;

      if (customUrl) {
        list.push({ 
          id: 'custom-premium', 
          name: lang === 'ar' ? '🚀 تشغيل الرابط المباشر الصافي الخاص بك' : '🚀 Playing Your Custom Direct Link', 
          url: customUrl, 
          type: 'video' 
        });
      }

      if (movie.original_language === 'ar' || movie.origin_country?.includes('SA')) {
        try {
          const response = await fetch(`https://api.vidsrc.pm/v1/${mediaType}/${movie.id}`);
          const data = await response.json();
          if (data && data.url) {
            list.push({ id: 'native-ar', name: lang === 'ar' ? '🚀 سيرفر مباشر أصيل' : '🚀 Direct Native Stream', url: data.url, type: 'video' });
          }
        } catch (e) {}

        list.push({ id: 'vidapi-ar', name: lang === 'ar' ? '🎬 سيرفر عربي 1 (VidApi)' : '🎬 Arab Server 1 (VidApi)', url: `https://vidapi.stream/embed/${mediaType}/${movie.id}`, type: 'iframe' });
        list.push({ id: 'arabembed-ar', name: lang === 'ar' ? '🍿 سيرفر عربي 2 (ArabEmbed)' : '🍿 Arab Server 2 (ArabEmbed)', url: `https://arabembed.org/embed/${mediaType}/${movie.id}`, type: 'iframe' });
        list.push({ id: 'autoembed-ar', name: lang === 'ar' ? '📺 سيرفر عربي 3 (AutoEmbed)' : '📺 Arab Server 3 (AutoEmbed)', url: `https://autoembed.to/${mediaType}/tmdb/${movie.id}`, type: 'iframe' });
        list.push({ id: 'su-ar', name: lang === 'ar' ? '🌐 سيرفر عربي 4 (SU)' : '🌐 Arab Server 4 (SU)', url: `https://vidsrc.su/embed/${mediaType}/${movie.id}`, type: 'iframe' });
        list.push({ id: 'me-ar', name: lang === 'ar' ? '✨ سيرفر عربي 5 (ME)' : '✨ Arab Server 5 (ME)', url: `https://vidsrc.me/embed/${mediaType}/${movie.id}`, type: 'iframe' });
        list.push({ id: 'cc-ar', name: lang === 'ar' ? '🔥 سيرفر عربي 6 (CC)' : '🔥 Arab Server 6 (CC)', url: `https://vidsrc.cc/v2/embed/${mediaType}/${movie.id}`, type: 'iframe' });

        setServers(list);
        if (list.length > 0) {
          setActiveServerId(list[0].id);
          setStreamUrl(list[0].url);
          setPlayerType(list[0].type);
        }
        setIsLoading(false);
        return;
      }

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
            list.push({ id: 'debrid-4k', name: lang === 'ar' ? '💎 سيرفر بريميوم صافي 4K (Debrid)' : '💎 Premium 4K Stream (Debrid)', url: finalPremiumData.download, type: 'video' });
          }
        }
      } catch (err) {}

      list.push({ id: 'vidsrc-su', name: 'Server SU (Multi-Lang)', url: `https://vidsrc.su/embed/${mediaType}/${movie.id}`, type: 'iframe' });
      list.push({ id: 'vidsrc-to', name: 'Server TO (Auto-Subs)', url: `https://vidsrc.to/embed/${mediaType}/${movie.id}`, type: 'iframe' });
      list.push({ id: 'vidsrc-me', name: 'Server ME (Fast Load)', url: `https://vidsrc.me/embed/${mediaType}/${movie.id}`, type: 'iframe' });
      list.push({ id: 'vidsrc-cc', name: 'Server CC (Backup HQ)', url: `https://vidsrc.cc/v2/embed/${mediaType}/${movie.id}`, type: 'iframe' });

      setServers(list);
      if (list.length > 0) {
        setActiveServerId(list[0].id);
        setStreamUrl(list[0].url);
        setPlayerType(list[0].type);
      }
      setIsLoading(false);
    };

    buildFullServersList();
  }, [movie, isCustom, currentId, mediaType, lang]);

  const handleServerChange = (serverId, serverUrl, srvType) => {
    setActiveServerId(serverId);
    setStreamUrl(serverUrl);
    setPlayerType(srvType || 'iframe');
  };

  if (!isCustom && !movie) return <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>Content not found.</div>;

  const displayTitle = isCustom ? (currentId === 'bein-1' ? 'beIN SPORTS HD 1 ⚽' : currentId === 'bein-2' ? 'beIN SPORTS HD 2 ⚽' : 'كل قنوات البث الرياضي 📺') : (movie?.title || movie?.name || 'Unknown Content');
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
          {isLoading ? '🔍 جاري الاتصال بالبث...' : isCustom ? `🔴 البث الحي المباشر: ${displayTitle}` : `🍿 ${currentActiveServer?.name || ''}`}
        </h3>

        <div style={{ width: '100%', height: '65vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#e50914', fontSize: '20px', fontWeight: 'bold' }}>Searching Streams...</div>
          ) : playerType === 'iptv-player' ? (
            <iframe 
              src={`https://www.hlsplayer.net/mp4-player?src=${encodeURIComponent("https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8")}`} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allowFullScreen 
              allow="autoplay; encrypted-media"
            />
          ) : playerType === 'video' ? (
            <video src={streamUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <iframe src={streamUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="autoplay; encrypted-media"></iframe>
          )}
        </div>

        {!isCustom && !isLoading && servers.length > 0 && (
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
