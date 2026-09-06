'use server'

import { cacheLife } from 'next/cache'
import { z } from 'zod'
import { handleRedditApiError } from '@/lib/utils/error-handler'
import { redditApiFetch, slimListingResponse } from '@/lib/utils/reddit-response'

// Every request goes through oauth.reddit.com with a bearer token.
// Cached listing/search/comment reads use the app-only token so the remote
// cache is shared instead of keyed per user OAuth token.
if (!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)) {
  throw new Error(
    'Missing REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET environment variables. Required for Reddit API calls.'
  )
}

// Validation schemas
const SUBREDDIT_NAME_REGEX = /^[a-zA-Z0-9_+-]+$/

const SubredditSchema = z
  .string()
  .min(1)
  .max(500) // Allow longer strings for multi-subreddit queries (e.g., "sub1+sub2+sub3")
  .refine(
    val => {
      // Split by + to handle multi-subreddit queries
      const subreddits = val.split('+')
      // Validate each individual subreddit
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

const AfterSchema = z.string().max(50).optional()

const REDDIT_PATH_REGEX = /^\/(r|user)\/.+$/

const PermalinkSchema = z.string().refine(
  val => {
    // Must start with /r/ or /user/
    if (!(val.startsWith('/r/') || val.startsWith('/user/'))) {
      return false
    }
    // Must be a valid path - allow most URL-safe characters
    // Reddit permalinks can contain various characters in post titles and paths
    // Examples: /r/subreddit/comments/post_id/title/ or /r/subreddit/comments/post_id/title/comment_id/
    const isValidPath = REDDIT_PATH_REGEX.test(val)
    return isValidPath && val.length <= 500 && val.length > 3
  },
  { message: 'Invalid permalink format' }
)

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

// Cached fetch functions - these cannot access cookies() directly
async function fetchSubredditPostsCached(
  subreddit: string,
  sort: string,
  timePeriod: string | undefined,
  after: string | undefined,
  limit: string
) {
  'use cache: remote'
  cacheLife('hours') // Cache for hours - Reddit data updated multiple times per day

  const params = new URLSearchParams({ limit })
  if (timePeriod) {
    params.append('t', timePeriod)
  }
  if (after) {
    params.append('after', after)
  }

  const response = await redditApiFetch(`/r/${subreddit}/${sort}`, params)

  if (!response.ok) {
    await handleRedditApiError(response)
  }

  return slimListingResponse(await response.json())
}

async function searchRedditCached(
  query: string,
  sort: string,
  timePeriod: string | undefined,
  after: string | undefined,
  limit: string
) {
  'use cache: remote'
  cacheLife('hours') // Cache for hours - Reddit search results updated multiple times per day

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
}

async function getCommentsCached(permalink: string) {
  'use cache: remote'
  cacheLife('hours') // Cache for hours - Comments updated multiple times per day

  const params = new URLSearchParams({ depth: '10', limit: '100', sort: 'top' })

  const response = await redditApiFetch(permalink, params)

  if (!response.ok) {
    await handleRedditApiError(response)
  }

  const data = await response.json()

  // Reddit returns [post, comments] array
  const commentsData = data[1]?.data?.children || []

  // Recursively parse comments and replies
  const formattedComments = parseComments(commentsData)

  return {
    comments: formattedComments,
    count: formattedComments.length,
  }
}

// Public API functions - cached fetches use the app-only token so listings are shared.
export async function getSubredditPosts(
  subreddit: string,
  sort = 'hot',
  timePeriod?: string,
  after?: string,
  limit = '100'
) {
  try {
    const validated = GetSubredditPostsSchema.parse({
      after,
      limit,
      sort,
      subreddit,
      timePeriod,
    })

    const data = await fetchSubredditPostsCached(
      validated.subreddit,
      validated.sort,
      validated.timePeriod,
      validated.after,
      validated.limit
    )

    return data
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      throw new Error(`Invalid input: ${error.issues.map(e => e.message).join(', ')}`, {
        cause: error,
      })
    }
    // Re-throw RedditError as-is, it's already properly formatted
    throw error
  }
}

export async function searchReddit(
  query: string,
  sort = 'relevance',
  timePeriod?: string,
  after?: string,
  limit = '100'
) {
  try {
    const validated = SearchRedditSchema.parse({
      after,
      limit,
      query,
      sort,
      timePeriod,
    })

    const data = await searchRedditCached(
      validated.query,
      validated.sort,
      validated.timePeriod,
      validated.after,
      validated.limit
    )

    return data
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      throw new Error(`Invalid input: ${error.issues.map(e => e.message).join(', ')}`, {
        cause: error,
      })
    }
    console.error('Reddit search error:', error)
    throw error instanceof Error ? error : new Error('Search failed')
  }
}

export async function getComments(permalink: string) {
  try {
    const validated = GetCommentsSchema.parse({ permalink })
    return await getCommentsCached(validated.permalink)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      throw new Error(`Invalid permalink: ${error.issues.map(e => e.message).join(', ')}`, {
        cause: error,
      })
    }
    console.error('Comments fetch error:', error)
    throw error instanceof Error ? error : new Error('Failed to fetch comments')
  }
}

/**
 * Recursively parse comments and their replies
 */
function parseComments(children: any[]): any[] {
  const comments: any[] = []

  for (const item of children) {
    // Skip non-comment items (like "more" links)
    if (item.kind !== 't1') {
      continue
    }

    const comment = item.data

    // Skip AutoModerator and deleted
    if (comment.author === 'AutoModerator' || comment.author === '[deleted]') {
      continue
    }

    const formattedComment = {
      author: comment.author,
      body: comment.body,
      body_html: comment.body_html,
      created_ago: formatTimeAgo(comment.created_utc),
      created_utc: comment.created_utc,
      id: comment.id,
      replies: [] as any[], // Will be filled below
      score: comment.score,
    }

    // Parse nested replies
    if (comment.replies?.data?.children) {
      formattedComment.replies = parseComments(comment.replies.data.children)
    }

    comments.push(formattedComment)
  }

  return comments
}

/**
 * Format timestamp to human readable time ago
 */
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
