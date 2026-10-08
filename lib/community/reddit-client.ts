import {
  getAppAccessToken,
  invalidateAppAccessToken,
  REDDIT_API_BASE,
  USER_AGENT,
} from '@/lib/utils/reddit-token'

const MINUTE_MS = 60_000
const REQUEST_BUDGET = 40
const QUOTA_RESERVE = 10
let windowStartsAt = Date.now()
let usedInWindow = 0
let blockedUntil = 0

export class DiscoveryUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DiscoveryUnavailableError'
  }
}

function reserveRequest() {
  const now = Date.now()
  if (now - windowStartsAt >= MINUTE_MS) {
    windowStartsAt = now
    usedInWindow = 0
  }
  if (now < blockedUntil || usedInWindow >= REQUEST_BUDGET) {
    throw new DiscoveryUnavailableError('Reddit discovery is cooling down to respect API limits.')
  }
  usedInWindow += 1
}

function observeQuota(response: Response) {
  const remainingHeader = response.headers.get('x-ratelimit-remaining')
  const remaining = remainingHeader === null ? Number.NaN : Number(remainingHeader)
  const resetSeconds = Number(response.headers.get('x-ratelimit-reset')) || 60
  if (response.status === 429 || (Number.isFinite(remaining) && remaining <= QUOTA_RESERVE)) {
    blockedUntil = Date.now() + Math.max(1, resetSeconds) * 1000
  }
}

async function fetchWithToken(
  path: string,
  params: URLSearchParams,
  token: string
): Promise<Response> {
  reserveRequest()
  params.set('raw_json', '1')
  const response = await fetch(`${REDDIT_API_BASE}${path}?${params}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(8000),
  })
  observeQuota(response)
  return response
}

async function getTokenWithinDeadline(forceRefresh = false): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new DiscoveryUnavailableError('Reddit discovery authentication timed out.')),
      12_000
    )
  })
  try {
    return await Promise.race([getAppAccessToken(forceRefresh), deadline])
  } finally {
    clearTimeout(timer)
  }
}

/** Existing app OAuth, no anonymous scraping and no retry loop on refused requests. */
export async function requestCommunityData(
  path: string,
  params: URLSearchParams
): Promise<unknown> {
  if (Date.now() < blockedUntil) {
    throw new DiscoveryUnavailableError('Reddit discovery is cooling down to respect API limits.')
  }
  const token = await getTokenWithinDeadline()
  let response = await fetchWithToken(path, params, token)
  if (response.status === 401) {
    invalidateAppAccessToken()
    const replacement = await getTokenWithinDeadline(true)
    response = await fetchWithToken(path, params, replacement)
  }
  if (!response.ok) {
    throw new DiscoveryUnavailableError(
      `Reddit discovery is unavailable (HTTP ${response.status}).`
    )
  }
  return response.json()
}
