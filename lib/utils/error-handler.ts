import { RedditError, getErrorMessage, isRedditError } from '@/lib/errors/reddit-error'

/**
 * Handle Reddit API response errors
 * Extracts meaningful error messages from responses
 */
export async function handleRedditApiError(response: Response): Promise<never> {
  let errorMessage = `Reddit API error: ${response.status}`
  let reason: string | undefined

  // Try to get error details from response body
  try {
    const errorData = await response
      .clone()
      .json()
      .catch(() => null)
    if (errorData?.reason) {
      reason = errorData.reason
      errorMessage = errorData.reason
    } else if (errorData?.message) {
      reason = errorData.message
      errorMessage = errorData.message
    } else if (errorData?.error) {
      reason = typeof errorData.error === 'string' ? errorData.error : String(errorData.error)
      errorMessage = reason
    }
  } catch {
    // If JSON parsing fails, use default message
  }

  // Create specific error messages based on status code
  if (response.status === 403) {
    throw new RedditError(
      `Access denied (403). ${errorMessage}`,
      403,
      reason || 'The subreddit may be private or you may be rate-limited.'
    )
  }

  if (response.status === 429) {
    throw new RedditError(
      'Rate limited (429). Please try again later.',
      429,
      'You are making too many requests. Please wait a few minutes before trying again.'
    )
  }

  if (response.status === 404) {
    throw new RedditError(
      'Not found (404).',
      404,
      'The requested subreddit or post could not be found.'
    )
  }

  // Generic error
  throw new RedditError(errorMessage, response.status, reason)
}

/**
 * Wrap server action errors to ensure they're properly serialized
 */
export function wrapServerActionError<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      // Re-throw RedditError as-is (it's already serializable)
      if (isRedditError(error)) {
        throw error
      }
      // Wrap other errors
      const message = getErrorMessage(error)
      throw new RedditError(message)
    }
  }) as T
}
