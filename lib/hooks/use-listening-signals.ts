'use client'

import { useEffect } from 'react'
import { createListeningSession } from '@/lib/listening/session'
import { useListeningStore } from '@/lib/store/listening-store'
import { usePlayerStore } from '@/lib/store/player-store'

/** Device-local signals count advancing playback, with explicit seek and natural-end markers. */
export function useListeningSignals() {
  useEffect(() => {
    const listening = useListeningStore.getState()
    listening.hydrate()
    const initialPlayer = usePlayerStore.getState()
    useListeningStore.getState().refreshSongs(initialPlayer.songs)
    const session = createListeningSession(initialPlayer, performance.now())

    const unsubscribePlayer = usePlayerStore.subscribe((state, previous) => {
      const profile = useListeningStore.getState()
      if (state.songs !== previous.songs) {
        profile.refreshSongs(state.songs)
      }
      const signals = session.update(state, performance.now(), profile.enabled)
      for (const signal of signals) {
        profile.record(signal.song, signal.type, signal.seconds)
      }
    })
    const unsubscribeListening = useListeningStore.subscribe((state, previous) => {
      if (
        state.enabled !== previous.enabled ||
        (previous.events.length > 0 && state.events.length === 0)
      ) {
        session.reset(usePlayerStore.getState(), performance.now())
      }
    })
    return () => {
      unsubscribePlayer()
      unsubscribeListening()
    }
  }, [])
}
