import type { Song } from '@/lib/store/player-store'

function decodeHtmlEntities(url: string): string {
  return url
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
}

function normalizeThumbnailUrl(thumbnail?: string, previewUrl?: string): string | undefined {
  let url = previewUrl || thumbnail
  if (!url || url === 'self' || url === 'default' || url === 'nsfw' || url === 'spoiler') {
    return undefined
  }

  url = decodeHtmlEntities(url)

  if (url.startsWith('http:')) {
    url = url.replace('http:', 'https:')
  } else if (url.startsWith('//')) {
    url = `https:${url}`
  }

  return url.startsWith('https://') ? url : undefined
}

const YOUTUBE_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)(?<id>[^&\n?#]+)/u,
  /youtube\.com\/watch\?.*v=(?<id>[^&\n?#]+)/u,
]
const VIMEO_ID_REGEX = /vimeo\.com\/(?<id>\d+)/u
const HOST_PREFIX_REGEX = /^(?:www|m)\./u
const REDDIT_CDN_REGEX = /(?:^|\.)(?:redd\.it|redditmedia\.com|redditstatic\.com)$/iu

export function isRedditHostedImage(url: string): boolean {
  try {
    return REDDIT_CDN_REGEX.test(new URL(url).hostname)
  } catch {
    return REDDIT_CDN_REGEX.test(url)
  }
}

function sanitizeHttpUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string' || !rawUrl) {
    return ''
  }
  try {
    const parsed = new URL(rawUrl)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? rawUrl : ''
  } catch {
    return ''
  }
}

function sanitizeRedditPermalink(rawPermalink: unknown): string {
  if (typeof rawPermalink !== 'string') {
    return ''
  }
  if (
    (rawPermalink.startsWith('/r/') || rawPermalink.startsWith('/user/')) &&
    !rawPermalink.startsWith('//') &&
    !rawPermalink.includes('//') &&
    !rawPermalink.includes('\\') &&
    !rawPermalink.includes('?') &&
    !rawPermalink.includes('#') &&
    !rawPermalink.split('/').some(segment => segment === '.' || segment === '..')
  ) {
    return rawPermalink
  }
  return ''
}

export function parseSong(data: any): Song {
  const thumbnail = normalizeThumbnailUrl(data.thumbnail, data.preview?.images?.[0]?.source?.url)
  const type = mediaType(data)

  return {
    author: data.author,
    created_ago: formatTimeAgo(new Date(data.created_utc * 1000)),
    created_utc: data.created_utc,
    domain: data.domain,
    id: data.id,
    name: data.name,
    permalink: sanitizeRedditPermalink(data.permalink),
    playable: type !== 'none',
    score: data.score || 0,
    selftext: data.selftext,
    subreddit: data.subreddit,
    thumbnail,
    title: data.title,
    type,
    url: sanitizeHttpUrl(data.url),
  }
}

const MEDIA_TYPE_BY_DOMAIN: Record<string, Song['type']> = {
  'm.youtube.com': 'youtube',
  'soundcloud.com': 'soundcloud',
  'vimeo.com': 'vimeo',
  'www.soundcloud.com': 'soundcloud',
  'www.vimeo.com': 'vimeo',
  'www.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'youtube.com': 'youtube',
}

function mediaType(data: any): Song['type'] {
  const url = sanitizeHttpUrl(data.url)
  if (!url) {
    return 'none'
  }
  const byDomain = MEDIA_TYPE_BY_DOMAIN[data.domain?.toLowerCase() ?? '']
  if (byDomain) {
    return byDomain
  }
  return url.toLowerCase().endsWith('.mp3') ? 'mp3' : 'none'
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  const intervals = {
    day: 86_400,
    hour: 3600,
    minute: 60,
    month: 2_592_000,
    week: 604_800,
    year: 31_536_000,
  }

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit)
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`
    }
  }

  return 'just now'
}

export function parsePlayableSongs(posts: unknown): Song[] {
  if (!Array.isArray(posts)) {
    return []
  }
  return posts
    .filter(post => post?.data && !post.data.is_self && mediaType(post.data) !== 'none')
    .map(post => parseSong(post.data))
}

export function extractYouTubeId(url: string): string | null {
  if (!url) {
    return null
  }

  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

export function extractVimeoId(url: string): string | null {
  if (!url) {
    return null
  }

  const match = url.match(VIMEO_ID_REGEX)
  return match?.[1] || null
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || Number.isNaN(seconds)) {
    return '0:00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function getPlatformName(domain: string): string {
  const normalizedDomain = domain.toLowerCase().replace(HOST_PREFIX_REGEX, '')

  const platforms: Record<string, string> = {
    'soundcloud.com': 'SoundCloud',
    'vimeo.com': 'Vimeo',
    'youtu.be': 'YouTube',
    'youtube.com': 'YouTube',
  }

  return platforms[normalizedDomain] || domain
}
