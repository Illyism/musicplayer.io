import { beforeEach, expect, test } from 'bun:test'
import { type Song, usePlayerStore } from './player-store'

const songs = [
  { id: 'unsupported', playable: false, type: 'none' },
  { id: 'first', playable: true, type: 'youtube' },
  { id: 'second', playable: true, type: 'soundcloud' },
] as Song[]

beforeEach(() => {
  usePlayerStore.setState({
    currentIndex: -1,
    currentSong: null,
    currentTime: 0,
    duration: 0,
    failedSongIds: [],
    isPlaying: false,
    playbackError: null,
    songs: [],
  })
})

test('a new listing starts the first playable track without requiring a selection', () => {
  usePlayerStore.getState().setSongs(songs)
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().currentIndex).toBe(1)
  expect(usePlayerStore.getState().isPlaying).toBe(true)
})

test('refreshing a listing preserves a retained paused track and its position', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.setCurrentSong(2)
  state.setCurrentTime(42)
  state.pause()
  state.setSongs([...songs])
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  expect(usePlayerStore.getState().currentTime).toBe(42)
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})

test('pagination does not interrupt the current track', () => {
  const state = usePlayerStore.getState()
  state.setSongs([songs[1]])
  state.pause()
  state.addSongs([songs[2]])
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})

test('replacing a listing starts its first track and resets playback position', () => {
  const state = usePlayerStore.getState()
  state.setSongs([songs[1]])
  state.setCurrentTime(42)
  state.setSongs([songs[2]])
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  expect(usePlayerStore.getState().currentTime).toBe(0)
  expect(usePlayerStore.getState().isPlaying).toBe(true)
})

test('an empty or unplayable listing stops playback', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.setSongs([songs[0]])
  expect(usePlayerStore.getState().currentSong).toBeNull()
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  state.setSongs([])
  expect(usePlayerStore.getState().currentIndex).toBe(-1)
})
