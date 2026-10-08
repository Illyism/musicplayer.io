import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#111111',
    description: 'Find your sound in music communities. Build a queue and keep the good finds.',
    display: 'standalone',
    icons: [{ purpose: 'any', sizes: 'any', src: '/icon.svg', type: 'image/svg+xml' }],
    name: 'Music Player for Reddit',
    short_name: 'Reddit Music',
    start_url: '/',
    theme_color: '#111111',
  }
}
