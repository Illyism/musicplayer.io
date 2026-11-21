import { RedditError } from '@/lib/errors/reddit-error'
import { createRequestQuota } from './reddit-quota'
import {
  getAppAccessToken,
  invalidateAppAccessToken,
  REDDIT_API_BASE,
  USER_AGENT,
} from './reddit-token'

const REQUEST_TIMEOUT_MS = 5000
const RETRIES = 1
const quota = createRequestQuota(60, 5)

const CONTROL_CHAR_REGEX = /\p{Cc}/u
const ENCODED_SEPARATOR_REGEX = /%(?:2f|5c)/iu
function hasDotPathSegment(path: string): boolean {
  return path.split('/').some(segment => segment === '.' || segment === '..')
}

function isUnsafePath(path: string): boolean {
  return (
    !path.startsWith('/') ||
    path.includes('//') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#') ||
    CONTROL_CHAR_REGEX.test(path) ||
    ENCODED_SEPARATOR_REGEX.test(path) ||
    hasDotPathSegment(path)
  )
}

function resolveRedditApiUrl(path: string, params: URLSearchParams): string {
  if (isUnsafePath(path)) {
    throw new RedditError('Invalid Reddit API path.', {
      statusCode: 400,
      reason: 'Invalid request path.',
    })
  }
  let targetUrl: URL
  let decodedPathname: string
  let decodedInputPath: string
  try {
    targetUrl = new URL(path, REDDIT_API_BASE)
    decodedPathname = decodeURI(targetUrl.pathname)
    decodedInputPath = decodeURI(path)
  } catch (error) {
    throw new RedditError('Invalid Reddit API path.', {
      cause: error,
      statusCode: 400,
      reason: 'Invalid request path.',
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
    throw new RedditError('Invalid Reddit API path.', {
      statusCode: 400,
      reason: 'Invalid request path.',
    })
  }
  targetUrl.search = params.toString()
  return targetUrl.href
}

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
    id: data.id,
    is_self: data.is_self,
    name: data.name,
    permalink: data.permalink,
    preview: preview?.images?.[0]?.source?.url
      ? { images: [{ source: { url: preview.images[0].source.url } }] }
      : undefined,
    score: data.score,
    selftext: data.selftext,
    subreddit: data.subreddit,
    thumbnail: data.thumbnail,
    title: data.title,
    url: data.url,
  }
}

async function redditFetch(url: string, headers: HeadersInit): Promise<Response> {
  let lastResponse: Response | undefined
  let lastError: unknown

  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    if (!quota.take()) {
      throw new RedditError('Rate limited (429). Please try again later.', {
        statusCode: 429,
        reason: 'You are making too many requests. Please wait a few minutes before trying again.',
      })
    }
    try {
      // biome-ignore lint/performance/noAwaitInLoops: sequential retry with backoff
      lastResponse = await fetch(url, {
        cache: 'no-store',
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      quota.observe(lastResponse)

      if (lastResponse.ok || lastResponse.status < 500) {
        return lastResponse
      }
    } catch (error) {
      lastError = error
    }

    if (attempt < RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }

  if (!lastResponse) {
    throw lastError instanceof Error ? lastError : new Error('Reddit API did not return a response')
  }
  return lastResponse
}

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

  invalidateAppAccessToken()
  const freshToken = await getAppAccessToken(true)
  if (freshToken === token) {
    return response
  }

  return redditFetch(url, buildHeaders(freshToken))
}
