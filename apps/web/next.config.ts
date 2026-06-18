import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' http://localhost:*",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      { source: '/api/auth/login', destination: 'http://localhost:4001/login' },
      { source: '/api/auth/register', destination: 'http://localhost:4001/register' },
      { source: '/api/auth/users', destination: 'http://localhost:4001/users' },
      { source: '/api/auth/refresh', destination: 'http://localhost:4001/refresh' },
      { source: '/api/projects/:path*', destination: 'http://localhost:4002/:path*' },
      { source: '/api/tasks/:path*', destination: 'http://localhost:4003/:path*' },
      { source: '/api/notifications/:path*', destination: 'http://localhost:4004/:path*' },
    ];
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.amazonaws.com' }],
  },
  typedRoutes: true,
};

export default nextConfig;
