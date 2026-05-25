'use client'

import { Play, Pause, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useState, useRef } from 'react'
import { usePlayerStore } from '@/lib/store/player-store'
import { formatTime } from '@/lib/utils/song-utils'

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
    if (!progressRef.current || duration === 0) return

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
        if (audio) audio.currentTime = newTime
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
  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      {/* Progress Bar */}
      <div
        ref={progressRef}
        onClick={handleSeek}
        className="relative h-1 bg-secondary cursor-pointer group"
      >
        <div
          className="absolute left-0 top-0 h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-4 md:px-6 py-3">
        {/* Time */}
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 flex-1 md:flex-none md:mx-auto">
          <button
            onClick={previous}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            disabled={!currentSong}
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            onClick={togglePlay}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={!currentSong}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </button>
          <button
            onClick={next}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            disabled={!currentSong}
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        {/* Volume */}
        <div className="hidden md:block relative">
          <button
            onClick={() => setShowVolume(!showVolume)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            aria-label="Volume control"
            aria-expanded={showVolume}
          >
            <VolumeIcon className="h-5 w-5" />
          </button>

          {showVolume && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setShowVolume(false)} />

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50">
                <div className="animate-volume-popover w-20 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-sm">
                  <div className="mb-3 text-center">
                    <p className="font-mono text-xs font-semibold tabular-nums">{volume}%</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Volume
                    </p>
                  </div>

                  <div className="flex justify-center py-1">
                    <div className="relative flex h-32 w-10 items-center justify-center">
                      <div className="relative h-full w-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-full bg-primary transition-[height] duration-150 ease-out motion-reduce:transition-none"
                          style={{ height: `${volume}%` }}
                        />
                      </div>

                      <div
                        className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-card bg-primary shadow-lg"
                        style={{ bottom: `calc(${volume}% - ${volume / 100}rem)` }}
                      />

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={e => setVolume(Number(e.target.value))}
                        aria-label="Volume"
                        className="absolute left-1/2 top-1/2 h-10 w-32 -translate-x-1/2 -translate-y-1/2 -rotate-90 cursor-pointer opacity-0"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setVolume(volume === 0 ? 80 : 0)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium transition-colors hover:bg-secondary/80"
                    aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-3.5 w-3.5" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                    {volume === 0 ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile Time */}
        <div className="md:hidden text-xs text-muted-foreground font-mono tabular-nums">
          {formatTime(currentTime)}
        </div>
      </div>
    </div>
  )
}
