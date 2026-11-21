'use client'

import {
  ArrowSquareOut,
  ArrowUp,
  Headphones,
  MusicNote,
  SoundcloudLogo,
  YoutubeLogo,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { NextUp } from '@/components/next-up'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'
import { formatNumber, getPlatformName } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'
import { MediaPlayerFrame } from './media-player-frame'

const UPCOMING_SKELETON_KEYS = ['up-1', 'up-2', 'up-3', 'up-4', 'up-5']

function NowPlayingSkeleton() {
  return (
    <div
      aria-label="Loading now playing"
      className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6 motion-safe:animate-pulse"
      role="status"
    >
      <span className="sr-only">Loading current track…</span>
      <div
        aria-hidden="true"
        className="bg-muted aspect-video min-h-[180px] w-full rounded-lg"
        style={{ aspectRatio: '16 / 9' }}
      />
      <div aria-hidden="true" className="space-y-2">
        <div className="bg-muted h-6 w-4/5 rounded-full" />
        <div className="bg-muted h-4 w-2/5 rounded-full" />
      </div>
      <div aria-hidden="true" className="bg-card space-y-3 rounded-lg p-4">
        <div className="bg-muted h-4 w-24 rounded-full" />
        <div className="space-y-2">
          <div className="bg-muted h-3.5 w-36 rounded-full" />
          <div className="bg-muted h-3.5 w-44 rounded-full" />
        </div>
        <div className="flex gap-2">
          <div className="bg-muted h-10 w-28 rounded-full" />
          <div className="bg-muted h-10 w-24 rounded-full" />
        </div>
      </div>
      <div aria-hidden="true" className="bg-card space-y-2 rounded-lg p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="bg-muted h-4 w-16 rounded-full" />
          <div className="bg-muted h-4 w-20 rounded-full" />
        </div>
        {UPCOMING_SKELETON_KEYS.map(key => (
          <div className="flex h-14 items-center gap-3 px-2" key={key}>
            <div className="bg-muted size-10 shrink-0 rounded-sm" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="bg-muted h-3.5 w-3/4 rounded-full" />
              <div className="bg-muted h-3 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlayerEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-lg">
        <Headphones className="size-7" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-balance">Find something worth hearing.</h2>
        <p className="text-muted-foreground max-w-60 text-sm leading-relaxed text-pretty">
          Pick a track. The music will meet you here.
        </p>
      </div>
    </div>
  )
}

function PlatformIcon({ song }: { song: Song }) {
  if (song.type === 'youtube') {
    return <YoutubeLogo aria-hidden className="size-4" weight="fill" />
  }
  if (song.type === 'soundcloud') {
    return <SoundcloudLogo aria-hidden className="size-4" weight="fill" />
  }
  return <MusicNote aria-hidden className="size-4" />
}

const PILL =
  'bg-muted hover:bg-accent focus-visible:outline-ring inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2'

export function SongInfoContent({
  song,
  variant = 'sidebar',
}: {
  song: Song
  variant?: 'sidebar' | 'sheet'
}) {
  const display = trackDisplay(song)
  const platform = getPlatformName(song.domain)
  const isSidebar = variant === 'sidebar'

  return (
    <div className="space-y-4">
      {isSidebar ? (
        <div>
          <h2
            className="line-clamp-2 text-2xl leading-tight font-extrabold tracking-[-0.03em] text-pretty"
            title={song.title}
          >
            {display.title}
          </h2>
          <p className="text-muted-foreground mt-1 truncate text-base">
            {display.artist ?? `r/${song.subreddit}`}
          </p>
        </div>
      ) : (
        <h2 className="text-base leading-snug font-bold text-pretty">{song.title}</h2>
      )}

      <section
        aria-label="From Reddit"
        className={cn('space-y-3', isSidebar && 'bg-card rounded-lg p-4')}
      >
        {isSidebar ? <h3 className="text-base font-bold">From Reddit</h3> : null}
        <div className="text-muted-foreground space-y-1 text-sm">
          <p className="flex items-center gap-1.5">
            <a
              className="text-foreground hover:text-reddit focus-visible:outline-ring min-w-0 truncate rounded-sm font-semibold focus-visible:outline-2"
              href={`https://www.reddit.com/r/${song.subreddit}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              r/{song.subreddit}
            </a>
            <span aria-hidden="true">·</span>
            <span className="text-reddit inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums">
              <ArrowUp aria-hidden className="size-3.5" weight="bold" />
              {formatNumber(song.score)}
              <span className="sr-only">upvotes</span>
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className="min-w-0 truncate">u/{song.author}</span>
            {song.created_ago ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{song.created_ago}</span>
              </>
            ) : null}
          </p>
        </div>
        {song.selftext ? (
          <p
            className={cn(
              'text-muted-foreground text-sm leading-relaxed wrap-break-word whitespace-pre-wrap',
              isSidebar && 'line-clamp-6'
            )}
          >
            {song.selftext}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <a
            className={PILL}
            href={`https://www.reddit.com${song.permalink}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ArrowSquareOut aria-hidden className="size-4" />
            Reddit post
          </a>
          {song.url ? (
            <a
              aria-label={`Open on ${platform}`}
              className={PILL}
              href={song.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <PlatformIcon song={song} />
              {platform}
            </a>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export function SongInfoSidebar({ isDesktop }: { isDesktop: boolean }) {
  const currentSong = usePlayerStore(state => state.currentSong)
  const loading = usePlayerStore(state => state.loading)

  let body: ReactNode
  if (currentSong) {
    body = (
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6">
        {isDesktop ? (
          <MediaPlayerFrame
            className="overflow-hidden rounded-lg"
            playerKeyPrefix="desktop-player"
            song={currentSong}
          />
        ) : null}
        <SongInfoContent key={currentSong.id} song={currentSong} />
        <NextUp />
      </div>
    )
  } else if (loading) {
    body = <NowPlayingSkeleton />
  } else {
    body = <PlayerEmptyState />
  }

  return (
    <aside aria-label="Now playing" className="bg-panel flex h-full min-h-0 w-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <h2 className="text-xl font-extrabold tracking-[-0.03em]">Now playing</h2>
        <Headphones aria-hidden className="text-muted-foreground size-5" />
      </div>
      {body}
    </aside>
  )
}
