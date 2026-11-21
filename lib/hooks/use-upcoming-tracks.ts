'use client'

import { useShallow } from 'zustand/react/shallow'
import { usePlayerStore } from '@/lib/store/player-store'

export function useUpcomingTracks() {
  const { failedSongIds, listingCursorId, queueSongs, repeatMode, songs } = usePlayerStore(
    useShallow(state => ({
      failedSongIds: state.failedSongIds,
      listingCursorId: state.listingCursorId,
      queueSongs: state.queueSongs,
      repeatMode: state.repeatMode,
      songs: state.songs,
    }))
  )
  const cursorIndex = songs.findIndex(song => song.id === listingCursorId)
  const availableTracks = songs
    .map((song, index) => ({ index, song }))
    .filter(({ song }) => song.playable && !failedSongIds.includes(song.id))
  const nextTracks = availableTracks.filter(({ index }) => index > cursorIndex)
  if (repeatMode === 'all' && cursorIndex >= 0) {
    nextTracks.push(...availableTracks.filter(({ index }) => index <= cursorIndex))
  }

  return { nextTracks, queueSongs }
}
