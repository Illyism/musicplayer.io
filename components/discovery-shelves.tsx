'use client'

import { MusicNote, RedditLogo } from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { ListeningSettings } from '@/components/listening-settings'
import { discoveryStatus } from '@/lib/community/presentation'
import { recommendCommunities } from '@/lib/community/recommendations'
import { useCommunityDiscovery } from '@/lib/hooks/use-community-discovery'
import { recommendTracks, useListeningStore } from '@/lib/store/listening-store'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

function TrackCard({ song }: { song: Song }) {
  const display = trackDisplay(song)
  const enqueue = usePlayerStore(state => state.enqueueSong)
  const playQueued = usePlayerStore(state => state.playQueuedSong)
  return (
    <button
      className="flex w-36 shrink-0 snap-start flex-col gap-2 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-40"
      onClick={() => {
        enqueue(song, 'next')
        playQueued(song.id)
      }}
      type="button"
    >
      {song.thumbnail ? (
        <Image
          alt=""
          className="aspect-square w-full rounded-xl object-cover"
          height={160}
          src={song.thumbnail}
          unoptimized={isRedditHostedImage(song.thumbnail)}
          width={160}
        />
      ) : (
        <span className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted">
          <MusicNote className="size-10 text-muted-foreground" />
        </span>
      )}
      <span className="line-clamp-2 font-medium text-sm leading-5">{display.title}</span>
      <span className="truncate text-muted-foreground text-xs">
        {display.artist ?? `r/${song.subreddit}`}
      </span>
    </button>
  )
}

export function DiscoveryShelves() {
  const { data } = useCommunityDiscovery()
  const { events, recentSongs } = useListeningStore()
  const { songs, selectedSubreddits, searchQuery } = usePlayerStore()
  if (searchQuery) {
    return null
  }
  const tracks = recommendTracks(songs, events, 8)
  const suggestions = recommendCommunities(data?.communities ?? [], events, selectedSubreddits)
  return (
    <div className="flex flex-col gap-7 pb-6">
      {tracks.length > 0 && (
        <section aria-label="Track recommendations" className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-5 sm:px-8">
            <div>
              <h2 className="font-semibold text-xl tracking-tight">
                {events.length > 0 ? 'Made for your ears' : 'Start listening'}
              </h2>
              <p className="mt-1 text-muted-foreground text-xs">
                {events.length > 0
                  ? 'Your listening helps shape these picks.'
                  : 'Fresh tracks from your current mix.'}
              </p>
            </div>
            <ListeningSettings />
          </div>
          <div className="flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:scroll-px-8 sm:px-8">
            {tracks.map(song => (
              <TrackCard key={song.id} song={song} />
            ))}
          </div>
        </section>
      )}
      {recentSongs.length > 0 && (
        <section aria-label="Jump back in" className="flex flex-col gap-3">
          <h2 className="px-5 font-semibold text-xl tracking-tight sm:px-8">Jump back in</h2>
          <div className="flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:scroll-px-8 sm:px-8">
            {recentSongs.slice(0, 6).map(song => (
              <TrackCard key={song.id} song={song} />
            ))}
          </div>
        </section>
      )}
      {suggestions.length > 0 && (
        <section aria-label="Community recommendations" className="flex flex-col gap-3">
          <div className="px-5 sm:px-8">
            <h2 className="font-semibold text-xl tracking-tight">Find your people</h2>
            <p className="mt-1 text-muted-foreground text-xs">
              {data ? discoveryStatus(data) : 'Finding active music communities…'}
            </p>
          </div>
          <div className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 sm:scroll-px-8 sm:px-8">
            {suggestions.map(({ community, reason }) => (
              <Link
                className="flex w-44 shrink-0 snap-start flex-col gap-3 rounded-2xl bg-muted/50 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/r/${community.key}`}
                key={community.key}
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-background text-reddit">
                  <RedditLogo className="size-6" weight="fill" />
                </span>
                <span className="truncate font-semibold text-sm">r/{community.name}</span>
                <span className="line-clamp-2 text-muted-foreground text-xs leading-5">
                  {reason}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
