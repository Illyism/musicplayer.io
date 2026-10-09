'use client'

import { useEffect, useRef, useState } from 'react'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { extractYouTubeId } from '@/lib/utils/song-utils'

declare global {
  interface Window {
    __youtubePlayer?: any
    onYouTubeIframeAPIReady: () => void
    YT: any
  }
}

interface YouTubePlayerProps {
  song: Song
}

export function YouTubePlayer({ song }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const loadedSongRef = useRef<{ id: string } | null>(null)
  const transitioningRef = useRef<boolean>(true)
  const [isReady, setIsReady] = useState(false)
  const { isPlaying, volume } = usePlayerStore()
  const videoId = extractYouTubeId(song.url)
  const [embedActive, setEmbedActive] = useState(isPlaying)

  useEffect(() => {
    if (isPlaying) {
      setEmbedActive(true)
    }
  }, [isPlaying])

  useEffect(() => {
    if (!embedActive) {
      return
    }
    let mounted = true
    let interval: ReturnType<typeof setInterval> | undefined
    const isCurrent = () =>
      mounted && loadedSongRef.current?.id === usePlayerStore.getState().currentSong?.id

    const initPlayer = () => {
      if (!(mounted && containerRef.current && window.YT?.Player) || playerRef.current) {
        return
      }
      const element = document.createElement('div')
      containerRef.current.appendChild(element)
      playerRef.current = new window.YT.Player(element, {
        events: {
          onAutoplayBlocked: () => {
            if (isCurrent()) {
              usePlayerStore.setState({
                isPlaying: false,
                playbackError: 'Your browser blocked autoplay. Press Play to start.',
              })
            }
          },
          onError: (event: any) => {
            if (isCurrent() && loadedSongRef.current) {
              usePlayerStore
                .getState()
                .failCurrentSong(
                  loadedSongRef.current.id,
                  `YouTube could not play this track (error ${event.data}).`
                )
            }
          },
          onReady: () => {
            if (!mounted) {
              return
            }
            setIsReady(true)
            interval = setInterval(() => {
              if (!isCurrent() || transitioningRef.current) {
                return
              }
              const state = usePlayerStore.getState()
              const time = playerRef.current.getCurrentTime()
              if (Number.isFinite(time) && time >= 0) {
                state.setCurrentTime(time)
              }
              state.setDuration(playerRef.current.getDuration())
            }, 100)
          },
          onStateChange: (event: any) => {
            if (!isCurrent()) {
              return
            }
            const state = usePlayerStore.getState()
            if (event.data === 1) {
              const wasTransitioning = transitioningRef.current
              transitioningRef.current = false
              // A pending load must honor a pause pressed while it was loading.
              if (!state.isPlaying) {
                if (wasTransitioning) {
                  playerRef.current.pauseVideo()
                } else {
                  state.play()
                }
              }
            } else if (event.data === 5) {
              transitioningRef.current = false
            } else if (event.data === 0 && !transitioningRef.current) {
              transitioningRef.current = true
              state.onEnded()
              const nextState = usePlayerStore.getState()
              if (nextState.isPlaying && state.currentSong?.id === nextState.currentSong?.id) {
                playerRef.current.seekTo(0, true)
                playerRef.current.playVideo()
              }
            } else if (event.data === 2 && !transitioningRef.current) {
              state.pause()
            }
          },
        },
        height: '100%',
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0 },
        width: '100%',
      })
      window.__youtubePlayer = playerRef.current
    }

    if (window.YT?.Player) {
      initPlayer()
    } else {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.body.appendChild(script)
      window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      mounted = false
      clearInterval(interval)
      const player = playerRef.current
      playerRef.current = null
      if (window.__youtubePlayer === player) {
        window.__youtubePlayer = undefined
      }
      player?.destroy()
    }
  }, [embedActive])

  useEffect(() => {
    if (!videoId) {
      usePlayerStore
        .getState()
        .failCurrentSong(song.id, 'Unrecognized YouTube URL. Skipping track.')
      return
    }
    if (!(isReady && playerRef.current)) {
      return
    }
    loadedSongRef.current = { id: song.id }
    transitioningRef.current = true
    const state = usePlayerStore.getState()
    playerRef.current.setVolume(state.volume)
    const options = { startSeconds: state.currentTime, videoId }
    if (state.isPlaying) {
      playerRef.current.loadVideoById(options)
    } else {
      playerRef.current.cueVideoById(options)
    }
  }, [song.id, videoId, isReady])

  useEffect(() => {
    if (!(isReady && playerRef.current) || loadedSongRef.current?.id !== song.id) {
      return
    }
    // YouTube commands return void, not promises.
    if (isPlaying) {
      playerRef.current.playVideo()
    } else {
      playerRef.current.pauseVideo()
    }
  }, [isPlaying, isReady, song.id])

  useEffect(() => {
    if (isReady) {
      playerRef.current?.setVolume(volume)
    }
  }, [volume, isReady])

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full" ref={containerRef} />
      {!videoId && <p className="text-gray-400">Unrecognized YouTube URL</p>}
    </div>
  )
}
