import {
  getAppAccessToken,
  invalidateAppAccessToken,
  REDDIT_API_BASE,
  USER_AGENT,
} from './reddit-token'

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
    selftext_html: data.selftext_html,
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
    // biome-ignore lint/performance/noAwaitInLoops: sequential retry with backoff
    lastResponse = await fetch(url, { cache: 'no-store', headers })

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
 * Fetch an oauth.reddit.com endpoint with a bearer token.
 *
 * Uses the signed-in user's token when present, otherwise an app-only token.
 * A rejected token (401/403) is retried once with a freshly minted app token,
 * which covers both an expired app token and a stale user cookie.
 */
export async function redditApiFetch(
  path: string,
  params: URLSearchParams,
  accessToken?: string
): Promise<Response> {
  // raw_json=1 stops Reddit HTML-escaping &, < and > in titles and selftext
  params.set('raw_json', '1')
  const url = `${REDDIT_API_BASE}${path}?${params}`

  const buildHeaders = (bearerToken: string): HeadersInit => ({
    Accept: 'application/json',
    Authorization: `Bearer ${bearerToken}`,
    'User-Agent': USER_AGENT,
  })

  const token = accessToken ?? (await getAppAccessToken())
  const response = await redditFetch(url, buildHeaders(token))

  if (response.status !== 401 && response.status !== 403) {
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
