import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForBuild: true,
  },
  async headers() {
    return [
      {
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
        source: '/:path(privacy|terms)',
      },
      {
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
        source: '/:path*',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/images/:path*',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/favicon.ico',
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        hostname: 'i.ytimg.com',
        protocol: 'https',
      },
      {
        hostname: 'img.youtube.com',
        protocol: 'https',
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  output: 'standalone',
  partialPrefetching: false,
  reactCompiler: true,
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: process.env.DOCKER_BUILD === 'true',
  },
}

export default nextConfig
