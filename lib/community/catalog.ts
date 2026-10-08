import type { Community, CommunityCategory } from './types'

// Names are starting points, never evidence of current availability or activity.
export const STARTER_COMMUNITIES: { category: CommunityCategory; name: string }[] = [
  { category: 'All music', name: 'listentothis' },
  { category: 'All music', name: 'Music' },
  { category: 'Electronic', name: 'electronicmusic' },
  { category: 'Indie', name: 'indieheads' },
  { category: 'Hip-hop', name: 'hiphopheads' },
  { category: 'Jazz', name: 'Jazz' },
  { category: 'Ambient', name: 'ambientmusic' },
  { category: 'Classical', name: 'classicalmusic' },
  { category: 'Rock', name: 'rock' },
  { category: 'Metal', name: 'Metal' },
  { category: 'Pop', name: 'popheads' },
]

const CATEGORY_MATCHERS: { category: CommunityCategory; pattern: RegExp }[] = [
  { category: 'Ambient', pattern: /ambient|drone|chillout/i },
  { category: 'Jazz', pattern: /jazz|bebop/i },
  { category: 'Classical', pattern: /classical|orchestra|baroque|chamber music/i },
  { category: 'Hip-hop', pattern: /hip[ -]?hop|rap\b|trap music/i },
  { category: 'Metal', pattern: /metal|hardcore|doom|blackmetal/i },
  {
    category: 'Electronic',
    pattern: /electronic|techno|house music|edm|dubstep|synthwave|drum.?and.?bass/i,
  },
  { category: 'Indie', pattern: /indie|alternative music/i },
  { category: 'Rock', pattern: /rock|punk|shoegaze/i },
  { category: 'Pop', pattern: /pop music|popheads|k[ -]?pop/i },
]
const MUSIC_COMMUNITY_PATTERN =
  /music|song|listen|jazz|classical|hip[ -]?hop|rap\b|metal|indie|rock|punk|ambient|techno|edm|dubstep|synthwave|shoegaze|orchestra|album/i

export function inferCommunityCategory(name: string, description: string): CommunityCategory {
  const starter = STARTER_COMMUNITIES.find(item => item.name.toLowerCase() === name.toLowerCase())
  if (starter) {
    return starter.category
  }
  const text = `${name} ${description}`
  return CATEGORY_MATCHERS.find(item => item.pattern.test(text))?.category ?? 'Other'
}

export function isMusicCommunity(name: string, description: string): boolean {
  return MUSIC_COMMUNITY_PATTERN.test(`${name} ${description}`)
}

export function getFallbackCommunities(
  query: string,
  category: CommunityCategory | null
): Community[] {
  const normalizedQuery = query.toLowerCase()
  return STARTER_COMMUNITIES.filter(item => !category || item.category === category)
    .filter(
      item =>
        !normalizedQuery || `${item.name} ${item.category}`.toLowerCase().includes(normalizedQuery)
    )
    .map(item => ({
      activity: 'unknown',
      category: item.category,
      description: '',
      discoverySources: ['starter'],
      key: item.name.toLowerCase(),
      latestPlayableAt: null,
      name: item.name,
      playablePosts: null,
      qualityScore: null,
      recentPlayablePosts: null,
      sampledPosts: null,
      subscribers: null,
      verifiedAt: null,
    }))
}
