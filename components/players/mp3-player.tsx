'use client'

import { MusicNote } from '@phosphor-icons/react'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'

declare global {
  interface Window {
    __audioPlayer?: HTMLAudioElement
  }
}

interface MP3PlayerProps {
  song: Song
}

export function MP3Player({ song }: MP3PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { isPlaying, volume, setCurrentTime, setDuration, togglePlay, play, pause } =
    usePlayerStore()

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    window.__audioPlayer = audio

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleDurationChange = () => {
      if (audio.duration > 0) {
        setDuration(audio.duration)
      }
    }

    const handleEnded = async () => {
      const state = usePlayerStore.getState()
      state.onEnded()
      const nextState = usePlayerStore.getState()
      if (nextState.isPlaying && state.currentSong?.id === nextState.currentSong?.id) {
        audio.currentTime = 0
        try {
          await audio.play()
        } catch {
          usePlayerStore.getState().pause()
        }
      }
    }

    const handlePlay = () => {
      const state = usePlayerStore.getState()
      if (!state.isPlaying) {
        play()
      }
    }

    const handlePause = () => {
      const state = usePlayerStore.getState()
      if (state.isPlaying) {
        pause()
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      if (window.__audioPlayer === audio) {
        window.__audioPlayer = undefined
      }
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [setCurrentTime, setDuration, play, pause])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    // Restore saved currentTime when audio is loaded
    const state = usePlayerStore.getState()
    if (state.currentSong?.id !== song.id) {
      return
    }
    if (
      state.currentTime > 0 &&
      (!state.duration || state.currentTime < state.duration) &&
      audio.readyState >= 2
    ) {
      audio.currentTime = state.currentTime
    }

    if (isPlaying) {
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (usePlayerStore.getState().currentSong?.id === song.id) {
            usePlayerStore.setState({
              isPlaying: false,
              playbackError: 'Your browser blocked autoplay. Press Play to start.',
            })
          }
        })
      }
    } else {
      audio.pause()
    }
  }, [isPlaying, song.id])

  // Restore saved position when audio metadata loads
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const handleLoadedMetadata = () => {
      const state = usePlayerStore.getState()
      if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
        audio.currentTime = state.currentTime
      }
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.volume = volume / 100
  }, [volume])

  return (
    <button
      aria-label={isPlaying ? 'Pause' : 'Play'}
      className="relative block h-full w-full cursor-pointer"
      onClick={togglePlay}
      type="button"
    >
      {song.thumbnail ? (
        <Image
          alt={song.title}
          className="object-cover"
          fill
          sizes="100vw"
          src={song.thumbnail}
          unoptimized={isRedditHostedImage(song.thumbnail)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-secondary to-background">
          <MusicNote className="h-24 w-24 text-muted-foreground" weight="fill" />
        </div>
      )}
      <audio preload="metadata" ref={audioRef} src={song.url}>
        <track kind="captions" />
      </audio>
    </button>
  )
}
