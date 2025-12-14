'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { cacheLife } from 'next/cache'
import { handleRedditApiError } from '@/lib/utils/error-handler'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Validation schemas
const SubredditSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9_+-]+$/,
    'Subreddit name can only contain alphanumeric characters, underscores, hyphens, and plus signs'
  )
  .min(1)
  .max(100)

const SortSchema = z.enum(['hot', 'new', 'top', 'rising', 'relevance']).default('hot')

const TimePeriodSchema = z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).optional()

const LimitSchema = z
  .string()
  .transform(val => {
    const num = parseInt(val, 10)
    if (isNaN(num) || num < 1 || num > 100) return '100'
    return num.toString()
  })
  .default('100')

const AfterSchema = z.string().max(50).optional()

const PermalinkSchema = z
  .string()
  .regex(/^\/r\/[a-zA-Z0-9_/.-]+$|^\/user\/[a-zA-Z0-9_/.-]+$/, 'Invalid permalink format')
  .max(500)

const SearchQuerySchema = z
  .string()
  .trim()
  .min(1, 'Search query cannot be empty')
  .max(200, 'Search query is too long')

const GetSubredditPostsSchema = z.object({
  subreddit: SubredditSchema,
  sort: SortSchema,
  timePeriod: TimePeriodSchema,
  after: AfterSchema,
  limit: LimitSchema,
  accessToken: z.string().optional(),
})

const SearchRedditSchema = z.object({
  query: SearchQuerySchema,
  sort: SortSchema,
  timePeriod: TimePeriodSchema,
  after: AfterSchema,
  limit: LimitSchema,
  accessToken: z.string().optional(),
})

const GetCommentsSchema = z.object({
  permalink: PermalinkSchema,
  accessToken: z.string().optional(),
})

// Cached fetch functions - these cannot access cookies() directly
async function fetchSubredditPostsCached(
  subreddit: string,
  sort: string,
  timePeriod: string | undefined,
  after: string | undefined,
  limit: string,
  accessToken: string | undefined
) {
  'use cache'
  cacheLife('minutes') // Cache for 15 minutes (default)

  const baseUrl = accessToken ? 'https://oauth.reddit.com' : 'https://www.reddit.com'
  const headers: HeadersInit = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }

  const params = new URLSearchParams({ limit })
  if (timePeriod) params.append('t', timePeriod)
  if (after) params.append('after', after)

  const url = `${baseUrl}/r/${subreddit}/${sort}.json?${params}`

  const response = await fetch(url, {
    headers,
  })

  if (!response.ok) {
    await handleRedditApiError(response)
  }

  return response.json()
}

async function searchRedditCached(
  query: string,
  sort: string,
  timePeriod: string | undefined,
  after: string | undefined,
  limit: string,
  accessToken: string | undefined
) {
  'use cache'
  cacheLife('minutes') // Cache for 15 minutes (default)

  const baseUrl = accessToken ? 'https://oauth.reddit.com' : 'https://www.reddit.com'
  const headers: HeadersInit = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }

  const params = new URLSearchParams({
    q: query,
    limit,
    sort,
    ...(timePeriod && { t: timePeriod }),
    ...(after && { after }),
  })

  const url = `${baseUrl}/search.json?${params}`

  const response = await fetch(url, {
    headers,
  })

  if (!response.ok) {
    await handleRedditApiError(response)
  }

  return response.json()
}

async function getCommentsCached(permalink: string, accessToken: string | undefined) {
  'use cache'
  cacheLife('minutes') // Cache for 15 minutes (default)

  const baseUrl = accessToken ? 'https://oauth.reddit.com' : 'https://www.reddit.com'
  const headers: HeadersInit = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }

  const url = `${baseUrl}${permalink}.json?limit=100&depth=10&sort=top`

  const response = await fetch(url, {
    headers,
  })

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

// Public API functions - these read cookies and call cached functions
export async function getSubredditPosts(
  subreddit: string,
  sort: string = 'hot',
  timePeriod?: string,
  after?: string,
  limit: string = '100'
) {
  try {
    // Read cookies outside cached scope
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('reddit_access_token')?.value

    // Validate and transform inputs
    const validated = GetSubredditPostsSchema.parse({
      subreddit,
      sort,
      timePeriod,
      after,
      limit,
      accessToken,
    })

    // Call cached function with token as argument
    const data = await fetchSubredditPostsCached(
      validated.subreddit,
      validated.sort,
      validated.timePeriod,
      validated.after,
      validated.limit,
      validated.accessToken
    )

    return data
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      throw new Error(`Invalid input: ${error.issues.map(e => e.message).join(', ')}`)
    }
    // Re-throw RedditError as-is, it's already properly formatted
    throw error
  }
}

export async function searchReddit(
  query: string,
  sort: string = 'relevance',
  timePeriod?: string,
  after?: string,
  limit: string = '100'
) {
  try {
    // Read cookies outside cached scope
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('reddit_access_token')?.value

    // Validate and transform inputs
    const validated = SearchRedditSchema.parse({
      query,
      sort,
      timePeriod,
      after,
      limit,
      accessToken,
    })

    // Call cached function with token as argument
    const data = await searchRedditCached(
      validated.query,
      validated.sort,
      validated.timePeriod,
      validated.after,
      validated.limit,
      validated.accessToken
    )

    return data
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      throw new Error(`Invalid input: ${error.issues.map(e => e.message).join(', ')}`)
    }
    console.error('Reddit search error:', error)
    throw error instanceof Error ? error : new Error('Search failed')
  }
}

export async function getComments(permalink: string) {
  try {
    // Read cookies outside cached scope
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('reddit_access_token')?.value

    // Validate permalink
    const validated = GetCommentsSchema.parse({ permalink, accessToken })

    // Call cached function with token as argument
    return await getCommentsCached(validated.permalink, validated.accessToken)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      throw new Error(`Invalid permalink: ${error.issues.map(e => e.message).join(', ')}`)
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
    if (item.kind !== 't1') continue

    const comment = item.data

    // Skip AutoModerator and deleted
    if (comment.author === 'AutoModerator' || comment.author === '[deleted]') {
      continue
    }

    const formattedComment = {
      id: comment.id,
      author: comment.author,
      body: comment.body,
      body_html: comment.body_html,
      score: comment.score,
      created_utc: comment.created_utc,
      created_ago: formatTimeAgo(comment.created_utc),
      replies: [], // Will be filled below
    }

    // Parse nested replies
    if (comment.replies && comment.replies.data && comment.replies.data.children) {
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
  const days = Math.floor(diff / 86400)
  const months = Math.floor(diff / 2592000)
  const years = Math.floor(diff / 31536000)

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'just now'
}
