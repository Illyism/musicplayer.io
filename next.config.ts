import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Keep Turbopack FS cache on so BuildKit .next/cache mounts work in Docker builds
    turbopackFileSystemCacheForBuild: true,
  },
  // Optimize static files
  async headers() {
    return [
      {
        // Legal pages stay reachable for people but out of search results.
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
  // Explicit opt-out keeps today's prefetch behaviour; Next enables partial prefetching by default next major
  partialPrefetching: false,
  reactCompiler: true,
  reactStrictMode: true,
  // Skip Next's embedded typecheck inside Docker builds. The real gate is CI/pre-commit
  // `bun run typecheck` (TS7 via `bun --check`).
  typescript: {
    ignoreBuildErrors: process.env.DOCKER_BUILD === 'true',
  },
}

export default nextConfig
