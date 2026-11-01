'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { getPersistedSubreddits, usePlayerStore } from '@/lib/store/player-store'
import { hydratePlayerStore } from './use-player-hydration'
import { isSubredditFetchInFlight, useRedditAPI } from './use-reddit-api'

const REDDIT_PATH_REGEX = /^\/r\/([^/]+)\/?$/
const COMMUNITY_SEPARATOR_REGEX = /[+\s]+/
const VALID_SUBREDDIT_REGEX = /^[a-z0-9_-]{1,100}$/i
const MAX_ROUTE_COMMUNITIES = 50

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

/** Initialize the feed from the route, after client storage has hydrated. */
export function useInitializeApp() {
  const hasInitialized = useRef<boolean>(false)
  const previousRouteRef = useRef<string | null>(null)
  const pathname = usePathname()
  const { fetchFromSubreddits } = useRedditAPI()

  useEffect(() => {
    hydratePlayerStore()

    // Browse starts searches before navigation completes. Keep that request active.
    const state = usePlayerStore.getState()
    const searchParams = new URLSearchParams(window.location.search)
    const routeCommunities = decodeRouteValue(
      pathname.match(REDDIT_PATH_REGEX)?.[1] ?? searchParams.get('r')
    )
    const wasOnRoute = previousRouteRef.current !== null
    previousRouteRef.current = routeCommunities

    if (state.searchQuery && !routeCommunities) {
      hasInitialized.current = true
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
      const communities = [
        ...new Set(
          routeCommunities
            .split(COMMUNITY_SEPARATOR_REGEX)
            .map(value => value.trim().toLowerCase())
            .filter(value => VALID_SUBREDDIT_REGEX.test(value))
        ),
      ].slice(0, MAX_ROUTE_COMMUNITIES)
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
          // The API hook reports failures with a toast; handle this boundary's promise.
          const browseRequestIsActive =
            wasInitialized &&
            isSubredditFetchInFlight(routeSelection) &&
            !sortChanged &&
            !periodChanged
          if (!browseRequestIsActive) {
            fetchFromSubreddits(communities).catch(() => undefined)
          }
        }
        return
      }

      state.setSearchQuery(null)
      state.setSelectedSubreddits([], { persist: false })
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

    const activeSubreddits = usePlayerStore.getState().selectedSubreddits
    if (activeSubreddits.length > 0) {
      const selectionKey = [...activeSubreddits].sort().join('+')
      const browseRequestIsActive =
        wasInitialized && isSubredditFetchInFlight(selectionKey) && !sortChanged && !periodChanged
      if (!browseRequestIsActive) {
        fetchFromSubreddits(activeSubreddits, undefined, {
          fallbackToDefaultOnError: true,
        }).catch(() => undefined)
      }
    } else {
      // An intentionally empty saved mix should stay empty.
      state.setSongs([])
      state.setAfter(null)
      state.setLoading(false)
    }
  }, [pathname, fetchFromSubreddits])
}
