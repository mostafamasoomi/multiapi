import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MultiAPI — دروازه هوش مصنوعی',
  description: 'دسترسی به بهترین مدل‌های هوش مصنوعی با پرداخت ریالی، کنترل هزینه و پشتیبانی کامل فارسی',
  openGraph: { title: 'MultiAPI', description: 'چندین مدل AI، یک حساب، پرداخت ریالی', locale: 'fa_IR', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}