import { SiteFooter } from '../components/SiteLayout';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#09090b', color: '#fafafa', fontFamily: 'Vazirmatn, system-ui, sans-serif', minHeight: '100vh' }}>
      <div>{children}</div>
      <SiteFooter />
    </div>
  );
}