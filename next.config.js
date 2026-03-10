/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const rewrites = [
      { source: '/favicon.ico', destination: '/favicon.svg' },
    ];
    // Only rewrite to local backend in development (production uses BACKEND_URL via /api/proxy)
    if (process.env.NODE_ENV === 'development') {
      rewrites.push({
        source: '/api/backend/:path*',
        destination: 'http://localhost:4000/api/v1/:path*',
      });
    }
    return rewrites;
  },
};

module.exports = nextConfig;
