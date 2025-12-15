'use client'

import { useEffect, useRef, useState } from 'react'
import { Song } from '@/lib/store/player-store'
import { usePlayerStore } from '@/lib/store/player-store'
import { extractYouTubeId } from '@/lib/utils/song-utils'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
    __youtubePlayer?: any
  }
}

interface YouTubePlayerProps {
  song: Song
}

export function YouTubePlayer({ song }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const videoIdRef = useRef<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const { isPlaying, volume, currentTime, setCurrentTime, setDuration, togglePlay } = usePlayerStore()

  const videoId = extractYouTubeId(song.url)

  // Initialize YouTube player
  useEffect(() => {
    if (!videoId || !containerRef.current) return

    const container = containerRef.current
    let mounted = true
    let player: any = null
    let updateInterval: NodeJS.Timeout | null = null
    videoIdRef.current = videoId

    const initPlayer = () => {
      if (!window.YT?.Player || !mounted || !containerRef.current) return

      // Clear container before creating new player
      const container = containerRef.current
      container.innerHTML = ''

      // Create new div for player
      const playerDiv = document.createElement('div')
      container.appendChild(playerDiv)

      try {
        player = new window.YT.Player(playerDiv, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1, // Always autoplay like original
            controls: 0,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              if (!mounted || videoIdRef.current !== videoId) return

              playerRef.current = event.target
              window.__youtubePlayer = event.target
              setIsReady(true)

              const state = usePlayerStore.getState()
              try {
                event.target.setVolume(volume)
                // If there's a saved currentTime > 0, seek to it (preserve playback position)
                if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
                  event.target.seekTo(state.currentTime, true)
                }
                if (state.isPlaying) {
                  event.target.playVideo()
                }
              } catch (_e) {
                // Silently handle errors
              }

              // Start update interval
              updateInterval = setInterval(() => {
                if (!mounted || !playerRef.current || videoIdRef.current !== videoId) return

                try {
                  const time = playerRef.current.getCurrentTime()
                  const dur = playerRef.current.getDuration()

                  if (typeof time === 'number' && time >= 0 && isFinite(time)) {
                    setCurrentTime(time)
                  }
                  if (typeof dur === 'number' && dur > 0 && isFinite(dur)) {
                    setDuration(dur)
                  }
                } catch (_e) {
                  // Ignore errors during cleanup
                }
              }, 100)
            },
            onStateChange: (event: any) => {
              if (!mounted || videoIdRef.current !== videoId) return

              const state = usePlayerStore.getState()

              // 0 = ended, -1 = unstarted, 1 = playing, 2 = paused, 3 = buffering, 5 = video cued
              if (event.data === 0) {
                // Song ended - advance to next
                state.next()
              } else if (event.data === 1) {
                // Playing - sync store state
                if (!state.isPlaying) {
                  state.play()
                }
              } else if (event.data === 2) {
                // Paused - sync store state
                if (state.isPlaying) {
                  state.pause()
                }
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data)
            },
          },
        })
      } catch (error) {
        console.error('YouTube player init error:', error)
      }
    }

    // Load YouTube API if needed
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true

      const firstScript = document.getElementsByTagName('script')[0]
      firstScript.parentNode?.insertBefore(tag, firstScript)

      window.onYouTubeIframeAPIReady = initPlayer
    } else {
      initPlayer()
    }

    // Cleanup
    return () => {
      mounted = false
      videoIdRef.current = null
      setIsReady(false)

      if (updateInterval) {
        clearInterval(updateInterval)
      }

      if (player) {
        try {
          player.stopVideo()
          player.destroy()
        } catch (_e) {
          // Silently ignore cleanup errors
        }
        player = null
      }

      playerRef.current = null

      if (container) {
        container.innerHTML = ''
      }
    }
  }, [videoId, setCurrentTime, setDuration, volume])

  // Handle play/pause
  useEffect(() => {
    if (!playerRef.current || videoIdRef.current !== videoId) return

    const tryPlay = () => {
      try {
        if (isPlaying) {
          playerRef.current.playVideo()
        } else {
          playerRef.current.pauseVideo()
        }
      } catch (_e) {
        // Silently handle errors
      }
    }

    if (isReady) {
      tryPlay()
    }
  }, [isPlaying, isReady, videoId])

  // Handle volume
  useEffect(() => {
    if (!isReady || !playerRef.current || videoIdRef.current !== videoId) return

    try {
      playerRef.current.setVolume(volume)
    } catch (_e) {
      // Ignore
    }
  }, [volume, isReady, videoId])

  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Invalid YouTube URL
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <div
        className={`absolute inset-0 z-10 ${isPlaying ? 'cursor-pointer' : ''}`}
        onClick={isPlaying ? togglePlay : undefined}
        style={{ pointerEvents: isPlaying ? 'auto' : 'none' }}
      />
    </div>
  )
}
