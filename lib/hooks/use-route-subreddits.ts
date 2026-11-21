'use client'

import { createContext, useContext } from 'react'
import { usePlayerStore } from '@/lib/store/player-store'

export const InitialSubredditsContext = createContext<string[] | undefined>(undefined)

export function useEffectiveSubreddits(): string[] {
  const initialSubreddits = useContext(InitialSubredditsContext)
  const initialized = usePlayerStore(state => state.initialized)
  const selectedSubreddits = usePlayerStore(state => state.selectedSubreddits)
  return initialized ? selectedSubreddits : (initialSubreddits ?? selectedSubreddits)
}
