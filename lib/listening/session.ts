import type { PlayerState, Song } from '@/lib/store/player-store'

export type ListeningSnapshot = Pick<
  PlayerState,
  | 'currentSong'
  | 'currentTime'
  | 'duration'
  | 'failedSongIds'
  | 'isPlaying'
  | 'naturalEndRevision'
  | 'playbackError'
  | 'seekRevision'
>

export interface SessionSignal {
  seconds: number
  song: Song
  type: 'listen' | 'complete' | 'skip'
}

/** Accumulates advancing media time, bounded by elapsed wall time, without counting seeks. */
export function createListeningSession(initial: ListeningSnapshot, initialClock: number) {
  let previous = initial
  let observedSong = initial.currentSong
  let seconds = 0
  let listened = false
  let completed = false
  let lastClock = initialClock

  const reset = (snapshot: ListeningSnapshot, clock: number) => {
    previous = snapshot
    observedSong = snapshot.currentSong
    seconds = 0
    listened = false
    completed = false
    lastClock = clock
  }

  const update = (snapshot: ListeningSnapshot, clock: number, enabled = true): SessionSignal[] => {
    const signals: SessionSignal[] = []
    if (!enabled) {
      reset(snapshot, clock)
      return signals
    }

    const naturalEnd = snapshot.naturalEndRevision !== previous.naturalEndRevision
    if (observedSong?.id !== snapshot.currentSong?.id) {
      if (
        observedSong &&
        seconds >= 3 &&
        seconds < 15 &&
        !naturalEnd &&
        !previous.failedSongIds.includes(observedSong.id) &&
        !previous.playbackError
      ) {
        signals.push({ seconds, song: observedSong, type: 'skip' })
      }
      reset(snapshot, clock)
      return signals
    }

    if (naturalEnd) {
      reset(snapshot, clock)
      return signals
    }

    const seeking = snapshot.seekRevision !== previous.seekRevision
    if (seeking) {
      previous = snapshot
      lastClock = clock
      return signals
    }

    if (snapshot.currentTime !== previous.currentTime) {
      const progress = snapshot.currentTime - previous.currentTime
      const wallTime = Math.max(0, (clock - lastClock) / 1000)
      if (
        previous.isPlaying &&
        snapshot.isPlaying &&
        progress > 0 &&
        Number.isFinite(progress) &&
        progress <= wallTime + 0.5 &&
        !snapshot.failedSongIds.includes(snapshot.currentSong?.id ?? '')
      ) {
        seconds += Math.min(progress, wallTime)
      }
      lastClock = clock
    } else if (snapshot.isPlaying !== previous.isPlaying) {
      lastClock = clock
    }

    if (observedSong && !snapshot.failedSongIds.includes(observedSong.id)) {
      if (!listened && seconds >= 30) {
        signals.push({ seconds, song: observedSong, type: 'listen' })
        listened = true
      }
      if (
        !completed &&
        Number.isFinite(snapshot.duration) &&
        snapshot.duration > 0 &&
        seconds >= snapshot.duration * 0.8
      ) {
        signals.push({ seconds, song: observedSong, type: 'complete' })
        completed = true
      }
    }
    previous = snapshot
    return signals
  }

  return { reset, update }
}
