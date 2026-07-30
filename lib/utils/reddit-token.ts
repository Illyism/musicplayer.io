import { RedditError } from '@/lib/errors/reddit-error'

// Reddit requires User-Agent in format: <platform>:<app ID>:<version> (by /u/<username>)
const REDDIT_USERNAME = process.env.REDDIT_USERNAME || 'musicplayer'
export const USER_AGENT = `web:musicplayer.io:v0.6.14 (by /u/${REDDIT_USERNAME})`

// All data requests go through oauth.reddit.com. The public www.reddit.com/*.json
// endpoints now reject anonymous traffic with 403, so a token is always required.
export const REDDIT_API_BASE = 'https://oauth.reddit.com'

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET

// Refresh a little before the real expiry so an in-flight request never races it
const EXPIRY_SKEW_MS = 60_000

let cachedToken: { token: string; expiresAt: number } | null = null
let inflight: Promise<string> | null = null

/**
 * Get an app-only ("client credentials") access token.
 *
 * This is what unauthenticated visitors use. Reddit blocks anonymous access to
 * the .json endpoints, and Basic auth is only accepted by /api/v1/access_token —
 * sending it to a data endpoint is what produces a 403.
 *
 * Tokens are cached in module scope and shared across requests until they expire.
 */
export async function getAppAccessToken(forceRefresh = false): Promise<string> {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    throw new RedditError(
      'Reddit API credentials are not configured.',
      500,
      'Server is missing REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET.'
    )
  }

  if (forceRefresh) {
    cachedToken = null
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  // Collapse concurrent misses into a single token request
  if (inflight) {
    return inflight
  }

  inflight = (async () => {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        Authorization: 'Basic ' + btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new RedditError(
        `Failed to obtain Reddit app token (${response.status}). ${body}`.trim(),
        response.status,
        'Could not authenticate with Reddit. Check the app credentials.'
      )
    }

    const data = (await response.json()) as { access_token?: string; expires_in?: number }

    if (!data.access_token) {
      throw new RedditError(
        'Reddit returned no access token.',
        502,
        'Could not authenticate with Reddit. Check the app credentials.'
      )
    }

    const ttlMs = (data.expires_in ?? 3600) * 1000
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + Math.max(ttlMs - EXPIRY_SKEW_MS, 30_000),
    }

    return data.access_token
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/**
 * Drop the cached app token, e.g. after Reddit rejects it with a 401.
 */
export function invalidateAppAccessToken(): void {
  cachedToken = null
}
