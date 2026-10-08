'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/lib/store/player-store'
import { useRedditAPI } from './use-reddit-api'

const REDDIT_PATH_REGEX = /^\/r\/([^/]+)\/?$/
const COMMUNITY_SEPARATOR_REGEX = /[+\s]+/

const SORT_METHODS = ['hot', 'new', 'top'] as const
const TOP_PERIODS = ['day', 'week', 'month', 'year', 'all'] as const

/** Initialize the feed from the route, after client storage has hydrated. */
export function useInitializeApp() {
  const hasInitialized = useRef<boolean>(false)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { fetchFromSubreddits } = useRedditAPI()

  useEffect(() => {
    // Browse starts searches before navigation completes. Keep that request active.
    const state = usePlayerStore.getState()
    const routeCommunities = pathname.match(REDDIT_PATH_REGEX)?.[1] ?? searchParams.get('r')
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
            .filter(Boolean)
        ),
      ]
      const currentSelection = [...state.selectedSubreddits].sort().join('+')
      const routeSelection = [...communities].sort().join('+')
      if (communities.length > 0) {
        if (
          !hasInitialized.current ||
          currentSelection !== routeSelection ||
          sortChanged ||
          periodChanged ||
          state.searchQuery
        ) {
          hasInitialized.current = true
          state.setSearchQuery(null)
          state.setSelectedSubreddits(communities)
          // The API hook reports failures with a toast; handle this boundary's promise.
          const browseRequestIsActive =
            state.loading && currentSelection === routeSelection && !sortChanged && !periodChanged
          if (!browseRequestIsActive) {
            fetchFromSubreddits(communities).catch(() => undefined)
          }
        }
        return
      }
    }

    if (hasInitialized.current && !sortChanged && !periodChanged) {
      return
    }
    hasInitialized.current = true
    if (state.selectedSubreddits.length > 0 && !state.loading) {
      fetchFromSubreddits(state.selectedSubreddits).catch(() => undefined)
    } else if (state.selectedSubreddits.length === 0) {
      // An intentionally empty saved mix should stay empty.
      state.setSongs([])
      state.setAfter(null)
    }
  }, [pathname, searchParams, fetchFromSubreddits])
}
