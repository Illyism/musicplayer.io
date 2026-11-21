'use client'

import {
  CaretDown,
  Pause,
  PictureInPicture,
  Play,
  Queue,
  Repeat,
  RepeatOnce,
  ShareNetwork,
  Shuffle,
  SkipBack,
  SkipForward,
} from '@phosphor-icons/react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { SaveTrackButton } from '@/components/save-track-button'
import { ShareModal } from '@/components/share-modal'
import { TrackMenu } from '@/components/track-menu'
import { Button } from '@/components/ui/button'
import { usePictureInPicture } from '@/lib/hooks/use-picture-in-picture'
import { usePlayerStore } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'
import { formatTime, getPlatformName, isRedditHostedImage } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'
import { MediaPlayerFrame } from './media-player-frame'
import { SeekControl } from './player-controls'
import { PlayerEmptyState, SongInfoContent } from './song-info-sidebar'

export function PlayerPanel({ isDesktop }: { isDesktop: boolean }) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    previous,
    next,
    shufflePlaylist,
    songs,
    repeatMode,
    cycleRepeatMode,
    setQueueOpen,
    setMobileView,
    selectedSubreddits,
  } = usePlayerStore()
  const pip = usePictureInPicture()
  const [share, setShare] = useState(false)
  const gestureStart = useRef(0)
  if (!currentSong) {
    return (
      <div className="flex min-h-full flex-col">
        <Button
          className="m-3 self-start"
          onClick={() => setMobileView('playlist')}
          variant="ghost"
        >
          <CaretDown className="size-5" />
          Back to music
        </Button>
        <PlayerEmptyState />
      </div>
    )
  }
  const display = trackDisplay(currentSong)
  return (
    <section
      aria-label="Now playing"
      className="bg-panel relative min-h-full overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      {!!currentSong.thumbnail && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] overflow-hidden opacity-40"
        >
          <Image
            alt=""
            className="size-full scale-150 object-cover blur-[64px] saturate-150 outline-none dark:outline-none"
            height={600}
            src={currentSong.thumbnail}
            unoptimized={isRedditHostedImage(currentSong.thumbnail)}
            width={600}
          />
          <div className="to-panel absolute inset-0 bg-linear-to-b from-transparent" />
        </div>
      )}
      <div className="relative mx-auto flex max-w-lg flex-col gap-5 px-5 sm:px-7">
        <div className="flex h-14 items-center justify-between gap-3">
          <Button
            aria-label="Collapse now playing"
            className="size-11 rounded-full"
            onClick={() => setMobileView('playlist')}
            onPointerDown={event => {
              gestureStart.current = event.clientY
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerUp={event => {
              if (event.clientY - gestureStart.current > 60) {
                setMobileView('playlist')
              }
            }}
            size="icon"
            variant="ghost"
          >
            <CaretDown className="size-6" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="text-muted-foreground text-[10px] tracking-[0.12em] uppercase">
              Playing from
            </p>
            <p className="mt-1 truncate text-xs font-semibold">r/{currentSong.subreddit}</p>
          </div>
          <TrackMenu song={currentSong} />
        </div>
        {!isDesktop && (
          <div className="my-3 flex aspect-video min-h-[min(34vh,180px)] w-full items-center justify-center">
            <MediaPlayerFrame
              className="w-full overflow-hidden rounded-lg shadow-2xl"
              playerKeyPrefix="mobile-player"
              song={currentSong}
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 text-2xl leading-tight font-extrabold tracking-[-0.03em]">
              {display.title}
            </h1>
            <p className="text-muted-foreground mt-2 truncate text-sm">
              {display.artist ?? `r/${currentSong.subreddit}`} ·{' '}
              {getPlatformName(currentSong.domain)}
            </p>
          </div>
          <SaveTrackButton className="size-12" song={currentSong} />
        </div>
        <div>
          <SeekControl className="[&>div]:bg-foreground/20 h-8" />
          <div className="text-muted-foreground flex justify-between text-[11px] tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>
              {duration > 0 ? `−${formatTime(Math.max(0, duration - currentTime))}` : '0:00'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1">
          <Button
            aria-label="Shuffle your mix"
            className="text-muted-foreground size-12 rounded-full"
            disabled={songs.length < 2}
            onClick={shufflePlaylist}
            size="icon"
            variant="ghost"
          >
            <Shuffle className="size-6" />
          </Button>
          <Button
            aria-label="Previous track"
            className="size-12 rounded-full"
            onClick={previous}
            size="icon"
            variant="ghost"
          >
            <SkipBack className="size-8" weight="fill" />
          </Button>
          <Button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="size-[72px] shrink-0 rounded-full"
            onClick={togglePlay}
            size="icon"
          >
            {isPlaying ? (
              <Pause className="size-8" weight="fill" />
            ) : (
              <Play className="ml-1 size-8" weight="fill" />
            )}
          </Button>
          <Button
            aria-label="Next track"
            className="size-12 rounded-full"
            onClick={next}
            size="icon"
            variant="ghost"
          >
            <SkipForward className="size-8" weight="fill" />
          </Button>
          <Button
            aria-label={`Repeat: ${repeatMode}. Change repeat mode`}
            aria-pressed={repeatMode !== 'off'}
            className={cn(
              'text-muted-foreground size-12 rounded-full',
              repeatMode !== 'off' && 'text-reddit'
            )}
            onClick={cycleRepeatMode}
            size="icon"
            variant="ghost"
          >
            {repeatMode === 'one' ? (
              <RepeatOnce className="size-6" />
            ) : (
              <Repeat className="size-6" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <Button
            aria-label={pip.isActive ? 'Close picture-in-picture' : 'Open picture-in-picture'}
            aria-pressed={pip.isActive}
            className="text-muted-foreground size-12 rounded-full"
            disabled={pip.isOpening}
            onClick={pip.toggle}
            size="icon"
            variant="ghost"
          >
            <PictureInPicture className="size-6" />
          </Button>
          <div className="flex items-center gap-3">
            <Button
              aria-label="Share this track"
              className="text-muted-foreground size-12 rounded-full"
              onClick={() => setShare(true)}
              size="icon"
              variant="ghost"
            >
              <ShareNetwork className="size-5" />
            </Button>
            <Button
              aria-label="Open queue"
              className="text-muted-foreground size-12 rounded-full"
              onClick={() => setQueueOpen(true)}
              size="icon"
              variant="ghost"
            >
              <Queue className="size-6" />
            </Button>
          </div>
        </div>
        <details className="bg-card rounded-lg p-5">
          <summary className="cursor-pointer text-base font-semibold">Behind the track</summary>
          <div className="pt-5">
            <SongInfoContent key={currentSong.id} song={currentSong} variant="sheet" />
          </div>
        </details>
      </div>
      <ShareModal
        isOpen={share}
        onClose={() => setShare(false)}
        song={currentSong}
        subreddits={selectedSubreddits}
      />
    </section>
  )
}
