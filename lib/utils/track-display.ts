import type { Song } from '@/lib/store/player-store'

const TITLE_SEPARATOR = /^(.+?)\s+(?:--|—|–|-)\s+(.+)$/
const TRAILING_METADATA = /\s*\[[^\]]+\]\s*(?:\((?:19|20)\d{2}\))?\s*$/

/** Format common Artist — Track titles while retaining the original in the source record. */
export function trackDisplay(song: Pick<Song, 'title'>) {
  const title = song.title.replace(TRAILING_METADATA, '').trim() || song.title
  const parts = title.match(TITLE_SEPARATOR)
  return { artist: parts?.[1]?.trim() ?? null, title: parts?.[2]?.trim() ?? title }
}
