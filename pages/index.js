import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w300'; 

const FREE_LIVE_CHANNELS = [
  { id: 'bein-sports-1', name: 'beIN SPORTS 1 HD ⚽', logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', type: 'hls' },
  { id: 'bein-sports-2', name: 'beIN SPORTS 2 HD ⚽', logo: 'https://images.unsplash.com/photo-1540747737956-378724044602?w=300', url: 'https://cdn.theoplayer.com/video/elephants-dream/playlist.m3u8', type: 'hls' },
  { id: 'bein-sports-3', name: 'beIN SPORTS 3 HD ⚽', logo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300', url: 'https://playertest.longtailvideo.com/adaptive/bipbop/bipbop.m3u8', type: 'hls' },
  { id: 'ssc-sports-1', name: 'SSC SPORTS 1 HD 🇸🇦', logo: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300', url: 'https://amc-cdn.eccdnx.com/live/amc.m3u8', type: 'hls' },
  { id: 'ssc-sports-2', name: 'SSC SPORTS 2 HD 🇸🇦', logo: 'https://images.unsplash.com/photo-1551958219-acbc608c6d77?w=300', url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8', type: 'hls' },
  { id: 'saudi-sports-1', name: 'القناة الرياضية السعودية 1 📺', logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8', type: 'hls' },
  { id: 'ch-quran', name: 'قناة القرآن الكريم بث مباشر 🕋', logo: 'https://images.unsplash.com/photo-1609599006353-e629abcbddc5?w=300', url: 'https://www.youtube.com/embed/live_stream?channel=UCuG6pZEnNf3P9-fO8S7I8GA&autoplay=1', type: 'iframe' }
];

const GENRES_EN = [
  { id: 'all', name: 'Trending 🔥' },
  { id: 'arabic', name: 'Arabic 🇸🇦' },
  { id: '28', name: 'Action 💥' }
];

const GENRES_AR = [
  { id: 'all', name: 'المحتوى الشائع 🔥' },
  { id: 'arabic', name: 'عربي 🇸🇦' },
  { id: '28', name: 'أكشن 💥' }
];

async function fetchMultiplePages(urlWithoutPage, totalPages = 3) {
  try {
    const promises = [];
    for (let i = 1; i <= totalPages; i++) {
      promises.push(fetch(`${urlWithoutPage}&page=${i}`).then(res => res.json()));
    }
    const results = await Promise.all(promises);
    return results.reduce((acc, curr) => acc.concat(curr.results || []), []);
  } catch (error) { return []; }
}

export async function getServerSideProps() {
  try {
    const moviesEn = await fetchMultiplePages(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US`);
    const showsEn = await fetchMultiplePages(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US`);
    return { props: { initialMovies: moviesEn, initialShows: showsEn } };
  } catch (error) { return { props: { initialMovies: [], initialShows: [] } }; }
}

export default function Home({ initialMovies, initialShows }) {
  const [lang, setLang] = useState('en'); 
  const [activeTab, setActiveTab] = useState('movies'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  
  const [trendingMovies, setTrendingMovies] = useState(initialMovies || []);
  const [trendingShows, setTrendingShows] = useState(initialShows || []);

  useEffect(() => {
    const savedLang = localStorage.getItem('site_lang') || 'en';
    setLang(savedLang);
  }, []);

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

  const genresList = lang === 'ar' ? GENRES_AR : GENRES_EN;
  let sectionTitle = lang === 'ar' ? (activeTab === 'movies' ? 'أحدث الأفلام الشائعة' : activeTab === 'shows' ? 'أحدث المسلسلات الشائعة' : 'الباقة الرياضية الحية 🔴') : (activeTab === 'movies' ? 'Trending Movies' : activeTab === 'shows' ? 'Trending TV Shows' : 'Live Sports Channels 🔴');

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '2px solid #111', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ color: '#e50914', fontSize: '30px', fontWeight: '900', margin: 0 }}>CINEMA MATRIX</h1>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px', fontWeight: 'bold' }}>BY: NAWAF AL-NAZAWI</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('movies')} style={{ backgroundColor: activeTab === 'movies' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 20px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>{lang === 'ar' ? 'الأفلام' : 'Movies'}</button>
          <button onClick={() => setActiveTab('shows')} style={{ backgroundColor: activeTab === 'shows' ? '#e50914' : '#141414', color: 'white', border: 'none', padding: '10px 20px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>{lang === 'ar' ? 'المسلسلات' : 'TV Shows'}</button>
          <button onClick={() => setActiveTab('live')} style={{ backgroundColor: activeTab === 'live' ? '#06d6a0' : '#141414', color: 'white', border: 'none', padding: '10px 20px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>{lang === 'ar' ? '🔴 قنوات رياضية' : '🔴 Live Sports'}</button>
        </div>
      </header>

      <main>
        <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>{sectionTitle}</h2>
        
        {activeTab === 'live' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {FREE_LIVE_CHANNELS.map((channel) => (
              <Link href={`/movie/${channel.id}?type=live&url=${encodeURIComponent(channel.url)}&streamType=${channel.type}`} key={channel.id} style={{ textDecoration: 'none' }}>
                <div style={{ backgroundColor: '#111', borderRadius: '12px', overflow: 'hidden', border: '2px solid #222', cursor: 'pointer', textAlign: 'center', paddingBottom: '15px' }}>
                  <div style={{ position: 'relative', width: '100%', height: '120px' }}>
                    <img src={channel.logo} alt={channel.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                    <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', backgroundColor: '#e50914', color: 'white', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>LIVE</span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '15px 10px 0 10px', color: '#fff' }}>{channel.name}</h4>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
            {(activeTab === 'movies' ? trendingMovies : trendingShows).slice(0, 14).map((item) => (
              <Link href={`/movie/${item.id}?type=${activeTab === 'movies' ? 'movie' : 'tv'}`} key={item.id} style={{ textDecoration: 'none' }}>
                <div style={{ backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', border: '1px solid #222', cursor: 'pointer' }}>
                  <img src={item.poster_path ? `${IMAGE_URL}${item.poster_path}` : 'https://via.placeholder.com/300x450'} alt={item.title || item.name} style={{ width: '100%', height: '210px', objectFit: 'cover' }}/>
                  <div style={{ padding: '10px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}>{item.title || item.name}</h4>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
