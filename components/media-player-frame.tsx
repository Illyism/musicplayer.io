'use client'

import { ArrowSquareOut, ArrowsInSimple, ArrowsOutSimple, MusicNote } from '@phosphor-icons/react'
import Image from 'next/image'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { usePictureInPicture } from '@/lib/hooks/use-picture-in-picture'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'
import { PiPMediaHost } from './picture-in-picture'
import { MP3Player } from './players/mp3-player'
import { SoundCloudPlayer } from './players/soundcloud-player'
import { VimeoPlayer } from './players/vimeo-player'
import { YouTubePlayer } from './players/youtube-player'

interface MediaPlayerFrameProps {
  className?: string
  playerKeyPrefix: string
  showTheatreToggle?: boolean
  song: Song
}

export function MediaPlayerFrame({
  song,
  playerKeyPrefix,
  className = '',
  showTheatreToggle = true,
}: MediaPlayerFrameProps) {
  const playbackError = usePlayerStore(state => state.playbackError)
  const isTheatreMode = usePlayerStore(state => state.isTheatreMode)
  const toggleTheatreMode = usePlayerStore(state => state.toggleTheatreMode)
  const setTheatreMode = usePlayerStore(state => state.setTheatreMode)
  const isPlaying = usePlayerStore(state => state.isPlaying)
  const currentTime = usePlayerStore(state => state.currentTime)
  const { isActive } = usePictureInPicture()
  const showTheatre = isTheatreMode && !isActive

  useEffect(() => {
    if (!isTheatreMode) {
      return
    }
    const closeTheatre = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTheatreMode(false)
      }
    }
    document.addEventListener('keydown', closeTheatre)
    return () => document.removeEventListener('keydown', closeTheatre)
  }, [isTheatreMode, setTheatreMode])

  return (
    <div className={`relative aspect-video bg-black ${className}`}>
      <PiPMediaHost>
        <div
          className={
            showTheatre
              ? 'fixed inset-x-0 top-[var(--app-header-height,72px)] bottom-[calc(var(--app-player-height,96px)+var(--app-nav-height,0px))] z-40 flex items-center justify-center bg-black'
              : 'absolute inset-0'
          }
        >
          <div
            className={
              showTheatre ? 'relative aspect-video max-h-full w-full' : 'relative h-full w-full'
            }
          >
            {song.type === 'youtube' && (
              <YouTubePlayer key={`${playerKeyPrefix}-youtube`} song={song} />
            )}
            {song.type === 'soundcloud' && (
              <SoundCloudPlayer key={`${playerKeyPrefix}-soundcloud`} song={song} />
            )}
            {song.type === 'vimeo' && <VimeoPlayer key={`${playerKeyPrefix}-vimeo`} song={song} />}
            {song.type === 'mp3' && <MP3Player key={`${playerKeyPrefix}-mp3`} song={song} />}
            {song.type === 'none' && (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                <MusicNote className="size-6 text-white/50" />
                <p className="text-sm text-white/70">This track plays on its source.</p>
                <Button asChild className="h-11 rounded-full" variant="secondary">
                  <a href={song.url} rel="noopener noreferrer" target="_blank">
                    Open track
                    <ArrowSquareOut className="size-4" />
                  </a>
                </Button>
              </div>
            )}
            {!isPlaying && currentTime === 0 && song.thumbnail && !playbackError && !showTheatre ? (
              <Image
                alt=""
                className="pointer-events-none z-10 object-cover"
                fill
                sizes="(max-width: 1023px) 100vw, 360px"
                src={song.thumbnail}
                unoptimized={isRedditHostedImage(song.thumbnail)}
              />
            ) : null}
          </div>

          {playbackError && (
            <p
              className="absolute inset-x-3 bottom-3 z-20 rounded-xl bg-black/80 px-3 py-2 text-white text-xs leading-relaxed backdrop-blur-sm"
              role="status"
            >
              {playbackError}
            </p>
          )}

          {showTheatreToggle && !isActive ? (
            <Button
              aria-label={isTheatreMode ? 'Exit theatre mode' : 'Enter theatre mode'}
              aria-pressed={isTheatreMode}
              className={`absolute z-20 size-11 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/80 focus-visible:ring-white/60 ${
                isTheatreMode ? 'top-4 right-4' : 'top-3 right-3'
              }`}
              onClick={toggleTheatreMode}
              size="icon"
              title={isTheatreMode ? 'Exit theatre mode' : 'Theatre mode'}
              type="button"
            >
              {isTheatreMode ? (
                <ArrowsInSimple className="size-4" />
              ) : (
                <ArrowsOutSimple className="size-4" />
              )}
            </Button>
          ) : null}
        </div>
      </PiPMediaHost>
    </div>
  )
}
