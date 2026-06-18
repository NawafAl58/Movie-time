import React from 'react';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

export async function getServerSideProps() {
  try {
    const res = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=ar`);
    const data = await res.json();
    return { props: { movies: data.results || [] } };
  } catch (error) {
    return { props: { movies: [] } };
  }
}

export default function Home({ movies }) {
  return (
    <div style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px', direction: 'rtl' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #222', alignItems: 'center' }}>
        <h1 style={{ color: '#dc2626', fontSize: '28px', fontWeight: 'black', letterSpacing: '1px' }}>CINEMA MATRIX</h1>
        <div style={{ fontSize: '14px', color: '#aaa' }}>مرحباً بك في منصتك</div>
      </header>
      
      <main style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '22px', marginBottom: '20px', borderRight: '4px solid #dc2626', paddingRight: '10px' }}>أحدث الأفلام والمسلسلات الرائجة</h3>
        
        {movies.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', marginTop: '5px' }}>جاري تحميل الأفلام...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '25px' }}>
            {movies.map((movie) => (
              <div key={movie.id} style={{ backgroundColor: '#141414', borderRadius: '10px', overflow: 'hidden', border: '1px solid #222', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <img 
                  src={movie.poster_path ? `${IMAGE_URL}${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image'} 
                  alt={movie.title || movie.name} 
                  style={{ width: '100%', height: '240px', objectFit: 'cover' }}
                />
                <div style={{ padding: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {movie.title || movie.name}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: '#aaa' }}>
                    <span>{movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || 'قريباً'}</span>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>⭐ {movie.vote_average?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
