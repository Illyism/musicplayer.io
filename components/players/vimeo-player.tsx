'use client'

import { useEffect, useRef, useState } from 'react'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { extractVimeoId } from '@/lib/utils/song-utils'

declare global {
  interface Window {
    __vimeoPlayer?: any
    Vimeo: any
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
  const { isPlaying, volume, setCurrentTime, setDuration, togglePlay } = usePlayerStore()

  const videoId = extractVimeoId(song.url)

  // Initialize Vimeo player (only once, keep persistent)
  useEffect(() => {
    if (!iframeRef.current) {
      return
    }

    let mounted = true
    let player: any = null

    // Set initial videoId
    if (videoId) {
      videoIdRef.current = videoId
    }

    const initPlayer = () => {
      if (!(window.Vimeo && mounted && iframeRef.current)) {
        return
      }

      // Only create player if it doesn't exist
      if (playerRef.current) {
        return
      }

      try {
        player = new window.Vimeo.Player(iframeRef.current)
        playerRef.current = player
        window.__vimeoPlayer = player

        player.ready().then(() => {
          if (!mounted) {
            return
          }

          setIsReady(true)

          // Load initial video if we have one
          if (videoIdRef.current) {
            loadVideo(player, videoIdRef.current)
          }
        })

        player.on('timeupdate', (data: any) => {
          if (!mounted || videoIdRef.current === null) {
            return
          }

          try {
            if (data?.seconds && typeof data.seconds === 'number') {
              setCurrentTime(data.seconds)
            }
          } catch {
            // Ignore
          }
        })

        player.getDuration().then((dur: number) => {
          if (!mounted || videoIdRef.current === null) {
            return
          }

          try {
            if (dur > 0 && Number.isFinite(dur)) {
              setDuration(dur)
            }
          } catch {
            // Ignore
          }
        })

        player.on('ended', () => {
          if (!mounted || videoIdRef.current === null) {
            return
          }
          const state = usePlayerStore.getState()
          state.next()
        })

        player.on('play', () => {
          if (!mounted || videoIdRef.current === null) {
            return
          }
          const state = usePlayerStore.getState()
          if (!state.isPlaying) {
            state.play()
          }
        })

        player.on('pause', () => {
          if (!mounted || videoIdRef.current === null) {
            return
          }
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
      if (!(mounted && playerInstance)) {
        return
      }

      try {
        const state = usePlayerStore.getState()
        playerInstance.setVolume(volume / 100)

        // Load the new video
        playerInstance
          .loadVideo(newVideoId)
          .then(() => {
            if (!mounted || videoIdRef.current !== newVideoId) {
              return
            }

            // Seek to saved position if needed
            if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
              // biome-ignore lint/suspicious/noNestedPromises: SDK callback chain
              playerInstance.setCurrentTime(state.currentTime).catch(() => undefined)
            }

            // Get duration
            // biome-ignore lint/suspicious/noNestedPromises: SDK callback chain
            playerInstance.getDuration().then((dur: number) => {
              if (!mounted || videoIdRef.current !== newVideoId) {
                return
              }

              try {
                if (dur > 0 && Number.isFinite(dur)) {
                  setDuration(dur)
                }
              } catch {
                // Ignore
              }
            })

            // Explicitly play if needed
            if (state.isPlaying) {
              setTimeout(() => {
                if (mounted && playerRef.current && videoIdRef.current === newVideoId) {
                  try {
                    // biome-ignore lint/suspicious/noNestedPromises: SDK callback chain
                    playerInstance.play().catch(() => {
                      // Handle autoplay rejection
                    })
                  } catch {
                    // Handle autoplay rejection
                  }
                }
              }, 100)
            }
          })
          .catch(() => {
            // Handle load error
          })
      } catch {
        // Silently handle errors
      }
    }

    if (window.Vimeo) {
      // Wait for iframe to be ready
      setTimeout(initPlayer, 100)
    } else {
      const script = document.createElement('script')
      script.src = 'https://player.vimeo.com/api/player.js'
      script.async = true
      script.onload = initPlayer
      document.body.appendChild(script)
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
        } catch {
          // Silently ignore
        }
      }

      playerRef.current = null
      setIsReady(false)
      videoIdRef.current = null
    }
  }, [setCurrentTime, setDuration, videoId, volume]) // Only run once on mount

  // Handle videoId changes - load new video without destroying player
  useEffect(() => {
    if (!videoId) {
      return
    }

    // If player is ready and videoId changed, load new video
    if (isReady && playerRef.current && videoIdRef.current !== videoId) {
      videoIdRef.current = videoId
      const playerInstance = playerRef.current

      try {
        const state = usePlayerStore.getState()
        playerInstance.setVolume(volume / 100)

        // Load the new video
        playerInstance
          .loadVideo(videoId)
          .then(() => {
            if (videoIdRef.current !== videoId) {
              return
            }

            // Seek to saved position if needed
            if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
              // biome-ignore lint/suspicious/noNestedPromises: SDK callback chain
              playerInstance.setCurrentTime(state.currentTime).catch(() => undefined)
            }

            // Get duration
            // biome-ignore lint/suspicious/noNestedPromises: SDK callback chain
            playerInstance.getDuration().then((dur: number) => {
              if (videoIdRef.current !== videoId) {
                return
              }

              try {
                if (dur > 0 && Number.isFinite(dur)) {
                  setDuration(dur)
                }
              } catch {
                // Ignore
              }
            })

            // Explicitly play if needed
            if (state.isPlaying) {
              setTimeout(() => {
                if (playerRef.current && videoIdRef.current === videoId) {
                  try {
                    // biome-ignore lint/suspicious/noNestedPromises: SDK callback chain
                    playerInstance.play().catch(() => {
                      // Handle autoplay rejection
                    })
                  } catch {
                    // Handle autoplay rejection
                  }
                }
              }, 100)
            }
          })
          .catch(() => {
            // Handle load error
          })
      } catch {
        // Silently handle errors
      }
    } else if (!isReady && videoId) {
      // Store videoId for when player becomes ready
      videoIdRef.current = videoId
    }
  }, [videoId, isReady, volume, setDuration])

  useEffect(() => {
    if (!(isReady && playerRef.current) || videoIdRef.current !== videoId) {
      return
    }

    try {
      if (isPlaying) {
        playerRef.current.play().catch(() => {
          // Handle autoplay rejection
        })
      } else {
        playerRef.current.pause()
      }
    } catch {
      // Ignore
    }
  }, [isPlaying, isReady, videoId])

  useEffect(() => {
    if (!(isReady && playerRef.current) || videoIdRef.current !== videoId) {
      return
    }

    try {
      playerRef.current.setVolume(volume / 100)
    } catch {
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
      <div className="flex h-full w-full items-center justify-center text-gray-400">
        Invalid Vimeo URL
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <iframe
        allow="autoplay; fullscreen"
        allowFullScreen
        frameBorder="0"
        height="100%"
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${videoId}?api=1`}
        title={`Vimeo player: ${song.title}`}
        width="100%"
      />
      {/* Transparent click-to-pause overlay; keyboard users use the main controls */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: widget has no DOM API */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: widget has no DOM API */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: widget has no DOM API */}
      <div
        className={`absolute inset-0 z-10 ${isPlaying ? 'cursor-pointer' : ''}`}
        onClick={isPlaying ? togglePlay : undefined}
        style={{ pointerEvents: isPlaying ? 'auto' : 'none' }}
      />
    </div>
  )
}
