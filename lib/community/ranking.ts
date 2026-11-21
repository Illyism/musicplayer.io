import type { Community, CommunityActivity } from './types'

const DAY_SECONDS = 86_400
const ACTIVITY_WEIGHT = 45
const SUPPORTED_RATIO_WEIGHT = 30
const RECENCY_WEIGHT = 25
const RECENT_POSTS_FOR_FULL_ACTIVITY = 10
const RECENCY_HORIZON_DAYS = 14
const SUPPORTED_MUSIC_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'youtu.be',
  'soundcloud.com',
  'vimeo.com',
])
const WWW_PREFIX = /^www\./u
const MP3_SUFFIX = /\.mp3$/iu
const COMMUNITY_QUERY_PREFIX = /^\/?r\//iu

export interface DiscoveryPost {
  created_utc?: number
  is_self?: boolean
  over_18?: boolean
  removed_by_category?: string | null
  subreddit?: string
  url?: string
}

interface ActivitySample {
  activity: CommunityActivity
  latestPlayableAt: string | null
  playablePosts: number
  qualityScore: number
  recentPlayablePosts: number
  sampledPosts: number
}

export function isSupportedMusicLink(post: DiscoveryPost): boolean {
  if (post.is_self || post.over_18 || post.removed_by_category || !post.url) {
    return false
  }
  try {
    const url = new URL(post.url)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false
    }
    return (
      SUPPORTED_MUSIC_HOSTS.has(url.hostname.replace(WWW_PREFIX, '')) ||
      MP3_SUFFIX.test(url.pathname)
    )
  } catch {
    return false
  }
}

export function scoreActivitySample(posts: DiscoveryPost[]): ActivitySample {
  const nowSeconds = Date.now() / 1000
  const validPosts = posts.filter(
    (post): post is DiscoveryPost & { created_utc: number } =>
      typeof post.created_utc === 'number' &&
      Number.isFinite(post.created_utc) &&
      post.created_utc > 0 &&
      post.created_utc <= nowSeconds + 60
  )
  const playablePosts = validPosts.filter(isSupportedMusicLink)
  const recentPlayablePosts = playablePosts.filter(
    post => post.created_utc >= nowSeconds - 7 * DAY_SECONDS
  )
  const newest = Math.max(0, ...playablePosts.map(post => post.created_utc))
  const newestAgeDays =
    newest > 0 ? Math.max(0, (nowSeconds - newest) / DAY_SECONDS) : Number.POSITIVE_INFINITY
  let activity: CommunityActivity = 'quiet'
  if (recentPlayablePosts.length >= 2 && newestAgeDays <= 2) {
    activity = 'active'
  } else if (recentPlayablePosts.length > 0) {
    activity = 'recent'
  }

  const playableRatio = validPosts.length > 0 ? playablePosts.length / validPosts.length : 0
  const activityScore =
    Math.min(recentPlayablePosts.length / RECENT_POSTS_FOR_FULL_ACTIVITY, 1) * ACTIVITY_WEIGHT
  const recencyScore = Number.isFinite(newestAgeDays)
    ? Math.max(0, 1 - newestAgeDays / RECENCY_HORIZON_DAYS) * RECENCY_WEIGHT
    : 0
  const qualityScore = Math.round(
    activityScore + playableRatio * SUPPORTED_RATIO_WEIGHT + recencyScore
  )
  return {
    activity,
    latestPlayableAt: newest > 0 ? new Date(newest * 1000).toISOString() : null,
    playablePosts: playablePosts.length,
    qualityScore,
    recentPlayablePosts: recentPlayablePosts.length,
    sampledPosts: validPosts.length,
  }
}

function queryRelevance(community: Community, query: string): number {
  if (!query) {
    return 0
  }
  const key = community.key.toLowerCase()
  const name = community.name.toLowerCase()
  if (key === query || name === query) {
    return 2
  }
  return key.includes(query) || name.includes(query) ? 1 : 0
}

export function rankCommunities(communities: Community[], query = ''): Community[] {
  const normalizedQuery = query.trim().replace(COMMUNITY_QUERY_PREFIX, '').trim().toLowerCase()
  const unique = new Map<string, Community>()
  for (const community of communities) {
    const key = community.key.toLowerCase()
    const previous = unique.get(key)
    if (!previous || (community.qualityScore ?? -1) > (previous.qualityScore ?? -1)) {
      unique.set(key, community)
    }
  }
  return [...unique.values()].sort(
    (left, right) =>
      queryRelevance(right, normalizedQuery) - queryRelevance(left, normalizedQuery) ||
      (right.qualityScore ?? -1) - (left.qualityScore ?? -1) ||
      left.name.localeCompare(right.name)
  )
}
