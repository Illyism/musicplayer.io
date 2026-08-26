// lib/store.ts
import { create } from 'zustand'

export interface Song {
  author: string
  created_ago?: string
  created_utc: number
  domain: string
  downs: number
  id: string
  is_self: boolean
  media?: any
  name: string
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

interface PlaylistStore {
  addMessage: (message: {
    type: 'error' | 'success' | 'info'
    text: string
    buttons?: Array<{
      text: string
      className?: string
      url?: string
      callback?: () => void
      action?: 'close'
    }>
  }) => void
  addSongs: (songs: Song[]) => void
  after: string | null
  backward: () => void
  currentIndex: number
  currentSong: Song | null
  currentSongId: string | null // Track current song ID to prevent stale updates
  currentTime: number
  duration: number
  forward: () => void
  // Player state
  isPlaying: boolean
  loading: boolean
  // Messages
  messages: Array<{
    id: string
    type: 'error' | 'success' | 'info'
    text: string
    buttons?: Array<{
      text: string
      className?: string
      url?: string
      callback?: () => void
      action?: 'close'
    }>
  }>
  // Mobile navigation
  mobileView: 'browse' | 'playlist' | 'song'
  playPause: () => void
  removeMessage: (id: string) => void
  searchQuery: string | null // Reddit search query
  seekTo: (time: number) => void
  selectedSubreddits: string[]
  setAfter: (after: string | null) => void
  setCurrentSong: (index: number) => void
  setCurrentTime: (time: number, songId?: string) => void
  setDuration: (duration: number, songId?: string) => void
  setIsPlaying: (isPlaying: boolean) => void
  setLoading: (loading: boolean) => void
  setMobileView: (view: 'browse' | 'playlist' | 'song') => void
  setSearchQuery: (query: string | null) => void

  setSelectedSubreddits: (subreddits: string[]) => void
  setSongs: (songs: Song[]) => void
  setSortMethod: (method: 'hot' | 'new' | 'top') => void
  setTopMethod: (method: 'day' | 'week' | 'month' | 'year' | 'all') => void
  setVolume: (volume: number) => void
  songs: Song[]
  sortMethod: 'hot' | 'new' | 'top'
  topMethod: 'day' | 'week' | 'month' | 'year' | 'all'
  volume: number
}

// Load from localStorage on initialization
const _loadSubredditsFromStorage = (): string[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const stored = localStorage.getItem('redditMusicPlayer_subreddits')
    if (stored) {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch (e) {
    console.error('Failed to load subreddits from localStorage:', e)
  }
  return []
}

// Load sort method from localStorage
const _loadSortMethodFromStorage = (): 'hot' | 'new' | 'top' => {
  if (typeof window === 'undefined') {
    return 'hot'
  }
  try {
    const stored = localStorage.getItem('redditMusicPlayer_sortMethod')
    if (stored && (stored === 'hot' || stored === 'new' || stored === 'top')) {
      return stored
    }
  } catch (e) {
    console.error('Failed to load sort method from localStorage:', e)
  }
  return 'hot'
}

// Load top method from localStorage
const _loadTopMethodFromStorage = (): 'day' | 'week' | 'month' | 'year' | 'all' => {
  if (typeof window === 'undefined') {
    return 'week'
  }
  try {
    const stored = localStorage.getItem('redditMusicPlayer_topMethod')
    if (stored && ['day', 'week', 'month', 'year', 'all'].includes(stored)) {
      return stored as 'day' | 'week' | 'month' | 'year' | 'all'
    }
  } catch (e) {
    console.error('Failed to load top method from localStorage:', e)
  }
  return 'week'
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  addMessage: message => {
    const id = Math.random().toString(36).slice(7)
    set(state => ({
      messages: [...state.messages, { ...message, id }],
    }))
    // Auto-remove success/info messages after 5 seconds
    if (message.type !== 'error') {
      setTimeout(() => {
        usePlaylistStore.getState().removeMessage(id)
      }, 5000)
    }
  },
  addSongs: songs => set(state => ({ songs: [...state.songs, ...songs] })),
  after: null,
  backward: () => {
    const state = get()
    if (state.currentIndex > 0) {
      let prevIndex = state.currentIndex - 1
      let prevSong = state.songs[prevIndex]
      // Skip non-playable songs
      while (prevSong && !prevSong.playable && prevIndex > 0) {
        prevIndex -= 1
        prevSong = state.songs[prevIndex]
      }
      if (prevSong?.playable) {
        set({
          currentIndex: prevIndex,
          currentSong: prevSong,
          currentSongId: prevSong.id,
          currentTime: 0,
          duration: 0,
          isPlaying: true, // Auto-play previous song
        })
      }
    }
  },
  currentIndex: -1,
  currentSong: null,
  currentSongId: null,
  currentTime: 0,
  duration: 0,
  forward: () => {
    const state = get()
    if (state.currentIndex < state.songs.length - 1) {
      let nextIndex = state.currentIndex + 1
      let nextSong = state.songs[nextIndex]
      // Skip non-playable songs
      while (nextSong && !nextSong.playable && nextIndex < state.songs.length - 1) {
        nextIndex += 1
        nextSong = state.songs[nextIndex]
      }
      if (nextSong?.playable) {
        set({
          currentIndex: nextIndex,
          currentSong: nextSong,
          currentSongId: nextSong.id,
          currentTime: 0,
          duration: 0,
          isPlaying: true, // Auto-play next song
        })
      }
    }
  },
  // Player state
  isPlaying: false,
  loading: false,
  messages: [],
  // Mobile navigation
  mobileView: 'playlist',
  playPause: () => set(state => ({ isPlaying: !state.isPlaying })),
  removeMessage: id =>
    set(state => ({
      messages: state.messages.filter(m => m.id !== id),
    })),
  searchQuery: null,
  seekTo: time => set({ currentTime: time }),
  selectedSubreddits: [], // Initialize empty, load from localStorage on client
  setAfter: after => set({ after }),
  setCurrentSong: index =>
    set(state => {
      const song = state.songs[index] || null
      return {
        currentIndex: index,
        currentSong: song,
        currentSongId: song?.id || null,
        currentTime: 0,
        duration: 0,
        // Always auto-play when clicking a song (if playable)
        isPlaying: song?.playable,
      }
    }),
  setCurrentTime: (time, songId) => {
    const state = get()
    // Only update if this update is for the current song (prevent stale updates from old players)
    if (!songId || songId === state.currentSongId) {
      set({ currentTime: time })
    }
  },
  setDuration: (duration, songId) => {
    const state = get()
    // Only update if this update is for the current song (prevent stale updates from old players)
    if (!songId || songId === state.currentSongId) {
      set({ duration })
    }
  },
  setIsPlaying: isPlaying => set({ isPlaying }),
  setLoading: loading => set({ loading }),
  setMobileView: view => set({ mobileView: view }),
  setSearchQuery: query => set({ searchQuery: query }),

  setSelectedSubreddits: subreddits => {
    set({ selectedSubreddits: subreddits })
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('redditMusicPlayer_subreddits', JSON.stringify(subreddits))
      } catch (e) {
        console.error('Failed to save subreddits to localStorage:', e)
      }
    }
  },
  setSongs: songs => set({ currentIndex: -1, currentSong: null, currentSongId: null, songs }),
  setSortMethod: method => {
    set({ sortMethod: method })
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('redditMusicPlayer_sortMethod', method)
      } catch (e) {
        console.error('Failed to save sort method to localStorage:', e)
      }
    }
  },
  setTopMethod: method => {
    set({ topMethod: method })
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('redditMusicPlayer_topMethod', method)
      } catch (e) {
        console.error('Failed to save top method to localStorage:', e)
      }
    }
  },
  setVolume: volume => set({ volume }),
  songs: [],
  sortMethod: 'hot', // Initialize with default, load from localStorage on client
  topMethod: 'week', // Initialize with default, load from localStorage on client
  volume: 100,
}))
