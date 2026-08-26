import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheHandlers: {
    remote: require.resolve('./cache-handlers/redis-handler.js'),
  },
  experimental: {
    // Keep Turbopack FS cache on so BuildKit .next/cache mounts work in Docker builds
    turbopackFileSystemCacheForBuild: true,
  },
  // Optimize static files
  async headers() {
    return [
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
        hostname: 'i.redd.it',
        protocol: 'https',
      },
      {
        hostname: 'preview.redd.it',
        protocol: 'https',
      },
      {
        hostname: 'external-preview.redd.it',
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
  reactCompiler: true,
  reactStrictMode: true,
  // Skip Next's embedded tsc (TS6) inside Docker builds. The real gate is CI/pre-commit
  // `bun run typecheck` (TS7 via @typescript/native).
  typescript: {
    ignoreBuildErrors: process.env.DOCKER_BUILD === 'true',
  },
}

export default nextConfig
