import { Suspense } from 'react'
import { preload } from 'react-dom'
import { AppShellFallback } from '@/components/app-shell-fallback'
import { MusicApp } from '@/components/music-app'
import { listingRequestPath, parseRouteCommunities } from '@/lib/utils/listing-request'

async function SubredditApp({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const communities = parseRouteCommunities(slug)
  if (communities.length > 0) {
    preload(listingRequestPath(communities.join('+')), { as: 'fetch', crossOrigin: 'anonymous' })
  }
  return <MusicApp initialSubreddits={communities.length > 0 ? communities : undefined} />
}

export default function SubredditPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <SubredditApp params={params} />
    </Suspense>
  )
}
