import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { useMediaSession } from '../use-media-session'

const firstSong = {
  id: 'first',
  playable: true,
  subreddit: 'listentothis',
  thumbnail: 'https://example.com/art.jpg',
  title: 'First song',
  type: 'mp3',
  url: 'https://example.com/audio.mp3',
} as Song
const queuedSong = { ...firstSong, id: 'queued', title: 'Queued song' }
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
const originalWindow = globalThis.window
const originalMetadata = globalThis.MediaMetadata
let renderer: ReactTestRenderer | undefined
let handlers: Map<MediaSessionAction, MediaSessionActionHandler | null>
let session: any
let audio: { currentTime: number }

function MediaSessionHarness() {
  useMediaSession()
  return null
}

beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  handlers = new Map()
  session = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: mock(
      (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
        handlers.set(action, handler)
      }
    ),
    setPositionState: mock(() => undefined),
  }
  audio = { currentTime: 0 }
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaSession: session },
  })
  ;(globalThis as any).MediaMetadata = class {
    constructor(metadata: MediaMetadataInit) {
      Object.assign(this, metadata)
    }
  }
  ;(globalThis as any).window = { __audioPlayer: audio }
  usePlayerStore.setState({
    currentIndex: 0,
    currentSong: firstSong,
    currentTime: 30,
    duration: 100,
    failedSongIds: [],
    isPlaying: true,
    listingCursorId: firstSong.id,
    playbackSource: 'listing',
    queueSongs: [],
    repeatMode: 'off',
    songs: [firstSong],
  })
})

afterEach(async () => {
  await act(() => renderer?.unmount())
  renderer = undefined
  if (originalNavigator) {
    Object.defineProperty(globalThis, 'navigator', originalNavigator)
  } else {
    Reflect.deleteProperty(globalThis, 'navigator')
  }
  ;(globalThis as any).window = originalWindow
  ;(globalThis as any).MediaMetadata = originalMetadata
})

async function mountSession() {
  await act(() => {
    renderer = create(<MediaSessionHarness />)
  })
}

test('device media metadata and playback state follow the active track', async () => {
  await mountSession()
  expect(session.metadata.title).toBe('First song')
  expect(session.metadata.artist).toBe('r/listentothis')
  expect(session.playbackState).toBe('playing')
  await act(() => usePlayerStore.getState().pause())
  expect(session.playbackState).toBe('paused')
  expect(session.setPositionState).toHaveBeenCalledWith({
    duration: 100,
    playbackRate: 1,
    position: 30,
  })
})

test('device seek clamps to duration and seeks the audio reference even outside the opener document', async () => {
  await mountSession()
  await act(async () => {
    await handlers.get('seekto')?.({ action: 'seekto', seekTime: 200 })
  })
  expect(audio.currentTime).toBe(100)
  expect(usePlayerStore.getState().currentTime).toBe(100)
  await act(async () => {
    await handlers.get('seekbackward')?.({ action: 'seekbackward', seekOffset: 150 })
  })
  expect(audio.currentTime).toBe(0)
})

test('device next uses the user queue, and unmount removes registered actions', async () => {
  await mountSession()
  await act(() => usePlayerStore.getState().enqueueSong(queuedSong, 'next'))
  await act(() => handlers.get('nexttrack')?.({ action: 'nexttrack' }))
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued')
  expect(session.metadata.title).toBe('Queued song')
  await act(() => renderer?.unmount())
  renderer = undefined
  expect(handlers.get('nexttrack')).toBeNull()
  expect(handlers.get('play')).toBeNull()
  expect(session.metadata).toBeNull()
})

test('unsupported device actions do not prevent supported controls from registering', async () => {
  session.setActionHandler = mock(
    (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      if (action === 'seekto') {
        throw new Error('Unsupported action')
      }
      handlers.set(action, handler)
    }
  )
  await mountSession()
  await act(() => handlers.get('pause')?.({ action: 'pause' }))
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})
