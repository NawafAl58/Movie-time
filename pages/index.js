import React, { useState, useEffect, useRef } from 'react';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w300'; 

// 🔑 توكن حسابك الصحيح والفعال من Real-Debrid
const DEBRID_API_TOKEN = 'O5H7M7ITDE3LJ63T3QXHTROL4VAZKYRL47HSTSQGNW4DD6B4XE2Q';

const GENRES = [
  { id: 'all', name: 'Trending 🔥' },
  { id: 'arabic_movies', name: 'أفلام عربية 🎬' }, 
  { id: 'arabic_shows', name: 'مسلسلات عربية 📺' }, 
  { id: '28', name: 'Action 💥' },
  { id: '27', name: 'Horror 👻' },
  { id: '35', name: 'Comedy 😂' },
  { id: '10749', name: 'Romance ❤️' },
  { id: '878', name: 'Sci-Fi 🚀' },
  { id: '18', name: 'Drama 🎭' }
];

async function fetchMultiplePages(urlWithoutPage, totalPages = 3) {
  try {
    const promises = [];
    for (let i = 1; i <= totalPages; i++) {
      promises.push(fetch(`${urlWithoutPage}&page=${i}`).then(res => res.json()));
    }
    const results = await Promise.all(promises);
    return results.reduce((acc, curr) => acc.concat(curr.results || []), []);
  } catch (error) {
    console.error("Error fetching multiple pages:", error);
    return [];
  }
}

export async function getServerSideProps() {
  try {
    const moviesData = await fetchMultiplePages(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US`);
    const showsData = await fetchMultiplePages(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US`);
    return { props: { trendingMovies: moviesData, trendingShows: showsData } };
  } catch (error) {
    return { props: { trendingMovies: [], trendingShows: [] } };
  }
}

export default function Home({ trendingMovies, trendingShows }) {
  const [activeTab, setActiveTab] = useState('movies'); 
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [streamUrl, setStreamUrl] = useState(''); // ◀ تخزين رابط الـ 4K البريميوم المباشر
  const [isLoadingLink, setIsLoadingLink] = useState(false); // ◀ حالة التحميل أثناء توليد الرابط
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [genreItems, setGenreItems] = useState([]);
  
  const playerRef = useRef(null);

  // 🔍 البحث التلقائي الفوري للافلام والمسلسلات
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      const type = activeTab === 'movies' ? 'movie' : 'tv';
      try {
        const res = await fetch(`${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US&page=1`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 400); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  // جلب البيانات حسب التصنيف ودعم المحتوى العربي
  useEffect(() => {
    if (selectedGenre === 'all') {
      setGenreItems([]);
      return;
    }
    
    const fetchGenreData = async () => {
      let type = activeTab === 'movies' ? 'movie' : 'tv';
      
      if (selectedGenre === 'arabic_movies') type = 'movie';
      if (selectedGenre === 'arabic_shows') type = 'tv';

      let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&sort_by=popularity.desc&language=ar-SA`;
      
      if (selectedGenre === 'arabic_movies' || selectedGenre === 'arabic_shows') {
        url += `&with_original_language=ar`; 
      } else {
        url += `&with_genres=${selectedGenre}`; 
      }
      
      const data = await fetchMultiplePages(url);
      setGenreItems(data);
    };
    
    fetchGenreData();
  }, [selectedGenre, activeTab]);

  useEffect(() => {
    setSelectedGenre('all');
  }, [activeTab, searchQuery]);

  // تأثير لجلب رابط الـ 4K البريميوم فور اختيار الفيلم أو المسلسل
  useEffect(() => {
    if (!selectedMedia) {
      setStreamUrl('');
      return;
    }

    const fetchPremiumLink = async () => {
      setIsLoadingLink(true);
      const queryName = selectedMedia.title || selectedMedia.name;
      const year = selectedMedia.release_date?.split('-')[0] || selectedMedia.first_air_date?.split('-')[0] || '';
      
      try {
        // 1. البحث التلقائي عن جودة 4K في التورنتس العامة
        const torrentSearchUrl = `https://api.apibay.org/q.php?q=${encodeURIComponent(queryName + ' ' + year + ' 4K')}`;
        const torrentRes = await fetch(torrentSearchUrl);
        const torrents = await torrentRes.json();
        
        let targetTorrent = torrents && torrents.length > 0 ? torrents[0] : null;

        // خيار بديل إذا لم يجد نسخة 4K يبحث عن 1080p
        if (!targetTorrent || targetTorrent.info_hash === "0000000000000000000000000000000000000000") {
          const fallbackRes = await fetch(`https://api.apibay.org/q.php?q=${encodeURIComponent(queryName + ' ' + year + ' 1080p')}`);
          const fallbackTorrents = await fallbackRes.json();
          if (fallbackTorrents && fallbackTorrents.length > 0) {
            targetTorrent = fallbackTorrents[0];
          }
        }

        if (!targetTorrent || targetTorrent.info_hash === "0000000000000000000000000000000000000000") {
          // إذا لم يجد روابط تورنت إطلاقاً، نرجع للسيرفر الإفتراضي كخيار احتياطي لضمان التشغيل دائماً
          const type = activeTab === 'movies' ? 'movie' : 'tv';
          setStreamUrl(`https://vidsrc.to/embed/${type}/${selectedMedia.id}`);
          setIsLoadingLink(false);
          return;
        }

        const magnetLink = `magnet:?xt=urn:btih:${targetTorrent.info_hash}&dn=${encodeURIComponent(targetTorrent.name)}`;

        // 2. إرسال للـ Real-Debrid لفك التشفير وتوليد الرابط المباشر العالي الجودة
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
          const debridLink = finalInfo.links[0];
          const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${DEBRID_API_TOKEN}` },
            body: new URLSearchParams({ link: debridLink })
          });
          const finalPremiumData = await unrestrictRes.json();
          setStreamUrl(finalPremiumData.download);
        } else {
          // احتياطي
          const type = activeTab === 'movies' ? 'movie' : 'tv';
          setStreamUrl(`https://vidsrc.to/embed/${type}/${selectedMedia.id}`);
        }
      } catch (err) {
        console.error("Real-Debrid error, falling back:", err);
        const type = activeTab === 'movies' ? 'movie' : 'tv';
        setStreamUrl(`https://vidsrc.to/embed/${type}/${selectedMedia.id}`);
      }
      setIsLoadingLink(false);
    };

    fetchPremiumLink();

    if (playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedMedia]);

  let currentItems = [];
  let sectionTitle = `Trending ${activeTab === 'movies' ? 'Movies' : 'TV Shows'}`;

  if (searchQuery.trim() !== '') {
    currentItems = searchResults;
    sectionTitle = `Search Results for "${searchQuery}"`;
  } else if (selectedGenre !== 'all') {
    currentItems = genreItems;
    const genreObj = GENRES.find(g => g.id === selectedGenre);
    if (selectedGenre.startsWith('arabic')) {
      sectionTitle = genreObj ? genreObj.name : '';
    } else {
      sectionTitle = `${genreObj ? genreObj.name : ''} - ${activeTab === 'movies' ? 'Movies' : 'TV Shows'}`;
    }
  } else {
    currentItems = activeTab === 'movies' ? trendingMovies : trendingShows;
  }

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px', direction: 'ltr', display: 'flex', flexDirection: 'column' }}>
      
      <style jsx global>{`
        .tv-focusable:focus {
          outline: none !important;
          border: 3px solid #e50914 !important;
          transform: scale(1.04) !important;
          background-color: #1c1c1c !important;
          box-shadow: 0 0 15px #e50914;
        }
        .btn-tv-focusable:focus {
          outline: none !important;
          background-color: #e50914 !important;
          color: white !important;
          transform: scale(1.1) !important;
          box-shadow: 0 0 10px #e50914;
        }
      `}</style>

      <div style={{ flex: 1 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '2px solid #111', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h1 style={{ color: '#e50914', fontSize: '30px', fontWeight: '900', letterSpacing: '2px', margin: 0 }}>CINEMA MATRIX</h1>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
            <input 
              type="text" 
              placeholder={`Search...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tv-focusable"
              tabIndex="0"
              style={{ 
                width: '100%', padding: '12px 18px', fontSize: '15px', backgroundColor: '#141414', 
                color: 'white', border: '2px solid #222', borderRadius: '30px', outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              tabIndex="0"
              className="btn-tv-focusable"
              onClick={() => { setActiveTab('movies'); setSelectedMedia(null); setSearchQuery(''); }}
              style={{ backgroundColor: activeTab === 'movies' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 25px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.1s' }}
            >
              Movies
            </button>
            <button 
              tabIndex="0"
              className="btn-tv-focusable"
              onClick={() => { setActiveTab('shows'); setSelectedMedia(null); setSearchQuery(''); }}
              style={{ backgroundColor: activeTab === 'shows' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 25px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.1s' }}
            >
              TV Shows
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '25px', scrollbarWidth: 'none' }}>
          {GENRES.map((genre) => (
            <button
              key={genre.id}
              tabIndex="0"
              className="btn-tv-focusable"
              onClick={() => { setSelectedGenre(genre.id); setSelectedMedia(null); }}
              style={{
                backgroundColor: selectedGenre === genre.id ? '#fff' : '#111',
                color: selectedGenre === genre.id ? '#000' : '#fff',
                border: '1px solid #222',
                padding: '8px 18px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '20px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.1s'
              }}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* 📺 مشغل الفيديو المطور بدقة 4K وصوت كامل بدون قيود الـ iframe */}
        {selectedMedia && (
          <div ref={playerRef} style={{ marginBottom: '30px', backgroundColor: '#000', padding: '15px', borderRadius: '12px', border: '2px solid #e50914' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#fff' }}>
                {isLoadingLink ? '🔍 Generating Premium Link...' : `💎 Now Playing (Premium): ${selectedMedia.title || selectedMedia.name}`}
              </h3>
              <button 
                tabIndex="0"
                className="btn-tv-focusable"
                onClick={() => { setSelectedMedia(null); setStreamUrl(''); }} 
                style={{ backgroundColor: '#333', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Close Player ✕
              </button>
            </div>

            <div style={{ width: '100%', height: '55vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              {isLoadingLink ? (
                <div style={{ textAlign: 'center', color: '#e50914' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Bypassing & Fetching 4K BluRay Torrent...</div>
                  <div style={{ fontSize: '14px', color: '#999' }}>Real-Debrid API is unrestricting your high-speed stream</div>
                </div>
              ) : streamUrl.includes('embed') ? (
                /* في حال لم يجد تورنت يعود تلقائياً للـ iframe كخيار احتياطي */
                <iframe src={streamUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen></iframe>
              ) : (
                /* مشغل الفيديو الأصلي الفاخر للأفلام المباشرة والـ 4K الصوت فيه 100% طاقة */
                <video 
                  id="main-tv-player"
                  src={streamUrl} 
                  controls
                  autoPlay
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  className="tv-focusable"
                  tabIndex="0"
                />
              )}
            </div>
          </div>
        )}

        <main>
          <h2 style={{ fontSize: '22px', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>{sectionTitle}</h2>
          
          {currentItems.length === 0 ? (
            <p style={{ color: '#666', fontSize: '16px', textAlign: 'center' }}>No results found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
              {currentItems.map((item) => (
                <div 
                  key={item.id} 
                  tabIndex="0" 
                  className="tv-focusable" 
                  onClick={() => setSelectedMedia(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                      e.preventDefault();
                      setSelectedMedia(item);
                    }
                  }} 
                  style={{ backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', border: selectedMedia?.id === item.id ? '2px solid #e50914' : '1px solid #222', cursor: 'pointer', transition: 'transform 0.1s' }}
                >
                  <img src={item.poster_path ? `${IMAGE_URL}${item.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster'} alt={item.title || item.name} style={{ width: '100%', height: '210px', objectFit: 'cover' }}/>
                  <div style={{ padding: '10px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#999' }}>
                      <span>{item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || 'N/A'}</span>
                      <span style={{ color: '#ffb703', fontWeight: 'bold' }}>⭐ {item.vote_average?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <footer style={{ width: '100%', textAlign: 'center', padding: '15px 0', borderTop: '1px solid #111', marginTop: '40px', fontSize: '12px', color: '#666', letterSpacing: '1px' }}>
        Powered by <span style={{ color: '#e50914', fontWeight: 'bold' }}>N58</span> &copy; {new Date().getFullYear()}
      </footer>

    </div>
  );
}
