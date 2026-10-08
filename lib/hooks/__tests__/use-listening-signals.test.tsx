import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { useListeningSignals } from '@/lib/hooks/use-listening-signals'
import { useListeningStore } from '@/lib/store/listening-store'
import { type Song, usePlayerStore } from '@/lib/store/player-store'

const song = {
  author: 'listener',
  id: 'initial',
  playable: true,
  subreddit: 'indie',
  title: 'Initial track',
  type: 'youtube',
  url: 'https://www.youtube.com/watch?v=initial',
} as Song
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const originalActEnvironment = Object.getOwnPropertyDescriptor(
  globalThis,
  'IS_REACT_ACT_ENVIRONMENT'
)
let clock = 0
let clockSpy: ReturnType<typeof spyOn<typeof performance, 'now'>>
let renderer: ReactTestRenderer | undefined
let payload: string | null

function SignalsHarness() {
  useListeningSignals()
  return null
}

beforeEach(() => {
  clock = 0
  clockSpy = spyOn(performance, 'now').mockImplementation(() => clock)
  payload = null
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => payload,
      setItem: (_key: string, value: string) => {
        payload = value
      },
    },
  })
  useListeningStore.setState({
    enabled: true,
    events: [],
    hydrated: false,
    observedAt: {},
    recentSongs: [],
    savedSongIds: [],
    savedSongs: [],
  })
  usePlayerStore.setState({
    currentIndex: 0,
    currentSong: song,
    currentTime: 10,
    duration: 100,
    failedSongIds: [],
    isPlaying: true,
    listingCursorId: song.id,
    naturalEndRevision: 0,
    playbackError: null,
    playbackSource: 'listing',
    queueSongs: [],
    repeatMode: 'off',
    seekRevision: 0,
    songs: [song],
  })
})

function restoreGlobal(name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor)
  } else {
    Reflect.deleteProperty(globalThis, name)
  }
}

afterEach(async () => {
  await act(() => renderer?.unmount())
  renderer = undefined
  clockSpy.mockRestore()
  restoreGlobal('localStorage', originalStorage)
  restoreGlobal('IS_REACT_ACT_ENVIRONMENT', originalActEnvironment)
  useListeningStore.setState({
    enabled: true,
    events: [],
    hydrated: false,
    observedAt: {},
    recentSongs: [],
    savedSongIds: [],
    savedSongs: [],
  })
})

async function mount() {
  await act(() => {
    renderer = create(<SignalsHarness />)
  })
}

async function progress(seconds: number, elapsed: number) {
  await act(() => {
    clock += elapsed * 1000
    usePlayerStore.getState().setCurrentTime(seconds)
  })
}

test('initial active playback is observed immediately after hydration without counting earlier time', async () => {
  await mount()
  await progress(39, 29)
  expect(useListeningStore.getState().events).toEqual([])
  await progress(40, 1)
  expect(useListeningStore.getState().events.map(event => event.type)).toEqual(['listen'])
  expect(useListeningStore.getState().events[0].seconds).toBe(30)
})

test('stored opt-out is honored before the first playback observation and enabling starts fresh', async () => {
  payload = JSON.stringify({ enabled: false, events: [] })
  await mount()
  expect(useListeningStore.getState().enabled).toBe(false)
  await progress(50, 40)
  expect(useListeningStore.getState().events).toEqual([])
  await act(() => useListeningStore.getState().setEnabled(true))
  await progress(79, 29)
  expect(useListeningStore.getState().events).toEqual([])
  await progress(80, 1)
  expect(useListeningStore.getState().events.map(event => event.type)).toEqual(['listen'])
})

test('explicit history reset discards accrued session time before collecting again', async () => {
  await mount()
  await progress(40, 30)
  expect(useListeningStore.getState().events).toHaveLength(1)
  await act(() => useListeningStore.getState().clearHistory())
  await progress(60, 20)
  expect(useListeningStore.getState().events).toEqual([])
  await progress(70, 10)
  expect(useListeningStore.getState().events.map(event => event.type)).toEqual(['listen'])
})

test('fresh initial feed metadata restores saved bookmark details without adding listening signals', async () => {
  payload = JSON.stringify({ enabled: true, events: [], savedSongIds: [song.id] })
  await mount()
  expect(useListeningStore.getState().savedSongIds).toEqual([song.id])
  expect(useListeningStore.getState().savedSongs[0].title).toBe('Initial track')
  expect(useListeningStore.getState().events).toEqual([])
})

test('a hook mounted before the first track arrives observes that track’s later progress', async () => {
  usePlayerStore.setState({ currentSong: null, currentTime: 0, isPlaying: false, songs: [] })
  await mount()
  await act(() => usePlayerStore.getState().setSongs([song]))
  await progress(30, 30)
  expect(useListeningStore.getState().events[0].songId).toBe(song.id)
})

test('unmounting stops collection and removes the listening preference subscription', async () => {
  await mount()
  await act(() => renderer?.unmount())
  renderer = undefined
  await progress(50, 40)
  await act(() => useListeningStore.getState().setEnabled(false))
  expect(useListeningStore.getState().events).toEqual([])
})
