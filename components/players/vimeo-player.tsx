'use client'

import { useEffect, useRef, useState } from 'react'
import { Song } from '@/lib/store/player-store'
import { usePlayerStore } from '@/lib/store/player-store'
import { extractVimeoId } from '@/lib/utils/song-utils'

declare global {
  interface Window {
    Vimeo: any
    __vimeoPlayer?: any
  }
}

interface VimeoPlayerProps {
  song: Song
}

export function VimeoPlayer({ song }: VimeoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<any>(null)
  const videoIdRef = useRef<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const { isPlaying, volume, currentTime, setCurrentTime, setDuration, togglePlay } = usePlayerStore()

  const videoId = extractVimeoId(song.url)

  // Initialize Vimeo player (only once, keep persistent)
  useEffect(() => {
    if (!iframeRef.current) return

    let mounted = true
    let player: any = null

    // Set initial videoId
    if (videoId) {
      videoIdRef.current = videoId
    }

    const initPlayer = () => {
      if (!window.Vimeo || !mounted || !iframeRef.current) return

      // Only create player if it doesn't exist
      if (playerRef.current) return

      try {
        player = new window.Vimeo.Player(iframeRef.current)
        playerRef.current = player
        window.__vimeoPlayer = player

        player.ready().then(() => {
          if (!mounted) return

          setIsReady(true)

          // Load initial video if we have one
          if (videoIdRef.current) {
            loadVideo(player, videoIdRef.current)
          }
        })

        player.on('timeupdate', (data: any) => {
          if (!mounted || videoIdRef.current === null) return

          try {
            if (data?.seconds && typeof data.seconds === 'number') {
              setCurrentTime(data.seconds)
            }
          } catch (_e) {
            // Ignore
          }
        })

        player.getDuration().then((dur: number) => {
          if (!mounted || videoIdRef.current === null) return

          try {
            if (dur > 0 && isFinite(dur)) {
              setDuration(dur)
            }
          } catch (_e) {
            // Ignore
          }
        })

        player.on('ended', () => {
          if (!mounted || videoIdRef.current === null) return
          const state = usePlayerStore.getState()
          state.next()
        })

        player.on('play', () => {
          if (!mounted || videoIdRef.current === null) return
          const state = usePlayerStore.getState()
          if (!state.isPlaying) {
            state.play()
          }
        })

        player.on('pause', () => {
          if (!mounted || videoIdRef.current === null) return
          const state = usePlayerStore.getState()
          if (state.isPlaying) {
            state.pause()
          }
        })

        player.on('error', (e: any) => {
          console.error('Vimeo error:', e)
        })
      } catch (error) {
        console.error('Vimeo init error:', error)
      }
    }

    const loadVideo = (playerInstance: any, newVideoId: string) => {
      if (!mounted || !playerInstance) return

      try {
        const state = usePlayerStore.getState()
        playerInstance.setVolume(volume / 100)

        // Load the new video
        playerInstance.loadVideo(newVideoId).then(() => {
          if (!mounted || videoIdRef.current !== newVideoId) return

          // Seek to saved position if needed
          if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
            playerInstance.setCurrentTime(state.currentTime).catch(() => {})
          }

          // Get duration
          playerInstance.getDuration().then((dur: number) => {
            if (!mounted || videoIdRef.current !== newVideoId) return

            try {
              if (dur > 0 && isFinite(dur)) {
                setDuration(dur)
              }
            } catch (_e) {
              // Ignore
            }
          })

          // Explicitly play if needed
          if (state.isPlaying) {
            setTimeout(() => {
              if (mounted && playerRef.current && videoIdRef.current === newVideoId) {
                try {
                  playerInstance.play().catch(() => {
                    // Handle autoplay rejection
                  })
                } catch (_e) {
                  // Handle autoplay rejection
                }
              }
            }, 100)
          }
        }).catch(() => {
          // Handle load error
        })
      } catch (_e) {
        // Silently handle errors
      }
    }

    if (!window.Vimeo) {
      const script = document.createElement('script')
      script.src = 'https://player.vimeo.com/api/player.js'
      script.async = true
      script.onload = initPlayer
      document.body.appendChild(script)
    } else {
      // Wait for iframe to be ready
      setTimeout(initPlayer, 100)
    }

    return () => {
      mounted = false

      if (player) {
        try {
          player.pause()
          player.off('timeupdate')
          player.off('ended')
          player.off('play')
          player.off('pause')
          player.off('error')
        } catch (_e) {
          // Silently ignore
        }
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
        playerInstance.setVolume(volume / 100)

        // Load the new video
        playerInstance.loadVideo(videoId).then(() => {
          if (videoIdRef.current !== videoId) return

          // Seek to saved position if needed
          if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
            playerInstance.setCurrentTime(state.currentTime).catch(() => {})
          }

          // Get duration
          playerInstance.getDuration().then((dur: number) => {
            if (videoIdRef.current !== videoId) return

            try {
              if (dur > 0 && isFinite(dur)) {
                setDuration(dur)
              }
            } catch (_e) {
              // Ignore
            }
          })

          // Explicitly play if needed
          if (state.isPlaying) {
            setTimeout(() => {
              if (playerRef.current && videoIdRef.current === videoId) {
                try {
                  playerInstance.play().catch(() => {
                    // Handle autoplay rejection
                  })
                } catch (_e) {
                  // Handle autoplay rejection
                }
              }
            }, 100)
          }
        }).catch(() => {
          // Handle load error
        })
      } catch (_e) {
        // Silently handle errors
      }
    } else if (!isReady && videoId) {
      // Store videoId for when player becomes ready
      videoIdRef.current = videoId
    }
  }, [videoId, isReady, volume])

  useEffect(() => {
    if (!isReady || !playerRef.current || videoIdRef.current !== videoId) return

    try {
      if (isPlaying) {
        playerRef.current.play().catch(() => {
          // Handle autoplay rejection
        })
      } else {
        playerRef.current.pause()
      }
    } catch (_e) {
      // Ignore
    }
  }, [isPlaying, isReady, videoId])

  useEffect(() => {
    if (!isReady || !playerRef.current || videoIdRef.current !== videoId) return

    try {
      playerRef.current.setVolume(volume / 100)
    } catch (_e) {
      // Ignore
    }
  }, [volume, isReady, videoId])

  // Update iframe src when videoId changes (but keep iframe persistent)
  useEffect(() => {
    if (iframeRef.current && videoId) {
      const vimeoUrl = `https://player.vimeo.com/video/${videoId}?api=1`
      if (iframeRef.current.src !== vimeoUrl) {
        iframeRef.current.src = vimeoUrl
      }
    }
  }, [videoId])

  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Invalid Vimeo URL
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${videoId}?api=1`}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
      <div
        className={`absolute inset-0 z-10 ${isPlaying ? 'cursor-pointer' : ''}`}
        onClick={isPlaying ? togglePlay : undefined}
        style={{ pointerEvents: isPlaying ? 'auto' : 'none' }}
      />
    </div>
  )
}
