'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearAdminToken } from '../../../lib/admin-api';

const TABS = [
  { key: 'overview', label: 'نمای کلی', icon: '📊', href: '/admin' },
  { key: 'models', label: 'مدلها', icon: '🤖', href: '/admin/models' },
  { key: 'users', label: 'کاربران', icon: '👥', href: '/admin/users' },
  { key: 'fx', label: 'نرخ ارز', icon: '💱', href: '/admin/fx' },
  { key: 'brakes', label: 'ترمزها', icon: '🛑', href: '/admin/brakes' },
];

export default function AdminSidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();

  function isActive(item: (typeof TABS)[number]) {
    if (item.key === 'overview') return pathname === '/admin';
    return pathname.startsWith(item.href);
  }

  function handleLogout() {
    clearAdminToken();
    onLogout();
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-logo">🛡️</span>
        <span className="admin-sidebar-name">پنل مدیریت</span>
      </div>
      <nav className="admin-sidebar-nav">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={'admin-sidebar-item' + (isActive(tab) ? ' active' : '')}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
      <div className="admin-sidebar-foot">
        <button className="admin-sidebar-logout" onClick={handleLogout}>
          🚪 خروج
        </button>
      </div>
    </aside>
  );
}