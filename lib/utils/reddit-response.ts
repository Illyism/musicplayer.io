import { RedditError } from '@/lib/errors/reddit-error'
import {
  getAppAccessToken,
  invalidateAppAccessToken,
  REDDIT_API_BASE,
  USER_AGENT,
} from './reddit-token'

const MINUTE_MS = 60_000
const REQUEST_BUDGET = 60
const QUOTA_RESERVE = 5
const REQUEST_TIMEOUT_MS = 8000
let windowStartsAt = Date.now()
let usedInWindow = 0
let blockedUntil = 0

function reserveApiRequest() {
  const now = Date.now()
  if (now - windowStartsAt >= MINUTE_MS) {
    windowStartsAt = now
    usedInWindow = 0
  }
  if (now < blockedUntil || usedInWindow >= REQUEST_BUDGET) {
    throw new RedditError(
      'Rate limited (429). Please try again later.',
      429,
      'You are making too many requests. Please wait a few minutes before trying again.'
    )
  }
  usedInWindow += 1
}

function observeApiQuota(response: Response) {
  const remainingHeader = response.headers.get('x-ratelimit-remaining')
  const remaining = remainingHeader === null ? Number.NaN : Number(remainingHeader)
  const resetSeconds = Number(response.headers.get('x-ratelimit-reset')) || 60
  if (response.status === 429 || (Number.isFinite(remaining) && remaining <= QUOTA_RESERVE)) {
    blockedUntil = Date.now() + Math.max(1, resetSeconds) * 1000
  }
}

export function resolveRedditApiUrl(path: string, params: URLSearchParams): string {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('..') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#')
  ) {
    throw new RedditError('Invalid Reddit API path.', 400, 'Invalid request path.')
  }
  const targetUrl = new URL(path, REDDIT_API_BASE)
  if (targetUrl.origin !== REDDIT_API_BASE || targetUrl.pathname !== path) {
    throw new RedditError('Invalid Reddit API path.', 400, 'Invalid request path.')
  }
  targetUrl.search = params.toString()
  return targetUrl.href
}

/**
 * Slim Reddit listing responses before caching.
 * Full search results (limit=100) can exceed Next.js's 2MB cache limit.
 */
export function slimListingResponse(data: any): any {
  if (!data?.data?.children) {
    return data
  }

  return {
    data: {
      after: data.data.after,
      before: data.data.before,
      children: data.data.children.map((child: any) => ({
        data: child.data ? slimPostData(child.data) : child.data,
        kind: child.kind,
      })),
      dist: data.data.dist,
    },
    kind: data.kind,
  }
}

function slimPostData(data: Record<string, unknown>) {
  const preview = data.preview as { images?: Array<{ source?: { url?: string } }> } | undefined

  return {
    author: data.author,
    created_utc: data.created_utc,
    domain: data.domain,
    downs: data.downs,
    id: data.id,
    is_self: data.is_self,
    media: data.media,
    name: data.name,
    num_comments: data.num_comments,
    permalink: data.permalink,
    preview: preview?.images?.[0]?.source?.url
      ? { images: [{ source: { url: preview.images[0].source.url } }] }
      : undefined,
    score: data.score,
    selftext: data.selftext,
    subreddit: data.subreddit,
    thumbnail: data.thumbnail,
    title: data.title,
    ups: data.ups,
    url: data.url,
  }
}

/**
 * Fetch from Reddit with retries on transient 5xx errors.
 * Uses no-store since callers rely on Next.js "use cache" for caching.
 */
export async function redditFetch(
  url: string,
  headers: HeadersInit,
  retries = 2
): Promise<Response> {
  let lastResponse: Response | undefined

  // Retries are inherently sequential — each attempt depends on the previous failure
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    reserveApiRequest()
    // biome-ignore lint/performance/noAwaitInLoops: sequential retry with backoff
    lastResponse = await fetch(url, {
      cache: 'no-store',
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    observeApiQuota(lastResponse)

    if (lastResponse.ok || lastResponse.status < 500) {
      return lastResponse
    }

    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }

  if (!lastResponse) {
    throw new Error('Reddit API did not return a response')
  }
  return lastResponse
}

/**
 * Fetch an oauth.reddit.com endpoint with the app-only bearer token.
 * A rejected token (401) is retried once with a freshly minted app token.
 */
export async function redditApiFetch(path: string, params: URLSearchParams): Promise<Response> {
  // raw_json=1 stops Reddit HTML-escaping &, < and > in titles and selftext
  params.set('raw_json', '1')
  const url = resolveRedditApiUrl(path, params)

  const buildHeaders = (bearerToken: string): HeadersInit => ({
    Accept: 'application/json',
    Authorization: `Bearer ${bearerToken}`,
    'User-Agent': USER_AGENT,
  })

  const token = await getAppAccessToken()
  const response = await redditFetch(url, buildHeaders(token))

  if (response.status !== 401) {
    return response
  }

  // Token was rejected — mint a fresh app token and try once more
  invalidateAppAccessToken()
  const freshToken = await getAppAccessToken(true)
  if (freshToken === token) {
    return response
  }

  return redditFetch(url, buildHeaders(freshToken))
}
