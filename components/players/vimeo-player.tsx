'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { extractVimeoId } from '@/lib/utils/song-utils'
import { EMBED_SANDBOX, PauseOverlay } from './embed-frame'

declare global {
  interface Window {
    __vimeoPlayer?: any
    Vimeo: any
  }
}

interface VimeoPlayerProps {
  song: Song
}

const PLAYER_EVENTS = ['timeupdate', 'ended', 'play', 'pause', 'error'] as const

function vimeoEmbedUrl(videoId: string): string {
  return `https://player.vimeo.com/video/${videoId}?api=1`
}

function handlePlaybackFailure(songId: string, error: unknown) {
  const state = usePlayerStore.getState()
  if (state.currentSong?.id !== songId) {
    return
  }
  if (error instanceof Error && error.name === 'NotAllowedError') {
    usePlayerStore.setState({
      isPlaying: false,
      playbackError: 'Your browser blocked autoplay. Press Play to start.',
    })
    return
  }
  state.failCurrentSong(songId, 'Vimeo could not play this track. Skipping track.')
}

export function VimeoPlayer({ song }: VimeoPlayerProps) {
  const [embedAttempt, setEmbedAttempt] = useState(0)
  const remountEmbed = useCallback(() => setEmbedAttempt(attempt => attempt + 1), [])
  const videoId = extractVimeoId(song.url)
  if (!videoId) {
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-400">
        Invalid Vimeo URL
      </div>
    )
  }
  return (
    <VimeoEmbed key={embedAttempt} onEmbedFailed={remountEmbed} song={song} videoId={videoId} />
  )
}

interface VimeoEmbedProps {
  onEmbedFailed: () => void
  song: Song
  videoId: string
}

function VimeoEmbed({ onEmbedFailed, song, videoId }: VimeoEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<any>(null)
  const loadedSongRef = useRef<{ id: string } | null>(null)
  const embeddedSongIdRef = useRef(song.id)
  const embeddedVideoIdRef = useRef(videoId)
  const initialIframeSrc = useRef(vimeoEmbedUrl(videoId))
  const [isReady, setIsReady] = useState(false)
  const { isPlaying, volume, togglePlay } = usePlayerStore(
    useShallow(state => ({
      isPlaying: state.isPlaying,
      togglePlay: state.togglePlay,
      volume: state.volume,
    }))
  )

  useEffect(() => {
    let mounted = true
    const currentSongId = () => {
      const loadedId = loadedSongRef.current?.id
      return mounted && loadedId === usePlayerStore.getState().currentSong?.id ? loadedId : null
    }

    const initPlayer = () => {
      if (!(mounted && iframeRef.current && window.Vimeo?.Player) || playerRef.current) {
        return
      }
      const player = new window.Vimeo.Player(iframeRef.current)
      playerRef.current = player

      const replay = async (songId: string) => {
        try {
          await player.setCurrentTime(0)
          await player.play()
        } catch (error) {
          handlePlaybackFailure(songId, error)
        }
      }

      player.on('timeupdate', (data: { seconds?: number }) => {
        const { seconds } = data
        if (currentSongId() && typeof seconds === 'number' && Number.isFinite(seconds)) {
          usePlayerStore.getState().setCurrentTime(seconds)
        }
      })
      player.on('ended', () => {
        const songId = currentSongId()
        if (!songId) {
          return
        }
        const state = usePlayerStore.getState()
        state.onEnded()
        const nextState = usePlayerStore.getState()
        if (nextState.isPlaying && nextState.currentSong?.id === songId) {
          replay(songId)
        }
      })
      player.on('play', () => {
        const state = usePlayerStore.getState()
        if (currentSongId() && !state.isPlaying) {
          state.play()
        }
      })
      player.on('pause', () => {
        const state = usePlayerStore.getState()
        if (currentSongId() && state.isPlaying) {
          state.pause()
        }
      })
      player.on('error', (error: unknown) => {
        console.error('Vimeo error:', error)
      })
      player
        .ready()
        .then(() => {
          if (mounted) {
            window.__vimeoPlayer = player
            setIsReady(true)
          }
        })
        .catch((error: unknown) => {
          if (mounted) {
            handlePlaybackFailure(embeddedSongIdRef.current, error)
            onEmbedFailed()
          }
        })
    }

    if (window.Vimeo?.Player) {
      initPlayer()
    } else {
      const script = document.createElement('script')
      script.src = 'https://player.vimeo.com/api/player.js'
      script.async = true
      script.onload = initPlayer
      document.body.appendChild(script)
    }

    return () => {
      mounted = false
      const player = playerRef.current
      playerRef.current = null
      if (window.__vimeoPlayer === player) {
        window.__vimeoPlayer = undefined
      }
      if (player) {
        for (const event of PLAYER_EVENTS) {
          player.off(event)
        }
      }
    }
  }, [onEmbedFailed])

  useEffect(() => {
    const player = playerRef.current
    if (!(isReady && player)) {
      return
    }
    let current = true
    const syncVideo = async () => {
      const state = usePlayerStore.getState()
      if (embeddedVideoIdRef.current !== videoId) {
        embeddedVideoIdRef.current = videoId
        await player.loadVideo(videoId)
      }
      await player.setVolume(state.volume / 100)
      const duration = await player.getDuration()
      if (!current) {
        return
      }
      loadedSongRef.current = { id: song.id }
      if (duration > 0 && Number.isFinite(duration)) {
        state.setDuration(duration)
      }
      if (state.currentTime > 0 && (!state.duration || state.currentTime < state.duration)) {
        await player.setCurrentTime(state.currentTime)
      }
      if (current && usePlayerStore.getState().isPlaying) {
        await player.play()
      }
    }
    syncVideo().catch((error: unknown) => {
      if (current) {
        handlePlaybackFailure(song.id, error)
      }
    })
    return () => {
      current = false
    }
  }, [isReady, song.id, videoId])

  useEffect(() => {
    const player = playerRef.current
    if (!(isReady && player) || loadedSongRef.current?.id !== song.id) {
      return
    }
    if (isPlaying) {
      player.play().catch((error: unknown) => handlePlaybackFailure(song.id, error))
    } else {
      player.pause()
    }
  }, [isPlaying, isReady, song.id])

  useEffect(() => {
    if (isReady) {
      playerRef.current?.setVolume(volume / 100)
    }
  }, [volume, isReady])

  return (
    <div className="relative h-full w-full">
      <iframe
        allow="autoplay; fullscreen"
        allowFullScreen
        frameBorder="0"
        height="100%"
        ref={iframeRef}
        sandbox={EMBED_SANDBOX}
        src={initialIframeSrc.current}
        title={`Vimeo player: ${song.title}`}
        width="100%"
      />
      {isPlaying ? <PauseOverlay onPause={togglePlay} /> : null}
    </div>
  )
}
