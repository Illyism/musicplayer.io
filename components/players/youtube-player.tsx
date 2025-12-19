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
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isReady, setIsReady] = useState(false)
  const { isPlaying, volume, currentTime, setCurrentTime, setDuration, togglePlay } =
    usePlayerStore()

  const videoId = extractYouTubeId(song.url)

  // Initialize YouTube player (only once, keep persistent)
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    let mounted = true
    let player: any = null

    // Set initial videoId
    if (videoId) {
      videoIdRef.current = videoId
    }

    const initPlayer = () => {
      if (!window.YT?.Player || !mounted || !containerRef.current) return

      // Only create player if it doesn't exist
      if (playerRef.current) return

      const container = containerRef.current

      // Clear any existing content first (remove any orphaned iframes)
      container.innerHTML = ''

      // If there's a global player from another component, destroy it first
      if (window.__youtubePlayer && window.__youtubePlayer !== playerRef.current) {
        try {
          const oldPlayer = window.__youtubePlayer
          oldPlayer.stopVideo()
          oldPlayer.destroy()
          window.__youtubePlayer = undefined
        } catch (_e) {
          // Ignore errors
        }
      }

      // Create div for player if it doesn't exist
      let playerDiv = container.querySelector('div')
      if (!playerDiv) {
        playerDiv = document.createElement('div')
        container.appendChild(playerDiv)
      }

      try {
        player = new window.YT.Player(playerDiv, {
          videoId: videoId || '', // Use current videoId or empty
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0, // Don't autoplay, we'll handle it explicitly
            controls: 0,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              if (!mounted) return

              playerRef.current = event.target
              window.__youtubePlayer = event.target
              setIsReady(true)
              videoIdRef.current = videoId

              const state = usePlayerStore.getState()
              try {
                event.target.setVolume(volume)
                // If there's a saved currentTime > 0, seek to it
                if (
                  state.currentTime > 0 &&
                  (!state.duration || state.currentTime < state.duration)
                ) {
                  event.target.seekTo(state.currentTime, true)
                }
                // Explicitly play if needed
                if (state.isPlaying && videoId) {
                  event.target.playVideo().catch(() => {
                    // Handle autoplay rejection
                  })
                }
              } catch (_e) {
                // Silently handle errors
              }

              // Start update interval
              if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current)
              }
              updateIntervalRef.current = setInterval(() => {
                if (!mounted || !playerRef.current || videoIdRef.current === null) return

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
              if (!mounted || videoIdRef.current === null) return

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

    // Cleanup (only on unmount, not on videoId change)
    return () => {
      mounted = false

      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }

      // Destroy player and remove iframe completely
      if (playerRef.current) {
        try {
          const playerInstance = playerRef.current
          playerInstance.stopVideo()
          playerInstance.destroy()

          // Clear the global reference if it's this player
          if (window.__youtubePlayer === playerInstance) {
            window.__youtubePlayer = undefined
          }
        } catch (_e) {
          // Silently ignore cleanup errors
        }
      }

      // Clear container completely to remove any lingering iframes
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      if (player) {
        player = null
      }

      playerRef.current = null
      setIsReady(false)
      videoIdRef.current = null
    }
  }, [setCurrentTime, setDuration]) // Only run once on mount

  // Handle videoId changes - load new video without destroying player
  useEffect(() => {
    if (!videoId) return

    // If player is ready and videoId changed, load new video
    if (isReady && playerRef.current && videoIdRef.current !== videoId) {
      videoIdRef.current = videoId
      const playerInstance = playerRef.current

      try {
        const state = usePlayerStore.getState()
        playerInstance.setVolume(volume)

        // Load the new video
        playerInstance.loadVideoById({
          videoId,
          startSeconds:
            state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)
              ? state.currentTime
              : 0,
        })

        // Explicitly play if needed
        if (state.isPlaying) {
          // Wait a bit for video to load, then play
          setTimeout(() => {
            if (playerRef.current && videoIdRef.current === videoId) {
              try {
                playerInstance.playVideo().catch(() => {
                  // Handle autoplay rejection
                })
              } catch (_e) {
                // Handle autoplay rejection
              }
            }
          }, 100)
        }
      } catch (_e) {
        // Silently handle errors
      }
    } else if (!isReady && videoId) {
      // Store videoId for when player becomes ready
      videoIdRef.current = videoId
    }
  }, [videoId, isReady, volume])

  // Handle play/pause
  useEffect(() => {
    if (!isReady || !playerRef.current || videoIdRef.current !== videoId) return

    try {
      if (isPlaying) {
        playerRef.current.playVideo().catch(() => {
          // Handle autoplay rejection
        })
      } else {
        playerRef.current.pauseVideo()
      }
    } catch (_e) {
      // Silently handle errors
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
    </div>
  )
}
