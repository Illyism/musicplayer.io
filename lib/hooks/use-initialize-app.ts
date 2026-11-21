'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { getPersistedSubreddits, usePlayerStore } from '@/lib/store/player-store'
import { parseRouteCommunities } from '@/lib/utils/listing-request'
import { hydratePlayerStore } from './use-player-hydration'
import { isSubredditFetchInFlight, useRedditAPI } from './use-reddit-api'

const REDDIT_PATH_REGEX = /^\/r\/(?<communities>[^/]+)\/?$/u

const SORT_METHODS = ['hot', 'new', 'top'] as const
const TOP_PERIODS = ['day', 'week', 'month', 'year', 'all'] as const

function decodeRouteValue(value: string | null): string | null {
  if (!value) {
    return null
  }
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function useInitializeApp() {
  const hasInitialized = useRef<boolean>(false)
  const previousRouteRef = useRef<string | null>(null)
  const pathname = usePathname()
  const { fetchFromSubreddits } = useRedditAPI()

  useEffect(() => {
    hydratePlayerStore()

    const state = usePlayerStore.getState()
    const searchParams = new URLSearchParams(window.location.search)
    const routeCommunities = decodeRouteValue(
      pathname.match(REDDIT_PATH_REGEX)?.[1] ?? searchParams.get('r')
    )
    const wasOnRoute = previousRouteRef.current !== null
    previousRouteRef.current = routeCommunities

    const searchOwnsFeed = Boolean(state.searchQuery) && !routeCommunities
    if (searchOwnsFeed) {
      hasInitialized.current = true
      state.setInitialized(true)
      return
    }

    const routeSort = SORT_METHODS.find(value => value === searchParams.get('sort'))
    const routePeriod = TOP_PERIODS.find(value => value === searchParams.get('t'))
    const sortChanged = routeSort !== undefined && routeSort !== state.sortMethod
    const periodChanged = routePeriod !== undefined && routePeriod !== state.topPeriod
    if (routeSort) {
      state.setSortMethod(routeSort)
    }
    if (routePeriod) {
      state.setTopPeriod(routePeriod)
    }

    if (routeCommunities) {
      const communities = parseRouteCommunities(routeCommunities)
      const currentSelection = [...state.selectedSubreddits].sort().join('+')
      const routeSelection = [...communities].sort().join('+')
      const wasInitialized = hasInitialized.current
      hasInitialized.current = true

      if (communities.length > 0) {
        if (
          !wasInitialized ||
          currentSelection !== routeSelection ||
          sortChanged ||
          periodChanged ||
          state.searchQuery
        ) {
          state.setSearchQuery(null)
          state.setSelectedSubreddits(communities, { persist: false })
          state.setInitialized(true)
          const browseRequestIsActive =
            wasInitialized &&
            isSubredditFetchInFlight(routeSelection) &&
            !sortChanged &&
            !periodChanged
          if (!browseRequestIsActive) {
            fetchFromSubreddits(communities)
          }
        } else {
          state.setInitialized(true)
        }
        return
      }

      state.setSearchQuery(null)
      state.setSelectedSubreddits([], { persist: false })
      state.setInitialized(true)
      state.setSongs([])
      state.setAfter(null)
      state.setListingError('The requested subreddit or post could not be found.')
      state.setLoading(false)
      return
    }

    const wasInitialized = hasInitialized.current
    if (wasInitialized && !wasOnRoute && !sortChanged && !periodChanged) {
      return
    }
    hasInitialized.current = true

    if (wasOnRoute || state.selectedSubreddits.length === 0) {
      const persisted = getPersistedSubreddits()
      state.setSelectedSubreddits(persisted, { persist: false })
    }
    state.setInitialized(true)

    const activeSubreddits = usePlayerStore.getState().selectedSubreddits
    const savedMixIsEmpty = activeSubreddits.length === 0
    if (savedMixIsEmpty) {
      state.setSongs([])
      state.setAfter(null)
      state.setLoading(false)
      return
    }
    const selectionKey = [...activeSubreddits].sort().join('+')
    const browseRequestIsActive =
      wasInitialized && isSubredditFetchInFlight(selectionKey) && !sortChanged && !periodChanged
    if (!browseRequestIsActive) {
      fetchFromSubreddits(activeSubreddits, undefined, { fallbackToDefaultOnError: true })
    }
  }, [pathname, fetchFromSubreddits])
}
