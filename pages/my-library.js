import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from '../components/Navbar';

export default function MyLibrary() {
  const [activeTab, setActiveTab] = useState('favorites');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLibraryData();
  }, [activeTab]);

  async function loadLibraryData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_library')
        .select('*')
        .eq('user_id', user.id)
        .eq('list_type', activeTab)
        .order('created_at', { ascending: false });
      
      setItems(data || []);
    }
    setLoading(false);
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <Head><title>Cinematrix - مكتبتي الخاصّة</title></Head>
      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        <h1 style={{ fontSize: '28px', color: '#e50914', fontWeight: '800', marginBottom: '20px' }}>
          مكتبتي الشخصية 🍿
        </h1>

        <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #222', paddingBottom: '12px', marginBottom: '25px' }}>
          <button
            onClick={() => setActiveTab('favorites')}
            style={{
              backgroundColor: activeTab === 'favorites' ? '#e50914' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ❤️ المفضلة ({activeTab === 'favorites' ? items.length : '..'})
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            style={{
              backgroundColor: activeTab === 'watchlist' ? '#0070f3' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📌 قائمة المشاهدة لاحقاً ({activeTab === 'watchlist' ? items.length : '..'})
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#888' }}>جاري تحميل مكتبتك...</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#666' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎬</div>
            <p style={{ margin: 0 }}>لا يوجد محتوى مضاف في هذه القائمة حالياً.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '20px' }}>
            {items.map((item) => (
              <Link key={item.id} href={`/${item.media_type}/${item.media_id}`} style={{ textDecoration: 'none', color: '#fff' }}>
                <div style={{ backgroundColor: '#141414', borderRadius: '10px', overflow: 'hidden', border: '1px solid #222' }}>
                  <img
                    src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                    alt={item.title}
                    style={{ width: '100%', height: '255px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 5px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </p>
                    <span style={{ fontSize: '11px', color: '#ffc107', fontWeight: 'bold' }}>
                      ★ {item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
