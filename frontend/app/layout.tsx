import type { Metadata } from 'next';
import './globals.css';
import AppNav from '@/components/AppNav';

export const metadata: Metadata = {
  title: 'MultiAPI — دروازه هوش مصنوعی',
  description: 'دسترسی به بهترین مدلهای هوش مصنوعی با پرداخت ریالی، کنترل هزینه و پشتیبانی کامل فارسی',
  openGraph: { title: 'MultiAPI', description: 'چندین مدل AI، یک حساب، پرداخت ریالی', locale: 'fa_IR', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className="dark">
      <head>
        <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" />
      </head>
      <body className="bg-bg text-text font-sans">
        <AppNav />
        <main>{children}</main>
      </body>
    </html>
  );
}