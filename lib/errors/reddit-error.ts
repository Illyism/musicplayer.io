/**
 * Custom error class for Reddit API errors
 * This ensures errors are properly serialized and can be shown to users
 *
 * Note: Next.js Server Actions serialize errors, so we ensure the message
 * contains all necessary information in a plain string format.
 */
export class RedditError extends Error {
  readonly statusCode?: number
  readonly reason?: string

  constructor(message: string, statusCode?: number, reason?: string, options?: ErrorOptions) {
    // Include all info in the message for Next.js serialization
    const fullMessage = reason || message
    super(fullMessage, options)
    this.name = 'RedditError'
    this.statusCode = statusCode
    this.reason = reason
    // Ensure the error message is properly serializable
    Object.setPrototypeOf(this, RedditError.prototype)
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    if (this.reason) {
      return this.reason
    }
    if (this.statusCode === 403) {
      return 'Access denied. The subreddit may be private or you may be rate-limited.'
    }
    if (this.statusCode === 429) {
      return 'Rate limited. Please try again in a few minutes.'
    }
    if (this.statusCode === 404) {
      return 'Subreddit or post not found.'
    }
    return this.message || 'An error occurred while fetching from Reddit.'
  }

  /**
   * Convert to a plain object for serialization
   */
  toJSON() {
    return {
      message: this.getUserMessage(),
      name: this.name,
      reason: this.reason,
      statusCode: this.statusCode,
    }
  }
}

/**
 * Check if an error is a RedditError
 */
export function isRedditError(error: unknown): error is RedditError {
  return error instanceof RedditError
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (isRedditError(error)) {
    return error.getUserMessage()
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred.'
}
