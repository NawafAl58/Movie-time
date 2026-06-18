import React from 'react';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

async function getTrendingMovies() {
  const res = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=ar`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('Failed to fetch data');
  const data = await res.json();
  return data.results;
}

export default async function Home() {
  const movies = await getTrendingMovies();

  return (
    <div className="min-h-screen bg-black text-white font-sans" dir="rtl">
      {/* الهيدر */}
      <header className="p-5 flex justify-between items-center border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-50">
        <h1 className="text-2xl font-black text-red-600 tracking-wider">CINEMA MATRIX</h1>
        <nav className="flex gap-6 text-sm font-medium">
          <a href="#" className="text-red-500">الرئيسية</a>
          <a href="#" className="text-zinc-400 hover:text-white transition">الأفلام</a>
          <a href="#" className="text-zinc-400 hover:text-white transition">المسلسلات</a>
        </nav>
      </header>

      {/* البانر الرئيسي */}
      {movies[0] && (
        <div className="relative h-[55vh] w-full flex items-end p-6 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to top, black, transparent), url(https://image.tmdb.org/t/p/original${movies[0].backdrop_path})` }}>
          <div className="max-w-xl bg-black/60 p-5 rounded-lg border border-zinc-800 backdrop-blur-sm">
            <span className="bg-red-600 text-xs font-bold px-2 py-0.5 rounded">رائج الآن</span>
            <h2 className="text-3xl font-bold mt-2">{movies[0].title || movies[0].name}</h2>
            <p className="text-zinc-300 text-xs mt-2 line-clamp-3 leading-relaxed">{movies[0].overview}</p>
          </div>
        </div>
      )}

      {/* شبكة عرض الأفلام */}
      <main className="p-6">
        <h3 className="text-xl font-bold mb-6 text-zinc-100">أحدث الأفلام والمسلسلات</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {movies.slice(1).map((movie) => (
            <div key={movie.id} className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:scale-105 transition duration-200">
              <img src={`${IMAGE_URL}${movie.poster_path}`} alt={movie.title} className="w-full h-[260px] object-cover"/>
              <div className="p-2">
                <h4 className="font-bold text-xs truncate">{movie.title || movie.name}</h4>
                <div className="flex justify-between items-center mt-2 text-[10px] text-zinc-400">
                  <span>{movie.release_date?.split('-')[0] || 'قريباً'}</span>
                  <span className="text-yellow-400">⭐ {movie.vote_average?.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
