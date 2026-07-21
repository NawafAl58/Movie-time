// pages/_app.js
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // 🛡️ كود منع وحجب فتح أي نوافذ منبثقة إعلانية تلقائية (Pop-ups)
    const originalOpen = window.open;
    window.open = function (url, target, features) {
      if (target === '_blank' || !target) {
        console.warn('Blocked popup attempt to:', url);
        return null;
      }
      return originalOpen.apply(this, arguments);
    };
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
