import { useEffect } from 'react'
import { getPersistedSubreddits, usePlayerStore } from '@/lib/store/player-store'

let hasHydrated = false

export function hydratePlayerStore() {
  if (hasHydrated || typeof window === 'undefined') {
    return
  }
  hasHydrated = true
  try {
    const sortMethod = localStorage.getItem('reddit_music_player_sort_method')
    const topPeriod = localStorage.getItem('reddit_music_player_top_period')
    const volume = localStorage.getItem('reddit_music_player_volume')

    usePlayerStore.setState({
      selectedSubreddits: getPersistedSubreddits(),
      sortMethod: sortMethod ? JSON.parse(sortMethod) : 'hot',
      topPeriod: topPeriod ? JSON.parse(topPeriod) : 'week',
      volume: volume ? JSON.parse(volume) : 100,
    })
  } catch (error) {
    console.error('Failed to hydrate player state from localStorage:', error)
  }
}

/**
 * Hydrates player store from localStorage on client-side only
 * This prevents SSR hydration mismatches
 */
export function usePlayerHydration() {
  useEffect(() => {
    hydratePlayerStore()
  }, [])
}
