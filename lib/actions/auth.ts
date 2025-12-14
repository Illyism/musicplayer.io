'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET
const REDDIT_REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL + '/auth/callback'

if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
  throw new Error(
    'Missing Reddit OAuth credentials. Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.'
  )
}

// Validation schemas
const AuthCodeSchema = z.string().min(1).max(200)

const RedditTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  error: z.string().optional(),
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
  .transform(val => val.substring(0, 50))

export async function loginWithReddit(code: string) {
  try {
    // Validate input
    const validatedCode = AuthCodeSchema.parse(code)

    // Exchange code for tokens
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`),
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: validatedCode,
        redirect_uri: REDDIT_REDIRECT_URI,
      }),
    })

    const tokenDataRaw = await tokenResponse.json()
    const tokenData = RedditTokenResponseSchema.parse(tokenDataRaw)

    if (tokenData.error) {
      console.error('Reddit token exchange error:', tokenData.error)
      return { success: false, error: 'Failed to exchange authorization code' }
    }

    if (!tokenData.access_token) {
      return { success: false, error: 'No access token received' }
    }

    // Get user info
    const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!userResponse.ok) {
      console.error('Reddit user info error:', userResponse.status)
      return { success: false, error: 'Failed to fetch user information' }
    }

    const userDataRaw = await userResponse.json()
    const userData = RedditUserSchema.parse(userDataRaw)

    // Sanitize and validate username
    const sanitizedUsername = UsernameSchema.parse(userData.name)

    // Set cookies
    const cookieStore = await cookies()

    // Access token - HTTP-only, secure in production
    cookieStore.set('reddit_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600, // Default to 1 hour if not provided
      path: '/',
    })

    // Refresh token - HTTP-only, secure in production
    if (tokenData.refresh_token) {
      cookieStore.set('reddit_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        // Refresh tokens typically don't expire, but set a long maxAge
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    }

    // Username cookie (non-httpOnly so client can read it for display)
    // Safe because it's just a display value, not sensitive
    cookieStore.set('reddit_username', sanitizedUsername, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })

    return {
      success: true,
      username: sanitizedUsername,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return { success: false, error: 'Invalid input data' }
    }
    console.error('Reddit auth error:', error)
    return { success: false, error: 'Authentication failed. Please try again.' }
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
