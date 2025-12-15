'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { Song } from '@/lib/store/player-store'
import { usePlayerStore } from '@/lib/store/player-store'
import { Music } from 'lucide-react'

interface MP3PlayerProps {
  song: Song
}

export function MP3Player({ song }: MP3PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { isPlaying, volume, currentTime, setCurrentTime, setDuration, togglePlay, play, pause } = usePlayerStore()

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleDurationChange = () => {
      if (audio.duration > 0) {
        setDuration(audio.duration)
      }
    }

    const handleEnded = () => {
      usePlayerStore.getState().next()
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
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [setCurrentTime, setDuration, play, pause])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Restore saved currentTime when audio is loaded
    const state = usePlayerStore.getState()
    if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration) && audio.readyState >= 2) {
      audio.currentTime = state.currentTime
    }

    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTime])

  // Restore saved position when audio metadata loads
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

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
  }, [song.url])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = volume / 100
  }, [volume])

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={togglePlay}>
      {song.thumbnail && song.thumbnail !== 'self' ? (
        <Image src={song.thumbnail} alt={song.title} fill className="object-cover" sizes="100vw" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-secondary to-background">
          <Music className="w-24 h-24 text-muted-foreground" />
        </div>
      )}
      <audio ref={audioRef} src={song.url} preload="metadata" />
    </div>
  )
}
