import { RedditError } from '@/lib/errors/reddit-error'

async function requestRedditApi<T>(params: URLSearchParams): Promise<T> {
  const response = await fetch(`/api/reddit?${params.toString()}`, {
    credentials: 'same-origin',
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof data?.error === 'string' && data.error.length > 0
        ? data.error
        : `Reddit API error: ${response.status}`
    throw new RedditError(message, response.status, message)
  }
  return data as T
}

export function getSubredditPosts(
  subreddit: string,
  sort = 'hot',
  timePeriod?: string,
  after?: string,
  limit = '100'
) {
  const params = new URLSearchParams({
    limit,
    sort,
    subreddit,
    ...(timePeriod && { t: timePeriod }),
    ...(after && { after }),
  })
  return requestRedditApi<any>(params)
}

export function searchReddit(
  query: string,
  sort = 'relevance',
  timePeriod?: string,
  after?: string,
  limit = '100'
) {
  const params = new URLSearchParams({
    limit,
    q: query,
    sort,
    ...(timePeriod && { t: timePeriod }),
    ...(after && { after }),
  })
  return requestRedditApi<any>(params)
}

export function getComments(permalink: string) {
  const params = new URLSearchParams({ permalink })
  return requestRedditApi<{ comments: any[]; count: number }>(params)
}
