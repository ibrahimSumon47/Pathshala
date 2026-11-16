import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'পাঠশালা — Pathshala',
  description: 'বাংলা ও ইংরেজিতে কোর্স, কুইজ আর লাইভ ক্লাস — শেখা ও শেখানোর একটি জায়গা।',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
