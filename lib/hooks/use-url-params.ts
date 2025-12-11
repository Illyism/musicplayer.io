"use client"

import { useEffect, useRef } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { usePlaylistStore } from "@/lib/store"
import { useRedditMusic } from "@/lib/hooks/use-reddit-music"

/**
 * Hook to handle URL parameters for loading subreddits
 * Supports:
 * - /r/listentothis+music (path-based)
 * - ?r=listentothis+music (query-based)
 * - ?autoplay (autoplay flag)
 */
export function useUrlParams() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const setSelectedSubreddits = usePlaylistStore((state) => state.setSelectedSubreddits)
  const { fetchMusicForSubreddits } = useRedditMusic()
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Only run once on mount to avoid conflicts with localStorage
    if (hasInitialized.current) return
    
    // Check for subreddits in URL path (e.g., /r/listentothis+music)
    const pathMatch = pathname.match(/^\/r\/(.+)$/)
    if (pathMatch) {
      const subreddits = pathMatch[1].split('+').map(s => s.trim().toLowerCase()).filter(Boolean)
      if (subreddits.length > 0) {
        hasInitialized.current = true
        setSelectedSubreddits(subreddits)
        fetchMusicForSubreddits(subreddits)
        return
      }
    }

    // Check for subreddits in query params (e.g., ?r=listentothis+music)
    const rParam = searchParams.get('r')
    if (rParam) {
      const subreddits = rParam.split('+').map(s => s.trim().toLowerCase()).filter(Boolean)
      if (subreddits.length > 0) {
        hasInitialized.current = true
        setSelectedSubreddits(subreddits)
        fetchMusicForSubreddits(subreddits)
        return
      }
    }

    // If no URL params, check localStorage for saved subreddits
    const savedSubreddits = usePlaylistStore.getState().selectedSubreddits
    if (savedSubreddits.length > 0) {
      hasInitialized.current = true
      fetchMusicForSubreddits(savedSubreddits)
    } else {
      // Default to listentothis if nothing saved
      hasInitialized.current = true
      const defaultSubs = ["listentothis"]
      setSelectedSubreddits(defaultSubs)
      fetchMusicForSubreddits(defaultSubs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
