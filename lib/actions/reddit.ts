import { RedditError } from '@/lib/errors/reddit-error'

async function requestRedditApi(params: URLSearchParams) {
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
  return data
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
  return requestRedditApi(params)
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
  return requestRedditApi(params)
}
