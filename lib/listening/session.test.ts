import { expect, test } from 'bun:test'
import { createListeningSession, type ListeningSnapshot } from '@/lib/listening/session'
import type { Song } from '@/lib/store/player-store'

const song = { id: 'first', playable: true, title: 'First', type: 'youtube' } as Song
const second = { ...song, id: 'second', title: 'Second' }

function session(initial: Partial<ListeningSnapshot> = {}) {
  let snapshot: ListeningSnapshot = {
    currentSong: song,
    currentTime: 0,
    duration: 100,
    failedSongIds: [],
    isPlaying: true,
    naturalEndRevision: 0,
    playbackError: null,
    seekRevision: 0,
    ...initial,
  }
  let clock = 0
  const tracker = createListeningSession(snapshot, clock)
  return {
    reset: () => tracker.reset(snapshot, clock),
    update: (changes: Partial<ListeningSnapshot>, elapsed: number, enabled = true) => {
      snapshot = { ...snapshot, ...changes }
      clock += elapsed
      return tracker.update(snapshot, clock, enabled)
    },
  }
}

test('30 seconds of advancing playback records one listen and 80% records one completion', () => {
  const tracker = session()
  expect(tracker.update({ currentTime: 29 }, 29_000)).toEqual([])
  expect(tracker.update({ currentTime: 30 }, 1000).map(signal => signal.type)).toEqual(['listen'])
  expect(tracker.update({ currentTime: 79 }, 49_000)).toEqual([])
  expect(tracker.update({ currentTime: 80 }, 1000).map(signal => signal.type)).toEqual(['complete'])
  expect(tracker.update({ currentTime: 90 }, 10_000)).toEqual([])
})

test('a short track does not lower the 30-second listening threshold', () => {
  const tracker = session({ duration: 20 })
  const signals = tracker.update({ currentTime: 16 }, 16_000)
  expect(signals.map(signal => signal.type)).toEqual(['complete'])
})

test('forward and backward seeks do not count playback or emit duplicate listens', () => {
  const tracker = session()
  expect(tracker.update({ currentTime: 10 }, 10_000)).toEqual([])
  expect(tracker.update({ currentTime: 90, seekRevision: 1 }, 1000)).toEqual([])
  expect(tracker.update({ currentTime: 91 }, 1000)).toEqual([])
  expect(tracker.update({ currentTime: 0, seekRevision: 2 }, 1000)).toEqual([])
  expect(tracker.update({ currentTime: 19 }, 19_000).map(signal => signal.type)).toEqual(['listen'])
  expect(tracker.update({ currentTime: 0, seekRevision: 3 }, 1000)).toEqual([])
  expect(tracker.update({ currentTime: 30 }, 30_000)).toEqual([])
})

test('small seeks within the elapsed wall-clock window are still excluded', () => {
  const tracker = session()
  tracker.update({ currentTime: 28 }, 28_000)
  expect(tracker.update({ currentTime: 30, seekRevision: 1 }, 2000)).toEqual([])
  expect(tracker.update({ currentTime: 32 }, 2000).map(signal => signal.type)).toEqual(['listen'])
})

test('buffering, paused progress and autoplay rejection cannot create listens or skips', () => {
  const tracker = session({ isPlaying: false })
  expect(tracker.update({ currentTime: 40 }, 40_000)).toEqual([])
  expect(tracker.update({ isPlaying: true }, 1000)).toEqual([])
  expect(tracker.update({ currentTime: 44 }, 4000)).toEqual([])
  expect(tracker.update({ isPlaying: false, playbackError: 'Autoplay blocked' }, 1000)).toEqual([])
  expect(tracker.update({ currentSong: second, currentTime: 0 }, 1000)).toEqual([])
})

test('a progress jump larger than elapsed time cannot fake a listen', () => {
  const tracker = session()
  expect(tracker.update({ currentTime: 90 }, 1000)).toEqual([])
  expect(tracker.update({ currentTime: 91 }, 1000)).toEqual([])
  const signals = tracker.update({ currentSong: second, currentTime: 0 }, 1000)
  expect(signals).toEqual([])
})

test('manual track changes record early skips only between 3 and 15 actual seconds', () => {
  for (const seconds of [2, 3, 14, 15]) {
    const tracker = session()
    tracker.update({ currentTime: seconds }, seconds * 1000)
    const signals = tracker.update({ currentSong: second, currentTime: 0 }, 1000)
    expect(signals.map(signal => signal.type)).toEqual(seconds >= 3 && seconds < 15 ? ['skip'] : [])
  }
})

test('failed tracks and natural completion never count as early skips', () => {
  const failed = session()
  failed.update({ currentTime: 8 }, 8000)
  failed.update({ failedSongIds: ['first'] }, 0)
  expect(failed.update({ currentSong: second, currentTime: 0 }, 0)).toEqual([])
  const ended = session({ duration: 10 })
  ended.update({ currentTime: 8 }, 8000)
  expect(
    ended.update({ currentSong: second, currentTime: 0, naturalEndRevision: 1 }, 2000)
  ).toEqual([])
})

test('repeat-one starts a new listening session after an actual natural end', () => {
  const tracker = session({ duration: 40 })
  expect(tracker.update({ currentTime: 32 }, 32_000).map(signal => signal.type)).toEqual([
    'listen',
    'complete',
  ])
  expect(tracker.update({ currentTime: 0, naturalEndRevision: 1 }, 8000)).toEqual([])
  expect(tracker.update({ currentTime: 32 }, 32_000).map(signal => signal.type)).toEqual([
    'listen',
    'complete',
  ])
})

test('a seek back after completion preserves per-session deduplication', () => {
  const tracker = session({ duration: 40 })
  tracker.update({ currentTime: 32 }, 32_000)
  expect(tracker.update({ currentTime: 0, seekRevision: 1 }, 1000)).toEqual([])
  expect(tracker.update({ currentTime: 32 }, 32_000)).toEqual([])
})

test('disabled collection and explicit reset discard earlier partial listening', () => {
  const tracker = session()
  tracker.update({ currentTime: 20 }, 20_000)
  tracker.update({ currentTime: 30 }, 10_000, false)
  expect(tracker.update({ currentTime: 50 }, 20_000)).toEqual([])
  tracker.reset()
  expect(tracker.update({ currentTime: 60 }, 10_000)).toEqual([])
  expect(tracker.update({ currentTime: 80 }, 20_000).map(signal => signal.type)).toEqual(['listen'])
})

test('mounting with an already active track does not count earlier playback', () => {
  const tracker = session({ currentTime: 60 })
  expect(tracker.update({ currentTime: 80 }, 20_000)).toEqual([])
  expect(tracker.update({ currentTime: 90 }, 10_000).map(signal => signal.type)).toEqual(['listen'])
})
