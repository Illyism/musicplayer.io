import type { Song } from '@/lib/store/player-store'

const TITLE_SEPARATOR = /^(?<artist>.+?)\s+(?:--|—|–|-)\s+(?<track>.+)$/u
const TRAILING_METADATA = /\s*\[[^\]]+\]\s*(?:\((?:19|20)\d{2}\))?\s*$/u

export function trackDisplay(song: Pick<Song, 'title'>) {
  const title = song.title.replace(TRAILING_METADATA, '').trim() || song.title
  const parts = title.match(TITLE_SEPARATOR)
  return { artist: parts?.[1]?.trim() ?? null, title: parts?.[2]?.trim() ?? title }
}
