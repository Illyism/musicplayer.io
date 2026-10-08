'use client'

import { create } from 'zustand'
import type { Song } from '@/lib/store/player-store'

const STORAGE_KEY = 'reddit_music_player_listening_v1'
const MAX_EVENTS = 500
const MAX_RECENT = 20
const MAX_SAVED = 100
const DAY_MS = 24 * 60 * 60 * 1000
const RETENTION_MS = 30 * DAY_MS
const METADATA_RETENTION_MS = 2 * DAY_MS
const EVENT_TYPES = ['listen', 'complete', 'skip', 'like', 'unlike'] as const

export type ListeningEventType = (typeof EVENT_TYPES)[number]

export interface ListeningEvent {
  at: number
  seconds: number
  songId: string
  subreddit: string
  type: ListeningEventType
}

/**
 * Signals retain IDs, communities and playback measurements for at most 30 days.
 * Cached tracks include titles, authors, artwork, source URLs and Reddit metadata,
 * expire after 48 hours, and never contain downloaded music or embedded media.
 * Explicit bookmark IDs remain saved until removed; fresh feed data restores their metadata.
 */
export interface ListeningState {
  clearHistory: () => void
  enabled: boolean
  events: ListeningEvent[]
  hydrate: () => void
  hydrated: boolean
  observedAt: Record<string, number>
  recentSongs: Song[]
  record: (song: Song, type: ListeningEventType, seconds?: number) => void
  refreshSongs: (songs: Song[]) => void
  savedSongIds: string[]
  savedSongs: Song[]
  setEnabled: (enabled: boolean) => void
  toggleSaved: (song: Song) => void
}

function persist(state: ListeningState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        enabled: state.enabled,
        events: state.events,
        observedAt: state.observedAt,
        recentSongs: state.recentSongs,
        savedSongIds: state.savedSongIds,
        savedSongs: state.savedSongs,
      })
    )
  } catch {
    // Device-local features remain usable when browser storage is unavailable.
  }
}

function activeEvents(events: ListeningEvent[], now: number): ListeningEvent[] {
  return events.filter(event => event.at <= now && now - event.at <= RETENTION_MS)
}

export function communityAffinities(events: ListeningEvent[], now = Date.now()) {
  const scores = new Map<string, number>()
  const weights = { complete: 3, like: 5, listen: 2, skip: -2, unlike: -5 }
  for (const event of activeEvents(events, now)) {
    const decay = 0.5 ** ((now - event.at) / (14 * DAY_MS))
    const key = event.subreddit.toLowerCase()
    scores.set(key, (scores.get(key) ?? 0) + weights[event.type] * decay)
  }
  return scores
}

export function recommendTracks(
  songs: Song[],
  events: ListeningEvent[],
  limit = 6,
  now = Date.now()
) {
  const retainedEvents = activeEvents(events, now)
  const affinities = communityAffinities(retainedEvents, now)
  const recentlyHeard = new Set(
    retainedEvents
      .filter(event => event.type === 'listen' || event.type === 'complete')
      .map(event => event.songId)
  )
  const skipped = new Set(
    retainedEvents.filter(event => event.type === 'skip').map(event => event.songId)
  )
  const seenIds = new Set<string>()
  return songs
    .filter(song => {
      if (!song.playable || skipped.has(song.id) || seenIds.has(song.id)) {
        return false
      }
      seenIds.add(song.id)
      return true
    })
    .map((song, index) => ({
      index,
      score:
        (affinities.get(song.subreddit.toLowerCase()) ?? 0) + (recentlyHeard.has(song.id) ? -3 : 1),
      song,
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(item => item.song)
}

function isWebUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function readSong(value: unknown): Song | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const item = value as Partial<Song>
  if (
    typeof item.id !== 'string' ||
    !item.id ||
    typeof item.title !== 'string' ||
    typeof item.subreddit !== 'string' ||
    !isWebUrl(item.url) ||
    typeof item.playable !== 'boolean' ||
    !['youtube', 'soundcloud', 'vimeo', 'mp3', 'none'].includes(item.type ?? '')
  ) {
    return null
  }
  return {
    author: typeof item.author === 'string' ? item.author : '',
    created_utc: Number.isFinite(item.created_utc) ? (item.created_utc ?? 0) : 0,
    domain: typeof item.domain === 'string' ? item.domain : new URL(item.url).hostname,
    downs: Number.isFinite(item.downs) ? (item.downs ?? 0) : 0,
    id: item.id,
    is_self: item.is_self === true,
    name: typeof item.name === 'string' ? item.name : `t3_${item.id}`,
    num_comments: Number.isFinite(item.num_comments) ? (item.num_comments ?? 0) : 0,
    permalink: typeof item.permalink === 'string' ? item.permalink : '',
    playable: item.playable,
    score: Number.isFinite(item.score) ? (item.score ?? 0) : 0,
    selftext: typeof item.selftext === 'string' ? item.selftext : undefined,
    subreddit: item.subreddit,
    thumbnail: isWebUrl(item.thumbnail) ? item.thumbnail : undefined,
    title: item.title,
    type: item.type ?? 'none',
    ups: Number.isFinite(item.ups) ? (item.ups ?? 0) : 0,
    url: item.url,
  }
}

function isEvent(value: unknown): value is ListeningEvent {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const item = value as Partial<ListeningEvent>
  return (
    typeof item.at === 'number' &&
    Number.isFinite(item.at) &&
    item.at >= 0 &&
    typeof item.seconds === 'number' &&
    Number.isFinite(item.seconds) &&
    item.seconds >= 0 &&
    typeof item.songId === 'string' &&
    typeof item.subreddit === 'string' &&
    EVENT_TYPES.some(type => type === item.type)
  )
}

function uniqueIds(ids: string[], limit: number): string[] {
  return [...new Set(ids.filter(Boolean))].slice(0, limit)
}

function pruneMetadata(
  state: Pick<ListeningState, 'observedAt' | 'recentSongs' | 'savedSongIds' | 'savedSongs'>,
  now: number
) {
  const savedSongIds = uniqueIds(state.savedSongIds, MAX_SAVED)
  const hasFreshMetadata = (song: Song) => {
    const at = state.observedAt[song.id]
    return Number.isFinite(at) && at <= now && now - at <= METADATA_RETENTION_MS
  }
  const seenRecent = new Set<string>()
  const recentSongs = state.recentSongs
    .filter(song => {
      if (!hasFreshMetadata(song) || seenRecent.has(song.id)) {
        return false
      }
      seenRecent.add(song.id)
      return true
    })
    .slice(0, MAX_RECENT)
  const savedById = new Map(state.savedSongs.map(song => [song.id, song]))
  const savedSongs = savedSongIds
    .map(id => savedById.get(id))
    .filter((song): song is Song => !!song && hasFreshMetadata(song))
  const observedAt: Record<string, number> = {}
  for (const song of [...recentSongs, ...savedSongs]) {
    observedAt[song.id] = state.observedAt[song.id]
  }
  return { observedAt, recentSongs, savedSongIds, savedSongs }
}

export const useListeningStore = create<ListeningState>((set, get) => ({
  clearHistory: () => {
    get().hydrate()
    const state = get()
    set({
      ...pruneMetadata({ ...state, recentSongs: [] }, Date.now()),
      events: [],
      recentSongs: [],
    })
    persist(get())
  },
  enabled: true,
  events: [],
  hydrate: () => {
    if (get().hydrated) {
      return
    }
    const now = Date.now()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const data: unknown = raw ? JSON.parse(raw) : null
      if (typeof data === 'object' && data !== null) {
        const stored = data as Record<string, unknown>
        const events = Array.isArray(stored.events)
          ? activeEvents(stored.events.filter(isEvent), now).slice(-MAX_EVENTS)
          : []
        const recentSongs = Array.isArray(stored.recentSongs)
          ? stored.recentSongs.map(readSong).filter((song): song is Song => song !== null)
          : []
        const savedSongs = Array.isArray(stored.savedSongs)
          ? stored.savedSongs.map(readSong).filter((song): song is Song => song !== null)
          : []
        const savedSongIds = Array.isArray(stored.savedSongIds)
          ? stored.savedSongIds.filter((id): id is string => typeof id === 'string')
          : savedSongs.map(song => song.id)
        const observedAt =
          typeof stored.observedAt === 'object' && stored.observedAt !== null
            ? (stored.observedAt as Record<string, number>)
            : {}
        set({
          ...pruneMetadata({ observedAt, recentSongs, savedSongIds, savedSongs }, now),
          enabled: stored.enabled !== false,
          events,
        })
      }
    } catch {
      // Corrupt or denied storage starts a clean device-local profile.
    }
    set({ hydrated: true })
    persist(get())
  },
  hydrated: false,
  observedAt: {},
  recentSongs: [],
  record: (song, type, seconds = 0) => {
    get().hydrate()
    if (!(get().enabled && Number.isFinite(seconds))) {
      return
    }
    const at = Date.now()
    const metadata = readSong(song)
    set(state => {
      const recentSongs =
        type === 'listen' && metadata
          ? [metadata, ...state.recentSongs.filter(item => item.id !== song.id)]
          : state.recentSongs.map(item => (item.id === song.id && metadata ? metadata : item))
      const savedSongs =
        metadata && state.savedSongIds.includes(song.id)
          ? [metadata, ...state.savedSongs.filter(item => item.id !== song.id)]
          : state.savedSongs
      return {
        ...pruneMetadata(
          {
            ...state,
            observedAt: metadata ? { ...state.observedAt, [song.id]: at } : state.observedAt,
            recentSongs,
            savedSongs,
          },
          at
        ),
        events: [
          ...activeEvents(state.events, at),
          { at, seconds: Math.max(0, seconds), songId: song.id, subreddit: song.subreddit, type },
        ].slice(-MAX_EVENTS),
      }
    })
    persist(get())
  },
  refreshSongs: songs => {
    const state = get()
    const wantedIds = new Set([...state.savedSongIds, ...state.recentSongs.map(song => song.id)])
    const fresh = new Map<string, Song>()
    for (const song of songs) {
      if (wantedIds.has(song.id)) {
        const metadata = readSong(song)
        if (metadata) {
          fresh.set(song.id, metadata)
        }
      }
    }
    if (!fresh.size) {
      return
    }
    const now = Date.now()
    const savedById = new Map(state.savedSongs.map(song => [song.id, song]))
    const observedAt = { ...state.observedAt }
    for (const id of fresh.keys()) {
      observedAt[id] = now
    }
    set({
      ...pruneMetadata(
        {
          ...state,
          observedAt,
          recentSongs: state.recentSongs.map(song => fresh.get(song.id) ?? song),
          savedSongs: state.savedSongIds
            .map(id => fresh.get(id) ?? savedById.get(id))
            .filter((song): song is Song => song !== undefined),
        },
        now
      ),
    })
    persist(get())
  },
  savedSongIds: [],
  savedSongs: [],
  setEnabled: enabled => {
    get().hydrate()
    set({ enabled })
    persist(get())
  },
  toggleSaved: song => {
    get().hydrate()
    const state = get()
    const saved = state.savedSongIds.includes(song.id)
    const at = Date.now()
    const metadata = readSong(song)
    set({
      ...pruneMetadata(
        {
          ...state,
          observedAt: metadata ? { ...state.observedAt, [song.id]: at } : state.observedAt,
          savedSongIds: saved
            ? state.savedSongIds.filter(id => id !== song.id)
            : [song.id, ...state.savedSongIds],
          savedSongs: saved
            ? state.savedSongs.filter(item => item.id !== song.id)
            : [...(metadata ? [metadata] : []), ...state.savedSongs],
        },
        at
      ),
    })
    get().record(song, saved ? 'unlike' : 'like')
    persist(get())
  },
}))
