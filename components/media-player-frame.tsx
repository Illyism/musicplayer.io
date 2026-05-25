'use client'

import { ArrowsInSimple, ArrowsOutSimple } from '@phosphor-icons/react'
import { Song, usePlayerStore } from '@/lib/store/player-store'
import { YouTubePlayer } from './players/youtube-player'
import { SoundCloudPlayer } from './players/soundcloud-player'
import { VimeoPlayer } from './players/vimeo-player'
import { MP3Player } from './players/mp3-player'

interface MediaPlayerFrameProps {
  song: Song
  playerKeyPrefix: string
  className?: string
  showTheatreToggle?: boolean
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
            ? 'fixed inset-x-0 bottom-[65px] top-14 z-40 flex items-center bg-black'
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
              <p className="text-sm text-muted-foreground">Cannot play this media</p>
            </div>
          )}
        </div>

        {showTheatreToggle && (
          <button
            type="button"
            onClick={toggleTheatreMode}
            className={`absolute z-20 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm transition-[background-color,transform] duration-150 ease-out hover:bg-black/90 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-white/60 motion-reduce:transition-none ${
              isTheatreMode ? 'right-4 top-4' : 'right-3 top-3'
            }`}
            aria-pressed={isTheatreMode}
            aria-label={isTheatreMode ? 'Exit theatre mode' : 'Enter theatre mode'}
            title={isTheatreMode ? 'Exit theatre mode' : 'Theatre mode'}
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
