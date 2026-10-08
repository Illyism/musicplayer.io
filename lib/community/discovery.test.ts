import { expect, mock, test } from 'bun:test'
import { getFallbackCommunities } from './catalog'
import { createCommunityDiscovery, normalizeCommunityImage } from './discovery'
import type { CommunityDiscoveryResult } from './types'

const NOW = Date.UTC(2026, 9, 8)
const EMPTY_SNAPSHOT: CommunityDiscoveryResult = {
  category: null,
  communities: [],
  degraded: true,
  expiresAt: null,
  message: null,
  query: '',
  sampleWindowDays: 7,
  schemaVersion: 1,
  source: 'fallback',
  updatedAt: null,
}
const recentPost = {
  created_utc: NOW / 1000 - 3600,
  subreddit: 'focusmusic',
  url: 'https://youtu.be/test',
}
const listing = (values: unknown[]) => ({ data: { children: values.map(data => ({ data })) } })

function responseFor(path: string, ageSeconds = 3600) {
  if (path === '/subreddits/search') {
    return listing([{ display_name: 'focusmusic', public_description: 'Music for focusing.' }])
  }
  if (path === '/search') {
    return listing([recentPost])
  }
  if (path.endsWith('/about')) {
    return {
      data: {
        display_name: path.split('/')[2],
        public_description: 'A music community.',
        subscribers: 1234,
      },
    }
  }
  return listing([{ ...recentPost, created_utc: NOW / 1000 - ageSeconds }])
}

test('live discovery enriches supported-link samples and shares an in-flight request across consumers', async () => {
  const request = mock(async (path: string) => responseFor(path))
  const discover = createCommunityDiscovery({ now: () => NOW, request })
  const [first, second] = await Promise.all([
    discover({ query: 'focus' }),
    discover({ query: 'focus' }),
  ])
  expect(request).toHaveBeenCalledTimes(4)
  expect(first).toEqual(second)
  expect(first.source).toBe('live')
  expect(first.degraded).toBe(false)
  expect(first.communities[0].recentPlayablePosts).toBe(1)
  expect(first.communities[0].subscribers).toBe(1234)
  const cached = await discover({ query: 'FOCUS' })
  expect(cached.source).toBe('cache')
  expect(request).toHaveBeenCalledTimes(4)
})

test('live artist discovery ranks the exact community first without relabeling generic activity counts', async () => {
  const discover = createCommunityDiscovery({
    now: () => NOW,
    request: path => {
      if (path === '/subreddits/search') {
        return Promise.resolve(
          listing([{ display_name: 'CoverSongQueens' }, { display_name: 'laufey' }])
        )
      }
      if (path === '/search') {
        return Promise.resolve(listing([]))
      }
      if (path.endsWith('/about')) {
        return Promise.resolve({
          data: { display_name: path.split('/')[2], public_description: 'A music community.' },
        })
      }
      return Promise.resolve(
        listing(Array.from({ length: path.includes('/laufey/') ? 1 : 3 }, () => recentPost))
      )
    },
  })
  const result = await discover({ query: 'Laufey' })
  expect(result.communities.map(community => community.key)).toEqual(['laufey', 'coversongqueens'])
  expect(result.communities[0].recentPlayablePosts).toBe(1)
  expect(result.communities[1].recentPlayablePosts).toBe(3)
})

test('default discovery excludes quiet samples while explicit search labels them honestly', async () => {
  const discover = createCommunityDiscovery({
    now: () => NOW,
    request: async path => responseFor(path, 40 * 86_400),
  })
  const defaults = await discover()
  const searched = await discover({ query: 'focus' })
  expect(defaults.source).toBe('live')
  expect(defaults.communities).toHaveLength(0)
  expect(searched.communities).toHaveLength(1)
  expect(searched.communities[0].activity).toBe('quiet')
  expect(searched.communities[0].recentPlayablePosts).toBe(0)
})

test('refused API access returns explicitly unverified names, never stale YAML counts', async () => {
  const discover = createCommunityDiscovery({
    request: () => Promise.reject(new Error('refused')),
    snapshot: EMPTY_SNAPSHOT,
  })
  const result = await discover()
  expect(result.source).toBe('fallback')
  expect(result.degraded).toBe(true)
  expect(result.updatedAt).toBeNull()
  expect(result.message).toContain('not been checked')
  expect(
    result.communities.every(
      community => community.subscribers === null && community.verifiedAt === null
    )
  ).toBe(true)
})

test('a recent captured snapshot is visibly degraded and keeps its original check time', async () => {
  const checkedAt = new Date(NOW - 3_600_000).toISOString()
  const snapshot: CommunityDiscoveryResult = {
    ...EMPTY_SNAPSHOT,
    communities: getFallbackCommunities('', null),
    expiresAt: new Date(NOW + 3_600_000).toISOString(),
    source: 'live',
    updatedAt: checkedAt,
  }
  const result = await createCommunityDiscovery({
    now: () => NOW,
    request: () => Promise.reject(new Error('refused')),
    snapshot,
  })()
  expect(result.source).toBe('snapshot')
  expect(result.degraded).toBe(true)
  expect(result.updatedAt).toBe(checkedAt)
  expect(result.message).toContain('previously checked')
})

test('expired captured data cannot be served as a current activity snapshot', async () => {
  const snapshot: CommunityDiscoveryResult = {
    category: null,
    communities: getFallbackCommunities('', null),
    degraded: false,
    expiresAt: new Date(NOW - 1).toISOString(),
    message: null,
    query: '',
    sampleWindowDays: 7,
    schemaVersion: 1,
    source: 'live',
    updatedAt: new Date(NOW - 2 * 86_400_000).toISOString(),
  }
  const discover = createCommunityDiscovery({
    now: () => NOW,
    request: () => Promise.reject(new Error('refused')),
    snapshot,
  })
  expect((await discover()).source).toBe('fallback')
})

test('future or older-than-24-hour snapshot timestamps are not treated as recent checks', async () => {
  const results = await Promise.all(
    [NOW + 1, NOW - 86_400_001].map(checkedAt => {
      const snapshot: CommunityDiscoveryResult = {
        ...EMPTY_SNAPSHOT,
        communities: getFallbackCommunities('', null),
        expiresAt: new Date(NOW + 3_600_000).toISOString(),
        source: 'live',
        updatedAt: new Date(checkedAt).toISOString(),
      }
      return createCommunityDiscovery({
        now: () => NOW,
        request: () => Promise.reject(new Error('refused')),
        snapshot,
      })()
    })
  )
  for (const result of results) {
    expect(result.source).toBe('fallback')
    expect(result.updatedAt).toBeNull()
  }
})

test('a cached snapshot stops being served after its original expiry', async () => {
  let now = NOW
  const snapshot: CommunityDiscoveryResult = {
    ...EMPTY_SNAPSHOT,
    communities: getFallbackCommunities('', null),
    expiresAt: new Date(NOW + 30_000).toISOString(),
    source: 'live',
    updatedAt: new Date(NOW - 3_600_000).toISOString(),
  }
  const discover = createCommunityDiscovery({
    now: () => now,
    request: () => Promise.reject(new Error('refused')),
    snapshot,
  })
  expect((await discover()).source).toBe('snapshot')
  now += 30_001
  expect((await discover()).source).toBe('fallback')
})

test('discovery bounds candidate enrichment even when public search returns many communities', async () => {
  const request = mock((path: string) => {
    if (path === '/subreddits/search') {
      return Promise.resolve(
        listing(Array.from({ length: 100 }, (_, index) => ({ display_name: `music${index}` })))
      )
    }
    if (path === '/search') {
      return Promise.resolve(
        listing(
          Array.from({ length: 100 }, (_, index) => ({
            ...recentPost,
            subreddit: `music${index + 100}`,
          }))
        )
      )
    }
    return Promise.resolve(responseFor(path))
  })
  const result = await createCommunityDiscovery({ now: () => NOW, request })()
  expect(request.mock.calls.length).toBeLessThanOrEqual(34)
  expect(result.communities.length).toBeLessThanOrEqual(16)
})

test('private and NSFW communities are excluded before any recent-post sampling', async () => {
  const request = mock((path: string) => {
    if (path.endsWith('/about')) {
      return Promise.resolve({
        data: { display_name: 'focusmusic', over18: true, public_description: 'Music.' },
      })
    }
    return Promise.resolve(responseFor(path))
  })
  const result = await createCommunityDiscovery({ now: () => NOW, request })({ query: 'focus' })
  expect(result.communities).toHaveLength(0)
  expect(request.mock.calls.some(([path]) => path.endsWith('/new'))).toBe(false)
})

test('community artwork only accepts HTTPS links on Reddit CDN hosts', () => {
  expect(normalizeCommunityImage('https://styles.redditmedia.com/icon.png')).toBe(
    'https://styles.redditmedia.com/icon.png'
  )
  expect(normalizeCommunityImage('https://i.redd.it/banner.png')).toBe(
    'https://i.redd.it/banner.png'
  )
  expect(normalizeCommunityImage('http://i.redd.it/icon.png')).toBeNull()
  expect(normalizeCommunityImage('https://redditmedia.com.attacker.example/icon.png')).toBeNull()
  expect(normalizeCommunityImage('javascript:alert(1)')).toBeNull()
})
