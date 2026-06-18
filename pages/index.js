import React, { useState, useEffect } from 'react';
import Script from 'next/script';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w300'; // تم تقليل جودة جلب الصورة إلى w300 لتسريع تحميل البوسترات الصغيرة

const GENRES = [
  { id: 'all', name: 'Trending 🔥' },
  { id: '28', name: 'Action 💥' },
  { id: '27', name: 'Horror 👻' },
  { id: '35', name: 'Comedy 😂' },
  { id: '10749', name: 'Romance ❤️' },
  { id: '878', name: 'Sci-Fi 🚀' },
  { id: '18', name: 'Drama 🎭' }
];

export async function getServerSideProps() {
  try {
    const [moviesRes, showsRes] = await Promise.all([
      fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US`),
      fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US`)
    ]);

    const moviesData = await moviesRes.json();
    const showsData = await showsRes.json();

    return { 
      props: { 
        trendingMovies: moviesData.results || [], 
        trendingShows: showsData.results || [] 
      } 
    };
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

  useEffect(() => {
    if (selectedGenre === 'all') {
      setGenreItems([]);
      return;
    }

    const fetchGenreData = async () => {
      try {
        const type = activeTab === 'movies' ? 'movie' : 'tv';
        const res = await fetch(`${BASE_URL}/discover/${type}?api_key=${API_KEY}&with_genres=${selectedGenre}&sort_by=popularity.desc&language=en-US`);
        const data = await res.json();
        setGenreItems(data.results || []);
      } catch (error) {
        console.error("Genre fetch error:", error);
      }
    };

    fetchGenreData();
  }, [selectedGenre, activeTab]);

  useEffect(() => {
    setSelectedGenre('all');
  }, [activeTab, searchQuery]);

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

  const getStreamUrl = (item) => {
    const type = activeTab === 'movies' ? 'movie' : 'tv';
    return `https://vidsrc.me/embed/${type}?tmdb=${item.id}`;
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px', direction: 'ltr', display: 'flex', flexDirection: 'column' }}>
      
      <Script 
        src="https://pl29780684.effectivecpmnetwork.com/f311701da8f9ede7945e2f4e63498d76/invoke.js" 
        strategy="afterInteractive"
      />

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
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#999', fontSize: '14px', cursor: 'pointer' }}>✕</button>
            )}
          </div>

          {/* أزرار التنقل */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              onClick={() => { setActiveTab('movies'); setSelectedMedia(null); }}
              style={{ backgroundColor: activeTab === 'movies' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 25px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
            >
              Movies
            </button>
            <button 
              onClick={() => { setActiveTab('shows'); setSelectedMedia(null); }}
              style={{ backgroundColor: activeTab === 'shows' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 25px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
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
              onClick={() => { setSelectedGenre(genre.id); setSelectedMedia(null); }}
              style={{
                backgroundColor: selectedGenre === genre.id ? '#white' : '#111',
                color: selectedGenre === genre.id ? '#000' : '#fff',
                border: '1px solid #222',
                padding: '8px 18px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '20px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* حاوية الإعلان المدمج */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div id="container-f311701da8f9ede7945e2f4e63498d76" style={{ width: '100%', maxWidth: '1200px', minHeight: '90px' }}></div>
        </div>

        {/* مشغل الفيديو */}
        {selectedMedia && (
          <div style={{ marginBottom: '30px', backgroundColor: '#000', padding: '10px', borderRadius: '12px', border: '2px solid #e50914' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Now Playing: {selectedMedia.title || selectedMedia.name}</h3>
              <button onClick={() => setSelectedMedia(null)} style={{ backgroundColor: '#333', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Close Player ✕</button>
            </div>
            <div style={{ width: '100%', height: '55vh' }}>
              <iframe src={getStreamUrl(selectedMedia)} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} allowFullScreen scrolling="no"></iframe>
            </div>
          </div>
        )}

        {/* عرض المحتوى المُرتب والأصغر (تحديث الـ Grid والـ Dimensions) */}
        <main>
          <h2 style={{ fontSize: '22px', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>{sectionTitle}</h2>
          
          {currentItems.length === 0 ? (
            <p style={{ color: '#666', fontSize: '16px', textAlign: 'center' }}>No results found. Try another category.</p>
          ) : (
            // تم تغيير minmax إلى 140px لزيادة عدد الأفلام المعروضة في السطر الواحد بشكل مرتب
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
              {currentItems.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => { setSelectedMedia(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', border: selectedMedia?.id === item.id ? '2px solid #e50914' : '1px solid #222', cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {/* تم تقليل الارتفاع إلى 210px ليتناسب مع العرض الجديد */}
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

      {/* فوتر حقوق الملكية */}
      <footer style={{ width: '100%', textAlign: 'center', padding: '15px 0', borderTop: '1px solid #111', marginTop: '40px', fontSize: '12px', color: '#666', letterSpacing: '1px' }}>
        Powered by <span style={{ color: '#e50914', fontWeight: 'bold' }}>N58</span> &copy; {new Date().getFullYear()}
      </footer>

    </div>
  );
}
