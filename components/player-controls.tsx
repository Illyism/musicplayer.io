'use client'

import {
  MusicNote,
  Pause,
  PictureInPicture,
  Play,
  Queue,
  Repeat,
  RepeatOnce,
  Shuffle,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerLow,
  SpeakerX,
} from '@phosphor-icons/react'
import Image from 'next/image'
import { type ChangeEvent, useRef } from 'react'
import { SaveTrackButton } from '@/components/save-track-button'
import { Button } from '@/components/ui/button'
import { VoteControl } from '@/components/vote-control'
import { seekCurrentMedia } from '@/lib/hooks/use-media-session'
import { usePictureInPicture } from '@/lib/hooks/use-picture-in-picture'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'
import { formatTime, isRedditHostedImage } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

function useSeek() {
  const currentTime = usePlayerStore(state => state.currentTime)
  const duration = usePlayerStore(state => state.duration)
  const currentSong = usePlayerStore(state => state.currentSong)
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const inputProps = {
    'aria-label': 'Seek',
    'aria-valuetext': `${formatTime(currentTime)} of ${formatTime(duration)}`,
    disabled: !currentSong || duration === 0,
    max: duration || 1,
    min: 0,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      seekCurrentMedia(Number(event.target.value))
    },
    step: 1,
    type: 'range',
    value: Math.min(currentTime, duration),
  } as const
  return { inputProps, progress }
}

function DockSeekLine() {
  const { inputProps, progress } = useSeek()

  return (
    <div className="group/seek absolute inset-x-0 top-0 z-10 hidden h-3 lg:block">
      <div className="absolute inset-x-0 top-0 h-3 overflow-hidden rounded-t-lg">
        <div className="bg-foreground/25 dark:bg-foreground/20 h-[3px] w-full transition-[height] duration-100 group-hover/seek:h-[5px]">
          <div className="bg-reddit h-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <input
        {...inputProps}
        className="absolute inset-x-0 -top-1 h-4 w-full cursor-pointer opacity-0 disabled:cursor-default"
      />
      <div
        className="bg-foreground ring-ring/40 pointer-events-none absolute top-0.5 size-3 -translate-y-1/2 rounded-full opacity-0 transition-opacity duration-100 group-hover/seek:opacity-100 group-has-[input:disabled]/seek:hidden group-has-[input:focus-visible]/seek:opacity-100 group-has-[input:focus-visible]/seek:ring-4"
        style={{ left: `calc(${progress}% - 6px)` }}
      />
    </div>
  )
}

function MiniProgressLine() {
  const { progress } = useSeek()

  return (
    <div
      aria-hidden="true"
      className="bg-foreground/25 dark:bg-foreground/20 pointer-events-none absolute inset-x-2 bottom-1 h-1 overflow-hidden rounded-full lg:hidden"
    >
      <div className="bg-reddit h-full rounded-full" style={{ width: `${progress}%` }} />
    </div>
  )
}

export function SeekControl({ className = '' }: { className?: string }) {
  const { inputProps, progress } = useSeek()

  return (
    <div className={cn('group relative flex h-6 items-center', className)}>
      <div className="bg-foreground/20 h-1 w-full overflow-hidden rounded-full">
        <div className="bg-foreground h-full rounded-full" style={{ width: `${progress}%` }} />
      </div>
      <input
        {...inputProps}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
      />
      <div
        className="bg-foreground ring-background group-focus-within:ring-ring/30 pointer-events-none absolute size-2.5 rounded-full opacity-0 ring-4 transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100"
        style={{ left: `calc(${progress}% - 5px)` }}
      />
    </div>
  )
}

function TrackArtwork({ song }: { song: Song | null }) {
  return song?.thumbnail ? (
    <Image
      alt=""
      className="size-11 shrink-0 rounded-sm object-cover lg:size-14"
      height={56}
      priority
      src={song.thumbnail}
      unoptimized={isRedditHostedImage(song.thumbnail)}
      width={56}
    />
  ) : (
    <div className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-sm lg:size-14">
      <MusicNote className="size-5" />
    </div>
  )
}

function TrackSummary({ song }: { song: Song | null }) {
  const display = song ? trackDisplay(song) : null
  return (
    <>
      <TrackArtwork song={song} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold lg:text-[15px]">
          {display?.title || 'Your next favorite is waiting'}
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-xs lg:text-[13px]">
          {song ? (display?.artist ?? `r/${song.subreddit}`) : 'Choose a track to start listening'}
        </span>
      </span>
    </>
  )
}

export function PlayerControls() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    currentSong,
    songs,
    repeatMode,
    togglePlay,
    next,
    previous,
    shufflePlaylist,
    cycleRepeatMode,
    setVolume,
    setMobileView,
    setQueueOpen,
  } = usePlayerStore()
  const pip = usePictureInPicture()
  const previousVolumeRef = useRef(volume > 0 ? volume : 100)

  let VolumeIcon = SpeakerHigh
  if (volume === 0) {
    VolumeIcon = SpeakerX
  } else if (volume < 50) {
    VolumeIcon = SpeakerLow
  }

  return (
    <section
      aria-label="Playback controls"
      className="bg-card lg:bg-panel relative z-50 mx-2 flex h-16 shrink-0 items-center overflow-hidden rounded-lg px-2 lg:mb-2 lg:grid lg:h-[72px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)] lg:gap-4 lg:overflow-visible lg:px-4"
    >
      <MiniProgressLine />
      <DockSeekLine />

      <div className="flex w-full min-w-0 items-center gap-2 lg:gap-3">
        <button
          aria-label={currentSong ? `Show details for ${currentSong.title}` : 'Now playing'}
          className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 lg:hidden"
          disabled={!currentSong}
          onClick={() => setMobileView('player')}
          type="button"
        >
          <TrackSummary song={currentSong} />
        </button>
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <TrackSummary song={currentSong} />
          {currentSong !== null && <SaveTrackButton song={currentSong} />}
        </div>

        <div className="flex shrink-0 items-center lg:hidden">
          <Button
            aria-label="Open queue"
            className="size-11 rounded-full"
            onClick={() => setQueueOpen(true)}
            size="icon"
            variant="ghost"
          >
            <Queue className="size-5" />
          </Button>
          <Button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="text-foreground hover:bg-accent size-11 rounded-full bg-transparent"
            disabled={!currentSong}
            onClick={togglePlay}
            size="icon"
            type="button"
          >
            {isPlaying ? (
              <Pause className="size-5" weight="fill" />
            ) : (
              <Play className="ml-0.5 size-5" weight="fill" />
            )}
          </Button>
          <Button
            aria-label="Next track"
            className="size-11 rounded-full"
            disabled={!currentSong}
            onClick={next}
            size="icon"
            type="button"
            variant="ghost"
          >
            <SkipForward className="size-5" weight="fill" />
          </Button>
        </div>
      </div>

      <div className="hidden items-center gap-1 lg:flex">
        <Button
          aria-label="Shuffle your mix"
          className="text-muted-foreground hover:text-foreground size-11 rounded-full"
          disabled={songs.length < 2}
          onClick={shufflePlaylist}
          size="icon"
          variant="ghost"
        >
          <Shuffle className="size-5" />
        </Button>
        <Button
          aria-label="Previous track"
          className="size-11 rounded-full"
          disabled={!currentSong}
          onClick={previous}
          size="icon"
          type="button"
          variant="ghost"
        >
          <SkipBack className="size-5" weight="fill" />
        </Button>
        <Button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="hover:bg-primary mx-1 size-11 rounded-full hover:scale-105"
          disabled={!currentSong}
          onClick={togglePlay}
          size="icon"
          type="button"
        >
          {isPlaying ? (
            <Pause className="size-5" weight="fill" />
          ) : (
            <Play className="ml-0.5 size-5" weight="fill" />
          )}
        </Button>
        <Button
          aria-label="Next track"
          className="size-11 rounded-full"
          disabled={!currentSong}
          onClick={next}
          size="icon"
          type="button"
          variant="ghost"
        >
          <SkipForward className="size-5" weight="fill" />
        </Button>
        <Button
          aria-label={`Repeat: ${repeatMode}. Change repeat mode`}
          aria-pressed={repeatMode !== 'off'}
          className={cn(
            'text-muted-foreground hover:text-foreground size-11 rounded-full',
            repeatMode !== 'off' && 'text-reddit hover:text-reddit'
          )}
          onClick={cycleRepeatMode}
          size="icon"
          variant="ghost"
        >
          {repeatMode === 'one' ? <RepeatOnce className="size-5" /> : <Repeat className="size-5" />}
        </Button>
        <span className="text-muted-foreground ml-3 hidden text-xs whitespace-nowrap tabular-nums min-[1100px]:inline">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="hidden items-center justify-end gap-1 lg:flex">
        {currentSong !== null && (
          <VoteControl className="mr-3 hidden min-[1060px]:inline-flex" score={currentSong.score} />
        )}
        <Button
          aria-label="Open queue"
          className="text-muted-foreground hover:text-foreground size-11 rounded-full"
          onClick={() => setQueueOpen(true)}
          size="icon"
          variant="ghost"
        >
          <Queue className="size-5" />
        </Button>
        <Button
          aria-label={pip.isActive ? 'Close picture-in-picture' : 'Open picture-in-picture'}
          aria-pressed={pip.isActive}
          className="text-muted-foreground hover:text-foreground aria-pressed:text-foreground size-11 rounded-full"
          disabled={!currentSong || pip.isOpening}
          onClick={pip.toggle}
          size="icon"
          variant="ghost"
        >
          <PictureInPicture className="size-5" />
        </Button>
        <Button
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          aria-pressed={volume === 0}
          className="text-muted-foreground hover:text-foreground size-11 rounded-full"
          onClick={() => {
            if (volume === 0) {
              setVolume(previousVolumeRef.current)
            } else {
              previousVolumeRef.current = volume
              setVolume(0)
            }
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <VolumeIcon className="size-5" />
        </Button>
        <div className="group relative mr-1 flex h-11 w-24 items-center">
          <div className="bg-foreground/20 h-1 w-full overflow-hidden rounded-full">
            <div className="bg-foreground h-full rounded-full" style={{ width: `${volume}%` }} />
          </div>
          <input
            aria-label="Volume"
            aria-valuetext={`${volume}%`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            max={100}
            min={0}
            onChange={event => setVolume(Number(event.target.value))}
            type="range"
            value={volume}
          />
          <span
            className="bg-foreground ring-ring/30 pointer-events-none absolute size-2.5 rounded-full opacity-0 ring-4 group-focus-within:opacity-100 group-hover:opacity-100"
            style={{ left: `calc(${volume}% - 5px)` }}
          />
        </div>
      </div>
    </section>
  )
}
