import { redditAuthConfig } from "./config"

/**
 * Refresh Reddit access token using refresh token
 */
export async function refreshRedditToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string } | null> {
  const { clientId, clientSecret, tokenUrl } = redditAuthConfig

  if (!clientId || !clientSecret) {
    console.error('Reddit OAuth not configured')
    return null
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'User-Agent': 'RedditMusicPlayer/0.6.14 by illyism',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token refresh failed:', response.status, errorText)
      return null
    }

    const data = await response.json()
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Keep old refresh token if not provided
    }
  } catch (error) {
    console.error('Token refresh error:', error)
    return null
  }
}



