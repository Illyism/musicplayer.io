import { Song } from '@/lib/store/player-store'

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
    url = 'https:' + url
  }

  return url.startsWith('https://') ? url : undefined
}

/** Reddit CDN blocks Next.js image optimization; load these directly */
export function isRedditHostedImage(url: string): boolean {
  return /redd\.it/i.test(url)
}

/**
 * Parse Reddit post data into Song object
 */
export function parseSong(data: any): Song {
  const thumbnail = normalizeThumbnailUrl(data.thumbnail, data.preview?.images?.[0]?.source?.url)

  // Determine media type and playability
  const { type, playable } = determineMediaType(data)

  return {
    id: data.id,
    name: data.name, // Reddit fullname
    title: data.title,
    author: data.author,
    url: data.url,
    domain: data.domain,
    thumbnail,
    score: data.score || 0,
    ups: data.ups || 0,
    downs: data.downs || 0,
    created_utc: data.created_utc,
    created_ago: formatTimeAgo(new Date(data.created_utc * 1000)),
    num_comments: data.num_comments || 0,
    subreddit: data.subreddit,
    permalink: data.permalink,
    is_self: data.is_self || false,
    selftext: data.selftext,
    selftext_html: data.selftext_html,
    type,
    playable,
    media: data.media,
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
    return { type: 'youtube', playable: true }
  }

  // SoundCloud
  if (domain === 'soundcloud.com' || domain === 'www.soundcloud.com') {
    return { type: 'soundcloud', playable: true }
  }

  // Vimeo
  if (domain === 'vimeo.com' || domain === 'www.vimeo.com') {
    return { type: 'vimeo', playable: true }
  }

  // MP3
  if (url.endsWith('.mp3')) {
    return { type: 'mp3', playable: true }
  }

  // Not playable
  return { type: 'none', playable: false }
}

/**
 * Format timestamp as "X time ago"
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
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
  if (!Array.isArray(posts)) return []

  return posts.filter(post => {
    if (!post?.data) return false

    const data = post.data

    // Exclude self posts
    if (data.is_self) return false

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
  if (!url) return null

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

/**
 * Extract Vimeo video ID from URL
 */
export function extractVimeoId(url: string): string | null {
  if (!url) return null

  const match = url.match(/vimeo\.com\/(\d+)/)
  return match?.[1] || null
}

/**
 * Format seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format large numbers (e.g., 1234 -> 1.2k)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * Validate if URL is a valid media URL
 */
export function isValidMediaUrl(url: string): boolean {
  if (!url) return false

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
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'soundcloud.com': 'SoundCloud',
    'vimeo.com': 'Vimeo',
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
  if (!seconds || !isFinite(seconds)) return 'Unknown'

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
  if (!duration || duration === 0) return 0
  return Math.min(100, Math.max(0, (currentTime / duration) * 100))
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
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

    if (timeout) clearTimeout(timeout)
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
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
