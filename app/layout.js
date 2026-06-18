import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Cinema Matrix',
  description: 'موقع الأفلام والمسلسلات الخاص بي',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
