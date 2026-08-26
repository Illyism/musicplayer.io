'use client'

import { ArrowsInSimple, ArrowsOutSimple } from '@phosphor-icons/react'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
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
  const isTheatreMode = usePlayerStore(state => state.isTheatreMode)
  const toggleTheatreMode = usePlayerStore(state => state.toggleTheatreMode)

  return (
    <div className={`relative aspect-video bg-black ${className}`}>
      <div
        className={
          isTheatreMode
            ? 'fixed inset-x-0 top-14 bottom-[65px] z-40 flex items-center bg-black'
            : 'absolute inset-0'
        }
      >
        <div
          className={isTheatreMode ? 'relative aspect-video w-screen' : 'relative h-full w-full'}
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
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-sm">Cannot play this media</p>
            </div>
          )}
        </div>

        {showTheatreToggle && (
          <button
            aria-label={isTheatreMode ? 'Exit theatre mode' : 'Enter theatre mode'}
            aria-pressed={isTheatreMode}
            className={`absolute z-20 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 font-medium text-white text-xs shadow-lg backdrop-blur-sm transition-[background-color,transform] duration-150 ease-out hover:bg-black/90 focus:outline-hidden focus:ring-2 focus:ring-white/60 active:scale-95 motion-reduce:transition-none ${
              isTheatreMode ? 'top-4 right-4' : 'top-3 right-3'
            }`}
            onClick={toggleTheatreMode}
            title={isTheatreMode ? 'Exit theatre mode' : 'Theatre mode'}
            type="button"
          >
            {isTheatreMode ? (
              <ArrowsInSimple className="h-3.5 w-3.5" weight="fill" />
            ) : (
              <ArrowsOutSimple className="h-3.5 w-3.5" weight="fill" />
            )}
            <span className="hidden sm:inline">{isTheatreMode ? 'Exit theatre' : 'Theatre'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
