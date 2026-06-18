import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w300'; 

const GENRES = [
  { id: 'all', name: 'Trending 🔥' },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [genreItems, setGenreItems] = useState([]);
  
  const playerRef = useRef(null);

  useEffect(() => {
    if (selectedGenre === 'all') {
      setGenreItems([]);
      return;
    }
    const fetchGenreData = async () => {
      const type = activeTab === 'movies' ? 'movie' : 'tv';
      const data = await fetchMultiplePages(`${BASE_URL}/discover/${type}?api_key=${API_KEY}&with_genres=${selectedGenre}&sort_by=popularity.desc&language=en-US`);
      setGenreItems(data);
    };
    fetchGenreData();
  }, [selectedGenre, activeTab]);

  useEffect(() => {
    setSelectedGenre('all');
  }, [activeTab, searchQuery]);

  // التركيز التلقائي على المشغل عند فتح الفيلم عشان يسهل التحكم بالريموت
  useEffect(() => {
    if (selectedMedia && playerRef.current) {
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
    sectionTitle = `${genreObj ? genreObj.name : ''} - ${activeTab === 'movies' ? 'Movies' : 'TV Shows'}`;
  } else {
    currentItems = activeTab === 'movies' ? trendingMovies : trendingShows;
  }

  // تحديث السيرفر إلى vidsrc.to الأكثر استقراراً ودعماً للشاشات
  const getStreamUrl = (item) => {
    const type = activeTab === 'movies' ? 'movie' : 'tv';
    return `https://vidsrc.to/embed/${type}/${item.id}`;
  };

  // دالة ذكية لمعالجة ضغطات أزرار ريموت التلفزيون (زر الـ OK أو Enter)
  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      setSelectedMedia(item);
    }
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px', direction: 'ltr', display: 'flex', flexDirection: 'column' }}>
      
      <Script 
        src="https://pl29780684.effectivecpmnetwork.com/f311701da8f9ede7945e2f4e63498d76/invoke.js" 
        strategy="afterInteractive"
      />

      <style jsx global>{`
        /* تأثيرات حركة الريموت عند تحديد العناصر لتسهيل التصفح على التلفزيون */
        .tv-focusable:focus {
          outline: none !important;
          border: 3px solid #e50914 !important;
          transform: scale(1.08) !important;
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
        {/* هيدر المنصة */}
        <header style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '2px solid #111', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h1 style={{ color: '#e50914', fontSize: '30px', fontWeight: '900', letterSpacing: '2px', margin: 0 }}>CINEMA MATRIX</h1>
          
          {/* خانة البحث */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
            <input 
              type="text" 
              placeholder={`Search...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', padding: '12px 18px', fontSize: '15px', backgroundColor: '#141414', 
                color: 'white', border: '2px solid #222', borderRadius: '30px', outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* أزرار التنقل */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              tabIndex="0"
              className="btn-tv-focusable"
              onClick={() => { setActiveTab('movies'); setSelectedMedia(null); }}
              style={{ backgroundColor: activeTab === 'movies' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 25px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.1s' }}
            >
              Movies
            </button>
            <button 
              tabIndex="0"
              className="btn-tv-focusable"
              onClick={() => { setActiveTab('shows'); setSelectedMedia(null); }}
              style={{ backgroundColor: activeTab === 'shows' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 25px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.1s' }}
            >
              TV Shows
            </button>
          </div>
        </header>

        {/* شريط التصنيفات */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px', scrollbarWidth: 'none' }}>
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

        {/* حاوية الإعلان */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div id="container-f311701da8f9ede7945e2f4e63498d76" style={{ width: '100%', maxWidth: '1200px', minHeight: '90px' }}></div>
        </div>

        {/* مشغل الفيديو الذكي */}
        {selectedMedia && (
          <div ref={playerRef} style={{ marginBottom: '30px', backgroundColor: '#000', padding: '10px', borderRadius: '12px', border: '2px solid #e50914' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Now Playing: {selectedMedia.title || selectedMedia.name}</h3>
              <button 
                tabIndex="0"
                className="btn-tv-focusable"
                onClick={() => setSelectedMedia(null)} 
                style={{ backgroundColor: '#333', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Close Player ✕
              </button>
            </div>
            <div style={{ width: '100%', height: '55vh' }}>
              <iframe src={getStreamUrl(selectedMedia)} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} allowFullScreen scrolling="no"></iframe>
            </div>
          </div>
        )}

        {/* شبكة عرض الأفلام */}
        <main>
          <h2 style={{ fontSize: '22px', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>{sectionTitle}</h2>
          
          {currentItems.length === 0 ? (
            <p style={{ color: '#666', fontSize: '16px', textAlign: 'center' }}>No results found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
              {currentItems.map((item) => (
                <div 
                  key={item.id} 
                  tabIndex="0" // تفعيل التركيز بالريموت
                  className="tv-focusable" // كلاس التلفزيون المخصص
                  onClick={() => setSelectedMedia(item)}
                  onKeyDown={(e) => handleKeyDown(e, item)} // تشغيل الفيلم عند ضغط OK بالريموت
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
