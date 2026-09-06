import type { Song } from '@/lib/store/player-store'

// ============================================================================
// SONG PARSER
// ============================================================================

/** Decode HTML entities in Reddit CDN URLs (e.g. &amp; → &) */
export function decodeHtmlEntities(url: string): string {
  return url
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
}

/** Normalize a Reddit thumbnail/preview URL for use in img/Image src */
export function normalizeThumbnailUrl(thumbnail?: string, previewUrl?: string): string | undefined {
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

// Module-level regexes (compiled once)
const YOUTUBE_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
]
const VIMEO_ID_REGEX = /vimeo\.com\/(\d+)/
const REDDIT_CDN_REGEX = /redd\.it/i

/** Reddit CDN blocks Next.js image optimization; load these directly */
export function isRedditHostedImage(url: string): boolean {
  return REDDIT_CDN_REGEX.test(url)
}

/**
 * Parse Reddit post data into Song object
 */
export function parseSong(data: any): Song {
  const thumbnail = normalizeThumbnailUrl(data.thumbnail, data.preview?.images?.[0]?.source?.url)

  // Determine media type and playability
  const { type, playable } = determineMediaType(data)

  return {
    author: data.author,
    created_ago: formatTimeAgo(new Date(data.created_utc * 1000)),
    created_utc: data.created_utc,
    domain: data.domain,
    downs: data.downs || 0,
    id: data.id,
    is_self: data.is_self,
    media: data.media,
    name: data.name, // Reddit fullname
    num_comments: data.num_comments || 0,
    permalink: data.permalink,
    playable,
    score: data.score || 0,
    selftext: data.selftext,
    subreddit: data.subreddit,
    thumbnail,
    title: data.title,
    type,
    ups: data.ups || 0,
    url: data.url,
  }
}

/**
 * Determine media type from post data
 */
function determineMediaType(data: any): {
  type: Song['type']
  playable: boolean
} {
  const domain = data.domain?.toLowerCase() || ''
  const url = data.url?.toLowerCase() || ''

  // YouTube
  if (
    domain === 'youtube.com' ||
    domain === 'youtu.be' ||
    domain === 'm.youtube.com' ||
    domain === 'www.youtube.com'
  ) {
    return { playable: true, type: 'youtube' }
  }

  // SoundCloud
  if (domain === 'soundcloud.com' || domain === 'www.soundcloud.com') {
    return { playable: true, type: 'soundcloud' }
  }

  // Vimeo
  if (domain === 'vimeo.com' || domain === 'www.vimeo.com') {
    return { playable: true, type: 'vimeo' }
  }

  // MP3
  if (url.endsWith('.mp3')) {
    return { playable: true, type: 'mp3' }
  }

  // Not playable
  return { playable: false, type: 'none' }
}

/**
 * Format timestamp as "X time ago"
 */
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

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

/**
 * Filter Reddit posts to only include playable media
 */
export function filterPlayableSongs(posts: any[]): any[] {
  if (!Array.isArray(posts)) {
    return []
  }

  return posts.filter(post => {
    if (!post?.data) {
      return false
    }

    const { data } = post

    // Exclude self posts
    if (data.is_self) {
      return false
    }

    const domain = data.domain?.toLowerCase() || ''
    const url = data.url?.toLowerCase() || ''

    // Check if it's a playable domain
    return (
      domain === 'youtube.com' ||
      domain === 'youtu.be' ||
      domain === 'm.youtube.com' ||
      domain === 'www.youtube.com' ||
      domain === 'soundcloud.com' ||
      domain === 'www.soundcloud.com' ||
      domain === 'vimeo.com' ||
      domain === 'www.vimeo.com' ||
      url.endsWith('.mp3')
    )
  })
}

// ============================================================================
// PLAYER UTILITIES
// ============================================================================

/**
 * Extract YouTube video ID from URL
 */
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

/**
 * Extract Vimeo video ID from URL
 */
export function extractVimeoId(url: string): string | null {
  if (!url) {
    return null
  }

  const match = url.match(VIMEO_ID_REGEX)
  return match?.[1] || null
}

/**
 * Format seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || Number.isNaN(seconds)) {
    return '0:00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format large numbers (e.g., 1234 -> 1.2k)
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Validate if URL is a valid media URL
 */
export function isValidMediaUrl(url: string): boolean {
  if (!url) {
    return false
  }

  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase().replace('www.', '')

    return (
      domain === 'youtube.com' ||
      domain === 'youtu.be' ||
      domain === 'soundcloud.com' ||
      domain === 'vimeo.com' ||
      url.toLowerCase().endsWith('.mp3')
    )
  } catch {
    return false
  }
}

/**
 * Get platform name from domain
 */
export function getPlatformName(domain: string): string {
  const normalizedDomain = domain.toLowerCase().replace('www.', '')

  const platforms: Record<string, string> = {
    'soundcloud.com': 'SoundCloud',
    'vimeo.com': 'Vimeo',
    'youtu.be': 'YouTube',
    'youtube.com': 'YouTube',
  }

  return platforms[normalizedDomain] || domain
}

/**
 * Generate a unique ID for a song (for React keys)
 */
export function generateSongKey(song: Song, index: number): string {
  return `${song.id}-${song.name}-${index}`
}

/**
 * Check if song is currently playing
 */
export function isSongPlaying(song: Song, currentSong: Song | null, isPlaying: boolean): boolean {
  return currentSong?.id === song.id && isPlaying
}

/**
 * Get song duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (!(seconds && Number.isFinite(seconds))) {
    return 'Unknown'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(currentTime: number, duration: number): number {
  if (!duration || duration === 0) {
    return 0
  }
  return Math.min(100, Math.max(0, (currentTime / duration) * 100))
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}
