'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminToken } from '../../lib/admin-api';
import AdminSidebar from './components/AdminSidebar';
import { AdminLogin } from './components/AdminLogin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const t = getAdminToken();
    if (t) {
      setToken(t);
    }
    setChecking(false);
  }, []);

  function handleLogin(t: string) {
    setToken(t);
  }

  function handleLogout() {
    setToken('');
    router.push('/admin');
  }

  if (checking) {
    return (
      <div className="admin-loading">
        <div className="typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (!token) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar onLogout={handleLogout} />
      <main className="admin-main">{children}</main>
    </div>
  );
}