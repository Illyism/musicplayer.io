import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Music Player for Reddit | Stream Music from Subreddits',
  description:
    'Discover and stream music from Reddit communities. Browse subreddits, play YouTube, SoundCloud, and Vimeo content in a focused music player.',
  keywords: ['reddit', 'music', 'player', 'streaming', 'youtube', 'soundcloud', 'playlist'],
  authors: [{ name: 'Music Player for Reddit' }],
  openGraph: {
    title: 'Music Player for Reddit',
    description: 'Stream music from Reddit subreddits',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Music Player for Reddit',
    description: 'Stream music from Reddit subreddits',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
