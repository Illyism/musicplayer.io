import type { Song } from '@/lib/store/player-store'

const TITLE_SEPARATOR = /^(?<artist>.+?)\s+(?:--|—|–|-)\s+(?<track>.+)$/u
const TRAILING_METADATA = /\s*\[[^\]]+\]\s*(?:\((?:19|20)\d{2}\))?\s*$/u
const GENRE_TAG = /\[(?<genre>[^\]]+)\]/u
const YEAR_ONLY = /^(?:19|20)\d{2}$/u

export function trackDisplay(song: Pick<Song, 'title'>) {
  const title = song.title.replace(TRAILING_METADATA, '').trim() || song.title
  const parts = title.match(TITLE_SEPARATOR)
  const tag = song.title.match(GENRE_TAG)?.groups?.genre?.trim() ?? ''
  const genre = tag && !YEAR_ONLY.test(tag) ? tag : null
  return { artist: parts?.[1]?.trim() ?? null, genre, title: parts?.[2]?.trim() ?? title }
}
