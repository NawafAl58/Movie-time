// components/Navbar.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.avatar_url) setAvatar(profile.avatar_url);
          });
      }
    });
  }, []);

  return (
    <nav style={{ backgroundColor: '#141414', borderBottom: '1px solid #222', padding: '12px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link href="/" style={{ color: '#e50914', fontSize: '22px', fontWeight: '900', textDecoration: 'none', letterSpacing: '1px' }}>
          CINEMATRIX
        </Link>
        <Link href="/my-library" style={{ color: '#ccc', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}>
          📚 مكتبتي
        </Link>
      </div>

      <div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {avatar && <img src={avatar} alt="Avatar" style={{ width: '35px', height: '35px', borderRadius: '50%', border: '2px solid #e50914' }} />}
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              style={{ backgroundColor: '#222', color: '#ff4444', border: '1px solid #333', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
            >
              خروج
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/login')}
            style={{ backgroundColor: '#e50914', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            تسجيل الدخول
          </button>
        )}
      </div>
    </nav>
  );
}
