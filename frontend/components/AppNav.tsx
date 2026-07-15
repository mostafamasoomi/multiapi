'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8800'

const navItems = [
  { href: '/dashboard', label: 'داشبورد', icon: '📊' },
  { href: '/app', label: 'گفتگو', icon: '💬' },
  { href: '/models', label: 'مدل‌ها', icon: '🧩' },
  { href: '/usage', label: 'کیف پول', icon: '💰' },
  { href: '/api-keys', label: 'API Keys', icon: '🔑' },
  { href: '/docs', label: 'مستندات', icon: '📖' },
]

export default function AppNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ email?: string; username?: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const key = localStorage.getItem('api_key')
    if (key) {
      fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${key}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setUser(d))
        .catch(() => {})
    }
  }, [])

  const handleLogout = () => {
    const key = localStorage.getItem('api_key')
    if (key) {
      fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
      }).catch(() => {})
    }
    localStorage.removeItem('api_key')
    window.location.href = '/app'
  }

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-bg/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-text font-bold text-lg">
          <span className="bg-accent-gradient bg-clip-text text-transparent">⚡ MultiAPI</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-3 py-1.5 rounded text-sm transition-all
                  ${isActive
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-secondary hover:text-text hover:bg-panel-hover'
                  }
                `}
              >
                <span className="ml-1.5">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-text-secondary hover:text-text hover:bg-panel-hover transition-all"
              >
                <span className="w-6 h-6 rounded-full bg-accent-gradient flex items-center justify-center text-white text-xs font-bold">
                  {(user.username || user.email || '?')[0].toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user.username || user.email?.split('@')[0]}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 mt-2 w-48 bg-bg-2 border border-border rounded-lg shadow-lg py-1 z-50">
                    <Link
                      href="/app/profile"
                      className="block px-4 py-2 text-sm text-text-secondary hover:text-text hover:bg-panel-hover"
                      onClick={() => setMenuOpen(false)}
                    >
                      👤 پروفایل
                    </Link>
                    <Link
                      href="/app/payments"
                      className="block px-4 py-2 text-sm text-text-secondary hover:text-text hover:bg-panel-hover"
                      onClick={() => setMenuOpen(false)}
                    >
                      💳 پرداخت‌ها
                    </Link>
                    <Link
                      href="/app/notifications"
                      className="block px-4 py-2 text-sm text-text-secondary hover:text-text hover:bg-panel-hover"
                      onClick={() => setMenuOpen(false)}
                    >
                      🔔 اعلان‌ها
                    </Link>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-right px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                    >
                      🚪 خروج
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/app"
              className="px-4 py-1.5 text-sm font-medium bg-accent-gradient text-white rounded hover:opacity-90 transition-opacity"
            >
              ورود
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-text"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-bg-2 py-2 px-4">
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  block px-3 py-2 rounded text-sm transition-all
                  ${isActive ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text'}
                `}
                onClick={() => setMenuOpen(false)}
              >
                <span className="ml-2">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
