import React from 'react';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

export async function getServerSideProps() {
  try {
    const res = await fetch(`${BASE_URL}/trending/movie/week?api_key=${fe4b6ec1a6183fddf681565506956216}&language=ar`);
    const data = await res.json();
    return { props: { movies: data.results || [] } };
  } catch (error) {
    return { props: { movies: [] } };
  }
}

export default function Home({ movies }) {
  return (
    <div style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: 'screen', fontFamily: 'sans-serif', padding: '20px', direction: 'rtl' }}>
      <header style={{ display: 'flex', justifyContent: 'between', padding: '10px', borderBottom: '1px solid #222' }}>
        <h1 style={{ color: '#dc2626', fontSize: '24px', fontWeight: 'bold' }}>CINEMA MATRIX</h1>
      </header>
      
      <main style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>أحدث الأفلام والمسلسلات الرائجة</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
          {movies.map((movie) => (
            <div key={movie.id} style={{ backgroundColor: '#141414', borderRadius: '8px', overflow: 'hidden', border: '1px solid #222' }}>
              <img src={`${IMAGE_URL}${movie.poster_path}`} alt={movie.title} style={{ width: '100%', height: '220px', objectFit: 'cover' }}/>
              <div style={{ padding: '10px' }}>
                <h4 style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title || movie.name}</h4>
                <p style={{ color: '#fbbf24', fontSize: '10px', marginTop: '5px' }}>⭐ {movie.vote_average?.toFixed(1)}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
