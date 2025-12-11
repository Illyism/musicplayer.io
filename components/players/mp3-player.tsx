"use client"

import { useEffect, useRef } from "react"
import { Song } from "@/lib/store"

interface MP3PlayerProps {
  song: Song
  onStateChange?: (isPlaying: boolean) => void
  onTimeUpdate?: (currentTime: number) => void
  onDurationChange?: (duration: number) => void
  volume?: number
  isPlaying?: boolean
  onSeek?: (time: number) => void
  currentTime?: number
}

export function MP3Player({
  song,
  onStateChange,
  onTimeUpdate,
  onDurationChange,
  volume = 100,
  isPlaying = false,
  onSeek,
  currentTime = 0,
}: MP3PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const lastSeekedTimeRef = useRef<number>(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Check if audio source matches current song
    if (audio.src && audio.src !== song.url) {
      // Song changed, update source
      audio.src = song.url
      audio.load()
    } else if (!audio.src) {
      // First time, set source
      audio.src = song.url
    }

    const handleTimeUpdate = () => {
      onTimeUpdate?.(audio.currentTime)
    }

    const handleDurationChange = () => {
      onDurationChange?.(audio.duration)
    }

    const handlePlay = () => {
      onStateChange?.(true)
    }

    const handlePause = () => {
      onStateChange?.(false)
    }

    const handleEnded = () => {
      onStateChange?.(false)
      // Auto-play next song when current finishes
      const { usePlaylistStore } = require("@/lib/store")
      const store = usePlaylistStore.getState()
      if (store.currentIndex < store.songs.length - 1) {
        store.forward()
      }
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [song.url, onStateChange, onTimeUpdate, onDurationChange])

  // Set currentTime when component mounts or currentTime changes (for resuming playback)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    // Only seek if we're more than 1 second away from target (prevents replay)
    const currentPos = audio.currentTime || 0
    if (currentTime > 0 && Math.abs(currentPos - currentTime) > 1) {
      // Wait for audio to be ready before seeking
      const handleCanPlay = () => {
        if (currentTime > 0 && Math.abs(audio.currentTime - currentTime) > 1) {
          audio.currentTime = currentTime
          lastSeekedTimeRef.current = currentTime
        }
      }
      
      if (audio.readyState >= 2) {
        // Already loaded, set immediately
        audio.currentTime = currentTime
        lastSeekedTimeRef.current = currentTime
      } else {
        // Wait for canplay event
        audio.addEventListener('canplay', handleCanPlay, { once: true })
      }
      
      return () => {
        audio.removeEventListener('canplay', handleCanPlay)
      }
    }
  }, [currentTime])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Don't change play state if we just seeked (let seek handler do it)
    const currentPos = audio.currentTime || 0
    const timeSinceSeek = Math.abs(currentPos - lastSeekedTimeRef.current)
    if (timeSinceSeek < 2) {
      // Recently seeked, skip this update
      return
    }

    if (isPlaying) {
      audio.play().catch((e) => {
        console.error("Error playing audio:", e)
      })
    } else {
      audio.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = volume / 100
  }, [volume])

  // Expose seek method via ref
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    // Store audio ref globally for seek access
    ;(window as any).__mp3AudioRef = audioRef
  }, [])

  return (
    <div className="w-full h-full flex items-center justify-center">
      <audio ref={audioRef} src={song.url} preload="metadata" />
    </div>
  )
}

// Expose seek method
export function seekMP3Player(time: number) {
  const audio = document.querySelector("audio") as HTMLAudioElement
  if (audio) {
    audio.currentTime = time
  }
}

