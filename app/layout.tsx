import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  authors: [{ name: 'Music Player for Reddit' }],
  description:
    'Discover and stream music from Reddit communities. Browse subreddits, play YouTube, SoundCloud, and Vimeo content in a focused music player.',
  keywords: ['reddit', 'music', 'player', 'streaming', 'youtube', 'soundcloud', 'playlist'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    description: 'Stream music from Reddit subreddits',
    title: 'Music Player for Reddit',
    type: 'website',
  },
  title: 'Music Player for Reddit | Stream Music from Subreddits',
  twitter: {
    card: 'summary_large_image',
    description: 'Stream music from Reddit subreddits',
    title: 'Music Player for Reddit',
  },
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
