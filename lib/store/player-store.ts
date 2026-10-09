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
  failedSongIds: string[]

  // Playback
  isPlaying: boolean
  isTheatreMode: boolean
  listingCursorId: string | null
  loading: boolean

  // UI
  mobileView: 'browse' | 'playlist' | 'player' | 'library'
  naturalEndRevision: number
  playbackError: string | null
  playbackSource: 'listing' | 'queue' | null
  queueOpen: boolean
  queueSongs: Song[]
  repeatMode: 'off' | 'all' | 'one'
  searchQuery: string | null
  seekRevision: number
  selectedSubreddits: string[]
  // Playlist
  songs: Song[]
  sortMethod: 'hot' | 'new' | 'top'
  topPeriod: 'day' | 'week' | 'month' | 'year' | 'all'
  volume: number
}

export interface PlayerActions {
  addSongs: (songs: Song[]) => void
  clearQueue: () => void
  cycleRepeatMode: () => void
  enqueueSong: (song: Song, placement: 'next' | 'last') => void
  failCurrentSong: (songId: string, message: string) => void
  moveQueuedSong: (id: string, direction: 'up' | 'down') => void
  next: () => void
  onEnded: () => void
  pause: () => void

  // Playback actions
  play: () => void
  playQueuedSong: (id: string) => void
  previous: () => void
  removeQueuedSong: (id: string) => void
  seekTo: (time: number) => void
  setAfter: (after: string | null) => void
  setCurrentSong: (index: number) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setLoading: (loading: boolean) => void

  // UI actions
  setMobileView: (view: PlayerState['mobileView']) => void
  setQueueOpen: (open: boolean) => void
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

function uniqueSongsById(songs: Song[]): Song[] {
  const seen = new Set<string>()
  return songs.filter(song => {
    if (seen.has(song.id)) {
      return false
    }
    seen.add(song.id)
    return true
  })
}

function listingCursorIndex(state: PlayerState): number {
  const cursorId =
    state.listingCursorId ?? (state.playbackSource === 'queue' ? null : state.currentSong?.id)
  return cursorId ? state.songs.findIndex(song => song.id === cursorId) : -1
}

function availableSong(song: Song, failedSongIds: string[]): boolean {
  return song.playable && !failedSongIds.includes(song.id)
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  addSongs: newSongs => {
    set(state => ({ songs: uniqueSongsById([...state.songs, ...newSongs]) }))
  },
  after: null,

  clearQueue: () => {
    set({ queueSongs: [] })
  },
  currentIndex: -1,
  currentSong: null,
  currentTime: 0,

  cycleRepeatMode: () => {
    set(state => ({
      repeatMode: ({ all: 'one', off: 'all', one: 'off' } as const)[state.repeatMode],
    }))
  },
  duration: 0,

  enqueueSong: (song, placement) => {
    if (!song.playable) {
      return
    }
    set(state => {
      const remaining = state.queueSongs.filter(queued => queued.id !== song.id)
      return {
        queueSongs: placement === 'next' ? [song, ...remaining] : [...remaining, song],
      }
    })
  },

  failCurrentSong: (songId, message) => {
    const state = get()
    if (state.currentSong?.id !== songId || state.failedSongIds.includes(songId)) {
      return
    }
    set({ failedSongIds: [...state.failedSongIds, songId] })
    if (state.isPlaying) {
      get().next()
    }
    set({ playbackError: message })
  },
  failedSongIds: [],

  isPlaying: false,
  isTheatreMode: false,
  listingCursorId: null,
  loading: false,

  mobileView: 'playlist',

  moveQueuedSong: (id, direction) => {
    set(state => {
      const index = state.queueSongs.findIndex(song => song.id === id)
      const destination = index + (direction === 'up' ? -1 : 1)
      if (index < 0 || destination < 0 || destination >= state.queueSongs.length) {
        return state
      }
      const reordered = [...state.queueSongs]
      ;[reordered[index], reordered[destination]] = [reordered[destination], reordered[index]]
      return { queueSongs: reordered }
    })
  },
  naturalEndRevision: 0,

  next: () => {
    const state = get()
    const queuedSong = state.queueSongs.find(song => availableSong(song, state.failedSongIds))
    if (queuedSong) {
      const queuedIndex = state.queueSongs.findIndex(song => song.id === queuedSong.id)
      set({ queueSongs: state.queueSongs.slice(queuedIndex) })
      get().playQueuedSong(queuedSong.id)
      return
    }
    if (state.queueSongs.length) {
      set({ queueSongs: [] })
    }

    const cursorIndex = listingCursorIndex(state)
    const nextIndex = state.songs.findIndex(
      (song, index) => index > cursorIndex && availableSong(song, state.failedSongIds)
    )
    if (nextIndex >= 0) {
      get().setCurrentSong(nextIndex)
      return
    }
    if (state.repeatMode === 'all') {
      const firstIndex = state.songs.findIndex(song => availableSong(song, state.failedSongIds))
      if (firstIndex >= 0) {
        get().setCurrentSong(firstIndex)
        return
      }
    }
    set({ isPlaying: false })
  },

  onEnded: () => {
    const state = get()
    set({ naturalEndRevision: state.naturalEndRevision + 1 })
    if (
      state.repeatMode === 'one' &&
      state.currentSong &&
      availableSong(state.currentSong, state.failedSongIds)
    ) {
      set({ currentTime: 0, isPlaying: true, playbackError: null })
      return
    }
    get().next()
  },

  pause: () => {
    set({ isPlaying: false })
  },

  // ========================================
  // PLAYBACK ACTIONS
  // ========================================
  play: () => {
    set({ isPlaying: true, playbackError: null })
  },
  playbackError: null,
  playbackSource: null,

  playQueuedSong: id => {
    const state = get()
    const song = state.queueSongs.find(queued => queued.id === id)
    if (!song?.playable) {
      return
    }
    set({
      currentIndex: -1,
      currentSong: song,
      currentTime: 0,
      duration: 0,
      failedSongIds: state.failedSongIds.filter(failedId => failedId !== id),
      isPlaying: true,
      listingCursorId: state.songs[listingCursorIndex(state)]?.id ?? null,
      playbackError: null,
      playbackSource: 'queue',
      queueSongs: state.queueSongs.filter(queued => queued.id !== id),
    })
  },

  previous: () => {
    const state = get()
    const cursorIndex = listingCursorIndex(state)
    let prevIndex = state.playbackSource === 'queue' ? cursorIndex : cursorIndex - 1
    while (prevIndex >= 0) {
      const song = state.songs[prevIndex]
      if (song && availableSong(song, state.failedSongIds)) {
        get().setCurrentSong(prevIndex)
        return
      }
      prevIndex -= 1
    }
    if (state.repeatMode === 'all') {
      const lastIndex = state.songs.findLastIndex(song => availableSong(song, state.failedSongIds))
      if (lastIndex >= 0) {
        get().setCurrentSong(lastIndex)
      }
    }
  },
  queueOpen: false,
  queueSongs: [],

  removeQueuedSong: id => {
    set(state => ({ queueSongs: state.queueSongs.filter(song => song.id !== id) }))
  },
  repeatMode: 'off',
  searchQuery: null,
  seekRevision: 0,

  seekTo: time => {
    if (!Number.isFinite(time)) {
      return
    }
    set(state => ({ currentTime: Math.max(0, time), seekRevision: state.seekRevision + 1 }))
  },
  selectedSubreddits: ['listentothis'], // Static default

  setAfter: after => {
    set({ after })
  },

  setCurrentSong: index => {
    const { songs } = get()
    if (index < 0 || index >= songs.length) {
      return
    }
    const song = songs.at(index)

    if (!song) {
      return
    }

    set({
      currentIndex: index,
      currentSong: song,
      currentTime: 0,
      duration: 0,
      failedSongIds: get().failedSongIds.filter(id => id !== song.id),
      isPlaying: song.playable,
      listingCursorId: song.id,
      playbackError: null,
      playbackSource: 'listing',
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

  setQueueOpen: queueOpen => {
    set({ queueOpen })
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
    const uniqueSongs = uniqueSongsById(songs)
    if (state.currentSong) {
      const currentIndex =
        state.playbackSource === 'queue'
          ? -1
          : uniqueSongs.findIndex(song => song.id === state.currentSong?.id)
      const cursorId =
        state.listingCursorId ?? (state.playbackSource === 'queue' ? null : state.currentSong.id)
      set({
        currentIndex,
        listingCursorId: uniqueSongs.some(song => song.id === cursorId) ? cursorId : null,
        songs: uniqueSongs,
      })
      return
    }

    const firstIndex = uniqueSongs.findIndex(song => availableSong(song, state.failedSongIds))
    const firstSong = uniqueSongs[firstIndex] ?? null
    set({
      currentIndex: firstIndex,
      currentSong: firstSong,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      listingCursorId: firstSong?.id ?? null,
      playbackError: null,
      playbackSource: firstSong ? 'listing' : null,
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
    const state = get()
    const { songs, currentSong } = state
    const shuffled = [...songs].sort(() => Math.random() - 0.5)

    // If there's a current song, find its new index in shuffled array
    if (currentSong) {
      const newIndex = shuffled.findIndex(song => song.id === currentSong.id)
      set({
        currentIndex: state.playbackSource === 'queue' ? -1 : newIndex,
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
    set(state => ({ isPlaying: !state.isPlaying, playbackError: null }))
  },

  toggleTheatreMode: () => {
    set(state => ({ isTheatreMode: !state.isTheatreMode }))
  },
  topPeriod: 'week', // Static default
  volume: 100, // Static default
}))
