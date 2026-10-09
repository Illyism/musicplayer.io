import { afterEach, beforeEach, expect, test } from 'bun:test'
import { type Song, usePlayerStore } from './player-store'

const songs = [
  { id: 'unsupported', playable: false, title: 'Unsupported', type: 'none' },
  { id: 'first', playable: true, title: 'First', type: 'youtube' },
  { id: 'second', playable: true, title: 'Second', type: 'soundcloud' },
  { id: 'third', playable: true, title: 'Third', type: 'youtube' },
] as Song[]
const queuedSongs = [
  { id: 'queued-one', playable: true, title: 'Queued One', type: 'youtube' },
  { id: 'queued-two', playable: true, title: 'Queued Two', type: 'soundcloud' },
  { id: 'queued-three', playable: true, title: 'Queued Three', type: 'youtube' },
] as Song[]

function resetPlayer() {
  usePlayerStore.setState({
    currentIndex: -1,
    currentSong: null,
    currentTime: 0,
    duration: 0,
    failedSongIds: [],
    isPlaying: false,
    listingCursorId: null,
    naturalEndRevision: 0,
    playbackError: null,
    playbackSource: null,
    queueOpen: false,
    queueSongs: [],
    repeatMode: 'off',
    seekRevision: 0,
    songs: [],
  })
}

beforeEach(resetPlayer)
afterEach(resetPlayer)

test('a new listing selects the first playable track without starting playback', () => {
  usePlayerStore.getState().setSongs(songs)
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().currentIndex).toBe(1)
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})

test('refreshing a listing preserves a retained paused track and its position', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.setCurrentSong(2)
  state.setCurrentTime(42)
  state.setDuration(120)
  state.pause()
  state.setSongs([...songs])
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  expect(usePlayerStore.getState().currentTime).toBe(42)
  expect(usePlayerStore.getState().duration).toBe(120)
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})

test('pagination preserves playback and deduplicates within the incoming page', () => {
  const state = usePlayerStore.getState()
  state.setSongs([songs[1]])
  state.pause()
  state.addSongs([songs[2], songs[2], songs[1]])
  expect(usePlayerStore.getState().songs.map(song => song.id)).toEqual(['first', 'second'])
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})

test('changing the source list preserves current audio and resumes the new source on next', () => {
  const state = usePlayerStore.getState()
  state.setSongs([songs[1]])
  state.play()
  state.setCurrentTime(42)
  state.setSongs([songs[2]])
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().currentIndex).toBe(-1)
  expect(usePlayerStore.getState().currentTime).toBe(42)
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  expect(usePlayerStore.getState().currentTime).toBe(0)
})

test('clearing the source list preserves current audio until it ends', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.play()
  state.setSongs([])
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  state.onEnded()
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})

test('an initially unplayable list has no current track', () => {
  usePlayerStore.getState().setSongs([songs[0]])
  expect(usePlayerStore.getState().currentSong).toBeNull()
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})

test('play next moves an existing queue entry to the front without duplicating it', () => {
  const state = usePlayerStore.getState()
  state.enqueueSong(queuedSongs[0], 'last')
  state.enqueueSong(queuedSongs[1], 'last')
  state.enqueueSong(queuedSongs[1], 'next')
  expect(usePlayerStore.getState().queueSongs.map(song => song.id)).toEqual([
    'queued-two',
    'queued-one',
  ])
  state.enqueueSong(queuedSongs[1], 'last')
  expect(usePlayerStore.getState().queueSongs.map(song => song.id)).toEqual([
    'queued-one',
    'queued-two',
  ])
  state.enqueueSong(songs[0], 'next')
  expect(usePlayerStore.getState().queueSongs).toHaveLength(2)
})

test('removing or clearing pending queue entries does not interrupt current audio', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.play()
  state.enqueueSong(queuedSongs[0], 'last')
  state.enqueueSong(queuedSongs[1], 'last')
  state.removeQueuedSong(queuedSongs[0].id)
  expect(usePlayerStore.getState().queueSongs.map(song => song.id)).toEqual(['queued-two'])
  state.clearQueue()
  expect(usePlayerStore.getState().queueSongs).toEqual([])
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().isPlaying).toBe(true)
})

test('queue reorder swaps adjacent tracks and safely ignores boundary or missing moves', () => {
  const state = usePlayerStore.getState()
  for (const song of queuedSongs) {
    state.enqueueSong(song, 'last')
  }
  state.moveQueuedSong('queued-two', 'up')
  expect(usePlayerStore.getState().queueSongs.map(song => song.id)).toEqual([
    'queued-two',
    'queued-one',
    'queued-three',
  ])
  state.moveQueuedSong('queued-two', 'up')
  state.moveQueuedSong('queued-three', 'down')
  state.moveQueuedSong('missing', 'down')
  state.moveQueuedSong('queued-one', 'down')
  expect(usePlayerStore.getState().queueSongs.map(song => song.id)).toEqual([
    'queued-two',
    'queued-three',
    'queued-one',
  ])
})

test('next consumes the manual queue before returning to the source after its cursor', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.enqueueSong(queuedSongs[0], 'last')
  state.enqueueSong(queuedSongs[1], 'last')
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued-one')
  expect(usePlayerStore.getState().currentIndex).toBe(-1)
  expect(usePlayerStore.getState().listingCursorId).toBe('first')
  expect(usePlayerStore.getState().queueSongs.map(song => song.id)).toEqual(['queued-two'])
  state.onEnded()
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued-two')
  state.onEnded()
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  expect(usePlayerStore.getState().playbackSource).toBe('listing')
})

test('queue playback stays independent when browsing changes its source list', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.enqueueSong(queuedSongs[0], 'last')
  state.enqueueSong(queuedSongs[1], 'last')
  state.next()
  state.setCurrentTime(27)
  state.pause()
  state.setSongs([songs[3]])
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued-one')
  expect(usePlayerStore.getState().currentTime).toBe(27)
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  expect(usePlayerStore.getState().queueSongs.map(song => song.id)).toEqual(['queued-two'])
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued-two')
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('third')
})

test('playing a chosen queue entry removes only that entry and keeps the source cursor', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.enqueueSong(queuedSongs[0], 'last')
  state.enqueueSong(queuedSongs[1], 'last')
  state.playQueuedSong('queued-two')
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued-two')
  expect(usePlayerStore.getState().queueSongs.map(song => song.id)).toEqual(['queued-one'])
  state.previous()
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().queueSongs.map(song => song.id)).toEqual(['queued-one'])
})

test('queuing a source track still resumes after the previously playing source track', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.enqueueSong(songs[3], 'next')
  state.next()
  state.setSongs([...songs])
  expect(usePlayerStore.getState().currentSong?.id).toBe('third')
  expect(usePlayerStore.getState().currentIndex).toBe(-1)
  expect(usePlayerStore.getState().listingCursorId).toBe('first')
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
})

test('repeat off stops at the source end instead of wrapping', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.setCurrentSong(3)
  state.onEnded()
  expect(usePlayerStore.getState().currentSong?.id).toBe('third')
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('third')
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})

test('repeat all wraps the source and skips failed or unsupported tracks', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.cycleRepeatMode()
  state.setCurrentSong(3)
  usePlayerStore.setState({ failedSongIds: ['first'] })
  state.onEnded()
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  expect(usePlayerStore.getState().isPlaying).toBe(true)
})

test('repeat one replays natural completion but manual next consumes the queue', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.cycleRepeatMode()
  state.cycleRepeatMode()
  state.enqueueSong(queuedSongs[0], 'next')
  state.setCurrentTime(90)
  state.onEnded()
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().currentTime).toBe(0)
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  expect(usePlayerStore.getState().queueSongs).toHaveLength(1)
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued-one')
  state.cycleRepeatMode()
  expect(usePlayerStore.getState().repeatMode).toBe('off')
})

test('failed queue tracks skip to healthy queued entries even in repeat-one mode', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.cycleRepeatMode()
  state.cycleRepeatMode()
  state.enqueueSong(queuedSongs[0], 'next')
  state.enqueueSong(queuedSongs[1], 'last')
  state.next()
  state.failCurrentSong('queued-one', 'Unavailable')
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued-two')
  expect(usePlayerStore.getState().failedSongIds).toContain('queued-one')
  state.failCurrentSong('queued-one', 'Late stale error')
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued-two')
})

test('failure recovery stops when queue and source have no healthy tracks', () => {
  const state = usePlayerStore.getState()
  state.setSongs([songs[1]])
  state.play()
  state.enqueueSong(queuedSongs[0], 'last')
  state.failCurrentSong('first', 'Unavailable source')
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued-one')
  state.failCurrentSong('queued-one', 'Unavailable queue')
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  state.enqueueSong(queuedSongs[0], 'next')
  state.playQueuedSong('queued-one')
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  expect(usePlayerStore.getState().failedSongIds).not.toContain('queued-one')
})

test('a refreshed source resumes after its retained source cursor during queued playback', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.setCurrentSong(2)
  state.enqueueSong(queuedSongs[0], 'next')
  state.next()
  state.setSongs([songs[3], songs[2], songs[1]])
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
})

test('explicit seeking carries its own revision while provider progress stays separate', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.setCurrentTime(5)
  expect(usePlayerStore.getState().seekRevision).toBe(0)
  state.seekTo(10)
  expect(usePlayerStore.getState().currentTime).toBe(10)
  expect(usePlayerStore.getState().seekRevision).toBe(1)
  state.seekTo(-10)
  expect(usePlayerStore.getState().currentTime).toBe(0)
  expect(usePlayerStore.getState().seekRevision).toBe(2)
  state.seekTo(Number.NaN)
  expect(usePlayerStore.getState().seekRevision).toBe(2)
})

test('only natural completion advances the natural-end marker, including repeat-one', () => {
  const state = usePlayerStore.getState()
  state.setSongs(songs)
  state.next()
  expect(usePlayerStore.getState().naturalEndRevision).toBe(0)
  state.cycleRepeatMode()
  state.cycleRepeatMode()
  state.onEnded()
  expect(usePlayerStore.getState().naturalEndRevision).toBe(1)
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  expect(usePlayerStore.getState().isPlaying).toBe(true)
})
