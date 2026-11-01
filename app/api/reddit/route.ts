import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRedditError, RedditError } from '@/lib/errors/reddit-error'
import { handleRedditApiError } from '@/lib/utils/error-handler'
import {
  isValidRedditPermalink,
  redditApiFetch,
  slimListingResponse,
} from '@/lib/utils/reddit-response'

const SUBREDDIT_NAME_REGEX = /^[a-zA-Z0-9_-]+$/
const MAX_MULTI_SUBREDDITS = 50
const LISTING_CACHE_MS = 15 * 60_000
const NOT_FOUND_CACHE_MS = 60_000
const MAX_CACHE_KEYS = 200
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
}
const ERROR_HEADERS = { 'Cache-Control': 'private, no-store' }

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

const listingCache = new Map<string, CacheEntry<any>>()
const listingInFlight = new Map<string, Promise<any>>()
const notFoundCache = new Map<string, CacheEntry<{ message: string; statusCode: number }>>()

function setBoundedCache<T>(map: Map<string, CacheEntry<T>>, key: string, entry: CacheEntry<T>) {
  if (map.size >= MAX_CACHE_KEYS && !map.has(key)) {
    const oldestKey = map.keys().next().value
    if (oldestKey !== undefined) {
      map.delete(oldestKey)
    }
  }
  map.set(key, entry)
}

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const cached = map.get(key)
  if (!cached) {
    return undefined
  }
  if (cached.expiresAt <= Date.now()) {
    map.delete(key)
    return undefined
  }
  return cached.value
}

async function withSharedCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = LISTING_CACHE_MS
): Promise<T> {
  const cachedNotFound = getCached(notFoundCache, key)
  if (cachedNotFound) {
    throw new RedditError(cachedNotFound.message, cachedNotFound.statusCode, cachedNotFound.message)
  }

  const cached = getCached(listingCache, key)
  if (cached !== undefined) {
    return cached
  }

  const pending = listingInFlight.get(key)
  if (pending) {
    return pending
  }

  const request = (async () => {
    try {
      const value = await fetcher()
      setBoundedCache(listingCache, key, {
        expiresAt: Date.now() + ttlMs,
        value,
      })
      return value
    } catch (error) {
      if (isRedditError(error) && error.statusCode === 404) {
        setBoundedCache(notFoundCache, key, {
          expiresAt: Date.now() + NOT_FOUND_CACHE_MS,
          value: {
            message: error.getUserMessage(),
            statusCode: 404,
          },
        })
      }
      throw error
    } finally {
      listingInFlight.delete(key)
    }
  })()

  listingInFlight.set(key, request)
  return await request
}

function isCrossSiteRequest(request: NextRequest): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return true
  }
  const origin = request.headers.get('origin')
  if (!origin) {
    return false
  }
  try {
    const parsedOrigin = new URL(origin)
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = forwardedHost || request.headers.get('host') || request.nextUrl.host
    return parsedOrigin.host !== host
  } catch {
    return true
  }
}

const SubredditSchema = z
  .string()
  .min(1)
  .max(500)
  .refine(
    val => {
      const subreddits = val.split('+')
      if (subreddits.length === 0 || subreddits.length > MAX_MULTI_SUBREDDITS) {
        return false
      }
      return subreddits.every(
        sub => sub.length > 0 && sub.length <= 100 && SUBREDDIT_NAME_REGEX.test(sub)
      )
    },
    {
      message:
        'Subreddit name(s) can only contain alphanumeric characters, underscores, hyphens, and plus signs. Each subreddit must be <=100 characters.',
    }
  )

const SortSchema = z.enum(['hot', 'new', 'top', 'rising', 'relevance']).default('hot')

const TimePeriodSchema = z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).optional()

const LimitSchema = z
  .string()
  .transform(val => {
    const num = Number.parseInt(val, 10)
    if (Number.isNaN(num) || num < 1 || num > 100) {
      return '100'
    }
    return num.toString()
  })
  .default('100')

const AfterSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_]+$/)
  .max(50)
  .optional()

const PermalinkSchema = z.string().refine(isValidRedditPermalink, {
  message: 'Invalid permalink format',
})

const SearchQuerySchema = z
  .string()
  .trim()
  .min(1, 'Search query cannot be empty')
  .max(200, 'Search query is too long')

const GetSubredditPostsSchema = z.object({
  after: AfterSchema,
  limit: LimitSchema,
  sort: SortSchema,
  subreddit: SubredditSchema,
  timePeriod: TimePeriodSchema,
})

const SearchRedditSchema = z.object({
  after: AfterSchema,
  limit: LimitSchema,
  query: SearchQuerySchema,
  sort: SortSchema,
  timePeriod: TimePeriodSchema,
})

const GetCommentsSchema = z.object({
  permalink: PermalinkSchema,
})

function normalizeSubredditPath(subreddit: string): string {
  const unique = [
    ...new Set(
      subreddit
        .split('+')
        .map(sub => sub.trim().toLowerCase())
        .filter(Boolean)
    ),
  ].sort()
  return unique.join('+')
}

function fetchSubredditPostsCached(
  subreddit: string,
  sort: string,
  timePeriod: string | undefined,
  after: string | undefined,
  limit: string
) {
  const canonicalSubreddit = normalizeSubredditPath(subreddit)
  const cacheKey = `sub:${canonicalSubreddit}:${sort}:${timePeriod ?? ''}:${after ?? ''}:${limit}`

  return withSharedCache(cacheKey, async () => {
    const params = new URLSearchParams({ limit })
    if (timePeriod) {
      params.append('t', timePeriod)
    }
    if (after) {
      params.append('after', after)
    }

    const response = await redditApiFetch(`/r/${canonicalSubreddit}/${sort}`, params)

    if (!response.ok) {
      await handleRedditApiError(response)
    }

    return slimListingResponse(await response.json())
  })
}

function searchRedditCached(
  query: string,
  sort: string,
  timePeriod: string | undefined,
  after: string | undefined,
  limit: string
) {
  const normalizedQuery = query.trim().toLowerCase()
  const cacheKey = `search:${normalizedQuery}:${sort}:${timePeriod ?? ''}:${after ?? ''}:${limit}`

  return withSharedCache(cacheKey, async () => {
    const params = new URLSearchParams({
      limit,
      q: query,
      sort,
      ...(timePeriod && { t: timePeriod }),
      ...(after && { after }),
    })

    const response = await redditApiFetch('/search', params)

    if (!response.ok) {
      await handleRedditApiError(response)
    }

    return slimListingResponse(await response.json())
  })
}

function getCommentsCached(permalink: string) {
  const cacheKey = `comments:${permalink}`

  return withSharedCache(cacheKey, async () => {
    const params = new URLSearchParams({ depth: '10', limit: '100', sort: 'top' })

    const response = await redditApiFetch(permalink, params)

    if (!response.ok) {
      await handleRedditApiError(response)
    }

    const data = await response.json()
    const commentsData = data[1]?.data?.children || []
    const formattedComments = parseComments(commentsData)

    return {
      comments: formattedComments,
      count: formattedComments.length,
    }
  })
}

function parseComments(children: any[]): any[] {
  const comments: any[] = []

  for (const item of children) {
    if (item.kind !== 't1') {
      continue
    }

    const comment = item.data

    if (comment.author === 'AutoModerator' || comment.author === '[deleted]') {
      continue
    }

    const formattedComment = {
      author: comment.author,
      body: comment.body,
      created_ago: formatTimeAgo(comment.created_utc),
      id: comment.id,
      replies: [] as any[],
      score: comment.score,
    }

    if (comment.replies?.data?.children) {
      formattedComment.replies = parseComments(comment.replies.data.children)
    }

    comments.push(formattedComment)
  }

  return comments
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60)
  const hours = Math.floor(diff / 3600)
  const days = Math.floor(diff / 86_400)
  const months = Math.floor(diff / 2_592_000)
  const years = Math.floor(diff / 31_536_000)

  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''} ago`
  }
  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''} ago`
  }
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }
  return 'just now'
}

function getErrorStatusCode(statusCode?: number): number {
  if (
    statusCode === 400 ||
    statusCode === 403 ||
    statusCode === 404 ||
    statusCode === 429 ||
    statusCode === 503
  ) {
    return statusCode
  }
  return 502
}

export async function GET(request: NextRequest) {
  if (isCrossSiteRequest(request)) {
    return NextResponse.json(
      { error: 'Cross-origin requests are not allowed.' },
      { headers: ERROR_HEADERS, status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const after = searchParams.get('after') ?? undefined
  const limit = searchParams.get('limit') ?? '100'
  const timePeriod = searchParams.get('t') ?? undefined
  const subredditParam =
    searchParams.get('subreddit') ?? searchParams.get('subreddits') ?? searchParams.get('r')

  try {
    if (searchParams.has('permalink')) {
      const validated = GetCommentsSchema.parse({
        permalink: searchParams.get('permalink') ?? '',
      })
      const data = await getCommentsCached(validated.permalink)
      return NextResponse.json(data, { headers: CACHE_HEADERS })
    }

    if (searchParams.has('q')) {
      const validated = SearchRedditSchema.parse({
        after,
        limit,
        query: searchParams.get('q') ?? '',
        sort: searchParams.get('sort') ?? 'relevance',
        timePeriod,
      })
      const data = await searchRedditCached(
        validated.query,
        validated.sort,
        validated.timePeriod,
        validated.after,
        validated.limit
      )
      return NextResponse.json(data, { headers: CACHE_HEADERS })
    }

    if (subredditParam !== null) {
      const validated = GetSubredditPostsSchema.parse({
        after,
        limit,
        sort: searchParams.get('sort') ?? 'hot',
        subreddit: subredditParam,
        timePeriod,
      })
      const data = await fetchSubredditPostsCached(
        validated.subreddit,
        validated.sort,
        validated.timePeriod,
        validated.after,
        validated.limit
      )
      return NextResponse.json(data, { headers: CACHE_HEADERS })
    }

    return NextResponse.json(
      { error: 'Provide a subreddit, search query, or permalink.' },
      { headers: ERROR_HEADERS, status: 400 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: `Invalid input: ${error.issues.map(issue => issue.message).join(', ')}` },
        { headers: ERROR_HEADERS, status: 400 }
      )
    }

    if (isRedditError(error)) {
      const status = getErrorStatusCode(error.statusCode)
      return NextResponse.json(
        { error: error.getUserMessage() },
        { headers: ERROR_HEADERS, status }
      )
    }

    return NextResponse.json(
      { error: 'Reddit could not be reached. Please try again.' },
      { headers: ERROR_HEADERS, status: 503 }
    )
  }
}
