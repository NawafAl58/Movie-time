import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/bottts/svg?seed=Cinematrix1');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        fetchProfile(data.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
    if (data?.avatar_url) setAvatar(data.avatar_url);
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/login');
  };

  return (
    <nav style={{ backgroundColor: '#0f0f0f', borderBottom: '1px solid #222', padding: '12px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: '24px', fontWeight: '900', color: '#e50914', letterSpacing: '1px' }}>CINEMATRIX</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link href="/" style={{ color: '#ccc', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>الرئيسية</Link>
        {user && (
          <Link href="/my-library" style={{ color: '#ccc', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>مكتبتي</Link>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setMenuOpen(!menuOpen)}>
            <img src={avatar} alt="Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #e50914', backgroundColor: '#181818' }} />
          </div>
        ) : (
          <Link href="/login" style={{ backgroundColor: '#e50914', color: '#fff', textDecoration: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>
            تسجيل الدخول
          </Link>
        )}

        {menuOpen && user && (
          <div style={{ position: 'absolute', right: 0, top: '50px', backgroundColor: '#181818', border: '1px solid #333', borderRadius: '8px', width: '180px', boxShadow: '0 8px 20px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid #282828', fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
            <Link href="/my-library" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '10px 12px', color: '#fff', textDecoration: 'none', fontSize: '13px' }}>
              ❤️ المفضلة والقوائم
            </Link>
            <button onClick={handleSignOut} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', backgroundColor: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '13px', borderTop: '1px solid #282828' }}>
              🚪 تسجيل الخروج
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
