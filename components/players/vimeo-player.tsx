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

  useEffect(() => {
    if (!videoId || !iframeRef.current) return

    let mounted = true
    let player: any = null
    videoIdRef.current = videoId

    const initPlayer = () => {
      if (!window.Vimeo || !mounted || !iframeRef.current) return

      try {
        player = new window.Vimeo.Player(iframeRef.current)
        playerRef.current = player
        window.__vimeoPlayer = player

        player.ready().then(() => {
          if (!mounted || videoIdRef.current !== videoId) return

          setIsReady(true)

          const state = usePlayerStore.getState()
          try {
            player.setVolume(volume / 100)
            // If there's a saved currentTime > 0, seek to it (preserve playback position)
            if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
              player.setCurrentTime(state.currentTime).catch(() => {})
            }
          } catch (e) {
            console.error('Vimeo volume error:', e)
          }

          player.on('timeupdate', (data: any) => {
            if (!mounted || videoIdRef.current !== videoId) return

            try {
              if (data?.seconds && typeof data.seconds === 'number') {
                setCurrentTime(data.seconds)
              }
            } catch (_e) {
              // Ignore
            }
          })

          player.getDuration().then((dur: number) => {
            if (!mounted || videoIdRef.current !== videoId) return

            try {
              if (dur > 0 && isFinite(dur)) {
                setDuration(dur)
              }
            } catch (_e) {
              // Ignore
            }
          })

          player.on('ended', () => {
            if (!mounted || videoIdRef.current !== videoId) return
            const state = usePlayerStore.getState()
            state.next()
          })

          player.on('play', () => {
            if (!mounted || videoIdRef.current !== videoId) return
            const state = usePlayerStore.getState()
            if (!state.isPlaying) {
              state.play()
            }
          })

          player.on('pause', () => {
            if (!mounted || videoIdRef.current !== videoId) return
            const state = usePlayerStore.getState()
            if (state.isPlaying) {
              state.pause()
            }
          })

          if (isPlaying) {
            player.play().catch(() => {})
          }
        })

        player.on('error', (e: any) => {
          console.error('Vimeo error:', e)
        })
      } catch (error) {
        console.error('Vimeo init error:', error)
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
      videoIdRef.current = null
      setIsReady(false)

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
    }
  }, [videoId, isPlaying, setCurrentTime, setDuration, volume])

  useEffect(() => {
    if (!isReady || !playerRef.current || videoIdRef.current !== videoId) return

    try {
      if (isPlaying) {
        playerRef.current.play()
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
        key={videoId}
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
