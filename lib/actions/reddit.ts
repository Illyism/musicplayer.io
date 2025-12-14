'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function getHeaders() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('reddit_access_token')?.value

  return {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

async function getBaseUrl() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('reddit_access_token')?.value
  return accessToken ? 'https://oauth.reddit.com' : 'https://www.reddit.com'
}

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
})

const SearchRedditSchema = z.object({
  query: SearchQuerySchema,
  sort: SortSchema,
  timePeriod: TimePeriodSchema,
  after: AfterSchema,
  limit: LimitSchema,
})

const GetCommentsSchema = z.object({
  permalink: PermalinkSchema,
})

export async function getSubredditPosts(
  subreddit: string,
  sort: string = 'hot',
  timePeriod?: string,
  after?: string,
  limit: string = '100'
) {
  try {
    // Validate and transform inputs
    const validated = GetSubredditPostsSchema.parse({
      subreddit,
      sort,
      timePeriod,
      after,
      limit,
    })

    const baseUrl = await getBaseUrl()
    const headers = await getHeaders()

    const params = new URLSearchParams({ limit: validated.limit })
    if (validated.timePeriod) params.append('t', validated.timePeriod)
    if (validated.after) params.append('after', validated.after)

    const url = `${baseUrl}/r/${validated.subreddit}/${validated.sort}.json?${params}`

    const response = await fetch(url, {
      headers,
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied (403). Rate limited or private subreddit.')
      }
      throw new Error(`Reddit API error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`)
    }
    console.error('Reddit API error:', error)
    throw error instanceof Error ? error : new Error('Failed to fetch from Reddit')
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
    // Validate and transform inputs
    const validated = SearchRedditSchema.parse({
      query,
      sort,
      timePeriod,
      after,
      limit,
    })

    const baseUrl = await getBaseUrl()
    const headers = await getHeaders()

    const params = new URLSearchParams({
      q: validated.query,
      limit: validated.limit,
      sort: validated.sort,
      ...(validated.timePeriod && { t: validated.timePeriod }),
      ...(validated.after && { after: validated.after }),
    })

    const url = `${baseUrl}/search.json?${params}`

    const response = await fetch(url, {
      headers,
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`)
    }
    console.error('Reddit search error:', error)
    throw error instanceof Error ? error : new Error('Search failed')
  }
}

export async function getComments(permalink: string) {
  try {
    // Validate permalink
    const validated = GetCommentsSchema.parse({ permalink })

    const baseUrl = await getBaseUrl()
    const headers = await getHeaders()

    const url = `${baseUrl}${validated.permalink}.json?limit=100&depth=10&sort=top`

    const response = await fetch(url, {
      headers,
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`)
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      throw new Error(`Invalid permalink: ${error.errors.map(e => e.message).join(', ')}`)
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
