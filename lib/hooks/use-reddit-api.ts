import { useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { usePlayerStore } from '@/lib/store/player-store'
import { parseSong, filterPlayableSongs } from '@/lib/utils/song-utils'
import { getSubredditPosts, searchReddit } from '@/lib/actions/reddit'
import { getErrorMessage } from '@/lib/errors/reddit-error'

// ============================================================================
// REDDIT API HOOK
// ============================================================================

export function useRedditAPI() {
  const storeRef = useRef(usePlayerStore.getState())
  const isFetchingRef = useRef(false)

  // Keep store ref updated
  usePlayerStore.subscribe(state => {
    storeRef.current = state
  })

  /**
   * Fetch from subreddits
   */
  const fetchFromSubreddits = useCallback(async (subreddits: string[], pagination?: string) => {
    // Prevent concurrent requests
    if (isFetchingRef.current) return []
    isFetchingRef.current = true

    const state = storeRef.current
    state.setLoading(true)

    try {
      const subredditString = subreddits.join('+')
      const sort = state.sortMethod
      const timePeriod = sort === 'top' ? state.topPeriod : undefined

      const data = await getSubredditPosts(subredditString, sort, timePeriod, pagination, '100')

      if (!data?.data?.children) {
        console.warn('Unexpected API response structure')
        return []
      }

      // Filter and parse songs
      const filtered = filterPlayableSongs(data.data.children)
      const songs = filtered.map((item: any) => parseSong(item.data))

      // Update store
      if (pagination) {
        state.addSongs(songs)
      } else {
        state.setSongs(songs)
      }

      state.setAfter(data.data.after || null)

      return songs
    } catch (error: any) {
      console.error('Error fetching from Reddit:', error)
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage, { duration: 10000 })
      throw error
    } finally {
      state.setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  /**
   * Search Reddit
   */
  const fetchSearch = useCallback(async (query: string, pagination?: string) => {
    if (!query?.trim()) return []

    // Prevent concurrent requests
    if (isFetchingRef.current) return []
    isFetchingRef.current = true

    const state = storeRef.current
    state.setLoading(true)

    try {
      const sort = state.sortMethod
      const timePeriod = sort === 'top' ? state.topPeriod : undefined

      const data = await searchReddit(query, sort, timePeriod, pagination, '100')

      if (!data?.data?.children) {
        console.warn('Unexpected search response')
        return []
      }

      // Filter and parse songs
      const filtered = filterPlayableSongs(data.data.children)
      const songs = filtered.map((item: any) => parseSong(item.data))

      // Update store
      if (pagination) {
        state.addSongs(songs)
      } else {
        state.setSongs(songs)
      }

      state.setAfter(data.data.after || null)

      return songs
    } catch (error: any) {
      console.error('Search error:', error)
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage, { duration: 10000 })
      throw error
    } finally {
      state.setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  /**
   * Fetch songs from Reddit
   */
  const fetchSongs = useCallback(
    async (pagination?: string) => {
      const state = storeRef.current

      // Use search if query exists
      if (state.searchQuery) {
        return fetchSearch(state.searchQuery, pagination)
      }

      // Use selected subreddits or default to listentothis
      const subreddits =
        state.selectedSubreddits.length > 0 ? state.selectedSubreddits : ['listentothis']

      return fetchFromSubreddits(subreddits, pagination)
    },
    [fetchFromSubreddits, fetchSearch]
  )

  return {
    fetchSongs,
    fetchFromSubreddits,
    fetchSearch,
  }
}
