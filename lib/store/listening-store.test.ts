import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import {
  communityAffinities,
  type ListeningEvent,
  recommendTracks,
  useListeningStore,
} from '@/lib/store/listening-store'
import type { Song } from '@/lib/store/player-store'

const STORAGE_KEY = 'reddit_music_player_listening_v1'
const NOW = 1_800_000_000_000
const DAY = 24 * 60 * 60 * 1000
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
let stored: Map<string, string>
let clock: ReturnType<typeof spyOn<typeof Date, 'now'>>

function song(id: string, subreddit = 'indie'): Song {
  return {
    author: 'listener',
    created_utc: 1_700_000_000,
    domain: 'youtube.com',
    downs: 0,
    id,
    is_self: false,
    media: { embedded: 'not needed for playback' },
    name: `t3_${id}`,
    num_comments: 3,
    permalink: `/r/${subreddit}/comments/${id}/track/`,
    playable: true,
    score: 12,
    subreddit,
    thumbnail: 'https://i.redd.it/artwork.jpg',
    title: `Track ${id}`,
    type: 'youtube',
    ups: 12,
    url: `https://www.youtube.com/watch?v=${id}`,
  }
}

function event(
  songId: string,
  type: ListeningEvent['type'] = 'listen',
  at = NOW,
  subreddit = 'indie'
): ListeningEvent {
  return { at, seconds: 30, songId, subreddit, type }
}

function resetStore() {
  useListeningStore.setState({
    enabled: true,
    events: [],
    hydrated: false,
    observedAt: {},
    recentSongs: [],
    savedSongIds: [],
    savedSongs: [],
  })
}

beforeEach(() => {
  resetStore()
  clock = spyOn(Date, 'now').mockReturnValue(NOW)
  stored = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  })
})

afterEach(() => {
  clock.mockRestore()
  if (originalStorage) {
    Object.defineProperty(globalThis, 'localStorage', originalStorage)
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
  resetStore()
})

test('history keeps the newest 500 signals and 20 deduplicated recent tracks', () => {
  const state = useListeningStore.getState()
  for (let index = 0; index < 525; index += 1) {
    state.record(song(String(index)), 'listen', 31)
  }
  expect(useListeningStore.getState().events).toHaveLength(500)
  expect(useListeningStore.getState().events[0].songId).toBe('25')
  expect(useListeningStore.getState().recentSongs).toHaveLength(20)
  state.record(song('520'), 'listen', 32)
  expect(useListeningStore.getState().recentSongs[0].id).toBe('520')
  expect(useListeningStore.getState().recentSongs.filter(item => item.id === '520')).toHaveLength(1)
  expect(useListeningStore.getState().recentSongs).toHaveLength(20)
})

test('hydration rejects corrupt, future, expired and malformed signals', () => {
  stored.set(
    STORAGE_KEY,
    JSON.stringify({
      events: [
        event('fresh'),
        event('expired', 'like', NOW - 31 * DAY),
        event('future', 'like', NOW + DAY),
        { ...event('bad-seconds'), seconds: -1 },
        { ...event('bad-type'), type: 'invented' },
        null,
      ],
    })
  )
  useListeningStore.getState().hydrate()
  expect(useListeningStore.getState().events.map(item => item.songId)).toEqual(['fresh'])
  expect(useListeningStore.getState().hydrated).toBe(true)
})

test('invalid JSON starts a usable profile and sanitized browser storage', () => {
  stored.set(STORAGE_KEY, '{invalid')
  useListeningStore.getState().hydrate()
  expect(useListeningStore.getState().events).toEqual([])
  expect(useListeningStore.getState().hydrated).toBe(true)
  expect(() => JSON.parse(stored.get(STORAGE_KEY) ?? '')).not.toThrow()
})

test('turning collection off preserves bookmarks but records no listening or like signals', () => {
  const state = useListeningStore.getState()
  state.record(song('first'), 'listen', 30)
  state.setEnabled(false)
  state.record(song('second'), 'listen', 100)
  state.toggleSaved(song('saved'))
  expect(useListeningStore.getState().events).toHaveLength(1)
  expect(useListeningStore.getState().recentSongs.map(item => item.id)).toEqual(['first'])
  expect(useListeningStore.getState().savedSongIds).toEqual(['saved'])
  resetStore()
  state.hydrate()
  expect(useListeningStore.getState().enabled).toBe(false)
  expect(useListeningStore.getState().savedSongIds).toEqual(['saved'])
})

test('resetting history preserves saved bookmarks and their fresh metadata', () => {
  const state = useListeningStore.getState()
  state.toggleSaved(song('saved'))
  state.record(song('heard'), 'listen', 31)
  state.clearHistory()
  expect(useListeningStore.getState().events).toEqual([])
  expect(useListeningStore.getState().recentSongs).toEqual([])
  expect(useListeningStore.getState().savedSongIds).toEqual(['saved'])
  expect(useListeningStore.getState().savedSongs[0].title).toBe('Track saved')
  expect(Object.keys(useListeningStore.getState().observedAt)).toEqual(['saved'])
})

test('saved tracks are deduplicated and limited to 100 explicit bookmarks', () => {
  const state = useListeningStore.getState()
  for (let index = 0; index < 105; index += 1) {
    state.toggleSaved(song(String(index)))
  }
  expect(useListeningStore.getState().savedSongIds).toHaveLength(100)
  expect(useListeningStore.getState().savedSongIds).not.toContain('0')
  expect(useListeningStore.getState().savedSongs).toHaveLength(100)
  state.toggleSaved(song('104'))
  expect(useListeningStore.getState().savedSongIds).not.toContain('104')
  expect(useListeningStore.getState().events.at(-1)?.type).toBe('unlike')
})

test('48-hour metadata expiry preserves bookmark IDs and fresh feed data restores cached details', () => {
  stored.set(
    STORAGE_KEY,
    JSON.stringify({
      observedAt: { fresh: NOW - 47 * 60 * 60 * 1000, stale: NOW - 49 * 60 * 60 * 1000 },
      recentSongs: [song('fresh'), song('stale')],
      savedSongIds: ['stale', 'fresh'],
      savedSongs: [song('stale'), song('fresh')],
    })
  )
  const state = useListeningStore.getState()
  state.hydrate()
  expect(useListeningStore.getState().recentSongs.map(item => item.id)).toEqual(['fresh'])
  expect(useListeningStore.getState().savedSongs.map(item => item.id)).toEqual(['fresh'])
  expect(useListeningStore.getState().savedSongIds).toEqual(['stale', 'fresh'])
  state.refreshSongs([{ ...song('stale'), title: 'Freshly checked title' }])
  expect(useListeningStore.getState().savedSongs[0].title).toBe('Freshly checked title')
  expect(useListeningStore.getState().observedAt.stale).toBe(NOW)
})

test('legacy records without capture timestamps expire their metadata without deleting saves', () => {
  stored.set(
    STORAGE_KEY,
    JSON.stringify({ recentSongs: [song('old')], savedSongs: [song('saved')] })
  )
  useListeningStore.getState().hydrate()
  expect(useListeningStore.getState().recentSongs).toEqual([])
  expect(useListeningStore.getState().savedSongs).toEqual([])
  expect(useListeningStore.getState().savedSongIds).toEqual(['saved'])
})

test('persisted tracks keep disclosed playback metadata but discard embedded media and unsafe URLs', () => {
  const state = useListeningStore.getState()
  state.toggleSaved(song('saved'))
  resetStore()
  state.hydrate()
  const [saved] = useListeningStore.getState().savedSongs
  expect(saved.author).toBe('listener')
  expect(saved.title).toBe('Track saved')
  expect(saved.url).toBe('https://www.youtube.com/watch?v=saved')
  expect(saved.permalink).toContain('/comments/saved/')
  expect(saved.media).toBeUndefined()
  resetStore()
  stored.set(
    STORAGE_KEY,
    JSON.stringify({
      observedAt: { unsafe: NOW },
      recentSongs: [{ ...song('unsafe'), url: 'javascript:bad()' }],
      savedSongs: [],
    })
  )
  state.hydrate()
  expect(useListeningStore.getState().recentSongs).toEqual([])
})

test('storage denial never breaks collection or explicit saves', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    },
  })
  const state = useListeningStore.getState()
  expect(() => state.hydrate()).not.toThrow()
  expect(() => state.record(song('heard'), 'listen', 32)).not.toThrow()
  expect(() => state.toggleSaved(song('saved'))).not.toThrow()
  expect(useListeningStore.getState().savedSongIds).toEqual(['saved'])
  expect(useListeningStore.getState().events).toHaveLength(2)
})

test('new records prune 30-day events and refuse non-finite playback measurements', () => {
  const state = useListeningStore.getState()
  state.hydrate()
  useListeningStore.setState({ events: [event('expired', 'listen', NOW - 31 * DAY)] })
  state.record(song('bad'), 'listen', Number.NaN)
  expect(useListeningStore.getState().events).toHaveLength(1)
  state.record(song('valid'), 'listen', 30)
  expect(useListeningStore.getState().events.map(item => item.songId)).toEqual(['valid'])
})

test('community affinities honor likes, unlikes, skips, recency and case-insensitive names', () => {
  const affinities = communityAffinities(
    [
      event('liked', 'like', NOW, 'INDIE'),
      event('unliked', 'unlike', NOW, 'indie'),
      event('skipped', 'skip', NOW, 'indie'),
      event('old-listen', 'listen', NOW - 14 * DAY, 'ambient'),
      event('expired', 'complete', NOW - 31 * DAY, 'metal'),
      event('future', 'like', NOW + DAY, 'metal'),
    ],
    NOW
  )
  expect(affinities.get('indie')).toBe(-2)
  expect(affinities.get('ambient')).toBeCloseTo(1)
  expect(affinities.has('metal')).toBe(false)
})

test('track recommendations favor positive communities, avoid skips and penalize recently heard tracks', () => {
  const candidates = [
    song('heard', 'rock'),
    song('novel', 'rock'),
    song('skipped', 'jazz'),
    song('other', 'jazz'),
  ]
  const events = [
    event('favorite', 'like', NOW, 'rock'),
    event('heard', 'listen', NOW, 'rock'),
    event('skipped', 'skip', NOW, 'jazz'),
  ]
  expect(recommendTracks(candidates, events, 6, NOW).map(item => item.id)).toEqual([
    'novel',
    'heard',
    'other',
  ])
  expect(
    recommendTracks(candidates, [event('skipped', 'skip', NOW - 31 * DAY)], 6, NOW)
  ).toContainEqual(candidates[2])
})

test('track recommendations ignore unsupported and duplicate candidates and respect an empty limit', () => {
  const first = song('first')
  const unsupported = { ...song('unsupported'), playable: false }
  expect(recommendTracks([first, first, unsupported], [], 6, NOW).map(item => item.id)).toEqual([
    'first',
  ])
  expect(recommendTracks([first], [], 0, NOW)).toEqual([])
})
