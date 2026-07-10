'use client';
import Link from 'next/link';

export function SiteHeader() {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', display: 'grid', placeItems: 'center', fontSize: 16 }}>⚡</div>
        <span style={{ fontWeight: 800, fontSize: 18, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', color: 'transparent' }}>MultiAPI</span>
      </Link>
      <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Link href="/models" style={{ color: '#a1a1aa', fontSize: 14, textDecoration: 'none' }}>مدلها</Link>
        <Link href="/pricing" style={{ color: '#a1a1aa', fontSize: 14, textDecoration: 'none' }}>قیمتها</Link>
        <Link href="/docs" style={{ color: '#a1a1aa', fontSize: 14, textDecoration: 'none' }}>مستندات</Link>
        <Link href="/app" style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>شروع کنید</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px', textAlign: 'center', color: '#71717a', fontSize: 13 }}>
      <p>© 2026 MultiAPI. دسترسی هوشمند به آینده.</p>
    </footer>
  );
}