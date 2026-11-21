import { create } from 'zustand'

interface SearchState {
  query: string
  setQuery: (query: string) => void
}

export const useSearchStore = create<SearchState>(set => ({
  query: '',
  setQuery: query => set({ query }),
}))
