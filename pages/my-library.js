// pages/my-library.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabaseClient';

export default function MyLibrary() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('favorites');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLibraryData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('user_library')
          .select('*')
          .eq('user_id', user.id)
          .eq('list_type', activeTab);

        if (!error && data) {
          setItems(data);
        }
      }
      setLoading(false);
    }

    loadLibraryData();
  }, [activeTab]);

  return (
    <div style={{ backgroundColor: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <Head>
        <title>مكتبتي - CINEMATRIX</title>
      </Head>

      <Navbar />

      <div style={{ padding: '30px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', color: '#e50914', marginBottom: '20px', fontWeight: 'bold' }}>📚 مكتبتي الشخصية</h1>

        {/* أزرار التنقل بين المفضلة وقائمة المشاهدة */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <button
            onClick={() => setActiveTab('favorites')}
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: activeTab === 'favorites' ? '#e50914' : '#141414',
              color: '#fff'
            }}
          >
            ❤️ المفضلة
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: activeTab === 'watchlist' ? '#e50914' : '#141414',
              color: '#fff'
            }}
          >
            📌 مشاهدة لاحقاً
          </button>
        </div>

        {/* عرض المحتوى */}
        {loading ? (
          <p style={{ color: '#888' }}>جاري تحميل المكتبة...</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#666', fontSize: '15px' }}>
            {activeTab === 'favorites' ? 'لم تقم بإضافة أي عرض للمفضلة بعد.' : 'قائمة المشاهدة لاحقاً فارغة حالياً.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
            {items.map((item) => (
              <Link key={item.id} href={`/movie/${item.media_id}?type=${item.media_type}`} style={{ textDecoration: 'none', color: '#fff' }}>
                <div style={{ backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', border: '1px solid #222', transition: 'transform 0.2s' }}>
                  <img
                    src={item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : 'https://via.placeholder.com/300x450'}
                    alt={item.title}
                    style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '10px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 5px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </p>
                    <span style={{ fontSize: '11px', color: '#ffb703' }}>
                      ⭐ {item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A'}
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
