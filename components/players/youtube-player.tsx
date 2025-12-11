"use client"

import { useEffect, useRef, useState } from "react"
import { Song } from "@/lib/store"
import { extractYouTubeId } from "@/lib/utils/player-utils"

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

interface YouTubePlayerProps {
  song: Song
  onStateChange?: (state: number) => void
  onTimeUpdate?: (currentTime: number) => void
  onDurationChange?: (duration: number) => void
  volume?: number
  isPlaying?: boolean
  currentTime?: number
}

export function YouTubePlayer({
  song,
  onStateChange,
  onTimeUpdate,
  onDurationChange,
  volume = 100,
  isPlaying = false,
  currentTime = 0,
}: YouTubePlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const playerInstanceRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const lastSeekedTimeRef = useRef<number>(0)
  const videoId = extractYouTubeId(song.url)

  useEffect(() => {
    if (!videoId) return

    // Check if player already exists for this video
    const existingPlayer = (window as any).__youtubePlayer
    if (existingPlayer && existingPlayer.getVideoData && existingPlayer.getVideoData().video_id === videoId) {
      // Reuse existing player
      playerInstanceRef.current = existingPlayer
      setIsReady(true)
      // Update volume, time, and playing state
      try {
        existingPlayer.setVolume(volume)
        // Only seek if we're more than 1 second away from target (prevents replay)
        const currentPos = existingPlayer.getCurrentTime()
        if (currentTime > 0 && Math.abs(currentPos - currentTime) > 1) {
          existingPlayer.seekTo(currentTime, true)
          lastSeekedTimeRef.current = currentTime
          // Wait a bit for seek to complete before playing
          setTimeout(() => {
            if (isPlaying) {
              existingPlayer.playVideo()
            } else {
              existingPlayer.pauseVideo()
            }
          }, 100)
        } else {
          // Already at correct position, just update play state
          if (isPlaying) {
            existingPlayer.playVideo()
          } else {
            existingPlayer.pauseVideo()
          }
        }
      } catch (e) {
        // If reuse fails, create new player
        createPlayer()
      }
      return
    }

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
        createPlayer()
      }
    } else {
      createPlayer()
    }

    function createPlayer() {
      if (!playerRef.current || !window.YT) return

      // Destroy existing player if it's for a different video
      const existingPlayer = (window as any).__youtubePlayer
      if (existingPlayer && existingPlayer.getVideoData && existingPlayer.getVideoData().video_id !== videoId) {
        try {
          existingPlayer.destroy()
        } catch (e) {
          // Ignore destroy errors
        }
      }

      playerInstanceRef.current = new window.YT.Player(playerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true)
            event.target.setVolume(volume)
            // Store player globally for seek access
            ;(window as any).__youtubePlayer = event.target
            // Seek to current time if it's greater than 0 (resume from where we left off)
            if (currentTime > 0) {
              event.target.seekTo(currentTime, true)
              lastSeekedTimeRef.current = currentTime
              // Wait for seek to complete before playing
              setTimeout(() => {
                if (isPlaying) {
                  event.target.playVideo()
                }
              }, 200)
            } else {
              // No seeking needed, just play if needed
              if (isPlaying) {
                event.target.playVideo()
              }
            }
          },
          onStateChange: (event: any) => {
            const state = event.data
            // YouTube states: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
            // Only update playing state for actual play/pause, not buffering or seeking
            if (state === 1) {
              onStateChange?.(1) // Playing
            } else if (state === 2) {
              onStateChange?.(0) // Paused
            } else if (state === 0) {
              // Auto-play next song when video ends
              const { usePlaylistStore } = require("@/lib/store")
              const store = usePlaylistStore.getState()
              if (store.currentIndex < store.songs.length - 1) {
                store.forward()
              }
            }
            // Ignore buffering (3) and other states to prevent unwanted pauses
          },
        },
      })
    }

    return () => {
      // Only destroy if song is actually changing (not just view switching)
      // We'll handle cleanup when a new song is selected
    }
  }, [videoId, currentTime])

  useEffect(() => {
    if (!isReady || !playerInstanceRef.current) return

    const player = playerInstanceRef.current
    
    // Update immediately when ready
    try {
      const currentTime = player.getCurrentTime()
      const duration = player.getDuration()
      if (duration > 0) {
        onDurationChange?.(duration)
      }
      if (currentTime > 0) {
        onTimeUpdate?.(currentTime)
      }
    } catch (e) {
      // Ignore errors
    }
    
    // Update frequently for smooth progress bar (every 100ms)
    const interval = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime()
        const duration = player.getDuration()
        // Always update time, even if 0 (for initial state)
        onTimeUpdate?.(currentTime)
        // Only update duration if valid
        if (duration > 0 && isFinite(duration)) {
          onDurationChange?.(duration)
        }
      } catch (e) {
        // Ignore errors
      }
    }, 100) // Update every 100ms for smooth progress bar

    return () => clearInterval(interval)
  }, [isReady, onTimeUpdate, onDurationChange])

  useEffect(() => {
    if (!isReady || !playerInstanceRef.current) return

    const player = playerInstanceRef.current
    try {
      // Don't change play state if we just seeked (let seek handler do it)
      const currentPos = player.getCurrentTime()
      const timeSinceSeek = Math.abs(currentPos - lastSeekedTimeRef.current)
      if (timeSinceSeek < 2) {
        // Recently seeked, skip this update
        return
      }
      
      if (isPlaying) {
        player.playVideo()
      } else {
        player.pauseVideo()
      }
    } catch (e) {
      // Ignore errors
    }
  }, [isPlaying, isReady])

  useEffect(() => {
    if (!isReady || !playerInstanceRef.current) return

    const player = playerInstanceRef.current
    try {
      player.setVolume(volume)
    } catch (e) {
      // Ignore errors
    }
  }, [volume, isReady])

  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Invalid YouTube URL
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <div ref={playerRef} className="w-full h-full" />
    </div>
  )
}

