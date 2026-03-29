import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.tile.openstreetmap.org https://unpkg.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.tile.openstreetmap.org",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // geolocation=(self) — allows farmer GPS via navigator.geolocation
    // camera/microphone remain blocked
    // interest-cohort — disables FLoC tracking
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',

  // Required: prevents Next.js 16 from bundling mongoose (causes build failures)
  serverExternalPackages: ['mongoose'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  sassOptions: {
    includePaths: [path.join(process.cwd(), 'node_modules')],
  },

  poweredByHeader: false,
  compress: true,

  webpack(config) {
    return config;
  },
};

export default withNextIntl(nextConfig);
