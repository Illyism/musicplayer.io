"use client"

import { useEffect, useRef, useState } from "react"
import { Song } from "@/lib/store"

interface SoundCloudPlayerProps {
  song: Song
  onStateChange?: (isPlaying: boolean) => void
  onTimeUpdate?: (currentTime: number) => void
  onDurationChange?: (duration: number) => void
  volume?: number
  isPlaying?: boolean
  currentTime?: number
}

export function SoundCloudPlayer({
  song,
  onStateChange,
  onTimeUpdate,
  onDurationChange,
  volume = 100,
  isPlaying = false,
  currentTime = 0,
}: SoundCloudPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const widgetRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if widget already exists for this URL
    const existingWidget = (window as any).__soundcloudWidget
    const existingUrl = (window as any).__soundcloudUrl
    if (existingWidget && existingUrl === song.url) {
      // Reuse existing widget
      widgetRef.current = existingWidget
      setIsReady(true)
      // Update volume, time, and playing state
      try {
        existingWidget.setVolume(volume / 100)
        if (currentTime > 0) {
          existingWidget.seekTo(currentTime * 1000)
        }
        if (isPlaying) {
          existingWidget.play()
        } else {
          existingWidget.pause()
        }
      } catch (e) {
        // If reuse fails, create new widget
        initializePlayer()
      }
      return
    }

    // Load SoundCloud Widget API
    if (!window.SC) {
      const script = document.createElement("script")
      script.src = "https://w.soundcloud.com/player/api.js"
      script.async = true
      document.body.appendChild(script)

      script.onload = () => {
        initializePlayer()
      }
    } else {
      initializePlayer()
    }

    function initializePlayer() {
      if (!iframeRef.current || !window.SC) return

      widgetRef.current = window.SC.Widget(iframeRef.current)

      widgetRef.current.bind(window.SC.Widget.Events.READY, () => {
        setIsReady(true)
        widgetRef.current.setVolume(volume / 100)
        // Store widget globally for seek access
        ;(window as any).__soundcloudWidget = widgetRef.current
        ;(window as any).__soundcloudUrl = song.url
        
        // Get duration when ready
        widgetRef.current.getDuration((duration: number) => {
          if (duration > 0 && isFinite(duration)) {
            onDurationChange?.(duration / 1000) // Convert milliseconds to seconds
          }
        })
        
        // Seek to current time if it's greater than 0 (resume from where we left off)
        if (currentTime > 0) {
          widgetRef.current.seekTo(currentTime * 1000) // SoundCloud uses milliseconds
        }
        // Then play if needed
        if (isPlaying) {
          widgetRef.current.play()
        }
      })

      widgetRef.current.bind(window.SC.Widget.Events.PLAY_PROGRESS, (e: any) => {
        const time = e.currentPosition / 1000 // Convert milliseconds to seconds
        onTimeUpdate?.(time)
        // Also update duration periodically in case it changes
        widgetRef.current.getDuration((duration: number) => {
          if (duration > 0 && isFinite(duration)) {
            onDurationChange?.(duration / 1000) // Convert milliseconds to seconds
          }
        })
      })

      widgetRef.current.bind(window.SC.Widget.Events.FINISHED, () => {
        onStateChange?.(false)
        // Auto-play next song when current finishes
        const { usePlaylistStore } = require("@/lib/store")
        const store = usePlaylistStore.getState()
        if (store.currentIndex < store.songs.length - 1) {
          store.forward()
        }
      })
    }

    return () => {
      // Don't unbind - widget will be reused if same URL
    }
  }, [song.url, currentTime])

  useEffect(() => {
    if (!isReady || !widgetRef.current) return

    const widget = widgetRef.current
    try {
      if (isPlaying) {
        widget.play()
      } else {
        widget.pause()
      }
    } catch (e) {
      // Ignore errors
    }
  }, [isPlaying, isReady])

  useEffect(() => {
    if (!isReady || !widgetRef.current) return

    const widget = widgetRef.current
    try {
      widget.setVolume(volume / 100)
    } catch (e) {
      // Ignore errors
    }
  }, [volume, isReady])

  const soundcloudUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(song.url)}&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true`

  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={soundcloudUrl}
      />
    </div>
  )
}

declare global {
  interface Window {
    SC: any
  }
}

