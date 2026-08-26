/**
 * Result type for Server Actions
 * Instead of throwing errors, return success/error results
 * This ensures errors are properly serialized in production
 */

export type Result<T, E = string> = { success: true; data: T } | { success: false; error: E }

/**
 * Create a success result
 */
export function success<T>(data: T): Result<T> {
  return { data, success: true }
}

/**
 * Create an error result
 */
export function failure<E>(error: E): Result<never, E> {
  return { error, success: false }
}

/**
 * Unwrap a result, throwing if it's an error
 * Use this when you want to maintain throwing behavior
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.success) {
    return result.data
  }
  throw new Error(typeof result === 'string' ? result : JSON.stringify(result))
}
