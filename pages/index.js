import React, { useState } from 'react';
import { useRouter } from 'next/router';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216';
const BASE_URL = 'https://api.themoviedb.org/3';

export async function getServerSideProps() {
  try {
    const res = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=ar-SA&page=1`);
    const data = await res.json();
    return { props: { popularMovies: data.results || [] } };
  } catch (error) {
    return { props: { popularMovies: [] } };
  }
}

export default function Home({ popularMovies }) {
  const router = useRouter();
  const [movies, setMovies] = useState(popularMovies);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setMovies(popularMovies);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(searchTerm)}&language=ar-SA`);
      const data = await res.json();
      setMovies(data.results || []);
    } catch (e) {}
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <h1 style={{ textAlign: 'center', color: '#e50914', fontSize: '40px', marginBottom: '30px', fontWeight: 'bold' }}>MOVIE TIME 🍿</h1>
      
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px', gap: '10px', flexWrap: 'wrap' }}>
        {/* 🔴 زر البث المباشر النظيف المضاف بجانب البحث مباشرة */}
        <button 
          onClick={() => router.push('/movie/iptv-live?type=live')}
          style={{ padding: '12px 25px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
        >
          📺 البث المباشر والرياضة
        </button>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="ابحث عن فيلم أو مسلسل..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '12px 20px', width: '300px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#111', color: 'white' }}
          />
          <button type="submit" style={{ padding: '12px 25px', backgroundColor: '#222', color: 'white', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>بحث</button>
        </form>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {movies.filter(m => m.poster_path).map((movie) => (
          <div 
            key={movie.id} 
            onClick={() => router.push(`/movie/${movie.id}?type=${movie.media_type || 'movie'}`)}
            style={{ width: '180px', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #222', transition: 'transform 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <img src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`} alt={movie.title || movie.name} style={{ width: '100%', height: '260px', objectFit: 'cover' }} />
            <div style={{ padding: '10px', fontSize: '13px', fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'center' }}>{movie.title || movie.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
