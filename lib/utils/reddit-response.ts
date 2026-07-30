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
  if (!data?.data?.children) return data

  return {
    kind: data.kind,
    data: {
      after: data.data.after,
      before: data.data.before,
      dist: data.data.dist,
      children: data.data.children.map((child: any) => ({
        kind: child.kind,
        data: child.data ? slimPostData(child.data) : child.data,
      })),
    },
  }
}

function slimPostData(data: Record<string, unknown>) {
  const preview = data.preview as { images?: Array<{ source?: { url?: string } }> } | undefined

  return {
    id: data.id,
    name: data.name,
    title: data.title,
    author: data.author,
    url: data.url,
    domain: data.domain,
    thumbnail: data.thumbnail,
    score: data.score,
    ups: data.ups,
    downs: data.downs,
    created_utc: data.created_utc,
    num_comments: data.num_comments,
    subreddit: data.subreddit,
    permalink: data.permalink,
    is_self: data.is_self,
    selftext: data.selftext,
    selftext_html: data.selftext_html,
    media: data.media,
    preview: preview?.images?.[0]?.source?.url
      ? { images: [{ source: { url: preview.images[0].source.url } }] }
      : undefined,
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

  for (let attempt = 0; attempt <= retries; attempt++) {
    lastResponse = await fetch(url, { headers, cache: 'no-store' })

    if (lastResponse.ok || lastResponse.status < 500) {
      return lastResponse
    }

    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }

  return lastResponse!
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

  const buildHeaders = (token: string): HeadersInit => ({
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
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
