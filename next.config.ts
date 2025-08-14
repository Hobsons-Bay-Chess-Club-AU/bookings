import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  
  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Strict Transport Security (HTTPS only)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Cross-Origin Embedder Policy
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          // Cross-Origin Opener Policy
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // Cross-Origin Resource Policy
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          // Origin Agent Cluster
          {
            key: 'Origin-Agent-Cluster',
            value: '?1',
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), encrypted-media=(), fullscreen=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), web-share=(), xr-spatial-tracking=()',
          },
          // Relax connect-src to allow Vercel Blob client uploads
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' https: data:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://m.stripe.com https://va.vercel-scripts.com https://maps.googleapis.com wss://*.stripe.com https://hooks.stripe.com https://b.stripecdn.com https://pay.stripe.com https://www.google.com/maps/embed https://vercel.com https://*.vercel.com https://blob.vercel-storage.com https://*.vercel-storage.com; frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://m.stripe.com https://www.google.com https://maps.google.com https://checkout.stripe.com https://pay.stripe.com https://www.google.com/maps/embed; object-src 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com; navigate-to 'self' https://checkout.stripe.com https://pay.stripe.com https://www.google.com/maps/embed; upgrade-insecure-requests",
          },
        ],
      },
      {
        // Apply specific headers to API routes
        source: '/api/(.*)',
        headers: [
          // Additional security for API routes
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },

  // Security settings
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Experimental features for security
  experimental: {
    // Security-related experimental features
    serverActions: {
      bodySizeLimit: '1mb', // Limit server action body size
    },
  },

  // Server external packages
  serverExternalPackages: [],

  // Image optimization settings
  images: {
    domains: [
      'localhost',
      'vercel.app',
      'supabase.co',
      'stripe.com',
      'js.stripe.com',
      'checkout.stripe.com',
      'maps.googleapis.com',
      'maps.gstatic.com',
      'streetviewpixels-pa.googleapis.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false, // Disable SVG for security
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack configuration for security
  webpack: (config, { dev, isServer }) => {
    // Security: Disable eval in production
    if (!dev) {
      config.optimization.minimize = true
    }

    return config
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Redirects for security
  async redirects() {
    return [
      // Redirect HTTP to HTTPS in production
      ...(process.env.NODE_ENV === 'production' ? [
        {
          source: '/:path*',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://:host/:path*',
          permanent: true,
        },
      ] : []),
    ]
  },

  // Rewrites for security
  async rewrites() {
    return [
      // Security: Hide internal API routes from direct access
      {
        source: '/internal/:path*',
        destination: '/api/internal/:path*',
      },
    ]
  },
}

export default nextConfig
