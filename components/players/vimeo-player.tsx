"use client"

import { useEffect, useRef, useState } from "react"
import { Song } from "@/lib/store"
import { extractVimeoId } from "@/lib/utils/player-utils"

interface VimeoPlayerProps {
  song: Song
  onStateChange?: (isPlaying: boolean) => void
  onTimeUpdate?: (currentTime: number) => void
  onDurationChange?: (duration: number) => void
  volume?: number
  isPlaying?: boolean
  currentTime?: number
}

export function VimeoPlayer({
  song,
  onStateChange,
  onTimeUpdate,
  onDurationChange,
  volume = 100,
  isPlaying = false,
  currentTime = 0,
}: VimeoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const lastSeekedTimeRef = useRef<number>(0)
  const videoId = extractVimeoId(song.url)

  useEffect(() => {
    if (!videoId) return

    // Check if player already exists for this video
    const existingPlayer = (window as any).__vimeoPlayer
    const existingVideoId = (window as any).__vimeoVideoId
    if (existingPlayer && existingVideoId === videoId) {
      // Reuse existing player
      playerRef.current = existingPlayer
      setIsReady(true)
      // Update volume, time, and playing state
      try {
        existingPlayer.setVolume(volume / 100)
        // Check current position before seeking
        existingPlayer.getCurrentTime().then((currentPos: number) => {
          // Only seek if we're more than 1 second away from target (prevents replay)
          if (currentTime > 0 && Math.abs(currentPos - currentTime) > 1) {
            existingPlayer.setCurrentTime(currentTime).then(() => {
              lastSeekedTimeRef.current = currentTime
              // Wait a bit for seek to complete before playing
              setTimeout(() => {
                if (isPlaying) {
                  existingPlayer.play()
                } else {
                  existingPlayer.pause()
                }
              }, 100)
            })
          } else {
            // Already at correct position, just update play state
            if (isPlaying) {
              existingPlayer.play()
            } else {
              existingPlayer.pause()
            }
          }
        })
      } catch (e) {
        // If reuse fails, create new player
        initializePlayer()
      }
      return
    }

    // Load Vimeo Player API
    if (!window.Vimeo) {
      const script = document.createElement("script")
      script.src = "https://player.vimeo.com/api/player.js"
      script.async = true
      document.body.appendChild(script)

      script.onload = () => {
        initializePlayer()
      }
    } else {
      initializePlayer()
    }

    function initializePlayer() {
      if (!iframeRef.current || !window.Vimeo) return

      playerRef.current = new window.Vimeo.Player(iframeRef.current)

      playerRef.current.ready().then(() => {
        setIsReady(true)
        playerRef.current.setVolume(volume / 100)
        // Store player globally for seek access
        ;(window as any).__vimeoPlayer = playerRef.current
        ;(window as any).__vimeoVideoId = videoId
        // Seek to current time if it's greater than 0 (resume from where we left off)
        if (currentTime > 0) {
          playerRef.current.setCurrentTime(currentTime).then(() => {
            lastSeekedTimeRef.current = currentTime
            // Wait for seek to complete before playing
            setTimeout(() => {
              if (isPlaying) {
                playerRef.current.play()
              }
            }, 200)
          })
        } else {
          // No seeking needed, just play if needed
          if (isPlaying) {
            playerRef.current.play()
          }
        }
      })

      playerRef.current.on("play", () => {
        onStateChange?.(true)
      })

      playerRef.current.on("pause", () => {
        onStateChange?.(false)
      })

      playerRef.current.on("timeupdate", (data: any) => {
        onTimeUpdate?.(data.seconds)
      })

      playerRef.current.on("ended", () => {
        onStateChange?.(false)
        // Auto-play next song when current finishes
        const { usePlaylistStore } = require("@/lib/store")
        const store = usePlaylistStore.getState()
        if (store.currentIndex < store.songs.length - 1) {
          store.forward()
        }
      })

      playerRef.current.getDuration().then((duration: number) => {
        onDurationChange?.(duration)
      })
    }

    return () => {
      // Only cleanup event listeners, don't destroy player
      // Player will be reused if same video
    }
  }, [videoId, currentTime])

  useEffect(() => {
    if (!isReady || !playerRef.current) return

    const player = playerRef.current
    try {
      // Don't change play state if we just seeked (let seek handler do it)
      player.getCurrentTime().then((currentPos: number) => {
        const timeSinceSeek = Math.abs(currentPos - lastSeekedTimeRef.current)
        if (timeSinceSeek < 2) {
          // Recently seeked, skip this update
          return
        }
        
        if (isPlaying) {
          player.play()
        } else {
          player.pause()
        }
      })
    } catch (e) {
      // Ignore errors
    }
  }, [isPlaying, isReady])

  useEffect(() => {
    if (!isReady || !playerRef.current) return

    const player = playerRef.current
    try {
      player.setVolume(volume / 100)
    } catch (e) {
      // Ignore errors
    }
  }, [volume, isReady])

  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Invalid Vimeo URL
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${videoId}?api=1&autoplay=0`}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

declare global {
  interface Window {
    Vimeo: any
  }
}

