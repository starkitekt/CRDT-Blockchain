import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const isProd = process.env.NODE_ENV === "production";

const buildCSP = () =>
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.tile.openstreetmap.org https://unpkg.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.tile.openstreetmap.org",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    // Only force HTTPS in production — breaks localhost in dev
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildCSP(),
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Production-only: HSTS with preload causes browsers to permanently
  // remember HTTPS for your domain — never set this in dev/staging
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  {
    // Legacy header — still respected by IE11; harmless on modern browsers
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Blocks Flash/PDF plugins from reading cross-domain responses
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    // geolocation=(self) — allows farmer GPS via navigator.geolocation
    // camera/microphone remain blocked
    // interest-cohort — disables FLoC tracking
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",

  // Prevents Next.js from bundling mongoose (causes build failures)
  serverExternalPackages: ["mongoose"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  sassOptions: {
    includePaths: [path.join(process.cwd(), "node_modules")],
  },

  poweredByHeader: false,
  compress: true,
};

export default withNextIntl(nextConfig);
