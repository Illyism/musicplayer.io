'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { usePlayerStore } from '@/lib/store/player-store'
import { useRedditAPI } from './use-reddit-api'

/**
 * Initialize app on mount
 * - Load from URL params
 * - Setup keyboard shortcuts
 * - Load saved state
 */
export function useInitializeApp() {
  const hasInitialized = useRef(false)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { fetchFromSubreddits } = useRedditAPI()
  const {
    setSelectedSubreddits,
    selectedSubreddits,
    togglePlay,
    next,
    previous,
    setVolume,
    volume,
  } = usePlayerStore()

  // ==========================================
  // INITIALIZE FROM URL
  // ==========================================
  useEffect(() => {
    // Check path: /r/music+listentothis
    const pathMatch = pathname.match(/^\/r\/(.+)$/)
    if (pathMatch) {
      const subs = pathMatch[1]
        .split('+')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)

      // Deduplicate subreddits from URL
      const seen = new Set<string>()
      const uniqueSubs = subs.filter(sub => {
        if (seen.has(sub)) {
          return false
        }
        seen.add(sub)
        return true
      })

      if (uniqueSubs.length > 0) {
        // Only update if different from current selection
        const currentSubsStr = selectedSubreddits.sort().join('+')
        const newSubsStr = uniqueSubs.sort().join('+')
        if (currentSubsStr !== newSubsStr) {
          setSelectedSubreddits(uniqueSubs)
          fetchFromSubreddits(uniqueSubs)
        }
        hasInitialized.current = true
        return
      }
    }

    // Check query: ?r=music+listentothis (fallback for old URLs)
    const rParam = searchParams.get('r')
    if (rParam) {
      const subs = rParam
        .split('+')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)

      // Deduplicate subreddits from URL
      const seen = new Set<string>()
      const uniqueSubs = subs.filter(sub => {
        if (seen.has(sub)) {
          return false
        }
        seen.add(sub)
        return true
      })

      if (uniqueSubs.length > 0) {
        // Only update if different from current selection
        const currentSubsStr = selectedSubreddits.sort().join('+')
        const newSubsStr = uniqueSubs.sort().join('+')
        if (currentSubsStr !== newSubsStr) {
          setSelectedSubreddits(uniqueSubs)
          fetchFromSubreddits(uniqueSubs)
        }
        hasInitialized.current = true
        return
      }
    }

    // Only initialize defaults on first mount
    if (!hasInitialized.current) {
      // Use saved subreddits or default
      if (selectedSubreddits.length > 0) {
        hasInitialized.current = true
        fetchFromSubreddits(selectedSubreddits)
      } else {
        hasInitialized.current = true
        const defaultSubs = ['listentothis']
        setSelectedSubreddits(defaultSubs)
        fetchFromSubreddits(defaultSubs)
      }
    }
  }, [pathname, searchParams, fetchFromSubreddits, selectedSubreddits, setSelectedSubreddits]) // React to pathname and searchParams changes

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Space: Play/Pause
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
        return
      }

      // Modifier key shortcuts
      const mod = e.ctrlKey || e.metaKey

      if (mod) {
        switch (e.code) {
          case 'ArrowLeft':
            e.preventDefault()
            previous()
            break
          case 'ArrowRight':
            e.preventDefault()
            next()
            break
          case 'ArrowUp':
            e.preventDefault()
            setVolume(Math.min(100, volume + 10))
            break
          case 'ArrowDown':
            e.preventDefault()
            setVolume(Math.max(0, volume - 10))
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, next, previous, setVolume, volume])
}
