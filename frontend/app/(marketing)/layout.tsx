import { SiteHeader, SiteFooter } from '../components/SiteLayout';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#09090b', color: '#fafafa', fontFamily: 'Vazirmatn, system-ui, sans-serif', minHeight: '100vh' }}>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}