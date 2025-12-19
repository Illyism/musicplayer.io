'use client'

import { useEffect, useRef, useState } from 'react'
import { Song } from '@/lib/store/player-store'
import { usePlayerStore } from '@/lib/store/player-store'

declare global {
  interface Window {
    SC: any
    __soundcloudWidget?: any
  }
}

interface SoundCloudPlayerProps {
  song: Song
}

export function SoundCloudPlayer({ song }: SoundCloudPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const widgetRef = useRef<any>(null)
  const songUrlRef = useRef<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const { isPlaying, volume, currentTime, setCurrentTime, setDuration, togglePlay } = usePlayerStore()

  // Initialize widget (only once, keep persistent)
  useEffect(() => {
    if (!iframeRef.current) return

    let mounted = true
    let widget: any = null

    // Set initial song URL
    songUrlRef.current = song.url

    const initWidget = () => {
      if (!window.SC?.Widget || !mounted || !iframeRef.current) return

      // Only create widget if it doesn't exist
      if (widgetRef.current) return

      try {
        widget = window.SC.Widget(iframeRef.current)
        widgetRef.current = widget
        window.__soundcloudWidget = widget

        widget.bind(window.SC.Widget.Events.READY, () => {
          if (!mounted) return

          setIsReady(true)

          // Load initial song if we have one
          if (songUrlRef.current) {
            loadSong(widget, songUrlRef.current)
          }
        })

        widget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (e: any) => {
          if (!mounted || songUrlRef.current === null) return

          try {
            if (e?.currentPosition && typeof e.currentPosition === 'number') {
              setCurrentTime(e.currentPosition / 1000)
            }
          } catch (_err) {
            // Ignore
          }
        })

        widget.bind(window.SC.Widget.Events.FINISH, () => {
          if (!mounted || songUrlRef.current === null) return
          const state = usePlayerStore.getState()
          state.next()
        })

        widget.bind(window.SC.Widget.Events.PLAY, () => {
          if (!mounted || songUrlRef.current === null) return
          const state = usePlayerStore.getState()
          if (!state.isPlaying) {
            state.play()
          }
        })

        widget.bind(window.SC.Widget.Events.PAUSE, () => {
          if (!mounted || songUrlRef.current === null) return
          const state = usePlayerStore.getState()
          if (state.isPlaying) {
            state.pause()
          }
        })

        widget.bind(window.SC.Widget.Events.ERROR, (_e: any) => {
          // SoundCloud error - silently handle
        })
      } catch (_error) {
        // SoundCloud init error - silently handle
      }
    }

    const loadSong = (widgetInstance: any, url: string) => {
      if (!mounted || !widgetInstance) return

      try {
        const state = usePlayerStore.getState()
        widgetInstance.setVolume(volume)

        // Load the new song
        widgetInstance.load(url, {
          auto_play: false,
          visual: true,
        })

        // Get duration and seek if needed
        widgetInstance.getDuration((dur: number) => {
          if (!mounted || songUrlRef.current !== url) return

          try {
            if (dur > 0 && isFinite(dur)) {
              setDuration(dur / 1000)

              // Seek to saved position if needed
              if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
                const position = (state.currentTime / (dur / 1000)) * 1000
                widgetInstance.seekTo(position)
              }
            }
          } catch (_err) {
            // Ignore
          }
        })

        // Explicitly play if needed
        if (state.isPlaying) {
          setTimeout(() => {
            if (mounted && widgetRef.current && songUrlRef.current === url) {
              try {
                widgetInstance.play()
              } catch (_e) {
                // Handle autoplay rejection
              }
            }
          }, 100)
        }
      } catch (_e) {
        // SoundCloud load error - silently handle
      }
    }

    if (!window.SC) {
      const script = document.createElement('script')
      script.src = 'https://w.soundcloud.com/player/api.js'
      script.async = true
      script.onload = initWidget
      document.body.appendChild(script)
    } else {
      // Wait for iframe to load
      const checkIframe = setInterval(() => {
        if (iframeRef.current?.contentWindow) {
          clearInterval(checkIframe)
          setTimeout(initWidget, 100)
        }
      }, 100)

      setTimeout(() => clearInterval(checkIframe), 5000)
    }

    return () => {
      mounted = false

      if (widget) {
        try {
          widget.pause()
          widget.unbind(window.SC.Widget.Events.READY)
          widget.unbind(window.SC.Widget.Events.PLAY_PROGRESS)
          widget.unbind(window.SC.Widget.Events.FINISH)
          widget.unbind(window.SC.Widget.Events.PLAY)
          widget.unbind(window.SC.Widget.Events.PAUSE)
          widget.unbind(window.SC.Widget.Events.ERROR)
        } catch (_e) {
          // Silently ignore
        }
      }

      widgetRef.current = null
      setIsReady(false)
      songUrlRef.current = null
    }
  }, [setCurrentTime, setDuration]) // Only run once on mount

  // Handle song.url changes - load new song without destroying widget
  useEffect(() => {
    if (!song.url || !isReady || !widgetRef.current) return

    // If widget is ready and song changed, load new song
    if (songUrlRef.current !== song.url) {
      songUrlRef.current = song.url
      const widgetInstance = widgetRef.current

      try {
        const state = usePlayerStore.getState()
        widgetInstance.setVolume(volume)

        // Load the new song
        widgetInstance.load(song.url, {
          auto_play: false,
          visual: true,
        })

        // Get duration and seek if needed
        widgetInstance.getDuration((dur: number) => {
          if (songUrlRef.current !== song.url) return

          try {
            if (dur > 0 && isFinite(dur)) {
              setDuration(dur / 1000)

              // Seek to saved position if needed
              if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
                const position = (state.currentTime / (dur / 1000)) * 1000
                widgetInstance.seekTo(position)
              }
            }
          } catch (_err) {
            // Ignore
          }
        })

        // Explicitly play if needed
        if (state.isPlaying) {
          setTimeout(() => {
            if (widgetRef.current && songUrlRef.current === song.url) {
              try {
                widgetInstance.play()
              } catch (_e) {
                // Handle autoplay rejection
              }
            }
          }, 100)
        }
      } catch (_e) {
        // SoundCloud load error - silently handle
      }
    } else if (!isReady && song.url) {
      // Store song URL for when widget becomes ready
      songUrlRef.current = song.url
    }
  }, [song.url, isReady, volume])

  useEffect(() => {
    if (!isReady || !widgetRef.current || songUrlRef.current !== song.url) return

    try {
      if (isPlaying) {
        widgetRef.current.play()
      } else {
        widgetRef.current.pause()
      }
    } catch (_e) {
      // Ignore
    }
  }, [isPlaying, isReady, song.url])

  useEffect(() => {
    if (!isReady || !widgetRef.current || songUrlRef.current !== song.url) return

    try {
      widgetRef.current.setVolume(volume)
    } catch (_e) {
      // Ignore
    }
  }, [volume, isReady, song.url])

  const soundcloudUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
    song.url
  )}&auto_play=false&visual=true`

  return (
    <div className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={soundcloudUrl}
      />
      <div
        className={`absolute inset-0 z-10 ${isPlaying ? 'cursor-pointer' : ''}`}
        onClick={isPlaying ? togglePlay : undefined}
        style={{ pointerEvents: isPlaying ? 'auto' : 'none' }}
      />
    </div>
  )
}
