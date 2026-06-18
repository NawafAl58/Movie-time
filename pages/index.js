import React, { useState } from 'react';

const API_KEY = 'fe4b6ec1a6183fddf681565506956216'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

// جلب الأفلام والمسلسلات الرائجة باللغة الإنجليزية
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
        movies: moviesData.results || [], 
        shows: showsData.results || [] 
      } 
    };
  } catch (error) {
    return { props: { movies: [], shows: [] } };
  }
}

export default function Home({ movies, shows }) {
  const [activeTab, setActiveTab] = useState('movies'); // 'movies' or 'shows'
  const [selectedMedia, setSelectedMedia] = useState(null);

  const currentItems = activeTab === 'movies' ? movies : shows;

  // دالة لجلب سيرفر المشاهدة (بث خارجي مجاني متوافق مع معرفات TMDB)
  const getStreamUrl = (item) => {
    const type = activeTab === 'movies' ? 'movie' : 'tv';
    // هذا السيرفر يسحب الفيلم تلقائياً بناءً على رقم الـ ID من TMDB
    return `https://vidsrc.me/embed/${type}?tmdb=${item.id}`;
  };

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', padding: '30px', direction: 'ltr' }}>
      
      {/* الهيدر المصمم للتلفزيون (كبير وواضح) */}
      <header style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '20px', borderBottom: '2px solid #111', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#e50914', fontSize: '36px', fontWeight: '900', letterSpacing: '2px', margin: 0 }}>CINEMA MATRIX</h1>
        
        {/* أزرار التنقل بين الأفلام والمسلسلات */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <button 
            onClick={() => { setActiveTab('movies'); setSelectedMedia(null); }}
            style={{ 
              backgroundColor: activeTab === 'movies' ? '#e50914' : '#141414', 
              color: 'white', border: 'none', padding: '12px 30px', fontSize: '18px', 
              fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' 
            }}
          >
            Movies
          </button>
          <button 
            onClick={() => { setActiveTab('shows'); setSelectedMedia(null); }}
            style={{ 
              backgroundColor: activeTab === 'shows' ? '#e50914' : '#141414', 
              color: 'white', border: 'none', padding: '12px 30px', fontSize: '18px', 
              fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' 
            }}
          >
            TV Shows
          </button>
        </div>
      </header>

      {/* مشغل الفيديو (يظهر فقط عند الضغط على فيلم أو مسلسل) */}
      {selectedMedia && (
        <div style={{ marginBottom: '40px', backgroundColor: '#000', padding: '10px', borderRadius: '12px', border: '2px solid #e50914' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Now Playing: {selectedMedia.title || selectedMedia.name}</h3>
            <button 
              onClick={() => setSelectedMedia(null)}
              style={{ backgroundColor: '#333', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
            >
              Close Player ✕
            </button>
          </div>
          <div style={{ relative: 'relative', width: '100%', height: '60vh' }}>
            <iframe 
              src={getStreamUrl(selectedMedia)}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
              allowFullScreen
              scrolling="no"
            ></iframe>
          </div>
        </div>
      )}

      {/* شبكة العرض الفخمة (أزرار وبوسترات كبيرة ومريحة للعين من مسافة بعيدة للـ TV) */}
      <main>
        <h2 style={{ fontSize: '26px', marginBottom: '25px', textTransform: 'uppercase', tracking: '1px' }}>
          Trending {activeTab === 'movies' ? 'Movies' : 'TV Shows'}
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '30px' }}>
          {currentItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => {
                setSelectedMedia(item);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ 
                backgroundColor: '#111', borderRadius: '12px', overflow: 'hidden', 
                border: selectedMedia?.id === item.id ? '3px solid #e50914' : '1px solid #222', 
                cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img 
                src={item.poster_path ? `${IMAGE_URL}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image'} 
                alt={item.title || item.name} 
                style={{ width: '100%', height: '300px', objectFit: 'cover' }}
              />
              <div style={{ padding: '15px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title || item.name}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#999' }}>
                  <span>{item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || 'N/A'}</span>
                  <span style={{ color: '#ffb703', fontWeight: 'bold' }}>⭐ {item.vote_average?.toFixed(1) || '0.0'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
