import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Cinema Matrix',
  description: 'موقع الأفلام والمسلسلات الخاص بي',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
