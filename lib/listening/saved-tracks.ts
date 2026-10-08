import { isPlayableMusicLink } from '@/lib/community/ranking'
import { requestCommunityData } from '@/lib/community/reddit-client'
import type { Song } from '@/lib/store/player-store'
import { parseSong } from '@/lib/utils/song-utils'

const POST_ID_PATTERN = /^[a-z0-9]{1,13}$/i
const MAX_IDS = 100
const CACHE_MS = 5 * 60_000
const MAX_CACHE_KEYS = 20
const DELETED_VALUES = new Set(['[deleted]', '[removed]'])

type RequestData = (path: string, params: URLSearchParams) => Promise<unknown>

/** Accept post IDs only, never caller-supplied Reddit paths or fullnames. */
export function parseSavedTrackIds(value: string | null): string[] | null {
  if (!value || value.length > MAX_IDS * 14) {
    return null
  }
  const ids = value.split(',')
  if (ids.length > MAX_IDS || ids.some(id => !POST_ID_PATTERN.test(id))) {
    return null
  }
  return [...new Set(ids.map(id => id.toLowerCase()))]
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/** Reject unavailable posts before they can restore stale bookmark metadata. */
export function parseSavedTracks(value: unknown, ids: string[]): Song[] {
  const { children } = record(record(value).data)
  if (!Array.isArray(children)) {
    return []
  }
  const requested = new Set(ids)
  const songs = new Map<string, Song>()
  for (const child of children) {
    const data = record(record(child).data)
    if (
      typeof data.id !== 'string' ||
      !requested.has(data.id) ||
      typeof data.title !== 'string' ||
      DELETED_VALUES.has(data.title) ||
      DELETED_VALUES.has(String(data.author)) ||
      DELETED_VALUES.has(String(data.selftext)) ||
      typeof data.subreddit !== 'string' ||
      typeof data.created_utc !== 'number' ||
      !Number.isFinite(data.created_utc) ||
      data.created_utc <= 0 ||
      !isPlayableMusicLink(data)
    ) {
      continue
    }
    const song = parseSong({
      ...data,
      domain: new URL(String(data.url)).hostname.toLowerCase(),
      media: undefined,
      selftext: undefined,
    })
    if (song.playable) {
      songs.set(song.id, song)
    }
  }
  return ids.map(id => songs.get(id)).filter((song): song is Song => song !== undefined)
}

export function createSavedTrackReader({
  request = requestCommunityData,
  now = Date.now,
}: {
  request?: RequestData
  now?: () => number
} = {}) {
  const cache = new Map<string, { expiresAt: number; songs: Song[] }>()
  const pending = new Map<string, Promise<Song[]>>()

  return async (ids: string[]): Promise<Song[]> => {
    const canonicalIds = [...ids].sort()
    const key = canonicalIds.join(',')
    const cached = cache.get(key)
    if (cached && cached.expiresAt > now()) {
      return parseOrder(cached.songs, ids)
    }
    const inFlight = pending.get(key)
    if (inFlight) {
      return parseOrder(await inFlight, ids)
    }
    const load = (async () => {
      const response = await request(
        '/api/info',
        new URLSearchParams({ id: canonicalIds.map(id => `t3_${id}`).join(',') })
      )
      const songs = parseSavedTracks(response, canonicalIds)
      if (cache.size >= MAX_CACHE_KEYS) {
        const oldest = cache.keys().next().value
        if (oldest !== undefined) {
          cache.delete(oldest)
        }
      }
      cache.set(key, { expiresAt: now() + CACHE_MS, songs })
      return songs
    })()
    pending.set(key, load)
    try {
      return parseOrder(await load, ids)
    } finally {
      pending.delete(key)
    }
  }
}

function parseOrder(songs: Song[], ids: string[]): Song[] {
  const byId = new Map(songs.map(song => [song.id, song]))
  return ids.map(id => byId.get(id)).filter((song): song is Song => song !== undefined)
}

export const readSavedTracks = createSavedTrackReader()
