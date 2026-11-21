import { RedditError } from '@/lib/errors/reddit-error'

export interface RedditComment {
  author: string
  body: string
  created_ago: string
  id: string
  replies: RedditComment[]
  score: number
}

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
    throw new RedditError(message, { statusCode: response.status, reason: message })
  }
  return data as T
}

export function getSubredditPosts(
  subreddit: string,
  sort = 'hot',
  timePeriod?: string,
  after?: string
) {
  const params = new URLSearchParams({
    limit: '100',
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
  after?: string
) {
  const params = new URLSearchParams({
    limit: '100',
    q: query,
    sort,
    ...(timePeriod && { t: timePeriod }),
    ...(after && { after }),
  })
  return requestRedditApi<any>(params)
}

export function getComments(permalink: string) {
  const params = new URLSearchParams({ permalink })
  return requestRedditApi<{ comments: RedditComment[]; count: number }>(params)
}
