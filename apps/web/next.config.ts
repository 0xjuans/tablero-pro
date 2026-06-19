import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const projectsUrl = process.env.PROJECTS_SERVICE_URL || 'http://localhost:4002';
const tasksUrl = process.env.TASKS_SERVICE_URL || 'http://localhost:4003';
const notificationsUrl = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4004';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      `connect-src 'self'${isDev ? ' http://localhost:*' : ''}`,
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      { source: '/api/auth/login', destination: `${authUrl}/login` },
      { source: '/api/auth/register', destination: `${authUrl}/register` },
      { source: '/api/auth/users', destination: `${authUrl}/users` },
      { source: '/api/auth/refresh', destination: `${authUrl}/refresh` },
      { source: '/api/projects/:path*', destination: `${projectsUrl}/:path*` },
      { source: '/api/tasks/:path*', destination: `${tasksUrl}/:path*` },
      { source: '/api/notifications/:path*', destination: `${notificationsUrl}/:path*` },
    ];
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.amazonaws.com' }],
  },
  typedRoutes: true,
};

export default nextConfig;
