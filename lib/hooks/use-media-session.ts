'use client'

import { useEffect } from 'react'
import { usePlayerStore } from '@/lib/store/player-store'

export async function seekCurrentMedia(requestedTime: number) {
  const state = usePlayerStore.getState()
  if (!(state.currentSong && Number.isFinite(requestedTime))) {
    return
  }
  const time = Math.max(
    0,
    state.duration > 0 ? Math.min(state.duration, requestedTime) : requestedTime
  )
  state.seekTo(time)
  try {
    if (state.currentSong.type === 'youtube') {
      window.__youtubePlayer?.seekTo(time, true)
    } else if (state.currentSong.type === 'soundcloud') {
      window.__soundcloudWidget?.seekTo(time * 1000)
    } else if (state.currentSong.type === 'vimeo') {
      await window.__vimeoPlayer?.setCurrentTime(time)
    } else if (state.currentSong.type === 'mp3') {
      const audio = window.__audioPlayer || document.querySelector('audio')
      if (audio) {
        audio.currentTime = time
      }
    }
  } catch {
    // A provider may still be preparing its media.
  }
}

export function useMediaSession() {
  const currentSong = usePlayerStore(state => state.currentSong)
  const isPlaying = usePlayerStore(state => state.isPlaying)
  const duration = usePlayerStore(state => state.duration)
  const currentTime = usePlayerStore(state => Math.floor(state.currentTime))

  useEffect(() => {
    const session = navigator.mediaSession
    if (!session) {
      return
    }
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      [
        'play',
        () => {
          const state = usePlayerStore.getState()
          if (state.currentSong) {
            state.play()
          }
        },
      ],
      ['pause', () => usePlayerStore.getState().pause()],
      ['nexttrack', () => usePlayerStore.getState().next()],
      ['previoustrack', () => usePlayerStore.getState().previous()],
      [
        'stop',
        async () => {
          usePlayerStore.getState().pause()
          await seekCurrentMedia(0)
        },
      ],
      [
        'seekto',
        async details => {
          if (typeof details.seekTime === 'number') {
            await seekCurrentMedia(details.seekTime)
          }
        },
      ],
      [
        'seekforward',
        async details => {
          await seekCurrentMedia(usePlayerStore.getState().currentTime + (details.seekOffset ?? 10))
        },
      ],
      [
        'seekbackward',
        async details => {
          await seekCurrentMedia(usePlayerStore.getState().currentTime - (details.seekOffset ?? 10))
        },
      ],
    ]
    const registered: MediaSessionAction[] = []
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler)
        registered.push(action)
      } catch {
        // Individual actions can be unavailable even when Media Session exists.
      }
    }
    return () => {
      for (const action of registered) {
        session.setActionHandler(action, null)
      }
      session.metadata = null
      session.playbackState = 'none'
    }
  }, [])

  useEffect(() => {
    const session = navigator.mediaSession
    if (!session || typeof MediaMetadata === 'undefined') {
      return
    }
    session.metadata = currentSong
      ? new MediaMetadata({
          album: 'Music Player for Reddit',
          artist: `r/${currentSong.subreddit}`,
          artwork: currentSong.thumbnail ? [{ src: currentSong.thumbnail }] : [],
          title: currentSong.title,
        })
      : null
  }, [currentSong])

  useEffect(() => {
    if (navigator.mediaSession) {
      let playbackState: MediaSessionPlaybackState = 'none'
      if (currentSong) {
        playbackState = isPlaying ? 'playing' : 'paused'
      }
      navigator.mediaSession.playbackState = playbackState
    }
  }, [currentSong, isPlaying])

  useEffect(() => {
    const session = navigator.mediaSession
    if (!session?.setPositionState) {
      return
    }
    try {
      if (duration > 0 && Number.isFinite(duration)) {
        session.setPositionState({
          duration,
          playbackRate: 1,
          position: Math.min(duration, Math.max(0, currentTime)),
        })
      } else {
        session.setPositionState()
      }
    } catch {
      // Some browsers expose position state without supporting every provider.
    }
  }, [currentTime, duration])
}
