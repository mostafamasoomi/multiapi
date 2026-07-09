/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8800';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Auth
      { source: '/api/auth/register', destination: `${BACKEND}/api/auth/register` },
      { source: '/api/auth/login', destination: `${BACKEND}/api/auth/login` },
      { source: '/api/me', destination: `${BACKEND}/api/me` },
      // Models
      { source: '/api/models', destination: `${BACKEND}/admin/models` },
      { source: '/api/models/list', destination: `${BACKEND}/admin/models/list` },
      // Chat
      { source: '/chat/completions', destination: `${BACKEND}/v1/chat/completions` },
      // Wallet
      { source: '/api/wallet/me/balance', destination: `${BACKEND}/wallet/me/balance` },
      { source: '/api/wallet/me/ledger', destination: `${BACKEND}/wallet/me/ledger` },
      // Payment
      { source: '/api/pay/create', destination: `${BACKEND}/pay/create` },
      { source: '/api/pay/callback', destination: `${BACKEND}/pay/callback` },
      // Admin
      { source: '/admin/:path*', destination: `${BACKEND}/admin/:path*` },
      { source: '/health', destination: `${BACKEND}/health` },
    ];
  },
};

module.exports = nextConfig;
