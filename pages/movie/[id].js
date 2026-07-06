import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export async function getServerSideProps(context) {
  const { id, type, url, streamType } = context.query;
  if (type === 'live') {
    return { props: { liveData: { id, url: url || '', streamType: streamType || 'iframe' }, isLive: true } };
  }
  return { props: { movieData: null, isLive: false } };
}

export default function MovieDetail({ liveData, isLive }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(isLive);

  useEffect(() => {
    if (!isLive || !liveData || liveData.streamType !== 'hls') return;

    setIsLoading(true);
    const video = videoRef.current;
    if (!video) return;

    // تشغيل نظام HLS المباشر للبث الرياضي الصافي
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = liveData.url;
      setIsLoading(false);
    } else {
      import('hls.js').then((Hls) => {
        if (Hls.default.isSupported()) {
          const hls = new Hls.default();
          hls.loadSource(liveData.url);
          hls.attachMedia(video);
          setIsLoading(false);
        }
      });
    }
  }, [isLive, liveData]);

  return (
    <div style={{ backgroundColor: '#050505', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <button onClick={() => router.push('/')} style={{ backgroundColor: '#111', color: 'white', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
        ← العودة للرئيسية
      </button>

      <div style={{ backgroundColor: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #e50914' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#fff' }}>
          🔴 مشغل البث الرياضي الحي المستقر
        </h3>

        <div style={{ width: '100%', height: '60vh', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {isLive && liveData.streamType === 'hls' ? (
            <video 
              ref={videoRef} 
              controls 
              autoPlay 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          ) : isLive ? (
            <iframe src={liveData.url} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="autoplay; encrypted-media"></iframe>
          ) : (
            <div style={{ padding: '50px', textAlign: 'center' }}>يرجى اختيار قناة من الواجهة الرئيسية.</div>
          )}
        </div>
      </div>
    </div>
  );
}
