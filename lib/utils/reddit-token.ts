import { RedditError } from '@/lib/errors/reddit-error'

// Reddit requires User-Agent in format: <platform>:<app ID>:<version> (by /u/<username>)
const REDDIT_USERNAME = process.env.REDDIT_USERNAME || 'musicplayer'
export const USER_AGENT = `web:musicplayer.io:v0.6.14 (by /u/${REDDIT_USERNAME})`

export const REDDIT_API_BASE = 'https://oauth.reddit.com'

const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET } = process.env

const EXPIRY_SKEW_MS = 60_000

let cachedToken: { token: string; expiresAt: number } | null = null
let inflight: Promise<string> | null = null

export async function getAppAccessToken(forceRefresh = false): Promise<string> {
  if (!(REDDIT_CLIENT_ID && REDDIT_CLIENT_SECRET)) {
    throw new RedditError('Reddit API credentials are not configured.', {
      statusCode: 500,
      reason: 'Server is missing REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET.',
    })
  }

  if (forceRefresh) {
    cachedToken = null
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  if (inflight) {
    return inflight
  }

  inflight = (async () => {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
      cache: 'no-store',
      headers: {
        Authorization: `Basic ${btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new RedditError(
        `Failed to obtain Reddit app token (${response.status}). ${body}`.trim(),
        {
          statusCode: response.status,
          reason: 'Could not authenticate with Reddit. Check the app credentials.',
        }
      )
    }

    const data = (await response.json()) as { access_token?: string; expires_in?: number }

    if (!data.access_token) {
      throw new RedditError('Reddit returned no access token.', {
        statusCode: 502,
        reason: 'Could not authenticate with Reddit. Check the app credentials.',
      })
    }

    const ttlMs = (data.expires_in ?? 3600) * 1000
    cachedToken = {
      expiresAt: Date.now() + Math.max(ttlMs - EXPIRY_SKEW_MS, 30_000),
      token: data.access_token,
    }

    return data.access_token
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export function invalidateAppAccessToken(): void {
  cachedToken = null
}
