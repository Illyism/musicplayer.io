'use client'

import { ArrowUp, MusicNote, Play, SpeakerHigh } from '@phosphor-icons/react'
import Image from 'next/image'
import { TrackMenu } from '@/components/track-menu'
import { Button } from '@/components/ui/button'
import type { Song } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'
import { formatNumber, isRedditHostedImage } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

const TRACK_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto_2.25rem] items-center gap-x-3 @min-[480px]/mix:grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_2.25rem] @min-[600px]/mix:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,9rem)_4.5rem_2.25rem] @min-[720px]/mix:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,9rem)_5.5rem_4.5rem_2.25rem]'
const NUMBER_CELL = 'hidden @min-[480px]/mix:flex'
const GENRE_CELL = 'hidden @min-[600px]/mix:block'
const POSTED_CELL = 'hidden @min-[720px]/mix:block'

export function TrackTableHeader({ showSharedBy }: { showSharedBy: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="bg-panel sticky top-0 z-10 mb-2 hidden border-b px-3 @min-[480px]/mix:block"
    >
      <div
        className={cn(TRACK_GRID, 'text-muted-foreground h-9 text-xs font-medium tracking-normal')}
      >
        <span className={cn(NUMBER_CELL, 'justify-center')}>#</span>
        <span>Title</span>
        <span className={GENRE_CELL}>{showSharedBy ? 'Shared by' : 'Genre'}</span>
        <span className={POSTED_CELL}>Posted</span>
        <span className="flex justify-end">
          <ArrowUp className="size-3.5" weight="bold" />
        </span>
        <span />
      </div>
    </div>
  )
}

export function TrackRow({
  song,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  priority,
  showSharedBy,
  showSubreddit,
}: {
  song: Song
  index: number
  isCurrent: boolean
  isPlaying: boolean
  onPlay: (index: number) => void
  priority?: boolean
  showSharedBy: boolean
  showSubreddit: boolean
}) {
  const display = trackDisplay(song)
  const artist = display.artist ?? `r/${song.subreddit}`
  const subtitle = display.artist && showSubreddit ? `${artist} · r/${song.subreddit}` : artist
  const thirdColumn = showSharedBy ? `u/${song.author}` : (display.genre ?? '')

  return (
    <div className="group/row relative">
      <Button
        aria-label={`Play ${song.title}, shared in r/${song.subreddit}`}
        aria-pressed={isCurrent}
        className={cn(
          TRACK_GRID,
          'group/track h-14 w-full rounded-md px-3 text-left font-normal',
          isCurrent
            ? 'bg-muted hover:bg-muted dark:hover:bg-muted'
            : 'hover:bg-foreground/10 dark:hover:bg-foreground/10'
        )}
        disabled={!song.playable}
        onClick={() => onPlay(index)}
        static
        variant="ghost"
      >
        <span
          className={cn(
            NUMBER_CELL,
            'text-muted-foreground items-center justify-center text-base tabular-nums'
          )}
        >
          {isCurrent && isPlaying ? (
            <SpeakerHigh className="text-reddit size-4" weight="fill" />
          ) : (
            <>
              <span
                className={cn(
                  'group-hover/track:hidden group-focus-visible/track:hidden',
                  isCurrent && 'text-reddit'
                )}
              >
                {index + 1}
              </span>
              <Play
                className="text-foreground hidden size-3.5 group-hover/track:block group-focus-visible/track:block"
                weight="fill"
              />
            </>
          )}
        </span>
        <span className="flex min-w-0 items-center gap-3">
          <span className="bg-muted relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm">
            {song.thumbnail ? (
              <Image
                alt=""
                className="size-full object-cover"
                height={40}
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                src={song.thumbnail}
                unoptimized={isRedditHostedImage(song.thumbnail)}
                width={40}
              />
            ) : (
              <MusicNote className="text-muted-foreground size-4" />
            )}
            {isCurrent === true && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white @min-[480px]/mix:hidden">
                {isPlaying ? (
                  <SpeakerHigh className="size-4" weight="fill" />
                ) : (
                  <Play className="size-4" weight="fill" />
                )}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                'block truncate text-[15px] leading-5 font-medium',
                isCurrent ? 'text-reddit' : 'text-foreground'
              )}
            >
              {display.title}
            </span>
            <span className="text-muted-foreground block truncate text-[13px] leading-5">
              {subtitle}
            </span>
          </span>
        </span>
        <span className={cn(GENRE_CELL, 'text-muted-foreground truncate text-sm')}>
          {thirdColumn}
        </span>
        <span className={cn(POSTED_CELL, 'text-muted-foreground truncate text-sm')}>
          {song.created_ago ?? ''}
        </span>
        <span className="flex items-center justify-end gap-1 text-sm font-semibold tabular-nums">
          <ArrowUp className="text-reddit size-4" weight="bold" />
          <span className="text-reddit">{formatNumber(song.score)}</span>
        </span>
        <span />
      </Button>
      <TrackMenu
        className="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 @max-[479px]/mix:opacity-100 pointer-coarse:opacity-100"
        song={song}
      />
    </div>
  )
}

export function TrackLoadingState() {
  return (
    <div aria-label="Loading tracks" className="flex flex-col py-2" role="status">
      <span className="sr-only">Finding music from your communities…</span>
      {['one', 'two', 'three', 'four', 'five', 'six'].map(key => (
        <div
          aria-hidden="true"
          className="flex h-14 items-center gap-3 rounded-md px-3 motion-safe:animate-pulse"
          key={key}
        >
          <div className="bg-muted size-10 shrink-0 rounded-sm" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="bg-muted h-3 w-3/4 rounded-full" />
            <div className="bg-muted h-2.5 w-2/5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
