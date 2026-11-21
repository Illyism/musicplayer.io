'use client'

import {
  ArrowSquareOut,
  Headphones,
  MusicNote,
  SoundcloudLogo,
  YoutubeLogo,
} from '@phosphor-icons/react'
import { VoteControl } from '@/components/vote-control'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { getPlatformName } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'
import { MediaPlayerFrame } from './media-player-frame'

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
  const spansCommunities = usePlayerStore(
    state => state.searchQuery !== null || state.selectedSubreddits.length > 1
  )
  const display = trackDisplay(song)
  const platform = getPlatformName(song.domain)

  return (
    <div className="space-y-5">
      <div>
        {variant === 'sidebar' ? (
          <>
            <h2
              className="line-clamp-2 text-2xl leading-tight font-extrabold tracking-[-0.03em] text-pretty"
              title={song.title}
            >
              {display.title}
            </h2>
            <p className="text-muted-foreground mt-1 truncate text-base">
              {display.artist ?? `r/${song.subreddit}`}
            </p>
          </>
        ) : (
          <h2 className="text-base leading-snug font-bold text-pretty">{song.title}</h2>
        )}
        <p className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          {spansCommunities || variant === 'sheet' ? (
            <>
              <a
                className="hover:text-foreground focus-visible:outline-ring rounded-sm focus-visible:outline-2"
                href={`https://www.reddit.com/r/${song.subreddit}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                r/{song.subreddit}
              </a>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span className="max-w-full truncate">u/{song.author}</span>
          {song.created_ago ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{song.created_ago}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <VoteControl score={song.score} />
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

      {song.selftext ? (
        <p className="text-muted-foreground text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
          {song.selftext}
        </p>
      ) : null}
    </div>
  )
}

export function SongInfoSidebar({ isDesktop }: { isDesktop: boolean }) {
  const currentSong = usePlayerStore(state => state.currentSong)

  return (
    <aside aria-label="Now playing" className="bg-panel flex h-full min-h-0 w-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <h2 className="text-xl font-extrabold tracking-[-0.03em]">Now playing</h2>
        <Headphones aria-hidden className="text-muted-foreground size-5" />
      </div>
      {currentSong ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {isDesktop ? (
            <MediaPlayerFrame
              className="mb-4 overflow-hidden rounded-lg"
              playerKeyPrefix="desktop-player"
              song={currentSong}
            />
          ) : null}
          <SongInfoContent key={currentSong.id} song={currentSong} />
        </div>
      ) : (
        <PlayerEmptyState />
      )}
    </aside>
  )
}
