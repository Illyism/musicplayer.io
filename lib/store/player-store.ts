import { create } from 'zustand'

// ============================================================================
// TYPES
// ============================================================================

export interface Song {
  id: string
  name: string // Reddit fullname (e.g., "t3_abc123")
  title: string
  author: string
  url: string
  domain: string
  thumbnail?: string
  score: number
  ups: number
  downs: number
  created_utc: number
  created_ago?: string
  num_comments: number
  subreddit: string
  permalink: string
  is_self: boolean
  selftext?: string
  selftext_html?: string
  type: 'youtube' | 'soundcloud' | 'vimeo' | 'mp3' | 'none'
  playable: boolean
  media?: any
}

export interface PlayerState {
  // Playlist
  songs: Song[]
  currentIndex: number
  currentSong: Song | null
  selectedSubreddits: string[]
  sortMethod: 'hot' | 'new' | 'top'
  topPeriod: 'day' | 'week' | 'month' | 'year' | 'all'
  searchQuery: string | null
  loading: boolean
  after: string | null // Pagination

  // Playback
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number

  // UI
  mobileView: 'browse' | 'playlist' | 'player'
}

export interface PlayerActions {
  // Playlist actions
  setSongs: (songs: Song[]) => void
  addSongs: (songs: Song[]) => void
  setCurrentSong: (index: number) => void
  setSelectedSubreddits: (subreddits: string[]) => void
  setSortMethod: (method: PlayerState['sortMethod']) => void
  setTopPeriod: (period: PlayerState['topPeriod']) => void
  setSearchQuery: (query: string | null) => void
  setLoading: (loading: boolean) => void
  setAfter: (after: string | null) => void
  shufflePlaylist: () => void

  // Playback actions
  play: () => void
  pause: () => void
  togglePlay: () => void
  next: () => void
  previous: () => void
  seekTo: (time: number) => void
  setVolume: (volume: number) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void

  // UI actions
  setMobileView: (view: PlayerState['mobileView']) => void
}

export type PlayerStore = PlayerState & PlayerActions

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const STORAGE_KEYS = {
  subreddits: 'reddit_music_player_subreddits',
  sortMethod: 'reddit_music_player_sort_method',
  topPeriod: 'reddit_music_player_top_period',
  volume: 'reddit_music_player_volume',
} as const

function _loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error)
  }
}

// ============================================================================
// STORE
// ============================================================================

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // ========================================
  // STATE (static defaults - NO localStorage here)
  // ========================================
  songs: [],
  currentIndex: -1,
  currentSong: null,
  selectedSubreddits: ['listentothis'], // Static default
  sortMethod: 'hot', // Static default
  topPeriod: 'week', // Static default
  searchQuery: null,
  loading: false,
  after: null,

  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 100, // Static default

  mobileView: 'playlist',

  // ========================================
  // PLAYLIST ACTIONS
  // ========================================
  setSongs: songs => {
    const state = get()
    // Deduplicate songs by ID (keep first occurrence)
    const seenIds = new Set<string>()
    const uniqueSongs = songs.filter(song => {
      if (seenIds.has(song.id)) {
        return false
      }
      seenIds.add(song.id)
      return true
    })

    // Preserve current song if it still exists in the new list
    let newCurrentIndex = -1
    let newCurrentSong = null
    let newCurrentTime = 0
    let newDuration = 0

    if (state.currentSong) {
      const foundIndex = uniqueSongs.findIndex(song => song.id === state.currentSong?.id)
      if (foundIndex >= 0) {
        newCurrentIndex = foundIndex
        newCurrentSong = state.currentSong
        // Preserve playback state (currentTime, duration, isPlaying)
        newCurrentTime = state.currentTime
        newDuration = state.duration
      }
    }

    set({
      songs: uniqueSongs,
      currentIndex: newCurrentIndex,
      currentSong: newCurrentSong,
      currentTime: newCurrentTime,
      duration: newDuration,
    })
  },

  addSongs: newSongs => {
    set(state => {
      // Filter out duplicates - only add songs that don't already exist
      const existingIds = new Set(state.songs.map(song => song.id))
      const uniqueNewSongs = newSongs.filter(song => !existingIds.has(song.id))
      return {
        songs: [...state.songs, ...uniqueNewSongs],
      }
    })
  },

  setCurrentSong: index => {
    const songs = get().songs
    const song = songs[index]

    if (!song) return

    set({
      currentIndex: index,
      currentSong: song,
      currentTime: 0,
      duration: 0,
      isPlaying: song.playable,
    })
  },

  setSelectedSubreddits: subreddits => {
    // Deduplicate subreddits (keep first occurrence)
    const seen = new Set<string>()
    const unique = subreddits.filter(sub => {
      if (seen.has(sub)) {
        return false
      }
      seen.add(sub)
      return true
    })
    set({ selectedSubreddits: unique })
    saveToStorage(STORAGE_KEYS.subreddits, unique)
  },

  setSortMethod: method => {
    set({ sortMethod: method })
    saveToStorage(STORAGE_KEYS.sortMethod, method)
  },

  setTopPeriod: period => {
    set({ topPeriod: period })
    saveToStorage(STORAGE_KEYS.topPeriod, period)
  },

  setSearchQuery: query => {
    set({ searchQuery: query })
  },

  setLoading: loading => {
    set({ loading })
  },

  setAfter: after => {
    set({ after })
  },

  shufflePlaylist: () => {
    const { songs, currentSong } = get()
    const shuffled = [...songs].sort(() => Math.random() - 0.5)

    // If there's a current song, find its new index in shuffled array
    if (currentSong) {
      const newIndex = shuffled.findIndex(song => song.id === currentSong.id)
      set({
        songs: shuffled,
        currentIndex: newIndex >= 0 ? newIndex : -1,
      })
    } else {
      set({ songs: shuffled })
    }
  },

  // ========================================
  // PLAYBACK ACTIONS
  // ========================================
  play: () => {
    set({ isPlaying: true })
  },

  pause: () => {
    set({ isPlaying: false })
  },

  togglePlay: () => {
    set(state => ({ isPlaying: !state.isPlaying }))
  },

  next: () => {
    const { songs, currentIndex } = get()

    // Find next playable song
    let nextIndex = currentIndex + 1
    while (nextIndex < songs.length) {
      const song = songs[nextIndex]
      if (song?.playable) {
        get().setCurrentSong(nextIndex)
        return
      }
      nextIndex++
    }

    // If no next song found, loop back to first playable song
    nextIndex = 0
    while (nextIndex < songs.length) {
      const song = songs[nextIndex]
      if (song?.playable) {
        get().setCurrentSong(nextIndex)
        return
      }
      nextIndex++
    }
  },

  previous: () => {
    const { songs, currentIndex } = get()

    // Find previous playable song
    let prevIndex = currentIndex - 1
    while (prevIndex >= 0) {
      const song = songs[prevIndex]
      if (song?.playable) {
        get().setCurrentSong(prevIndex)
        return
      }
      prevIndex--
    }
  },

  seekTo: time => {
    set({ currentTime: time })
  },

  setVolume: volume => {
    const clampedVolume = Math.max(0, Math.min(100, volume))
    set({ volume: clampedVolume })
    saveToStorage(STORAGE_KEYS.volume, clampedVolume)
  },

  setCurrentTime: time => {
    set({ currentTime: time })
  },

  setDuration: duration => {
    if (duration > 0 && isFinite(duration)) {
      set({ duration })
    }
  },

  // ========================================
  // UI ACTIONS
  // ========================================
  setMobileView: view => {
    set({ mobileView: view })
  },
}))
