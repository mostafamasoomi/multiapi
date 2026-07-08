/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8800';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/models', destination: `${BACKEND}/admin/models` },
      { source: '/chat/completions', destination: `${BACKEND}/v1/chat/completions` },
    ];
  },
};

module.exports = nextConfig;
