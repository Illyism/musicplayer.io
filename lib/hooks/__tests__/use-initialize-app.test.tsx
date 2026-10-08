import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test'
import {
  PathnameContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { usePlayerHydration } from '../use-player-hydration'

// Import server-action dependencies without requiring real Reddit credentials.
const originalClientId = process.env.REDDIT_CLIENT_ID
const originalClientSecret = process.env.REDDIT_CLIENT_SECRET
process.env.REDDIT_CLIENT_ID ??= 'initializer-test-client'
process.env.REDDIT_CLIENT_SECRET ??= 'initializer-test-secret'
const redditAPI = await import('../use-reddit-api')
const { useInitializeApp } = await import('../use-initialize-app')
if (originalClientId === undefined) {
  delete process.env.REDDIT_CLIENT_ID
} else {
  process.env.REDDIT_CLIENT_ID = originalClientId
}
if (originalClientSecret === undefined) {
  delete process.env.REDDIT_CLIENT_SECRET
} else {
  process.env.REDDIT_CLIENT_SECRET = originalClientSecret
}

const storage = new Map<string, string>()
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const originalActEnvironment = Object.getOwnPropertyDescriptor(
  globalThis,
  'IS_REACT_ACT_ENVIRONMENT'
)
const fetchFromSubreddits = mock(
  async (_subreddits: string[], _pagination?: string) => [] as Song[]
)
let apiSpy: ReturnType<typeof spyOn<typeof redditAPI, 'useRedditAPI'>>
let renderer: ReactTestRenderer | undefined
let previousState = usePlayerStore.getState()

function InitializeHarness() {
  usePlayerHydration()
  useInitializeApp()
  return null
}

function routeTree(pathname: string, query = '') {
  return (
    <PathnameContext.Provider value={pathname}>
      <SearchParamsContext.Provider value={new URLSearchParams(query)}>
        <InitializeHarness />
      </SearchParamsContext.Provider>
    </PathnameContext.Provider>
  )
}

async function mount(pathname = '/', query = '') {
  await act(() => {
    renderer = create(routeTree(pathname, query))
  })
}

function restoreGlobal(name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor)
  } else {
    Reflect.deleteProperty(globalThis, name)
  }
}

beforeEach(() => {
  previousState = usePlayerStore.getState()
  storage.clear()
  fetchFromSubreddits.mockClear()
  fetchFromSubreddits.mockImplementation(async () => [] as Song[])
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => storage.get(key) ?? null },
  })
  apiSpy = spyOn(redditAPI, 'useRedditAPI').mockReturnValue({
    fetchFromSubreddits,
    fetchSearch: async () => [],
    fetchSongs: async () => [],
  })
  usePlayerStore.setState({
    ...usePlayerStore.getInitialState(),
    after: null,
    loading: false,
    searchQuery: null,
    songs: [],
  })
})

afterEach(async () => {
  await act(() => renderer?.unmount())
  renderer = undefined
  apiSpy.mockRestore()
  usePlayerStore.setState(previousState)
  restoreGlobal('localStorage', originalStorage)
  restoreGlobal('IS_REACT_ACT_ENVIRONMENT', originalActEnvironment)
})

test('the first root visit loads the default community after hydration', async () => {
  await mount()
  expect(fetchFromSubreddits).toHaveBeenCalledTimes(1)
  expect(fetchFromSubreddits).toHaveBeenCalledWith(['listentothis'])
})

test('a saved mix is hydrated before its first request', async () => {
  storage.set('reddit_music_player_subreddits', JSON.stringify(['ambient', 'jazz']))
  await mount()
  expect(fetchFromSubreddits).toHaveBeenCalledWith(['ambient', 'jazz'])
  expect(usePlayerStore.getState().selectedSubreddits).toEqual(['ambient', 'jazz'])
})

test('a saved empty mix clears stale tracks and pagination without defaulting', async () => {
  storage.set('reddit_music_player_subreddits', '[]')
  usePlayerStore.setState({ after: 'old-page', songs: [{ id: 'stale' } as Song] })
  await mount()
  expect(fetchFromSubreddits).not.toHaveBeenCalled()
  expect(usePlayerStore.getState().selectedSubreddits).toEqual([])
  expect(usePlayerStore.getState().songs).toEqual([])
  expect(usePlayerStore.getState().after).toBeNull()
})

test('a shared community route overrides storage, normalizes duplicates, and applies sort settings', async () => {
  storage.set('reddit_music_player_subreddits', JSON.stringify(['jazz']))
  await mount('/r/Music+ambient+MUSIC/', 'sort=top&t=all')
  expect(fetchFromSubreddits).toHaveBeenCalledTimes(1)
  expect(fetchFromSubreddits).toHaveBeenCalledWith(['music', 'ambient'])
  expect(usePlayerStore.getState().selectedSubreddits).toEqual(['music', 'ambient'])
  expect(usePlayerStore.getState().sortMethod).toBe('top')
  expect(usePlayerStore.getState().topPeriod).toBe('all')
})

test('legacy r query links accept the plus signs decoded by URLSearchParams', async () => {
  await mount('/', 'r=ambient+jazz&sort=new')
  expect(fetchFromSubreddits).toHaveBeenCalledWith(['ambient', 'jazz'])
  expect(usePlayerStore.getState().sortMethod).toBe('new')
})

test('invalid shared sort values leave hydrated preferences intact', async () => {
  storage.set('reddit_music_player_sort_method', JSON.stringify('top'))
  storage.set('reddit_music_player_top_period', JSON.stringify('month'))
  await mount('/r/ambient', 'sort=unsupported&t=forever')
  expect(usePlayerStore.getState().sortMethod).toBe('top')
  expect(usePlayerStore.getState().topPeriod).toBe('month')
  expect(fetchFromSubreddits).toHaveBeenCalledWith(['ambient'])
})

test('search navigation to root keeps the active search request and selection', async () => {
  await mount('/r/ambient')
  fetchFromSubreddits.mockClear()
  usePlayerStore.setState({ loading: true, searchQuery: 'new jazz', selectedSubreddits: [] })
  await act(() => renderer?.update(routeTree('/')))
  expect(fetchFromSubreddits).not.toHaveBeenCalled()
  expect(usePlayerStore.getState().searchQuery).toBe('new jazz')
  expect(usePlayerStore.getState().selectedSubreddits).toEqual([])
})

test('Back to an explicit community route exits an active search', async () => {
  usePlayerStore.setState({ searchQuery: 'new jazz', selectedSubreddits: [] })
  await mount()
  expect(fetchFromSubreddits).not.toHaveBeenCalled()
  await act(() => renderer?.update(routeTree('/r/ambient')))
  expect(usePlayerStore.getState().searchQuery).toBeNull()
  expect(usePlayerStore.getState().selectedSubreddits).toEqual(['ambient'])
  expect(fetchFromSubreddits).toHaveBeenCalledWith(['ambient'])
})

test('a route remount does not duplicate an in-flight Browse request for the same mix', async () => {
  storage.set('reddit_music_player_subreddits', JSON.stringify(['ambient']))
  usePlayerStore.setState({ loading: true, selectedSubreddits: ['ambient'] })
  await mount('/r/ambient')
  expect(fetchFromSubreddits).not.toHaveBeenCalled()
  expect(usePlayerStore.getState().selectedSubreddits).toEqual(['ambient'])
})

test('changing only shared sort parameters reloads the same community', async () => {
  await mount('/r/ambient')
  fetchFromSubreddits.mockClear()
  await act(() => renderer?.update(routeTree('/r/ambient', 'sort=top&t=year')))
  expect(fetchFromSubreddits).toHaveBeenCalledTimes(1)
  expect(fetchFromSubreddits).toHaveBeenCalledWith(['ambient'])
  expect(usePlayerStore.getState().sortMethod).toBe('top')
  expect(usePlayerStore.getState().topPeriod).toBe('year')
})
