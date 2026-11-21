const MINUTE_MS = 60_000

export function createRequestQuota(budget: number, reserve: number) {
  let windowStartsAt = Date.now()
  let usedInWindow = 0
  let blockedUntil = 0

  return {
    isBlocked: () => Date.now() < blockedUntil,
    observe(response: Response) {
      const remainingHeader = response.headers.get('x-ratelimit-remaining')
      const remaining = remainingHeader === null ? Number.NaN : Number(remainingHeader)
      const resetSeconds = Number(response.headers.get('x-ratelimit-reset')) || 60
      if (response.status === 429 || (Number.isFinite(remaining) && remaining <= reserve)) {
        blockedUntil = Date.now() + Math.max(1, resetSeconds) * 1000
      }
    },
    take() {
      const now = Date.now()
      if (now - windowStartsAt >= MINUTE_MS) {
        windowStartsAt = now
        usedInWindow = 0
      }
      if (now < blockedUntil || usedInWindow >= budget) {
        return false
      }
      usedInWindow += 1
      return true
    },
  }
}
