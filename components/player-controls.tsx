'use client'

import {
  MusicNote,
  Pause,
  PictureInPicture,
  Play,
  Queue,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerLow,
  SpeakerX,
} from '@phosphor-icons/react'
import Image from 'next/image'
import { useRef } from 'react'
import { SaveTrackButton } from '@/components/save-track-button'
import { Button } from '@/components/ui/button'
import { usePictureInPicture } from '@/lib/hooks/use-picture-in-picture'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { formatTime, isRedditHostedImage } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

function seekMedia(song: Song, time: number) {
  try {
    if (song.type === 'youtube') {
      window.__youtubePlayer?.seekTo(time, true)
    } else if (song.type === 'vimeo') {
      window.__vimeoPlayer?.setCurrentTime(time)
    } else if (song.type === 'soundcloud') {
      window.__soundcloudWidget?.seekTo(time * 1000)
    } else if (song.type === 'mp3') {
      const audio = window.__audioPlayer ?? document.querySelector('audio')
      if (audio) {
        audio.currentTime = time
      }
    }
  } catch {
    // A provider may still be loading when the user seeks.
  }
}

export function SeekControl({ className = '' }: { className?: string }) {
  const currentTime = usePlayerStore(state => state.currentTime)
  const duration = usePlayerStore(state => state.duration)
  const currentSong = usePlayerStore(state => state.currentSong)
  const seekTo = usePlayerStore(state => state.seekTo)
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div className={`group relative flex h-6 items-center ${className}`}>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${progress}%` }} />
      </div>
      <input
        aria-label="Seek"
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
        disabled={!currentSong || duration === 0}
        max={duration || 1}
        min={0}
        onChange={event => {
          if (!currentSong) {
            return
          }
          const time = Number(event.target.value)
          seekTo(time)
          seekMedia(currentSong, time)
        }}
        step={1}
        type="range"
        value={Math.min(currentTime, duration)}
      />
      <div
        className="pointer-events-none absolute size-2.5 rounded-full bg-foreground opacity-0 ring-4 ring-background transition-opacity duration-100 group-focus-within:opacity-100 group-focus-within:ring-ring/30 group-hover:opacity-100"
        style={{ left: `calc(${progress}% - 5px)` }}
      />
    </div>
  )
}

function TrackArtwork({ song }: { song: Song | null }) {
  return song?.thumbnail ? (
    <Image
      alt=""
      className="size-11 shrink-0 rounded-xl object-cover outline outline-black/10 dark:outline-white/10"
      height={44}
      src={song.thumbnail}
      unoptimized={isRedditHostedImage(song.thumbnail)}
      width={44}
    />
  ) : (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
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
        <span className="block truncate font-medium text-sm">
          {display?.title || 'Your next favorite is waiting'}
        </span>
        <span className="mt-0.5 block truncate text-muted-foreground text-xs">
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
    togglePlay,
    next,
    previous,
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
      className="relative z-50 mx-2 flex h-16 shrink-0 items-center overflow-hidden rounded-xl bg-muted px-2 lg:mx-0 lg:grid lg:h-24 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1.2fr)_minmax(0,1fr)] lg:gap-6 lg:rounded-none lg:border-t lg:bg-sidebar lg:px-6 lg:py-3"
    >
      <SeekControl className="absolute inset-x-2 -bottom-2 lg:hidden" />

      <div className="flex w-full min-w-0 items-center gap-2 lg:gap-3">
        <button
          aria-label={currentSong ? `Show details for ${currentSong.title}` : 'Now playing'}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
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
            className="size-11 rounded-full bg-transparent text-foreground hover:bg-accent"
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

      <div className="hidden min-w-0 flex-col items-center gap-1 lg:flex">
        <div className="flex items-center gap-4">
          <Button
            aria-label="Previous track"
            className="size-11 rounded-full text-muted-foreground hover:text-foreground"
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
            className="size-11 rounded-full"
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
            className="size-11 rounded-full text-muted-foreground hover:text-foreground"
            disabled={!currentSong}
            onClick={next}
            size="icon"
            type="button"
            variant="ghost"
          >
            <SkipForward className="size-5" weight="fill" />
          </Button>
        </div>
        <div className="flex w-full items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
          <span className="w-9 text-right">{formatTime(currentTime)}</span>
          <SeekControl className="flex-1" />
          <span className="w-9">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="hidden items-center justify-end gap-2 lg:flex">
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
          aria-label={pip.isActive ? 'Close picture-in-picture' : 'Open picture-in-picture'}
          aria-pressed={pip.isActive}
          className="size-11 rounded-full"
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
          className="size-11 rounded-full text-muted-foreground"
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
        <div className="group relative flex h-11 w-24 items-center">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-muted-foreground"
              style={{ width: `${volume}%` }}
            />
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
            className="pointer-events-none absolute size-2.5 rounded-full bg-foreground opacity-0 ring-4 ring-ring/30 group-focus-within:opacity-100"
            style={{ left: `calc(${volume}% - 5px)` }}
          />
        </div>
        <span className="w-8 text-right text-[11px] text-muted-foreground tabular-nums">
          {volume}%
        </span>
      </div>
    </section>
  )
}
