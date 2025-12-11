import { create } from "zustand"

export interface Song {
  id: string
  name: string
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
  type: "youtube" | "soundcloud" | "vimeo" | "mp3" | "none"
  playable: boolean
  media?: any
}

interface PlaylistStore {
  songs: Song[]
  currentIndex: number
  currentSong: Song | null
  currentSongId: string | null // Track current song ID to prevent stale updates
  selectedSubreddits: string[]
  sortMethod: "hot" | "new" | "top"
  topMethod: "day" | "week" | "month" | "year" | "all"
  loading: boolean
  after: string | null
  searchQuery: string | null // Reddit search query
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
  // Player state
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  // Mobile navigation
  mobileView: "browse" | "playlist" | "song"
  
  setSelectedSubreddits: (subreddits: string[]) => void
  setSortMethod: (method: "hot" | "new" | "top") => void
  setTopMethod: (method: "day" | "week" | "month" | "year" | "all") => void
  setSongs: (songs: Song[]) => void
  addSongs: (songs: Song[]) => void
  setCurrentSong: (index: number) => void
  setLoading: (loading: boolean) => void
  setAfter: (after: string | null) => void
  setSearchQuery: (query: string | null) => void
  addMessage: (message: { type: 'error' | 'success' | 'info'; text: string; buttons?: Array<{ text: string; className?: string; url?: string; callback?: () => void; action?: 'close' }> }) => void
  removeMessage: (id: string) => void
  setIsPlaying: (isPlaying: boolean) => void
  setCurrentTime: (time: number, songId?: string) => void
  setDuration: (duration: number, songId?: string) => void
  setVolume: (volume: number) => void
  playPause: () => void
  forward: () => void
  backward: () => void
  seekTo: (time: number) => void
  setMobileView: (view: "browse" | "playlist" | "song") => void
}

// Load from localStorage on initialization
const loadSubredditsFromStorage = (): string[] => {
  if (typeof window === 'undefined') return []
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
const loadSortMethodFromStorage = (): "hot" | "new" | "top" => {
  if (typeof window === 'undefined') return "hot"
  try {
    const stored = localStorage.getItem('redditMusicPlayer_sortMethod')
    if (stored && (stored === "hot" || stored === "new" || stored === "top")) {
      return stored
    }
  } catch (e) {
    console.error('Failed to load sort method from localStorage:', e)
  }
  return "hot"
}

// Load top method from localStorage
const loadTopMethodFromStorage = (): "day" | "week" | "month" | "year" | "all" => {
  if (typeof window === 'undefined') return "week"
  try {
    const stored = localStorage.getItem('redditMusicPlayer_topMethod')
    if (stored && ["day", "week", "month", "year", "all"].includes(stored)) {
      return stored as "day" | "week" | "month" | "year" | "all"
    }
  } catch (e) {
    console.error('Failed to load top method from localStorage:', e)
  }
  return "week"
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  songs: [],
  currentIndex: -1,
  currentSong: null,
  currentSongId: null,
  selectedSubreddits: [], // Initialize empty, load from localStorage on client
  sortMethod: "hot", // Initialize with default, load from localStorage on client
  topMethod: "week", // Initialize with default, load from localStorage on client
  loading: false,
  after: null,
  searchQuery: null,
  messages: [],
  // Player state
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 100,
  // Mobile navigation
  mobileView: "playlist",
  
  setSelectedSubreddits: (subreddits) => {
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
  setSortMethod: (method) => {
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
  setTopMethod: (method) => {
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
  setSongs: (songs) => set({ songs, currentIndex: -1, currentSong: null, currentSongId: null }),
  addSongs: (songs) => set((state) => ({ songs: [...state.songs, ...songs] })),
  setCurrentSong: (index) => set((state) => {
    const song = state.songs[index] || null
    return {
      currentIndex: index,
      currentSong: song,
      currentSongId: song?.id || null,
      currentTime: 0,
      duration: 0,
      // Always auto-play when clicking a song (if playable)
      isPlaying: song !== null && song.playable,
    }
  }),
  setLoading: (loading) => set({ loading }),
  setAfter: (after) => set({ after }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  addMessage: (message) => {
    const id = Math.random().toString(36).substring(7)
    set((state) => ({
      messages: [...state.messages, { ...message, id }]
    }))
    // Auto-remove success/info messages after 5 seconds
    if (message.type !== 'error') {
      setTimeout(() => {
        usePlaylistStore.getState().removeMessage(id)
      }, 5000)
    }
  },
  removeMessage: (id) => set((state) => ({
    messages: state.messages.filter(m => m.id !== id)
  })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
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
  setVolume: (volume) => set({ volume }),
  playPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  forward: () => {
    const state = get()
    if (state.currentIndex < state.songs.length - 1) {
      let nextIndex = state.currentIndex + 1
      let nextSong = state.songs[nextIndex]
      // Skip non-playable songs
      while (nextSong && !nextSong.playable && nextIndex < state.songs.length - 1) {
        nextIndex++
        nextSong = state.songs[nextIndex]
      }
      if (nextSong && nextSong.playable) {
        set({ 
          currentIndex: nextIndex, 
          currentSong: nextSong,
          currentSongId: nextSong.id,
          currentTime: 0, 
          duration: 0,
          isPlaying: true // Auto-play next song
        })
      }
    }
  },
  backward: () => {
    const state = get()
    if (state.currentIndex > 0) {
      let prevIndex = state.currentIndex - 1
      let prevSong = state.songs[prevIndex]
      // Skip non-playable songs
      while (prevSong && !prevSong.playable && prevIndex > 0) {
        prevIndex--
        prevSong = state.songs[prevIndex]
      }
      if (prevSong && prevSong.playable) {
        set({ 
          currentIndex: prevIndex, 
          currentSong: prevSong,
          currentSongId: prevSong.id,
          currentTime: 0, 
          duration: 0,
          isPlaying: true // Auto-play previous song
        })
      }
    }
  },
  seekTo: (time) => set({ currentTime: time }),
  setMobileView: (view) => set({ mobileView: view }),
}))
