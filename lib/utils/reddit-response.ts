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

const CONTROL_CHAR_REGEX = /\p{Cc}/u
const ENCODED_SEPARATOR_REGEX = /%(?:2f|5c)/i
const REDDIT_PERMALINK_REGEX =
  /^\/(?:r\/[a-zA-Z0-9_-]{1,100}|user\/[a-zA-Z0-9_-]{1,50})\/comments\/[a-zA-Z0-9]{1,13}\/([^/?#\\]+?)(?:\/([a-zA-Z0-9]{1,13}))?\/?$/u

function hasDotPathSegment(path: string): boolean {
  return path.split('/').some(segment => segment === '.' || segment === '..')
}

export function isValidRedditPermalink(val: string): boolean {
  if (
    val.length <= 3 ||
    val.length > 500 ||
    !val.startsWith('/') ||
    val.startsWith('//') ||
    val.includes('//') ||
    val.includes('\\') ||
    val.includes('?') ||
    val.includes('#') ||
    CONTROL_CHAR_REGEX.test(val) ||
    ENCODED_SEPARATOR_REGEX.test(val) ||
    hasDotPathSegment(val)
  ) {
    return false
  }

  const match = REDDIT_PERMALINK_REGEX.exec(val)
  if (!match) {
    return false
  }

  const [, rawSlug] = match
  let decodedSlug: string
  try {
    decodedSlug = decodeURIComponent(rawSlug)
  } catch {
    return false
  }

  if (
    decodedSlug.length === 0 ||
    decodedSlug.length > 200 ||
    decodedSlug === '.' ||
    decodedSlug === '..' ||
    decodedSlug.includes('/') ||
    decodedSlug.includes('\\') ||
    decodedSlug.includes('?') ||
    decodedSlug.includes('#') ||
    CONTROL_CHAR_REGEX.test(decodedSlug)
  ) {
    return false
  }

  try {
    const parsed = new URL(val, REDDIT_API_BASE)
    const decodedPathname = decodeURI(parsed.pathname)
    return (
      parsed.origin === REDDIT_API_BASE &&
      decodedPathname === decodeURI(val) &&
      parsed.search === '' &&
      parsed.hash === '' &&
      !hasDotPathSegment(decodedPathname)
    )
  } catch {
    return false
  }
}

export function resolveRedditApiUrl(path: string, params: URLSearchParams): string {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('//') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#') ||
    CONTROL_CHAR_REGEX.test(path) ||
    ENCODED_SEPARATOR_REGEX.test(path) ||
    hasDotPathSegment(path)
  ) {
    throw new RedditError('Invalid Reddit API path.', 400, 'Invalid request path.')
  }
  let targetUrl: URL
  let decodedPathname: string
  let decodedInputPath: string
  try {
    targetUrl = new URL(path, REDDIT_API_BASE)
    decodedPathname = decodeURI(targetUrl.pathname)
    decodedInputPath = decodeURI(path)
  } catch (error) {
    // biome-ignore lint/style/useErrorCause: cause forwarded via RedditError's ErrorOptions
    throw new RedditError('Invalid Reddit API path.', 400, 'Invalid request path.', {
      cause: error,
    })
  }
  if (
    targetUrl.origin !== REDDIT_API_BASE ||
    decodedPathname !== decodedInputPath ||
    targetUrl.search !== '' ||
    targetUrl.hash !== '' ||
    hasDotPathSegment(decodedPathname) ||
    CONTROL_CHAR_REGEX.test(decodedPathname)
  ) {
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
