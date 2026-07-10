import { Providers } from '../providers';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', background: 'var(--bg)' }}>
      <Providers>{children}</Providers>
    </div>
  );
}