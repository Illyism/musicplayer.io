'use client'

import { useEffect, useRef, useState } from 'react'
import { type Song, usePlayerStore } from '@/lib/store/player-store'

declare global {
  interface Window {
    __soundcloudWidget?: any
    SC: any
  }
}

interface SoundCloudPlayerProps {
  song: Song
}

export function SoundCloudPlayer({ song }: SoundCloudPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const widgetRef = useRef<any>(null)
  const loadedSongRef = useRef<{ id: string } | null>(null)
  const loadingRef = useRef(true)
  const transitioningRef = useRef<boolean>(true)
  const generationRef = useRef(0)
  const [isReady, setIsReady] = useState(false)
  const { isPlaying, volume, togglePlay } = usePlayerStore()
  // Changing src would reload the iframe behind the persistent widget.
  const iframeUrl = useRef(
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(song.url)}&auto_play=false&visual=true`
  )

  useEffect(() => {
    let mounted = true
    const isCurrent = () =>
      mounted && loadedSongRef.current?.id === usePlayerStore.getState().currentSong?.id
    const initWidget = () => {
      if (!(mounted && iframeRef.current && window.SC?.Widget) || widgetRef.current) {
        return
      }
      const widget = window.SC.Widget(iframeRef.current)
      widgetRef.current = widget
      window.__soundcloudWidget = widget
      const events = window.SC.Widget.Events
      widget.bind(events.READY, () => {
        if (mounted) {
          setIsReady(true)
        }
      })
      widget.bind(events.PLAY_PROGRESS, (event: any) => {
        if (isCurrent() && !loadingRef.current && Number.isFinite(event?.currentPosition)) {
          usePlayerStore.getState().setCurrentTime(event.currentPosition / 1000)
        }
      })
      widget.bind(events.FINISH, () => {
        if (isCurrent() && !transitioningRef.current) {
          transitioningRef.current = true
          const state = usePlayerStore.getState()
          state.onEnded()
          const nextState = usePlayerStore.getState()
          if (nextState.isPlaying && state.currentSong?.id === nextState.currentSong?.id) {
            widget.seekTo(0)
            widget.play()
          }
        }
      })
      widget.bind(events.PLAY, () => {
        if (isCurrent() && !loadingRef.current) {
          const wasTransitioning = transitioningRef.current
          transitioningRef.current = false
          const state = usePlayerStore.getState()
          if (!state.isPlaying) {
            if (wasTransitioning) {
              widget.pause()
            } else {
              state.play()
            }
          }
        }
      })
      widget.bind(events.PAUSE, () => {
        if (isCurrent() && !transitioningRef.current) {
          usePlayerStore.getState().pause()
        }
      })
      widget.bind(events.ERROR, () => {
        if (isCurrent() && loadedSongRef.current) {
          usePlayerStore
            .getState()
            .failCurrentSong(
              loadedSongRef.current.id,
              'SoundCloud could not play this track. Skipping track.'
            )
        }
      })
    }

    if (window.SC?.Widget) {
      initWidget()
    } else {
      const script = document.createElement('script')
      script.src = 'https://w.soundcloud.com/player/api.js'
      script.async = true
      script.onload = initWidget
      document.body.appendChild(script)
    }
    return () => {
      mounted = false
      generationRef.current += 1
      const widget = widgetRef.current
      widgetRef.current = null
      if (window.__soundcloudWidget === widget) {
        window.__soundcloudWidget = undefined
      }
      if (widget) {
        for (const event of Object.values(window.SC.Widget.Events)) {
          widget.unbind(event)
        }
        widget.pause()
      }
    }
  }, [])

  useEffect(() => {
    loadedSongRef.current = { id: song.id }
    if (!(isReady && widgetRef.current)) {
      return
    }
    const widget = widgetRef.current
    loadingRef.current = true
    transitioningRef.current = true
    generationRef.current += 1
    const generation = generationRef.current
    widget.load(song.url, {
      auto_play: false,
      callback: () => {
        if (
          generationRef.current !== generation ||
          usePlayerStore.getState().currentSong?.id !== song.id
        ) {
          return
        }
        loadingRef.current = false
        const state = usePlayerStore.getState()
        widget.setVolume(state.volume)
        widget.getDuration((duration: number) => {
          if (
            generationRef.current === generation &&
            usePlayerStore.getState().currentSong?.id === song.id
          ) {
            usePlayerStore.getState().setDuration(duration / 1000)
          }
        })
        if (state.currentTime > 0) {
          widget.seekTo(state.currentTime * 1000)
        }
        if (state.isPlaying) {
          widget.play()
        } else {
          transitioningRef.current = false
        }
      },
      visual: true,
    })
  }, [song.id, song.url, isReady])

  useEffect(() => {
    if (!(isReady && widgetRef.current) || loadingRef.current) {
      return
    }
    if (isPlaying) {
      widgetRef.current.play()
    } else {
      widgetRef.current.pause()
    }
  }, [isPlaying, isReady])

  useEffect(() => {
    if (isReady && !loadingRef.current) {
      widgetRef.current?.setVolume(volume)
    }
  }, [volume, isReady])

  return (
    <div className="relative h-full w-full">
      <iframe
        allow="autoplay"
        frameBorder="no"
        height="100%"
        ref={iframeRef}
        scrolling="no"
        src={iframeUrl.current}
        title={`SoundCloud player: ${song.title}`}
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
