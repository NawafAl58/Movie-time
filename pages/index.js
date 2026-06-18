import React, { useState, useEffect } from 'react';
import Script from 'next/script';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

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
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const type = activeTab === 'movies' ? 'movie' : 'tv';
        const res = await fetch(`${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (error) {
        console.error("Search error:", error);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  const currentItems = searchQuery.trim() !== '' ? searchResults : (activeTab === 'movies' ? trendingMovies : trendingShows);

  const getStreamUrl = (item) => {
    const type = activeTab === 'movies' ? 'movie' : 'tv';
    return `https://vidsrc.me/embed/${type}?tmdb=${item.id}`;
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '30px', direction: 'ltr', display: 'flex', flexDirection: 'column' }}>
      
      {/* كود السكربت الإعلاني */}
      <Script 
        src="https://pl29780684.effectivecpmnetwork.com/f311701da8f9ede7945e2f4e63498d76/invoke.js" 
        strategy="afterInteractive"
      />

      <div style={{ flex: 1 }}>
        {/* هيدر المنصة */}
        <header style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '20px', borderBottom: '2px solid #111', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
          <h1 style={{ color: '#e50914', fontSize: '36px', fontWeight: '900', letterSpacing: '2px', margin: 0 }}>CINEMA MATRIX</h1>
          
          {/* خانة البحث */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <input 
              type="text" 
              placeholder={`Search ${activeTab === 'movies' ? 'Movies' : 'TV Shows'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', padding: '14px 20px', fontSize: '16px', backgroundColor: '#141414', 
                color: 'white', border: '2px solid #222', borderRadius: '30px', outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#999', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            )}
          </div>

          {/* أزرار التنقل */}
          <div style={{ display: 'flex', gap: '20px' }}>
            <button 
              onClick={() => { setActiveTab('movies'); setSelectedMedia(null); setSearchQuery(''); }}
              style={{ backgroundColor: activeTab === 'movies' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '12px 30px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
            >
              Movies
            </button>
            <button 
              onClick={() => { setActiveTab('shows'); setSelectedMedia(null); setSearchQuery(''); }}
              style={{ backgroundColor: activeTab === 'shows' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '12px 30px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
            >
              TV Shows
            </button>
          </div>
        </header>

        {/* حاوية الإعلان الخاص بك */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <div id="container-f311701da8f9ede7945e2f4e63498d76" style={{ width: '100%', maxWidth: '1200px', minHeight: '90px' }}></div>
        </div>

        {/* مشغل الفيديو */}
        {selectedMedia && (
          <div style={{ marginBottom: '40px', backgroundColor: '#000', padding: '10px', borderRadius: '12px', border: '2px solid #e50914' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Now Playing: {selectedMedia.title || selectedMedia.name}</h3>
              <button onClick={() => setSelectedMedia(null)} style={{ backgroundColor: '#333', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Close Player ✕</button>
            </div>
            <div style={{ width: '100%', height: '60vh' }}>
              <iframe src={getStreamUrl(selectedMedia)} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} allowFullScreen scrolling="no"></iframe>
            </div>
          </div>
        )}

        {/* عرض المحتوى */}
        <main>
          <h2 style={{ fontSize: '26px', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {searchQuery.trim() !== '' ? `Search Results for "${searchQuery}"` : `Trending ${activeTab === 'movies' ? 'Movies' : 'TV Shows'}`}
          </h2>
          
          {currentItems.length === 0 ? (
            <p style={{ color: '#666', fontSize: '18px', textAlign: 'center' }}>No results found. Try another title.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '30px' }}>
              {currentItems.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => { setSelectedMedia(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ backgroundColor: '#111', borderRadius: '12px', overflow: 'hidden', border: selectedMedia?.id === item.id ? '3px solid #e50914' : '1px solid #222', cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img src={item.poster_path ? `${IMAGE_URL}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster+Found'} alt={item.title || item.name} style={{ width: '100%', height: '300px', objectFit: 'cover' }}/>
                  <div style={{ padding: '15px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#999' }}>
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

      {/* 🔒 حقوقك الرسمية أسفل الموقع (Footer) */}
      <footer style={{ width: '100%', textAlign: 'center', padding: '20px 0', borderTop: '1px solid #111', marginTop: '5px', fontSize: '14px', color: '#666', letterSpacing: '1px' }}>
        Powered by <span style={{ color: '#e50914', fontWeight: 'bold' }}>N58</span> &copy; {new Date().getFullYear()}
      </footer>

    </div>
  );
}
