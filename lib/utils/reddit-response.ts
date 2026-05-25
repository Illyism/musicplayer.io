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
