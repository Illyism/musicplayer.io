import { createRequestQuota } from '@/lib/utils/reddit-quota'
import {
  getAppAccessToken,
  invalidateAppAccessToken,
  REDDIT_API_BASE,
  USER_AGENT,
} from '@/lib/utils/reddit-token'

const quota = createRequestQuota(40, 10)

class DiscoveryUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DiscoveryUnavailableError'
  }
}

async function fetchWithToken(
  path: string,
  params: URLSearchParams,
  token: string
): Promise<Response> {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('..') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#')
  ) {
    throw new DiscoveryUnavailableError('Invalid Reddit discovery path.')
  }
  const targetUrl = new URL(path, REDDIT_API_BASE)
  if (targetUrl.origin !== REDDIT_API_BASE || targetUrl.pathname !== path) {
    throw new DiscoveryUnavailableError('Invalid Reddit discovery path.')
  }
  if (!quota.take()) {
    throw new DiscoveryUnavailableError('Reddit discovery is cooling down to respect API limits.')
  }
  params.set('raw_json', '1')
  targetUrl.search = params.toString()
  const response = await fetch(targetUrl.href, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
  })
  quota.observe(response)
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

export async function requestCommunityData(
  path: string,
  params: URLSearchParams
): Promise<unknown> {
  if (quota.isBlocked()) {
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
