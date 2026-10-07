'use server'

import { cookies, headers } from 'next/headers'
import { z } from 'zod'

import {
  buildRedditAuthorizationUrl,
  getRedditOAuthConfig,
  getRedditTokenError,
} from '@/lib/utils/reddit-oauth'
import { USER_AGENT } from '@/lib/utils/reddit-token'

const OAUTH_COOKIE = 'reddit_oauth_transaction'

// Validation schemas
const AuthCodeSchema = z.string().min(1).max(200)

const OAuthTransactionSchema = z.object({
  clientId: z.string().min(1),
  redirectUri: z.string().url(),
  state: z.string().min(1).max(200),
})
const RedditTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive().optional(),
  refresh_token: z.string().optional(),
})

const RedditUserSchema = z.object({
  name: z.string().min(1).max(50),
})

const UsernameSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain alphanumeric characters, underscores, and hyphens'
  )
  .max(50)
  .transform(val => val.slice(0, 50))

export async function getRedditAuthorizationUrl() {
  try {
    const requestHeaders = await headers()
    const origin = requestHeaders.get('origin')
    if (!origin) {
      return { error: 'Please start sign-in from the website.', url: null }
    }
    const config = getRedditOAuthConfig(origin)
    const state = crypto.randomUUID()
    const cookieStore = await cookies()
    cookieStore.set(
      OAUTH_COOKIE,
      JSON.stringify({
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        state,
      }),
      {
        httpOnly: true,
        maxAge: 600,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      }
    )
    return { error: null, url: buildRedditAuthorizationUrl(config, state) }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to start Reddit sign-in.',
      url: null,
    }
  }
}

export async function loginWithReddit(code: string, state: string | null) {
  try {
    // Validate input
    const validatedCode = AuthCodeSchema.parse(code)
    const cookieStore = await cookies()
    const savedTransaction = cookieStore.get(OAUTH_COOKIE)?.value
    const transaction = OAuthTransactionSchema.safeParse(
      savedTransaction ? JSON.parse(savedTransaction) : null
    )
    if (!(state && transaction.success) || state !== transaction.data.state) {
      return { error: 'Security check failed. Please sign in again.', success: false }
    }
    const config = getRedditOAuthConfig(new URL(transaction.data.redirectUri).origin)
    if (
      config.clientId !== transaction.data.clientId ||
      config.redirectUri !== transaction.data.redirectUri
    ) {
      return { error: 'Sign-in settings changed. Please sign in again.', success: false }
    }
    cookieStore.delete(OAUTH_COOKIE)

    // Exchange code for tokens
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      body: new URLSearchParams({
        code: validatedCode,
        grant_type: 'authorization_code',
        redirect_uri: transaction.data.redirectUri,
      }),
      cache: 'no-store',
      headers: {
        Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      method: 'POST',
    })

    const tokenDataRaw = await tokenResponse.json().catch(() => null)
    const tokenData = RedditTokenResponseSchema.safeParse(tokenDataRaw)
    if (!(tokenResponse.ok && tokenData.success)) {
      const errorCode = typeof tokenDataRaw?.error === 'string' ? tokenDataRaw.error : undefined
      console.error('Reddit token exchange failed:', tokenResponse.status, errorCode)
      return { error: getRedditTokenError(tokenResponse.status, errorCode), success: false }
    }
    const successTokenData = tokenData.data

    // Get user info
    const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        Authorization: `Bearer ${successTokenData.access_token}`,
        'User-Agent': USER_AGENT,
      },
    })

    if (!userResponse.ok) {
      console.error('Reddit user info error:', userResponse.status)
      return { error: 'Failed to fetch user information', success: false }
    }

    const userDataRaw = await userResponse.json()
    const userData = RedditUserSchema.parse(userDataRaw)

    // Sanitize and validate username
    const sanitizedUsername = UsernameSchema.parse(userData.name)

    // Set cookies
    // Access token - HTTP-only, secure in production
    cookieStore.set('reddit_access_token', successTokenData.access_token, {
      httpOnly: true,
      maxAge: successTokenData.expires_in || 3600, // Default to 1 hour if not provided
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    // Refresh token - HTTP-only, secure in production
    if (successTokenData.refresh_token) {
      cookieStore.set('reddit_refresh_token', successTokenData.refresh_token, {
        httpOnly: true,
        // Refresh tokens typically don't expire, but set a long maxAge
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }

    // Username cookie (non-httpOnly so client can read it for display)
    // Safe because it's just a display value, not sensitive
    cookieStore.set('reddit_username', sanitizedUsername, {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return {
      success: true,
      username: sanitizedUsername,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error)
      return { error: 'Invalid input data', success: false }
    }
    console.error('Reddit auth error:', error)
    return { error: 'Authentication failed. Please try again.', success: false }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(OAUTH_COOKIE)
  cookieStore.delete('reddit_access_token')
  cookieStore.delete('reddit_refresh_token')
  cookieStore.delete('reddit_username')
  return { success: true }
}

export async function getAuthStatus() {
  const cookieStore = await cookies()
  const token = cookieStore.get('reddit_access_token')
  const username = cookieStore.get('reddit_username')

  return {
    isAuthenticated: !!token,
    username: username?.value || null,
  }
}
