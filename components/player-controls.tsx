'use client'

import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerLow,
  SpeakerX,
} from '@phosphor-icons/react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { usePlayerStore } from '@/lib/store/player-store'
import { formatTime, isRedditHostedImage } from '@/lib/utils/song-utils'

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
    seekTo,
    setVolume,
  } = usePlayerStore()

  const [showVolume, setShowVolume] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration === 0) {
      return
    }

    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const newTime = (percentage / 100) * duration

    seekTo(newTime)

    // Seek in actual players
    if (currentSong) {
      // YouTube
      if (currentSong.type === 'youtube' && (window as any).YT && (window as any).__youtubePlayer) {
        try {
          ;(window as any).__youtubePlayer.seekTo(newTime, true)
        } catch {
          // ignore
        }
      }

      // Vimeo
      if (currentSong.type === 'vimeo' && (window as any).__vimeoPlayer) {
        try {
          ;(window as any).__vimeoPlayer.setCurrentTime(newTime)
        } catch {
          // ignore
        }
      }

      // MP3
      if (currentSong.type === 'mp3') {
        const audio = document.querySelector('audio') as HTMLAudioElement
        if (audio) {
          audio.currentTime = newTime
        }
      }

      // SoundCloud
      if (currentSong.type === 'soundcloud' && (window as any).__soundcloudWidget) {
        try {
          const widget = (window as any).__soundcloudWidget
          widget.getDuration((dur: number) => {
            const position = (newTime / dur) * 1000
            widget.seekTo(position)
          })
        } catch {
          // ignore
        }
      }
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  let VolumeIcon = SpeakerHigh
  if (volume === 0) {
    VolumeIcon = SpeakerX
  } else if (volume < 50) {
    VolumeIcon = SpeakerLow
  }

  const handleSeekKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!currentSong || duration === 0) {
      return
    }
    const step = duration / 20
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      seekTo(Math.min(duration, currentTime + step))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      seekTo(Math.max(0, currentTime - step))
    }
  }

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-border border-t bg-card">
      {/* Progress Bar */}
      <div
        aria-label="Seek"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        className="group relative h-3 cursor-pointer"
        onClick={handleSeek}
        onKeyDown={handleSeekKeyboard}
        ref={progressRef}
        role="slider"
        tabIndex={0}
      >
        <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 bg-secondary" />
        <div
          className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-3 py-2 md:px-4">
        {/* Now Playing */}
        <div className="hidden w-[320px] min-w-0 items-center gap-3 md:flex">
          {currentSong?.thumbnail ? (
            <Image
              alt=""
              className="h-10 w-10 shrink-0 rounded object-cover"
              height={40}
              src={currentSong.thumbnail}
              unoptimized={isRedditHostedImage(currentSong.thumbnail)}
              width={40}
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-secondary" />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-xs">
              {currentSong?.title || 'No song selected'}
            </p>
            <p className="truncate text-muted-foreground text-xs">
              {currentSong
                ? `u/${currentSong.author} • r/${currentSong.subreddit}`
                : 'Pick a track'}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex flex-1 items-center gap-2 md:mx-auto md:flex-none">
          <button
            className="rounded-full p-2 transition-colors hover:bg-secondary disabled:opacity-40"
            disabled={!currentSong}
            onClick={previous}
            type="button"
          >
            <SkipBack className="h-5 w-5" weight="fill" />
          </button>
          <button
            className="rounded-full bg-primary p-3 text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-50"
            disabled={!currentSong}
            onClick={togglePlay}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" weight="fill" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" weight="fill" />
            )}
          </button>
          <button
            className="rounded-full p-2 transition-colors hover:bg-secondary disabled:opacity-40"
            disabled={!currentSong}
            onClick={next}
            type="button"
          >
            <SkipForward className="h-5 w-5" weight="fill" />
          </button>
        </div>

        {/* Volume */}
        <div className="relative hidden w-[320px] items-center justify-end gap-3 md:flex">
          <div className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
          <button
            aria-expanded={showVolume}
            aria-label="Volume control"
            className="rounded-full p-2 transition-colors hover:bg-secondary"
            onClick={() => setShowVolume(!showVolume)}
            type="button"
          >
            <VolumeIcon className="h-5 w-5" weight="fill" />
          </button>

          {showVolume && (
            <>
              {/* Dismissal backdrop, not interactive content */}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: overlay click-to-close */}
              {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: overlay click-to-close */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: escape closes via popover focus */}
              <div className="fixed inset-0 z-40" onClick={() => setShowVolume(false)} />

              <div className="absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2">
                <div className="w-20 animate-volume-popover rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-sm">
                  <div className="mb-3 text-center">
                    <p className="font-mono font-semibold text-xs tabular-nums">{volume}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Volume
                    </p>
                  </div>

                  <div className="flex justify-center py-1">
                    <div className="relative flex h-32 w-10 items-center justify-center">
                      <div className="relative h-full w-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="absolute right-0 bottom-0 left-0 rounded-full bg-primary transition-[height] duration-150 ease-out motion-reduce:transition-none"
                          style={{ height: `${volume}%` }}
                        />
                      </div>

                      <div
                        className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-card bg-primary shadow-lg"
                        style={{ bottom: `calc(${volume}% - ${volume / 100}rem)` }}
                      />

                      <input
                        aria-label="Volume"
                        className="absolute top-1/2 left-1/2 h-10 w-32 -translate-x-1/2 -translate-y-1/2 -rotate-90 cursor-pointer opacity-0"
                        max="100"
                        min="0"
                        onChange={e => setVolume(Number(e.target.value))}
                        type="range"
                        value={volume}
                      />
                    </div>
                  </div>

                  <button
                    aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-secondary px-2 py-1.5 font-medium text-xs transition-colors hover:bg-secondary/80"
                    onClick={() => setVolume(volume === 0 ? 80 : 0)}
                    type="button"
                  >
                    {volume === 0 ? (
                      <SpeakerX className="h-3.5 w-3.5" weight="fill" />
                    ) : (
                      <SpeakerHigh className="h-3.5 w-3.5" weight="fill" />
                    )}
                    {volume === 0 ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile Time */}
        <div className="font-mono text-muted-foreground text-xs tabular-nums md:hidden">
          {formatTime(currentTime)}
        </div>
      </div>
    </div>
  )
}
