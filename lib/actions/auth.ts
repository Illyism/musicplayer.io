'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'

const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET } = process.env
const REDDIT_REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
// Reddit requires User-Agent in format: <platform>:<app ID>:<version> (by /u/<username>)
const REDDIT_USERNAME = process.env.REDDIT_USERNAME || 'musicplayer'
const USER_AGENT = `web:musicplayer.io:v0.6.14 (by /u/${REDDIT_USERNAME})`

if (!(REDDIT_CLIENT_ID && REDDIT_CLIENT_SECRET)) {
  throw new Error(
    'Missing Reddit OAuth credentials. Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.'
  )
}

// Validation schemas
const AuthCodeSchema = z.string().min(1).max(200)

// Reddit can return either a success response with access_token or an error response
// Error responses may have error as a number (status code) or string, and no access_token
const RedditTokenResponseSchema = z.union([
  // Success response
  z.object({
    access_token: z.string(),
    expires_in: z.number().optional(),
    refresh_token: z.string().optional(),
  }),
  // Error response
  z.object({
    error: z.union([z.string(), z.number()]),
    error_description: z.string().optional(),
  }),
])

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

export async function loginWithReddit(code: string) {
  try {
    // Validate input
    const validatedCode = AuthCodeSchema.parse(code)

    // Exchange code for tokens
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      body: new URLSearchParams({
        code: validatedCode,
        grant_type: 'authorization_code',
        redirect_uri: REDDIT_REDIRECT_URI,
      }),
      headers: {
        Authorization: `Basic ${btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      method: 'POST',
    })

    const tokenDataRaw = await tokenResponse.json()
    const tokenData = RedditTokenResponseSchema.parse(tokenDataRaw)

    // Check if this is an error response (no access_token means error)
    if (!('access_token' in tokenData)) {
      let errorMsg = 'Unknown error'
      if ('error' in tokenData && typeof tokenData.error === 'string') {
        errorMsg = tokenData.error
      } else if ('error' in tokenData && typeof tokenData.error === 'number') {
        errorMsg = `HTTP ${tokenData.error}`
      }
      const errorDescription =
        'error_description' in tokenData ? tokenData.error_description : undefined
      console.error('Reddit token exchange error:', errorMsg, errorDescription)
      return {
        error: errorDescription || 'Failed to exchange authorization code',
        success: false,
      }
    }

    // TypeScript now knows this is the success response type
    const successTokenData = tokenData

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
    const cookieStore = await cookies()

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
