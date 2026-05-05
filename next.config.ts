import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Note: 'output: standalone' is NOT set here — Vercel manages its own output format.
  // Use output: 'standalone' only for self-hosted / Docker deployments.

  serverExternalPackages: [],
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/favicon.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'image/svg+xml; charset=utf-8',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
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
              // Scripts: self + inline for Next.js hydration + CDN for JSZip/Mammoth + Google/Firebase Auth
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com cdn.jsdelivr.net apis.google.com accounts.google.com www.gstatic.com www.google.com *.firebaseapp.com",
              // Styles: self + inline for Tailwind + Google Fonts + Google Auth UI + Firebase domains
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com www.gstatic.com *.firebaseapp.com",
              // Fonts: self + Google Fonts CDN + Google Font Static
              "font-src 'self' data: fonts.gstatic.com www.gstatic.com",
              // Images: self + data URIs (for base64) + blobs (for generated exports) + HTTPS + Google + Firebase
              "img-src 'self' data: blob: https: www.gstatic.com *.firebaseapp.com",
              // Connections: self + Firebase + Gemini + Stripe + Resend + Google Auth + all Firebase services
              "connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com https://*.googleapis.com https://api.stripe.com https://api.resend.com https://www.google.com https://accounts.google.com https://*.firebaseapp.com https://*.cloudfunctions.net",
              // Frames: Stripe payment iframe + Google Auth iframes + Firebase auth + Google gstatic resources
              "frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://*.firebaseapp.com www.gstatic.com accounts.google.com",
              // Workers: self + blob (for PDF/ZIP generation)
              "worker-src 'self' blob:",
              // Media (for audiobook TTS playback)
              "media-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
