import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Head from 'next/head';

const AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cinematrix1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cinematrix2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cinematrix3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cinematrix4',
];

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        fetchProfile(data.user.id);
      }
    });
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
    if (data?.avatar_url) setSelectedAvatar(data.avatar_url);
  }

  const handleAuth = async (isSignUp) => {
    if (!email.trim() || !password.trim()) {
      setMsg('يرجى كتابة البريد الإلكتروني وكلمة المرور أولاً!');
      return;
    }

    setLoading(true);
    setMsg('');

    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMsg(error.message);
    } else {
      const activeUser = data?.user;
      if (activeUser && isSignUp) {
        await supabase.from('profiles').upsert({ id: activeUser.id, avatar_url: selectedAvatar });
      }
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: '20px' }}>
      <Head><title>Cinematrix - تسجيل الدخول الإجباري</title></Head>

      <div style={{ backgroundColor: '#141414', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid #222' }}>
        <h1 style={{ color: '#e50914', textAlign: 'center', fontSize: '28px', fontWeight: '900', marginBottom: '5px' }}>CINEMATRIX</h1>
        <p style={{ color: '#aaa', textAlign: 'center', fontSize: '13px', marginBottom: '25px' }}>
          {user ? 'حسابك المفعل' : 'يرجى تسجيل الدخول لمتابعة المشاهدة 🔒'}
        </p>

        {/* اختيار الأفاتار */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '10px' }}>اختر رمز الأفاتار:</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {AVATARS.map((url, i) => (
              <img
                key={i}
                src={url}
                alt="avatar"
                onClick={() => setSelectedAvatar(url)}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: selectedAvatar === url ? '3px solid #e50914' : '2px solid transparent',
                  backgroundColor: '#1f1f1f'
                }}
              />
            ))}
          </div>
        </div>

        {!user ? (
          <div>
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '6px', backgroundColor: '#222', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' }}
            />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '6px', backgroundColor: '#222', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' }}
            />
            <button onClick={() => handleAuth(false)} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
              {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
            <button onClick={() => handleAuth(true)} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              إنشاء حساب جديد
            </button>
          </div>
        ) : (
          <div>
            <p style={{ textAlign: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px', marginBottom: '15px' }}>{user.email}</p>
            <button onClick={() => router.push('/')} style={{ width: '100%', padding: '12px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
              الانتقال للرئيسية 🎬
            </button>
            <button onClick={() => supabase.auth.signOut().then(() => router.reload())} style={{ width: '100%', padding: '10px', backgroundColor: '#222', color: '#ff4444', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer' }}>
              تسجيل الخروج
            </button>
          </div>
        )}

        {msg && <p style={{ color: '#ff4444', fontSize: '13px', textAlign: 'center', marginTop: '15px' }}>{msg}</p>}
      </div>
    </div>
  );
}
