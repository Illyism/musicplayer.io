export const COMMUNITY_CATEGORIES = [
  'All music',
  'Electronic',
  'Hip-hop',
  'Rock',
  'Indie',
  'Jazz',
  'Classical',
  'Metal',
  'Ambient',
  'Pop',
  'Other',
] as const

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number]
export type CommunityActivity = 'active' | 'recent' | 'quiet' | 'unknown'
export type DiscoverySource = 'live' | 'cache' | 'snapshot' | 'fallback'

export interface Community {
  activity: CommunityActivity
  bannerUrl?: string | null
  category: CommunityCategory
  description: string
  discoverySources: ('community-search' | 'music-links' | 'starter')[]
  iconUrl?: string | null
  key: string
  latestPlayableAt: string | null
  name: string
  playablePosts: number | null
  qualityScore: number | null
  recentPlayablePosts: number | null
  sampledPosts: number | null
  subscribers: number | null
  verifiedAt: string | null
}

export interface CommunityDiscoveryResult {
  category: CommunityCategory | null
  communities: Community[]
  degraded: boolean
  expiresAt: string | null
  message: string | null
  query: string
  sampleWindowDays: number
  schemaVersion: 1
  source: DiscoverySource
  updatedAt: string | null
}

export interface DiscoveryOptions {
  category?: CommunityCategory | null
  query?: string
}

export function parseCommunityCategory(value: string | null | undefined): CommunityCategory | null {
  return COMMUNITY_CATEGORIES.find(category => category === value) ?? null
}
