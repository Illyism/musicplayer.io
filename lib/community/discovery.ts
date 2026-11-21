import {
  getFallbackCommunities,
  inferCommunityCategory,
  isMusicCommunity,
  STARTER_COMMUNITIES,
} from './catalog'
import {
  type DiscoveryPost,
  isSupportedMusicLink,
  rankCommunities,
  scoreActivitySample,
} from './ranking'
import { requestCommunityData } from './reddit-client'
import type {
  Community,
  CommunityCategory,
  CommunityDiscoveryResult,
  DiscoveryOptions,
} from './types'

const CACHE_MS = 15 * 60_000
const FALLBACK_CACHE_MS = 60_000
const MAX_CACHE_KEYS = 20
const MAX_CANDIDATES = 16
const SAMPLE_SIZE = 25
const COMMUNITY_NAME_PATTERN = /^[a-z0-9_]{1,21}$/iu
const MUSIC_LINK_QUERY =
  '(site:youtube.com OR site:youtu.be OR site:soundcloud.com OR site:vimeo.com)'

interface AboutData {
  banner_background_image?: string
  banner_img?: string
  community_icon?: string
  display_name?: string
  icon_img?: string
  over18?: boolean
  public_description?: string
  subreddit_type?: string
  subscribers?: number
  title?: string
}

interface Candidate {
  key: string
  sources: Community['discoverySources']
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function listing<T>(value: unknown): T[] {
  const { children } = record(record(value).data)
  if (!Array.isArray(children)) {
    return []
  }
  return children.map(child => record(child).data).filter(Boolean) as T[]
}

function normalizeCommunityImage(value?: string): string | null {
  if (!value) {
    return null
  }
  try {
    const url = new URL(value)
    const trustedHost = ['redd.it', 'redditmedia.com', 'redditstatic.com'].some(
      host => url.hostname === host || url.hostname.endsWith(`.${host}`)
    )
    return url.protocol === 'https:' && trustedHost ? url.href : null
  } catch {
    return null
  }
}

async function mapConcurrent<T, R>(items: T[], map: (item: T) => Promise<R>): Promise<R[]> {
  const queue = [...items]
  const results: R[] = []
  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (item !== undefined) {
        // biome-ignore lint/performance/noAwaitInLoops: three workers bound API concurrency
        results.push(await map(item))
      }
    }
  }
  await Promise.all([worker(), worker(), worker()])
  return results
}

const cache = new Map<string, { result: CommunityDiscoveryResult; expires: number }>()
const inFlight = new Map<string, Promise<CommunityDiscoveryResult>>()

function fallback(
  query: string,
  category: CommunityCategory | null,
  message: string
): CommunityDiscoveryResult {
  const communities = getFallbackCommunities(query, category)
  return {
    category,
    communities: query ? rankCommunities(communities, query) : communities,
    degraded: true,
    expiresAt: null,
    message: `${message} Starter communities have not been checked.`,
    query,
    sampleWindowDays: 7,
    schemaVersion: 1,
    source: 'fallback',
    updatedAt: null,
  }
}

async function discover(options: DiscoveryOptions): Promise<CommunityDiscoveryResult> {
  const query = (options.query ?? '').trim().slice(0, 64)
  const category = options.category === 'All music' ? null : (options.category ?? null)
  const searchTerm = query || category || 'music'
  const candidates = new Map<string, Candidate>()
  let failureCount = 0
  let successfulRequests = 0
  const deadline = Date.now() + 20_000

  const addCandidate = (name: string, source: Candidate['sources'][number]) => {
    if (!COMMUNITY_NAME_PATTERN.test(name)) {
      return
    }
    const key = name.toLowerCase()
    const current = candidates.get(key)
    if (current) {
      if (!current.sources.includes(source)) {
        current.sources.push(source)
      }
    } else {
      candidates.set(key, { key, sources: [source] })
    }
  }

  const read = async (path: string, params: Record<string, string>): Promise<unknown | null> => {
    if (Date.now() >= deadline) {
      failureCount += 1
      return null
    }
    try {
      const data = await requestCommunityData(path, new URLSearchParams(params))
      successfulRequests += 1
      return data
    } catch {
      failureCount += 1
      return null
    }
  }

  const results = await Promise.all([
    read('/subreddits/search', {
      limit: '25',
      q: searchTerm,
      show_users: 'false',
      sort: 'activity',
    }),
    read('/search', {
      include_over_18: 'false',
      limit: '100',
      q: `${MUSIC_LINK_QUERY} ${searchTerm}`,
      sort: 'new',
      t: 'week',
      type: 'link',
    }),
  ])
  if (successfulRequests === 0) {
    return fallback(query, category, 'Live Reddit discovery is unavailable.')
  }

  const starters = STARTER_COMMUNITIES.filter(
    item =>
      (!category || item.category === category) &&
      (!query || `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()))
  )
  for (const starter of starters.slice(0, 8)) {
    addCandidate(starter.name, 'starter')
  }
  for (const community of listing<AboutData>(results[0]).slice(0, 8)) {
    if (typeof community.display_name === 'string' && !community.over18) {
      addCandidate(community.display_name, 'community-search')
    }
  }
  for (const post of listing<DiscoveryPost>(results[1])) {
    if (typeof post.subreddit === 'string' && isSupportedMusicLink(post)) {
      addCandidate(post.subreddit, 'music-links')
    }
  }
  for (const starter of starters) {
    addCandidate(starter.name, 'starter')
  }

  const selected = new Map<string, Candidate>()
  for (const [source, limit] of [
    ['starter', 8],
    ['community-search', 4],
    ['music-links', 4],
  ] as const) {
    let added = 0
    for (const candidate of candidates.values()) {
      if (added < limit && candidate.sources.includes(source) && !selected.has(candidate.key)) {
        selected.set(candidate.key, candidate)
        added += 1
      }
    }
  }
  for (const candidate of candidates.values()) {
    if (selected.size < MAX_CANDIDATES && !selected.has(candidate.key)) {
      selected.set(candidate.key, candidate)
    }
  }

  const communities = await mapConcurrent<Candidate, Community | null>(
    [...selected.values()].slice(0, MAX_CANDIDATES),
    async candidate => {
      const [aboutResponse, recentResponse] = await Promise.all([
        read(`/r/${candidate.key}/about`, {}),
        read(`/r/${candidate.key}/new`, { limit: String(SAMPLE_SIZE) }),
      ])
      const about = record(record(aboutResponse).data) as AboutData
      if (
        typeof about.display_name !== 'string' ||
        about.over18 ||
        about.subreddit_type === 'private' ||
        about.subreddit_type === 'user'
      ) {
        return null
      }
      const description =
        typeof about.public_description === 'string' ? about.public_description : ''
      const title = typeof about.title === 'string' ? about.title : ''
      if (!isMusicCommunity(about.display_name, `${title} ${description}`)) {
        return null
      }
      if (recentResponse === null) {
        return null
      }
      const sample = scoreActivitySample(listing<DiscoveryPost>(recentResponse))
      if (sample.playablePosts === 0) {
        return null
      }
      return {
        ...sample,
        bannerUrl: normalizeCommunityImage(about.banner_background_image ?? about.banner_img),
        category: inferCommunityCategory(about.display_name, `${title} ${description}`),
        description: description.slice(0, 500),
        discoverySources: candidate.sources,
        iconUrl: normalizeCommunityImage(about.community_icon || about.icon_img),
        key: candidate.key,
        name: about.display_name,
        subscribers:
          typeof about.subscribers === 'number' && Number.isFinite(about.subscribers)
            ? Math.max(0, about.subscribers)
            : null,
        verifiedAt: new Date(Date.now()).toISOString(),
      } satisfies Community
    }
  )
  const verified = communities
    .filter((community): community is Community => community !== null)
    .filter(community => !category || community.category === category)
    .filter(community => query.length > 0 || community.activity !== 'quiet')
  if (verified.length === 0 && failureCount > 0) {
    return fallback(query, category, 'Reddit activity checks could not be completed.')
  }
  return {
    category,
    communities: rankCommunities(verified, query),
    degraded: failureCount > 0,
    expiresAt: new Date(Date.now() + CACHE_MS).toISOString(),
    message:
      failureCount > 0
        ? 'Some communities could not be checked. Showing the available activity samples.'
        : null,
    query,
    sampleWindowDays: 7,
    schemaVersion: 1,
    source: 'live',
    updatedAt: new Date(Date.now()).toISOString(),
  }
}

export async function discoverCommunities(
  options: DiscoveryOptions = {}
): Promise<CommunityDiscoveryResult> {
  const normalized = {
    category: options.category ?? null,
    query: (options.query ?? '').trim().slice(0, 64).toLowerCase(),
  }
  const key = `${normalized.category ?? ''}:${normalized.query}`
  const saved = cache.get(key)
  if (saved && saved.expires > Date.now()) {
    return {
      ...saved.result,
      source: saved.result.source === 'live' ? 'cache' : saved.result.source,
    }
  }
  const pending = inFlight.get(key)
  if (pending) {
    return pending
  }
  const promise = discover(normalized)
  inFlight.set(key, promise)
  try {
    const result = await promise
    if (cache.size >= MAX_CACHE_KEYS) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) {
        cache.delete(oldest)
      }
    }
    const cacheExpiry = Date.now() + (result.source === 'live' ? CACHE_MS : FALLBACK_CACHE_MS)
    const resultExpiry = result.expiresAt === null ? Number.NaN : Date.parse(result.expiresAt)
    cache.set(key, {
      expires: Number.isFinite(resultExpiry) ? Math.min(cacheExpiry, resultExpiry) : cacheExpiry,
      result,
    })
    return result
  } finally {
    inFlight.delete(key)
  }
}
