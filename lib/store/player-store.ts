import { create } from 'zustand'

// ============================================================================
// TYPES
// ============================================================================

export interface Song {
  author: string
  created_ago?: string
  created_utc: number
  domain: string
  downs: number
  id: string
  is_self: boolean
  media?: any
  name: string // Reddit fullname (e.g., "t3_abc123")
  num_comments: number
  permalink: string
  playable: boolean
  score: number
  selftext?: string
  selftext_html?: string
  subreddit: string
  thumbnail?: string
  title: string
  type: 'youtube' | 'soundcloud' | 'vimeo' | 'mp3' | 'none'
  ups: number
  url: string
}

export interface PlayerState {
  after: string | null // Pagination
  currentIndex: number
  currentSong: Song | null
  currentTime: number
  duration: number

  // Playback
  isPlaying: boolean
  isTheatreMode: boolean
  loading: boolean

  // UI
  mobileView: 'browse' | 'playlist' | 'player'
  searchQuery: string | null
  selectedSubreddits: string[]
  // Playlist
  songs: Song[]
  sortMethod: 'hot' | 'new' | 'top'
  topPeriod: 'day' | 'week' | 'month' | 'year' | 'all'
  volume: number
}

export interface PlayerActions {
  addSongs: (songs: Song[]) => void
  next: () => void
  pause: () => void

  // Playback actions
  play: () => void
  previous: () => void
  seekTo: (time: number) => void
  setAfter: (after: string | null) => void
  setCurrentSong: (index: number) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setLoading: (loading: boolean) => void

  // UI actions
  setMobileView: (view: PlayerState['mobileView']) => void
  setSearchQuery: (query: string | null) => void
  setSelectedSubreddits: (subreddits: string[]) => void
  // Playlist actions
  setSongs: (songs: Song[]) => void
  setSortMethod: (method: PlayerState['sortMethod']) => void
  setTheatreMode: (enabled: boolean) => void
  setTopPeriod: (period: PlayerState['topPeriod']) => void
  setVolume: (volume: number) => void
  shufflePlaylist: () => void
  togglePlay: () => void
  toggleTheatreMode: () => void
}

export type PlayerStore = PlayerState & PlayerActions

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const STORAGE_KEYS = {
  sortMethod: 'reddit_music_player_sort_method',
  subreddits: 'reddit_music_player_subreddits',
  topPeriod: 'reddit_music_player_top_period',
  volume: 'reddit_music_player_volume',
} as const

function _loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue
  }
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return
  }
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
  after: null,
  currentIndex: -1,
  currentSong: null,
  currentTime: 0,
  duration: 0,

  isPlaying: false,
  isTheatreMode: false,
  loading: false,

  mobileView: 'playlist',

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
      nextIndex += 1
    }

    // If no next song found, loop back to first playable song
    nextIndex = 0
    while (nextIndex < songs.length) {
      const song = songs[nextIndex]
      if (song?.playable) {
        get().setCurrentSong(nextIndex)
        return
      }
      nextIndex += 1
    }
  },

  pause: () => {
    set({ isPlaying: false })
  },

  // ========================================
  // PLAYBACK ACTIONS
  // ========================================
  play: () => {
    set({ isPlaying: true })
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
      prevIndex -= 1
    }
  },
  searchQuery: null,

  seekTo: time => {
    set({ currentTime: time })
  },
  selectedSubreddits: ['listentothis'], // Static default

  setAfter: after => {
    set({ after })
  },

  setCurrentSong: index => {
    const { songs } = get()
    const song = songs.at(index)

    if (!song) {
      return
    }

    set({
      currentIndex: index,
      currentSong: song,
      currentTime: 0,
      duration: 0,
      isPlaying: song.playable,
    })
  },

  setCurrentTime: time => {
    set({ currentTime: time })
  },

  setDuration: duration => {
    if (duration > 0 && Number.isFinite(duration)) {
      set({ duration })
    }
  },

  setLoading: loading => {
    set({ loading })
  },

  // ========================================
  // UI ACTIONS
  // ========================================
  setMobileView: view => {
    set({ mobileView: view })
  },

  setSearchQuery: query => {
    set({ searchQuery: query })
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
    let newCurrentSong: Song | null = null
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
      currentIndex: newCurrentIndex,
      currentSong: newCurrentSong,
      currentTime: newCurrentTime,
      duration: newDuration,
      songs: uniqueSongs,
    })
  },

  setSortMethod: method => {
    set({ sortMethod: method })
    saveToStorage(STORAGE_KEYS.sortMethod, method)
  },

  setTheatreMode: enabled => {
    set({ isTheatreMode: enabled })
  },

  setTopPeriod: period => {
    set({ topPeriod: period })
    saveToStorage(STORAGE_KEYS.topPeriod, period)
  },

  setVolume: volume => {
    const clampedVolume = Math.max(0, Math.min(100, volume))
    set({ volume: clampedVolume })
    saveToStorage(STORAGE_KEYS.volume, clampedVolume)
  },

  shufflePlaylist: () => {
    const { songs, currentSong } = get()
    const shuffled = [...songs].sort(() => Math.random() - 0.5)

    // If there's a current song, find its new index in shuffled array
    if (currentSong) {
      const newIndex = shuffled.findIndex(song => song.id === currentSong.id)
      set({
        currentIndex: newIndex >= 0 ? newIndex : -1,
        songs: shuffled,
      })
    } else {
      set({ songs: shuffled })
    }
  },
  // ========================================
  // STATE (static defaults - NO localStorage here)
  // ========================================
  songs: [],
  sortMethod: 'hot', // Static default

  togglePlay: () => {
    set(state => ({ isPlaying: !state.isPlaying }))
  },

  toggleTheatreMode: () => {
    set(state => ({ isTheatreMode: !state.isTheatreMode }))
  },
  topPeriod: 'week', // Static default
  volume: 100, // Static default
}))
