import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

// ---------------------------------------------------------------------------
// Content Security Policy
// The admin panel is server-rendered Next.js — tighten as routes are added.
// ---------------------------------------------------------------------------
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  // Images come from the API (uploads/Cloudinary) and common stock/CDN domains.
  "img-src 'self' data: blob: https: http://localhost:8001 http://127.0.0.1:8001",
  "font-src 'self' data: https:",
  // unsafe-inline is required by PrimeReact and Chart.js inline styles.
  // Do NOT add unsafe-eval here — admin panel does not require eval().
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' https:",
  // https:/wss: cover Railway + any custom API host; localhost kept so
  // `next build` with NODE_ENV=production still works against a local API.
  "connect-src 'self' https: wss: ws: http://localhost:8001 http://127.0.0.1:8001",
  "frame-src 'self' https:",
  "media-src 'self' data: blob: https:",
  "upgrade-insecure-requests",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove console.log calls in production builds — reduces bundle size
  // and avoids accidentally leaking debug info.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  async headers() {
    // Dev bundles use eval-source-map; CSP without unsafe-eval blocks hydration
    // and leaves the login page as dead SSR HTML (buttons do nothing).
    if (process.env.NODE_ENV !== 'production') {
      return [];
    }

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy',      value: contentSecurityPolicy },
          { key: 'Strict-Transport-Security',    value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options',       value: 'nosniff' },
          { key: 'X-Frame-Options',              value: 'DENY' },
          { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',           value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  images: {
    dangerouslyAllowSVG: false,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
      { protocol: 'https', hostname: 't4.ftcdn.net' },
      { protocol: 'https', hostname: 'static.vecteezy.com' },
      { protocol: 'https', hostname: 'cdn-icons-png.flaticon.com' },
      { protocol: 'https', hostname: 'enatega-backend.s3.eu-north-1.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: 'assets.enatega.com' },
      // Local API uploads (development)
      { protocol: 'http', hostname: 'localhost', port: '8001', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8001', pathname: '/uploads/**' },
      // Production API uploads (local-disk fallback when Cloudinary isn't set)
      { protocol: 'https', hostname: 'jedzto-production.up.railway.app', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'api.jedzto.com', pathname: '/uploads/**' },
    ],
  },
};

export default withNextIntl(nextConfig);
