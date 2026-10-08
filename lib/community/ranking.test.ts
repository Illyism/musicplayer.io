import { expect, test } from 'bun:test'
import { getFallbackCommunities } from './catalog'
import {
  type DiscoveryPost,
  isPlayableMusicLink,
  rankCommunities,
  scoreActivitySample,
} from './ranking'

const NOW = Date.UTC(2026, 9, 8)
const DAY_MS = 86_400_000

function post(ageDays: number, url = 'https://youtu.be/test'): DiscoveryPost {
  return { created_utc: (NOW - ageDays * DAY_MS) / 1000, url }
}

test('supported music links reject self posts, unsafe URLs, NSFW, removed content, and unsupported providers', () => {
  expect(isPlayableMusicLink(post(0))).toBe(true)
  expect(isPlayableMusicLink(post(0, 'https://soundcloud.com/artist/track'))).toBe(true)
  expect(isPlayableMusicLink(post(0, 'https://audio.example/track.mp3?download=1'))).toBe(true)
  expect(isPlayableMusicLink({ ...post(0), is_self: true })).toBe(false)
  expect(isPlayableMusicLink({ ...post(0), over_18: true })).toBe(false)
  expect(isPlayableMusicLink({ ...post(0), removed_by_category: 'moderator' })).toBe(false)
  expect(isPlayableMusicLink(post(0, 'javascript:alert(1)'))).toBe(false)
  expect(isPlayableMusicLink(post(0, 'https://youtube.com.attacker.example/watch'))).toBe(false)
  expect(isPlayableMusicLink(post(0, 'https://open.spotify.com/track/test'))).toBe(false)
})

test('activity metrics count only observed supported links, use their newest timestamp, and ignore invalid dates', () => {
  const sample = scoreActivitySample(
    [
      post(0.5),
      post(3),
      post(14),
      post(0, 'https://example.com/discussion'),
      { url: 'https://youtu.be/missing-time' },
      { created_utc: Number.NaN, url: 'https://youtu.be/invalid-time' },
      post(-20),
    ],
    NOW
  )
  expect(sample.sampledPosts).toBe(4)
  expect(sample.playablePosts).toBe(3)
  expect(sample.recentPlayablePosts).toBe(2)
  expect(sample.activity).toBe('active')
  expect(sample.latestPlayableAt).toBe(new Date(NOW - 0.5 * DAY_MS).toISOString())
})

test('recent music activity outranks old link-heavy communities without using member counts', () => {
  const fresh = scoreActivitySample(
    Array.from({ length: 10 }, () => post(0.1)),
    NOW
  )
  const old = scoreActivitySample(
    Array.from({ length: 25 }, () => post(40)),
    NOW
  )
  expect(fresh.qualityScore).toBeGreaterThan(old.qualityScore)
  expect(old.activity).toBe('quiet')
  expect(scoreActivitySample([post(5)], NOW).activity).toBe('recent')
})

test('fallback names carry no invented current activity or subscriber measurements', () => {
  const communities = getFallbackCommunities('', null)
  expect(communities.length).toBeGreaterThan(0)
  for (const community of communities) {
    expect(community.activity).toBe('unknown')
    expect(community.subscribers).toBeNull()
    expect(community.qualityScore).toBeNull()
    expect(community.recentPlayablePosts).toBeNull()
    expect(community.verifiedAt).toBeNull()
  }
})

test('ranking deduplicates case-insensitive community keys and retains the strongest checked record', () => {
  const [fallback] = getFallbackCommunities('', null)
  const stronger = { ...fallback, key: fallback.key.toUpperCase(), qualityScore: 90 }
  const results = rankCommunities([fallback, stronger])
  expect(results).toHaveLength(1)
  expect(results[0].qualityScore).toBe(90)
})

test('artist searches put exact and partial names ahead of busier generic music communities', () => {
  const [base] = getFallbackCommunities('', null)
  const communities = [
    { ...base, key: 'coversongqueens', name: 'CoverSongQueens', qualityScore: 95 },
    { ...base, key: 'laufeymusic', name: 'LaufeyMusic', qualityScore: 65 },
    { ...base, key: 'laufey', name: 'laufey', qualityScore: 30 },
  ]
  for (const query of ['Laufey', ' r/LAUFEY ', '/r/laufey']) {
    expect(rankCommunities(communities, query).map(community => community.key)).toEqual([
      'laufey',
      'laufeymusic',
      'coversongqueens',
    ])
  }
  expect(rankCommunities(communities).map(community => community.key)).toEqual([
    'coversongqueens',
    'laufeymusic',
    'laufey',
  ])
})
