import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w300'; 

// 📺 قائمة قنوات البث المباشر المجانية والمفتوحة (يمكنك إضافة أو تعديل الروابط لاحقاً)
const FREE_LIVE_CHANNELS = [
  { id: 'ch-quran', name: 'قناة القرآن الكريم 🕋', logo: 'https://images.unsplash.com/photo-1609599006353-e629abcbddc5?w=300', url: 'https://www.youtube.com/embed/live_stream?channel=UCuG6pZEnNf3P9-fO8S7I8GA&autoplay=1', type: 'iframe' },
  { id: 'ch-sunnah', name: 'قناة السنة النبوية 🕌', logo: 'https://images.unsplash.com/photo-1597935258735-e29001c544e8?w=300', url: 'https://www.youtube.com/embed/live_stream?channel=UC4g5Wby1X2C_f3xZ3-u67Jw&autoplay=1', type: 'iframe' },
  { id: 'ch-ekhbariya', name: 'قناة الإخبارية السعودية 🇸🇦', logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300', url: 'https://www.youtube.com/embed/live_stream?channel=UCzGv2F7nZ05g62M2g-R50QA&autoplay=1', type: 'iframe' },
  { id: 'ch-saudi-tv', name: 'قناة السعودية الأولى 📺', logo: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=300', url: 'https://www.youtube.com/embed/live_stream?channel=UCyS6m-pYh_rQd8r-tA6Yl0A&autoplay=1', type: 'iframe' }
];

const GENRES_EN = [
  { id: 'all', name: 'Trending 🔥' },
  { id: 'arabic', name: 'Arabic 🇸🇦' },
  { id: '28', name: 'Action 💥' },
  { id: '27', name: 'Horror 👻' },
  { id: '35', name: 'Comedy 😂' },
  { id: '18', name: 'Drama 🎭' }
];

const GENRES_AR = [
  { id: 'all', name: 'المحتوى الشائع 🔥' },
  { id: 'arabic', name: 'عربي 🇸🇦' },
  { id: '28', name: 'أكشن 💥' },
  { id: '27', name: 'رعب 👻' },
  { id: '35', name: 'كوميدي 😂' },
  { id: '18', name: 'دراما 🎭' }
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
    return [];
  }
}

export async function getServerSideProps() {
  try {
    const moviesEn = await fetchMultiplePages(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US`);
    const showsEn = await fetchMultiplePages(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US`);
    return { props: { initialMovies: moviesEn, initialShows: showsEn } };
  } catch (error) {
    return { props: { initialMovies: [], initialShows: [] } };
  }
}

export default function Home({ initialMovies, initialShows }) {
  const [lang, setLang] = useState('en'); 
  const [activeTab, setActiveTab] = useState('movies'); // 'movies', 'shows', 'live'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [genreItems, setGenreItems] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState(initialMovies);
  const [trendingShows, setTrendingShows] = useState(initialShows);

  useEffect(() => {
    const savedLang = localStorage.getItem('site_lang');
    if (savedLang) setLang(savedLang);
  }, []);

  const toggleLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('site_lang', newLang);
    setSearchQuery('');
    setSelectedGenre('all');
  };

  useEffect(() => {
    const refreshTrending = async () => {
      const currentLang = lang === 'ar' ? 'ar-SA' : 'en-US';
      const movies = await fetchMultiplePages(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=${currentLang}`);
      const shows = await fetchMultiplePages(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=${currentLang}`);
      setTrendingMovies(movies);
      setTrendingShows(shows);
    };
    refreshTrending();
  }, [lang]);

  useEffect(() => {
    if (searchQuery.trim() === '' || activeTab === 'live') {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      const type = activeTab === 'movies' ? 'movie' : 'tv';
      const currentLang = lang === 'ar' ? 'ar-SA' : 'en-US';
      try {
        const res = await fetch(`${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery)}&language=${currentLang}&page=1`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {}
    }, 400); 
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab, lang]);

  useEffect(() => {
    if (selectedGenre === 'all' || activeTab === 'live') {
      setGenreItems([]);
      return;
    }
    const fetchGenreData = async () => {
      const type = activeTab === 'movies' ? 'movie' : 'tv';
      const isArabicGenre = selectedGenre === 'arabic';
      const currentLang = isArabicGenre ? 'ar-SA' : (lang === 'ar' ? 'ar-SA' : 'en-US');
      let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&sort_by=popularity.desc&language=${currentLang}`;
      if (isArabicGenre) {
        url += `&with_original_language=ar`;
      } else {
        url += `&with_genres=${selectedGenre}`; 
      }
      const data = await fetchMultiplePages(url);
      setGenreItems(data);
    };
    fetchGenreData();
  }, [selectedGenre, activeTab, lang]);

  useEffect(() => {
    setSelectedGenre('all');
  }, [activeTab]);

  const genresList = lang === 'ar' ? GENRES_AR : GENRES_EN;
  let sectionTitle = lang === 'ar' ? (activeTab === 'movies' ? 'أحدث الأفلام الشائعة' : activeTab === 'shows' ? 'أحدث المسلسلات الشائعة' : 'قنوات البث المباشر 🔴') : (activeTab === 'movies' ? 'Trending Movies' : activeTab === 'shows' ? 'Trending TV Shows' : 'Live Channels 🔴');

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px', direction: lang === 'ar' ? 'rtl' : 'ltr', display: 'flex', flexDirection: 'column' }}>
      
      <style jsx global>{`
        html, body, #__next { margin: 0 !important; padding: 0 !important; background-color: #050505 !important; }
        .tv-focusable:focus { outline: none !important; border: 3px solid #e50914 !important; transform: scale(1.04) !important; background-color: #1c1c1c !important; box-shadow: 0 0 15px #e50914; }
        .btn-tv-focusable:focus { outline: none !important; background-color: #e50914 !important; color: white !important; transform: scale(1.1) !important; box-shadow: 0 0 10px #e50914; }
      `}</style>

      <div style={{ flex: 1 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '2px solid #111', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ color: '#e50914', fontSize: '30px', fontWeight: '900', letterSpacing: '2px', margin: 0 }}>CINEMA MATRIX</h1>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px', fontWeight: 'bold' }}>BY: NAWAF AL-NAZAWI</div>
          </div>
          
          <div style={{ display: 'flex', gap: '5px', backgroundColor: '#141414', padding: '4px', borderRadius: '20px', border: '1px solid #222' }}>
            <button className="btn-tv-focusable" onClick={() => toggleLanguage('en')} style={{ padding: '6px 15px', fontSize: '12px', fontWeight: 'bold', borderRadius: '15px', border: 'none', cursor: 'pointer', backgroundColor: lang === 'en' ? '#e50914' : 'transparent', color: 'white' }}>English</button>
            <button className="btn-tv-focusable" onClick={() => toggleLanguage('ar')} style={{ padding: '6px 15px', fontSize: '12px', fontWeight: 'bold', borderRadius: '15px', border: 'none', cursor: 'pointer', backgroundColor: lang === 'ar' ? '#e50914' : 'transparent', color: 'white' }}>العربية</button>
          </div>

          {activeTab !== 'live' && (
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <input type="text" placeholder={lang === 'ar' ? 'بحث...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="tv-focusable" style={{ width: '100%', padding: '12px 18px', fontSize: '15px', backgroundColor: '#141414', color: 'white', border: '2px solid #222', borderRadius: '30px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button tabIndex="0" className="btn-tv-focusable" onClick={() => { setActiveTab('movies'); setSearchQuery(''); }} style={{ backgroundColor: activeTab === 'movies' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 20px', fontSize: '15px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
              {lang === 'ar' ? 'الأفلام' : 'Movies'}
            </button>
            <button tabIndex="0" className="btn-tv-focusable" onClick={() => { setActiveTab('shows'); setSearchQuery(''); }} style={{ backgroundColor: activeTab === 'shows' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 20px', fontSize: '15px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
              {lang === 'ar' ? 'المسلسلات' : 'TV Shows'}
            </button>
            <button tabIndex="0" className="btn-tv-focusable" onClick={() => { setActiveTab('live'); setSearchQuery(''); }} style={{ backgroundColor: activeTab === 'live' ? '#06d6a0' : '#141414', color: 'white', border: 'none', padding: '10px 20px', fontSize: '15px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
              {lang === 'ar' ? '🔴 بث مباشر' : '🔴 Live TV'}
            </button>
          </div>
        </header>

        {activeTab !== 'live' && (
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '25px', scrollbarWidth: 'none' }}>
            {genresList.map((genre) => (
              <button key={genre.id} tabIndex="0" className="btn-tv-focusable" onClick={() => { setSelectedGenre(genre.id); }} style={{ backgroundColor: selectedGenre === genre.id ? '#fff' : '#111', color: selectedGenre === genre.id ? '#000' : '#fff', border: '1px solid #222', padding: '8px 18px', fontSize: '14px', fontWeight: 'bold', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {genre.id === 'arabic' ? (activeTab === 'movies' ? (lang === 'ar' ? 'عربي 🎬' : 'Arabic 🎬') : (lang === 'ar' ? 'عربي 📺' : 'Arabic 📺')) : genre.name}
              </button>
            ))}
          </div>
        )}

        <main>
          <h2 style={{ fontSize: '22px', marginBottom: '20px', textTransform: 'uppercase' }}>{sectionTitle}</h2>
          
          {activeTab === 'live' ? (
            /* 🔴 عرض قنوات البث المباشر */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
              {FREE_LIVE_CHANNELS.map((channel) => (
                <Link href={`/movie/${channel.id}?type=live&url=${encodeURIComponent(channel.url)}`} key={channel.id} legacyBehavior>
                  <div tabIndex="0" className="tv-focusable" style={{ backgroundColor: '#111', borderRadius: '12px', overflow: 'hidden', border: '2px solid #222', cursor: 'pointer', textAlign: 'center', paddingBottom: '15px' }}>
                    <img src={channel.logo} alt={channel.name} style={{ width: '100%', height: '120px', objectFit: 'cover', opacity: 0.8 }} />
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '15px 10px 0 10px', color: '#fff' }}>{channel.name}</h4>
                    <span style={{ fontSize: '11px', backgroundColor: '#e50914', color: 'white', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '8px', fontWeight: 'bold' }}>LIVE</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* 🎬 عرض الأفلام والمسلسلات */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
              {(searchQuery.trim() !== '' ? searchResults : (selectedGenre !== 'all' ? genreItems : (activeTab === 'movies' ? trendingMovies : trendingShows))).map((item) => {
                const displayName = item.title || item.name;
                const itemType = item.first_air_date || activeTab === 'shows' ? 'tv' : 'movie';
                return (
                  <Link href={`/movie/${item.id}?type=${itemType}`} key={item.id} legacyBehavior>
                    <div tabIndex="0" className="tv-focusable" style={{ backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', border: '1px solid #222', cursor: 'pointer' }}>
                      <img src={item.poster_path ? `${IMAGE_URL}${item.poster_path}` : 'https://via.placeholder.com/300x450'} alt={displayName} style={{ width: '100%', height: '210px', objectFit: 'cover' }}/>
                      <div style={{ padding: '10px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#999' }}>
                          <span>{item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || 'N/A'}</span>
                          <span style={{ color: '#ffb703', fontWeight: 'bold' }}>⭐ {item.vote_average?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <footer style={{ width: '100%', textAlign: 'center', padding: '15px 0', borderTop: '1px solid #111', marginTop: '40px', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
        Developed & Powered by <span style={{ color: '#e50914' }}>NAWAF AL-NAZAWI</span> &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
