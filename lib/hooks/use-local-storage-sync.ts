"use client"

import { useEffect } from "react"
import { usePlaylistStore } from "@/lib/store"

/**
 * Hook to sync Zustand store with localStorage on client side only
 * Prevents hydration mismatches by loading localStorage after mount
 */
export function useLocalStorageSync() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const store = usePlaylistStore.getState()
    
    // Load subreddits from localStorage
    try {
      const storedSubreddits = localStorage.getItem('redditMusicPlayer_subreddits')
      if (storedSubreddits) {
        const parsed = JSON.parse(storedSubreddits)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Only set if store is empty (not already set by URL params)
          if (store.selectedSubreddits.length === 0) {
            store.setSelectedSubreddits(parsed)
          }
        }
      }
    } catch (e) {
      console.error('Failed to load subreddits from localStorage:', e)
    }

    // Load sort method from localStorage
    try {
      const storedSort = localStorage.getItem('redditMusicPlayer_sortMethod')
      if (storedSort && (storedSort === "hot" || storedSort === "new" || storedSort === "top")) {
        if (store.sortMethod === "hot") { // Only if still default
          store.setSortMethod(storedSort)
        }
      }
    } catch (e) {
      console.error('Failed to load sort method from localStorage:', e)
    }

    // Load top method from localStorage
    try {
      const storedTop = localStorage.getItem('redditMusicPlayer_topMethod')
      if (storedTop && ["day", "week", "month", "year", "all"].includes(storedTop)) {
        if (store.topMethod === "week") { // Only if still default
          store.setTopMethod(storedTop as "day" | "week" | "month" | "year" | "all")
        }
      }
    } catch (e) {
      console.error('Failed to load top method from localStorage:', e)
    }
  }, [])
}



