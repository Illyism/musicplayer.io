export interface RedditErrorOptions extends ErrorOptions {
  reason?: string
  statusCode?: number
}

export class RedditError extends Error {
  readonly statusCode?: number
  readonly reason?: string

  constructor(message: string, { reason, statusCode, ...errorOptions }: RedditErrorOptions = {}) {
    super(reason || message, errorOptions)
    this.name = 'RedditError'
    this.statusCode = statusCode
    this.reason = reason
  }

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

  toJSON() {
    return {
      message: this.getUserMessage(),
      name: this.name,
      reason: this.reason,
      statusCode: this.statusCode,
    }
  }
}

export function isRedditError(error: unknown): error is RedditError {
  return error instanceof RedditError
}

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
