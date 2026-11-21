import { getErrorMessage, isRedditError, RedditError } from '@/lib/errors/reddit-error'

export async function handleRedditApiError(response: Response): Promise<never> {
  let errorMessage = `Reddit API error: ${response.status}`
  let reason: string | undefined

  const errorData = await response.json().catch(() => null)
  if (errorData?.reason) {
    const { reason: apiReason } = errorData
    reason = apiReason
    errorMessage = apiReason
  } else if (errorData?.message) {
    reason = errorData.message
    errorMessage = errorData.message
  } else if (errorData?.error) {
    const detail = typeof errorData.error === 'string' ? errorData.error : String(errorData.error)
    reason = detail
    errorMessage = detail
  }

  if (response.status === 403) {
    throw new RedditError(`Access denied (403). ${errorMessage}`, {
      statusCode: 403,
      reason: reason || 'The subreddit may be private, quarantined, or banned.',
    })
  }

  if (response.status === 429) {
    throw new RedditError('Rate limited (429). Please try again later.', {
      statusCode: 429,
      reason: 'You are making too many requests. Please wait a few minutes before trying again.',
    })
  }

  if (response.status === 404 || (response.status >= 300 && response.status < 400)) {
    throw new RedditError('Not found (404).', {
      statusCode: 404,
      reason: 'The requested subreddit or post could not be found.',
    })
  }

  throw new RedditError(errorMessage, { statusCode: response.status, reason })
}

export function wrapServerActionError<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (isRedditError(error)) {
        throw error
      }
      const message = getErrorMessage(error)
      throw new RedditError(message, { cause: error })
    }
  }) as T
}
