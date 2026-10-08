import { expect, test } from 'bun:test'
import { recommendCommunities } from '@/lib/community/recommendations'
import type { Community, CommunityCategory } from '@/lib/community/types'
import type { ListeningEvent } from '@/lib/store/listening-store'

const NOW = 1_800_000_000_000
const DAY = 24 * 60 * 60 * 1000

function community(key: string, category: CommunityCategory, qualityScore = 50): Community {
  return {
    activity: 'active',
    category,
    description: '',
    discoverySources: ['music-links'],
    key,
    latestPlayableAt: new Date(NOW - DAY).toISOString(),
    name: key,
    playablePosts: 10,
    qualityScore,
    recentPlayablePosts: 5,
    sampledPosts: 25,
    subscribers: null,
    verifiedAt: new Date(NOW).toISOString(),
  }
}

function event(subreddit: string, type: ListeningEvent['type'], at = NOW): ListeningEvent {
  return { at, seconds: 30, songId: 'heard', subreddit, type }
}

test('recommendations exclude selected and quiet communities case-insensitively', () => {
  const result = recommendCommunities(
    [
      community('INDIE', 'Indie'),
      { ...community('quiet', 'Rock'), activity: 'quiet' },
      community('jazz', 'Jazz'),
    ],
    [],
    ['indie'],
    6,
    NOW
  )
  expect(result.map(item => item.community.key)).toEqual(['jazz'])
})

test('positive listening recommendations keep at most two per category when alternatives exist', () => {
  const rock = Array.from({ length: 5 }, (_, index) =>
    community(`rock${index}`, 'Rock', 100 - index)
  )
  const jazz = [community('jazz0', 'Jazz', 40), community('jazz1', 'Jazz', 30)]
  const ambient = [community('ambient0', 'Ambient', 20), community('ambient1', 'Ambient', 10)]
  const result = recommendCommunities(
    [...rock, ...jazz, ...ambient],
    [event('rock0', 'like')],
    [],
    6,
    NOW
  )
  expect(result.filter(item => item.community.category === 'Rock')).toHaveLength(2)
  expect(result.filter(item => item.community.category === 'Jazz')).toHaveLength(2)
  expect(result.filter(item => item.community.category === 'Ambient')).toHaveLength(2)
  expect(result[0].community.key).toBe('rock0')
})

test('a limited catalog fills remaining slots without inventing other categories', () => {
  const catalog = Array.from({ length: 4 }, (_, index) => community(`rock${index}`, 'Rock'))
  const result = recommendCommunities(catalog, [], [], 6, NOW)
  expect(result).toHaveLength(4)
  expect(new Set(result.map(item => item.community.key)).size).toBe(4)
  expect(result.every(item => item.community.category === 'Rock')).toBe(true)
})

test('cold-start and non-positive affinities never claim personalization', () => {
  const catalog = [
    community('rock', 'Rock'),
    { ...community('unknown', 'Other'), recentPlayablePosts: null },
  ]
  const cold = recommendCommunities(catalog, [], [], 6, NOW)
  expect(cold.every(item => !item.reason.includes('your listening'))).toBe(true)
  expect(cold.find(item => item.community.key === 'rock')?.reason).toContain('5 recent supported')
  const negative = recommendCommunities(catalog, [event('rock', 'skip')], [], 6, NOW)
  expect(negative.every(item => !item.reason.includes('your listening'))).toBe(true)
  const expired = recommendCommunities(catalog, [event('rock', 'like', NOW - 31 * DAY)], [], 6, NOW)
  expect(expired.every(item => !item.reason.includes('your listening'))).toBe(true)
})

test('positive affinity supplies an honest category-based reason and honors the limit', () => {
  const result = recommendCommunities(
    [
      community('liked', 'Indie', 20),
      community('newindie', 'Indie', 10),
      community('rock', 'Rock', 100),
    ],
    [event('liked', 'like')],
    ['liked'],
    1,
    NOW
  )
  expect(result).toHaveLength(1)
  expect(result[0].community.key).toBe('newindie')
  expect(result[0].reason).toBe('More indie, based on your listening')
  expect(recommendCommunities([community('rock', 'Rock')], [], [], 0, NOW)).toEqual([])
})

test('duplicate community keys produce one recommendation with the strongest available sample', () => {
  const result = recommendCommunities(
    [community('indie', 'Indie', 10), community('INDIE', 'Indie', 90)],
    [],
    [],
    6,
    NOW
  )
  expect(result).toHaveLength(1)
  expect(result[0].community.qualityScore).toBe(90)
})
