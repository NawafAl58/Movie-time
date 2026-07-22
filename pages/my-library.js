// pages/my-library.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabaseClient';

export default function MyLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLibrary() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_library').select('*').eq('user_id', user.id);
        setItems(data || []);
      }
      setLoading(false);
    }
    loadLibrary();
  }, []);

  return (
    <div style={{ backgroundColor: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head><title>مكتبتي - Cinematrix</title></Head>
      <Navbar />

      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', color: '#e50914', marginBottom: '20px' }}>📚 مكتبتي الشخصية</h1>

        {loading ? (
          <p style={{ color: '#888' }}>جاري تحميل المكتبة...</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#666' }}>لم تقم بإضافة أي أفلام أو مسلسلات بعد.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
            {items.map((item) => (
              <Link key={item.id} href={`/movie/${item.media_id}?type=${item.media_type}`} style={{ textDecoration: 'none', color: '#fff' }}>
                <div style={{ backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', border: '1px solid #222' }}>
                  <img src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} alt={item.title} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                  <div style={{ padding: '10px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                    <span style={{ fontSize: '11px', color: item.list_type === 'favorites' ? '#e50914' : '#ffb703' }}>
                      {item.list_type === 'favorites' ? '❤️ مفضلة' : '📌 مشاهدة لاحقاً'}
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
