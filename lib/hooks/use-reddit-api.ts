import { useCallback } from 'react'
import { toast } from 'sonner'
import { getSubredditPosts, searchReddit } from '@/lib/actions/reddit'
import { getErrorMessage, isRedditError } from '@/lib/errors/reddit-error'
import { removeSubredditsFromStorage, usePlayerStore } from '@/lib/store/player-store'
import { filterPlayableSongs, parseSong } from '@/lib/utils/song-utils'

const REDDIT_PATH_REGEX = /^\/r\/([^/]+)\/?$/
const COMMUNITY_SEPARATOR_REGEX = /[+\s]+/
const VALID_SUBREDDIT_REGEX = /^[a-z0-9_-]{1,100}$/i

let activeRequestId = 0
let inFlightSelectionKey: string | null = null
let isPaginationInFlight = false

export function isSubredditFetchInFlight(selectionKey: string): boolean {
  return inFlightSelectionKey !== null && inFlightSelectionKey === selectionKey
}

function getRouteSubredditsFromWindow(): string[] {
  if (typeof window === 'undefined') {
    return []
  }
  const raw = window.location.pathname.match(REDDIT_PATH_REGEX)?.[1]
  if (!raw) {
    return []
  }
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  return [
    ...new Set(
      decoded
        .split(COMMUNITY_SEPARATOR_REGEX)
        .map(value => value.trim().toLowerCase())
        .filter(value => VALID_SUBREDDIT_REGEX.test(value))
    ),
  ]
}

export interface FetchSubredditsOptions {
  fallbackToDefaultOnError?: boolean
}

export function useRedditAPI() {
  /**
   * Fetch from subreddits
   */
  const fetchFromSubreddits = useCallback(
    async (
      subreddits: string[],
      pagination?: string,
      options?: FetchSubredditsOptions
    ): Promise<any[]> => {
      if (pagination) {
        if (isPaginationInFlight) {
          return []
        }
        isPaginationInFlight = true
      }

      const selectionKey = [...subreddits]
        .map(sub => sub.toLowerCase())
        .sort()
        .join('+')
      activeRequestId += 1
      const requestId = activeRequestId
      if (!pagination) {
        inFlightSelectionKey = selectionKey
      }

      const state = usePlayerStore.getState()
      state.setLoading(true)
      state.setListingError(null)

      try {
        const subredditString = subreddits.join('+')
        const sort = state.sortMethod
        const timePeriod = sort === 'top' ? state.topPeriod : undefined

        const data = await getSubredditPosts(subredditString, sort, timePeriod, pagination, '100')

        if (requestId !== activeRequestId) {
          return []
        }

        if (!data?.data?.children) {
          if (!pagination) {
            state.setSongs([])
            state.setAfter(null)
          }
          return []
        }

        const filtered = filterPlayableSongs(data.data.children)
        const songs = filtered.map((item: any) => parseSong(item.data))

        if (!pagination && songs.length === 0) {
          const fallback = removeSubredditsFromStorage(subreddits)
          if (options?.fallbackToDefaultOnError && selectionKey !== 'listentothis') {
            inFlightSelectionKey = null
            state.setSelectedSubreddits(fallback, { persist: true })
            return await fetchFromSubreddits(fallback)
          }
        }

        if (pagination) {
          state.addSongs(songs)
        } else {
          state.setSongs(songs)
          if (songs.length > 0) {
            state.setSelectedSubreddits(subreddits, { persist: true })
          }
        }

        state.setAfter(data.data.after || null)
        state.setListingError(null)

        return songs
      } catch (error: unknown) {
        if (requestId !== activeRequestId) {
          return []
        }

        const fallback = removeSubredditsFromStorage(subreddits)
        if (!pagination) {
          if (options?.fallbackToDefaultOnError && selectionKey !== 'listentothis') {
            inFlightSelectionKey = null
            state.setSelectedSubreddits(fallback, { persist: true })
            state.setListingError(null)
            return await fetchFromSubreddits(fallback)
          }

          if (isRedditError(error) && error.statusCode === 404) {
            state.setSelectedSubreddits([], { persist: false })
          }
          state.setSongs([])
          state.setAfter(null)
        }

        const errorMessage = getErrorMessage(error)
        state.setListingError(errorMessage)
        toast.error(errorMessage, { duration: 10_000 })
        throw error
      } finally {
        if (pagination) {
          isPaginationInFlight = false
        }
        if (requestId === activeRequestId) {
          inFlightSelectionKey = null
          usePlayerStore.getState().setLoading(false)
        }
      }
    },
    []
  )

  /**
   * Search Reddit
   */
  const fetchSearch = useCallback(async (query: string, pagination?: string) => {
    if (!query.trim()) {
      return []
    }

    if (pagination) {
      if (isPaginationInFlight) {
        return []
      }
      isPaginationInFlight = true
    }

    activeRequestId += 1
    const requestId = activeRequestId
    inFlightSelectionKey = null

    const state = usePlayerStore.getState()
    state.setLoading(true)
    state.setListingError(null)

    try {
      const sort = state.sortMethod
      const timePeriod = sort === 'top' ? state.topPeriod : undefined

      const data = await searchReddit(query, sort, timePeriod, pagination, '100')

      if (requestId !== activeRequestId) {
        return []
      }

      if (!data?.data?.children) {
        if (!pagination) {
          state.setSongs([])
          state.setAfter(null)
        }
        return []
      }

      const filtered = filterPlayableSongs(data.data.children)
      const songs = filtered.map((item: any) => parseSong(item.data))

      if (pagination) {
        state.addSongs(songs)
      } else {
        state.setSongs(songs)
      }

      state.setAfter(data.data.after || null)
      state.setListingError(null)

      return songs
    } catch (error: unknown) {
      if (requestId !== activeRequestId) {
        return []
      }
      if (!pagination) {
        state.setSongs([])
        state.setAfter(null)
      }
      const errorMessage = getErrorMessage(error)
      state.setListingError(errorMessage)
      toast.error(errorMessage, { duration: 10_000 })
      throw error
    } finally {
      if (pagination) {
        isPaginationInFlight = false
      }
      if (requestId === activeRequestId) {
        usePlayerStore.getState().setLoading(false)
      }
    }
  }, [])

  /**
   * Fetch songs from Reddit
   */
  const fetchSongs = useCallback(
    (pagination?: string) => {
      const state = usePlayerStore.getState()

      if (state.searchQuery) {
        return fetchSearch(state.searchQuery, pagination)
      }

      if (state.selectedSubreddits.length > 0) {
        return fetchFromSubreddits(state.selectedSubreddits, pagination)
      }

      const routeSubreddits = getRouteSubredditsFromWindow()
      const subreddits = routeSubreddits.length > 0 ? routeSubreddits : ['listentothis']

      return fetchFromSubreddits(subreddits, pagination)
    },
    [fetchFromSubreddits, fetchSearch]
  )

  return {
    fetchFromSubreddits,
    fetchSearch,
    fetchSongs,
  }
}
