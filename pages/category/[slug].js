// pages/category/[slug].js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w300';

const GENRE_MAP = {
  action: { id: 28, en: 'Action 💥', ar: 'أكشن 💥' },
  horror: { id: 27, en: 'Horror 👻', ar: 'رعب 👻' },
  comedy: { id: 35, en: 'Comedy 😂', ar: 'كوميدي 😂' },
  romance: { id: 10749, en: 'Romance ❤️', ar: 'رومانسي ❤️' },
  scifi: { id: 878, en: 'Sci-Fi 🚀', ar: 'خيال علمي 🚀' },
  drama: { id: 18, en: 'Drama 🎭', ar: 'دراما 🎭' },
  arabic: { id: 'arabic', en: 'Arabic 🇸🇦', ar: 'عربي 🇸🇦' }
};

const GENRES_EN = [
  { id: 'all', slug: 'all', name: 'Trending 🔥' },
  { id: 'arabic', slug: 'arabic', name: 'Arabic 🇸🇦' }, 
  { id: '28', slug: 'action', name: 'Action 💥' },
  { id: '27', slug: 'horror', name: 'Horror 👻' },
  { id: '35', slug: 'comedy', name: 'Comedy 😂' },
  { id: '10749', slug: 'romance', name: 'Romance ❤️' },
  { id: '878', slug: 'scifi', name: 'Sci-Fi 🚀' },
  { id: '18', slug: 'drama', name: 'Drama 🎭' }
];

const GENRES_AR = [
  { id: 'all', slug: 'all', name: 'المحتوى الشائع 🔥' },
  { id: 'arabic', slug: 'arabic', name: 'عربي 🇸🇦' }, 
  { id: '28', slug: 'action', name: 'أكشن 💥' },
  { id: '27', slug: 'horror', name: 'رعب 👻' },
  { id: '35', slug: 'comedy', name: 'كوميدي 😂' },
  { id: '10749', slug: 'romance', name: 'رومانسي ❤️' },
  { id: '878', slug: 'scifi', name: 'خيال علمي 🚀' },
  { id: '18', slug: 'drama', name: 'دراما 🎭' }
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

export default function CategoryPage() {
  const router = useRouter();
  const { slug, type } = router.query;

  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState(type === 'tv' ? 'shows' : 'movies');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLang = localStorage.getItem('site_lang');
    if (savedLang) setLang(savedLang);
  }, []);

  const toggleLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('site_lang', newLang);
  };

  const genreInfo = GENRE_MAP[slug] || { id: slug, en: slug, ar: slug };

  useEffect(() => {
    if (!slug) return;

    async function fetchCategoryData() {
      setLoading(true);
      const mediaType = activeTab === 'shows' ? 'tv' : 'movie';
      const isArabic = genreInfo.id === 'arabic';
      const currentLang = isArabic ? 'ar-SA' : (lang === 'ar' ? 'ar-SA' : 'en-US');

      let url = `${BASE_URL}/discover/${mediaType}?api_key=${API_KEY}&sort_by=popularity.desc&language=${currentLang}`;

      if (isArabic) {
        url += `&with_original_language=ar`;
      } else if (genreInfo.id) {
        url += `&with_genres=${genreInfo.id}`;
      }

      const data = await fetchMultiplePages(url);
      setMovies(data);
      setLoading(false);
    }

    fetchCategoryData();
  }, [slug, activeTab, lang]);

  const handleGenreClick = (genre) => {
    if (genre.slug === 'all') {
      router.push('/');
    } else {
      router.push(`/category/${genre.slug}?type=${activeTab === 'shows' ? 'tv' : 'movie'}`);
    }
  };

  const genresList = lang === 'ar' ? GENRES_AR : GENRES_EN;
  const pageTitle = lang === 'ar' 
    ? (genreInfo.ar || slug) 
    : (genreInfo.en || slug);

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px', direction: lang === 'ar' ? 'rtl' : 'ltr', display: 'flex', flexDirection: 'column' }}>
      <Head>
        <title>{pageTitle} - CINEMA MATRIX</title>
      </Head>

      <style jsx global>{`
        html, body, #__next { margin: 0 !important; padding: 0 !important; background-color: #050505 !important; background: #050505 !important; }
        .tv-focusable:focus { outline: none !important; border: 3px solid #e50914 !important; transform: scale(1.04) !important; background-color: #1c1c1c !important; box-shadow: 0 0 15px #e50914; }
        .btn-tv-focusable:focus { outline: none !important; background-color: #e50914 !important; color: white !important; transform: scale(1.1) !important; box-shadow: 0 0 10px #e50914; }
      `}</style>

      <div style={{ flex: 1 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '2px solid #111', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
            <h1 style={{ color: '#e50914', fontSize: '30px', fontWeight: '900', letterSpacing: '2px', margin: 0 }}>CINEMA MATRIX</h1>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px', fontWeight: 'bold', letterSpacing: '1px' }}>
              BY: Anonymous
            </div>
          </div>

          <div style={{ display: 'flex', gap: '5px', backgroundColor: '#141414', padding: '4px', borderRadius: '20px', border: '1px solid #222' }}>
            <button className="btn-tv-focusable" onClick={() => toggleLanguage('en')} style={{ padding: '6px 15px', fontSize: '12px', fontWeight: 'bold', borderRadius: '15px', border: 'none', cursor: 'pointer', backgroundColor: lang === 'en' ? '#e50914' : 'transparent', color: 'white' }}>English</button>
            <button className="btn-tv-focusable" onClick={() => toggleLanguage('ar')} style={{ padding: '6px 15px', fontSize: '12px', fontWeight: 'bold', borderRadius: '15px', border: 'none', cursor: 'pointer', backgroundColor: lang === 'ar' ? '#e50914' : 'transparent', color: 'white' }}>العربية</button>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button tabIndex="0" className="btn-tv-focusable" onClick={() => router.push('/')} style={{ backgroundColor: '#111', border: '1px solid #333', color: 'white', padding: '10px 20px', fontSize: '15px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
              ← {lang === 'ar' ? 'الرئيسية' : 'Home'}
            </button>
            <button tabIndex="0" className="btn-tv-focusable" onClick={() => setActiveTab('movies')} style={{ backgroundColor: activeTab === 'movies' ? '#e50914' : '#141414', border: '1px solid #333', color: 'white', padding: '10px 20px', fontSize: '15px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
              {lang === 'ar' ? 'الأفلام' : 'Movies'}
            </button>
            <button tabIndex="0" className="btn-tv-focusable" onClick={() => setActiveTab('shows')} style={{ backgroundColor: activeTab === 'shows' ? '#e50914' : '#141414', border: '1px solid #333', color: 'white', padding: '10px 20px', fontSize: '15px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
              {lang === 'ar' ? 'المسلسلات' : 'TV Shows'}
            </button>
          </div>
        </header>

        {/* أزرار التنقل بين التصنيفات */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '25px', scrollbarWidth: 'none' }}>
          {genresList.map((genre) => (
            <button
              key={genre.id}
              tabIndex="0"
              className="btn-tv-focusable"
              onClick={() => handleGenreClick(genre)}
              style={{
                backgroundColor: genre.slug === slug ? '#e50914' : '#111',
                color: '#fff',
                border: '1px solid #222', padding: '8px 18px', fontSize: '14px', fontWeight: 'bold', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {genre.name}
            </button>
          ))}
        </div>

        <main>
          <h2 style={{ fontSize: '22px', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px', color: '#e50914' }}>
            {pageTitle} ({activeTab === 'movies' ? (lang === 'ar' ? 'أفلام' : 'Movies') : (lang === 'ar' ? 'مسلسلات' : 'TV Shows')})
          </h2>

          {loading ? (
            <p style={{ color: '#666', fontSize: '16px', textAlign: 'center' }}>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : movies.length === 0 ? (
            <p style={{ color: '#666', fontSize: '16px', textAlign: 'center' }}>{lang === 'ar' ? 'لا توجد نتائج.' : 'No results found.'}</p>
          ) : (
            /* 📐 نفس مقاس العرض والشبكة الخاص بالصفحة الرئيسية تماماً */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
              {movies.map((item) => {
                const displayName = item.title || item.name;
                const itemType = activeTab === 'shows' ? 'tv' : 'movie';

                return (
                  <Link href={`/movie/${item.id}?type=${itemType}`} key={item.id} legacyBehavior>
                    <div tabIndex="0" className="tv-focusable" style={{ backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', border: '1px solid #222', cursor: 'pointer', transition: 'transform 0.1s' }}>
                      <img src={item.poster_path ? `${IMAGE_URL}${item.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster'} alt={displayName} style={{ width: '100%', height: '210px', objectFit: 'cover' }}/>
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

      <footer style={{ width: '100%', textAlign: 'center', padding: '15px 0', borderTop: '1px solid #111', marginTop: '40px', fontSize: '12px', color: '#666', letterSpacing: '1px', fontWeight: 'bold' }}>
        Developed & Powered by <span style={{ color: '#e50914' }}>Anonymous</span> &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
