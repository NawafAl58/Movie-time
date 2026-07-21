// pages/category/[slug].js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TMDB_API_KEY = 'fe4b6ec1a6183fddf681565506956216';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// خريطة معرّفات التصنيفات في TMDB
const GENRE_MAP = {
  action: { id: 28, name: 'Action' },
  comedy: { id: 35, name: 'Comedy' },
  drama: { id: 18, name: 'Drama' },
  horror: { id: 27, name: 'Horror' },
  scifi: { id: 878, name: 'Sci-Fi' },
  animation: { id: 16, name: 'Animation' },
  romance: { id: 10749, name: 'Romance' },
  thriller: { id: 53, name: 'Thriller' }
};

export default function CategoryPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoryInfo = GENRE_MAP[slug] || { id: null, name: slug };

  useEffect(() => {
    if (!slug || !categoryInfo.id) return;

    async function fetchCategoryMovies() {
      setLoading(true);
      try {
        const res = await fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${categoryInfo.id}&language=en-US&sort_by=popularity.desc`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data.results || []);
        }
      } catch (e) {
        console.error("Fetch Category Error:", e);
      }
      setLoading(false);
    }

    fetchCategoryMovies();
  }, [slug]);

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <Head>
        <title>{categoryInfo.name} - SimplStream</title>
        <style>{`
          html, body {
            background-color: #050505 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden;
          }
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: #050505; }
          ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #e50914; }
        `}</style>
      </Head>

      {/* زر العودة للرئيسية */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <button 
          onClick={() => router.push('/')} 
          style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← Home
        </button>
        <h1 style={{ color: '#e50914', margin: 0, textTransform: 'capitalize' }}>{categoryInfo.name} Movies</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <h3 style={{ color: '#aaa' }}>Loading {categoryInfo.name}...</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
          {movies.map((item) => (
            <div 
              key={item.id} 
              onClick={() => router.push(`/movie/${item.id}?type=movie`)}
              style={{ backgroundColor: '#111', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #222', transition: 'transform 0.2s' }}
            >
              <img 
                src={item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : 'https://via.placeholder.com/300x450'} 
                alt={item.title} 
                style={{ width: '100%', height: '260px', objectFit: 'cover' }}
              />
              <div style={{ padding: '10px' }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>⭐ {item.vote_average?.toFixed(1)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
