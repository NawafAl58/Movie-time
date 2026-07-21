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
    setLoading(true);
    setMsg('');
    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMsg(error.message);
    } else if (isSignUp) {
      if (data?.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, avatar_url: selectedAvatar }]);
      }
      setMsg('تم إنشاء الحساب بنجاح!');
      router.push('/');
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  const updateAvatar = async (url) => {
    setSelectedAvatar(url);
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, avatar_url: url });
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <Head><title>Cinematrix - الحساب</title></Head>

      <div style={{ backgroundColor: '#141414', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid #222' }}>
        <h2 style={{ color: '#e50914', textAlign: 'center', marginBottom: '20px' }}>
          {user ? 'إعدادات الملف الشخصي' : 'تسجيل الدخول / حساب جديد'}
        </h2>

        {/* Avatar Selection */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>اختر الأفاتار الخاص بك:</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {AVATARS.map((url, i) => (
              <img
                key={i}
                src={url}
                alt="avatar"
                onClick={() => updateAvatar(url)}
                style={{
                  width: '50px',
                  height: '50px',
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
              style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '6px', backgroundColor: '#222', border: '1px solid #333', color: '#fff' }}
            />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '6px', backgroundColor: '#222', border: '1px solid #333', color: '#fff' }}
            />
            <button onClick={() => handleAuth(false)} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
              تسجيل الدخول
            </button>
            <button onClick={() => handleAuth(true)} disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              إنشاء حساب جديد
            </button>
          </div>
        ) : (
          <div>
            <p style={{ textAlign: 'center', color: '#aaa', fontSize: '14px' }}>مسجل بـ: {user.email}</p>
            <button onClick={() => supabase.auth.signOut().then(() => router.reload())} style={{ width: '100%', padding: '12px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>
              تسجيل الخروج
            </button>
          </div>
        )}

        {msg && <p style={{ color: '#ff4444', fontSize: '13px', textAlign: 'center', marginTop: '15px' }}>{msg}</p>}
      </div>
    </div>
  );
}
