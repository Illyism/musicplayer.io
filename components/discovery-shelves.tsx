'use client'

import { MusicNote, RedditLogo } from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useShallow } from 'zustand/react/shallow'
import { ListeningSettings } from '@/components/listening-settings'
import { discoveryStatus } from '@/lib/community/presentation'
import { recommendCommunities } from '@/lib/community/recommendations'
import { useCommunityDiscovery } from '@/lib/hooks/use-community-discovery'
import { recommendTracks, useListeningStore } from '@/lib/store/listening-store'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage, mediumCover } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

function TrackCard({ song, priority = false }: { song: Song; priority?: boolean }) {
  const display = trackDisplay(song)
  const cover = mediumCover(song)
  const enqueue = usePlayerStore(state => state.enqueueSong)
  const playQueued = usePlayerStore(state => state.playQueuedSong)
  return (
    <button
      className="focus-visible:ring-ring hover:bg-foreground/10 flex w-40 shrink-0 snap-start flex-col gap-2 rounded-lg p-2 text-left transition-colors outline-none focus-visible:ring-2 @min-[480px]/mix:w-44 @min-[480px]/mix:p-3"
      onClick={() => {
        enqueue(song, 'next')
        playQueued(song.id)
      }}
      type="button"
    >
      {cover ? (
        <Image
          alt=""
          className="aspect-square w-full rounded-md object-cover"
          height={160}
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          src={cover}
          unoptimized={isRedditHostedImage(cover)}
          width={160}
        />
      ) : (
        <span className="bg-muted flex aspect-square w-full items-center justify-center rounded-md">
          <MusicNote className="text-muted-foreground size-10" />
        </span>
      )}
      <span className="line-clamp-2 text-[15px] leading-5 font-bold">{display.title}</span>
      <span className="text-muted-foreground truncate text-sm">
        {display.artist ?? `r/${song.subreddit}`}
      </span>
    </button>
  )
}

export function DiscoveryShelves() {
  const { data } = useCommunityDiscovery()
  const { events, recentSongs } = useListeningStore()
  const { songs, selectedSubreddits, searchQuery } = usePlayerStore(
    useShallow(state => ({
      searchQuery: state.searchQuery,
      selectedSubreddits: state.selectedSubreddits,
      songs: state.songs,
    }))
  )
  if (searchQuery) {
    return null
  }
  const tracks = recommendTracks(songs, events, 8)
  const suggestions = recommendCommunities(data?.communities ?? [], events, selectedSubreddits)
  return (
    <div className="flex flex-col gap-8 pt-4 pb-8">
      {tracks.length > 0 && (
        <section aria-label="Track recommendations" className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-4 @min-[480px]/mix:px-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
                {events.length > 0 ? 'Made for your ears' : 'Start listening'}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {events.length > 0
                  ? 'Your listening helps shape these picks.'
                  : 'Fresh tracks from your current mix.'}
              </p>
            </div>
            <ListeningSettings />
          </div>
          <div className="flex snap-x snap-mandatory scroll-px-2 gap-1 overflow-x-auto px-2 pb-2 @min-[480px]/mix:scroll-px-3 @min-[480px]/mix:px-3">
            {tracks.map((song, index) => (
              <TrackCard key={song.id} priority={index < 4} song={song} />
            ))}
          </div>
        </section>
      )}
      {recentSongs.length > 0 && (
        <section aria-label="Jump back in" className="flex flex-col gap-3">
          <h2 className="px-4 text-2xl font-extrabold tracking-[-0.03em] @min-[480px]/mix:px-6">
            Jump back in
          </h2>
          <div className="flex snap-x snap-mandatory scroll-px-2 gap-1 overflow-x-auto px-2 pb-2 @min-[480px]/mix:scroll-px-3 @min-[480px]/mix:px-3">
            {recentSongs.slice(0, 6).map(song => (
              <TrackCard key={song.id} song={song} />
            ))}
          </div>
        </section>
      )}
      {suggestions.length > 0 && (
        <section aria-label="Community recommendations" className="flex flex-col gap-3">
          <div className="px-4 @min-[480px]/mix:px-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Find your people</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {data ? discoveryStatus(data) : 'Finding active music communities…'}
            </p>
          </div>
          <div className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 @min-[480px]/mix:scroll-px-6 @min-[480px]/mix:px-6">
            {suggestions.map(({ community, reason }) => (
              <Link
                className="bg-card hover:bg-muted focus-visible:ring-ring flex w-44 shrink-0 snap-start flex-col gap-3 rounded-lg p-4 transition-colors outline-none focus-visible:ring-2"
                href={`/r/${community.key}`}
                key={community.key}
              >
                <span className="bg-muted text-reddit flex size-12 items-center justify-center rounded-full">
                  <RedditLogo className="size-6" weight="fill" />
                </span>
                <span className="truncate text-[15px] font-bold">r/{community.name}</span>
                <span className="text-muted-foreground line-clamp-2 text-xs leading-5">
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
