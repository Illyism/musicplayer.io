import { Metadata } from 'next'

interface SubredditPageProps {
  params: Promise<{ subreddit: string }>
}

export async function generateMetadata(
  { params }: SubredditPageProps,
): Promise<Metadata> {
  const { subreddit } = await params
  const subredditName = subreddit.replace(/\+/g, ', ').replace(/^r\//, '')
  const title = `${subredditName} | Reddit Music Player`
  const description = `Listen to music from the ${subredditName} subreddit on Reddit Music Player.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://reddit.musicplayer.io/r/${subreddit}`,
      siteName: 'Reddit Music Player',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default function SubredditPage() {
  // This page will render the main application,
  // and the useUrlParams hook will pick up the subreddit from the URL.
  return null
}

