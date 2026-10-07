interface RedditOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function getRedditOAuthConfig(requestOrigin?: string): RedditOAuthConfig {
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  if (!(clientId && clientSecret)) {
    throw new Error('Reddit sign-in is not configured. Please contact the site owner.')
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestOrigin
  const redirectUri =
    process.env.REDDIT_REDIRECT_URI || (siteUrl ? new URL('/auth/callback', siteUrl).href : '')
  if (!redirectUri) {
    throw new Error('Reddit sign-in needs a callback address. Please contact the site owner.')
  }
  const callback = new URL(redirectUri)
  const localHttp = callback.protocol === 'http:' && callback.hostname === 'localhost'
  if (
    (callback.protocol !== 'https:' && !localHttp) ||
    callback.pathname !== '/auth/callback' ||
    callback.search ||
    callback.hash ||
    callback.username ||
    callback.password
  ) {
    throw new Error(
      'Reddit sign-in has an invalid callback address. Please contact the site owner.'
    )
  }
  if (requestOrigin && callback.origin !== new URL(requestOrigin).origin) {
    throw new Error(`Please open ${callback.origin} to sign in with Reddit.`)
  }
  return { clientId, clientSecret, redirectUri }
}

export function buildRedditAuthorizationUrl(config: RedditOAuthConfig, state: string): string {
  const url = new URL('https://www.reddit.com/api/v1/authorize')
  url.search = new URLSearchParams({
    client_id: config.clientId,
    duration: 'permanent',
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'identity read vote submit',
    state,
  }).toString()
  return url.href
}

export function getRedditTokenError(status: number, code?: string): string {
  if (code === 'invalid_grant') {
    return 'This sign-in link expired or was already used. Please sign in again.'
  }
  if (status === 401 || code === 'invalid_client') {
    return 'Reddit sign-in is not configured correctly. Please contact the site owner.'
  }
  if (status === 429) {
    return 'Reddit is receiving too many requests. Please try signing in again shortly.'
  }
  return 'Reddit could not complete sign-in. Please try again.'
}
