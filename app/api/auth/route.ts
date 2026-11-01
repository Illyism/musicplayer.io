import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildRedditAuthorizationUrl,
  getRedditOAuthConfig,
  getRedditTokenError,
} from '@/lib/utils/reddit-oauth'
import { USER_AGENT } from '@/lib/utils/reddit-token'

const OAUTH_COOKIE = 'reddit_oauth_transaction'
const OAUTH_REQUEST_TIMEOUT_MS = 10_000
const RESPONSE_HEADERS = { 'Cache-Control': 'private, no-store' }

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

const AuthActionRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('authorize') }),
  z.object({
    action: z.literal('callback'),
    code: z.string(),
    state: z.string().nullable().optional(),
  }),
  z.object({ action: z.literal('logout') }),
])

function isCrossSiteRequest(request: NextRequest): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return true
  }
  const origin = request.headers.get('origin')
  if (!origin) {
    return false
  }
  try {
    const parsedOrigin = new URL(origin)
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = forwardedHost || request.headers.get('host') || request.nextUrl.host
    return parsedOrigin.host !== host
  } catch {
    return true
  }
}

function getVerifiedOrigin(requestHeaders: Headers): string | null {
  if (requestHeaders.get('sec-fetch-site') === 'cross-site') {
    return null
  }
  const origin = requestHeaders.get('origin')
  if (!origin) {
    return null
  }
  try {
    const parsedOrigin = new URL(origin)
    if (parsedOrigin.protocol !== 'https:' && parsedOrigin.protocol !== 'http:') {
      return null
    }
    const forwardedHost = requestHeaders.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = forwardedHost || requestHeaders.get('host')
    if (host && parsedOrigin.host !== host) {
      return null
    }
    return parsedOrigin.origin
  } catch {
    return null
  }
}

async function handleAuthorize(request: NextRequest) {
  try {
    const origin = getVerifiedOrigin(request.headers)
    if (!origin) {
      return NextResponse.json(
        { error: 'Please start sign-in from the website.', url: null },
        { headers: RESPONSE_HEADERS, status: 403 }
      )
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
    return NextResponse.json(
      { error: null, url: buildRedditAuthorizationUrl(config, state) },
      { headers: RESPONSE_HEADERS }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to start Reddit sign-in.',
        url: null,
      },
      { headers: RESPONSE_HEADERS, status: 400 }
    )
  }
}

async function handleCallback(request: NextRequest, code: string, state: string | null) {
  try {
    const validatedCode = AuthCodeSchema.parse(code)
    const cookieStore = await cookies()
    const savedTransaction = cookieStore.get(OAUTH_COOKIE)?.value
    let parsedTransaction: unknown = null
    if (savedTransaction) {
      try {
        parsedTransaction = JSON.parse(savedTransaction)
      } catch {
        parsedTransaction = null
      }
    }
    const transaction = OAuthTransactionSchema.safeParse(parsedTransaction)
    cookieStore.delete(OAUTH_COOKIE)
    if (!(state && transaction.success) || state !== transaction.data.state) {
      return NextResponse.json(
        { error: 'Security check failed. Please sign in again.', success: false },
        { headers: RESPONSE_HEADERS, status: 400 }
      )
    }
    const origin = getVerifiedOrigin(request.headers)
    if (!origin) {
      return NextResponse.json(
        { error: 'Security check failed. Please sign in again.', success: false },
        { headers: RESPONSE_HEADERS, status: 403 }
      )
    }
    const config = getRedditOAuthConfig(origin)
    if (
      config.clientId !== transaction.data.clientId ||
      config.redirectUri !== transaction.data.redirectUri
    ) {
      return NextResponse.json(
        { error: 'Sign-in settings changed. Please sign in again.', success: false },
        { headers: RESPONSE_HEADERS, status: 400 }
      )
    }

    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      body: new URLSearchParams({
        code: validatedCode,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }),
      cache: 'no-store',
      headers: {
        Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(OAUTH_REQUEST_TIMEOUT_MS),
    })

    const tokenDataRaw = await tokenResponse.json().catch(() => null)
    const tokenData = RedditTokenResponseSchema.safeParse(tokenDataRaw)
    if (!(tokenResponse.ok && tokenData.success)) {
      const errorCode = typeof tokenDataRaw?.error === 'string' ? tokenDataRaw.error : undefined
      return NextResponse.json(
        { error: getRedditTokenError(tokenResponse.status, errorCode), success: false },
        { headers: RESPONSE_HEADERS, status: 400 }
      )
    }
    const successTokenData = tokenData.data

    const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${successTokenData.access_token}`,
        'User-Agent': USER_AGENT,
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(OAUTH_REQUEST_TIMEOUT_MS),
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user information', success: false },
        { headers: RESPONSE_HEADERS, status: 502 }
      )
    }

    const userDataRaw = await userResponse.json()
    const userData = RedditUserSchema.parse(userDataRaw)
    const sanitizedUsername = UsernameSchema.parse(userData.name)
    const tokenMaxAge = successTokenData.expires_in || 3600

    cookieStore.set('reddit_access_token', successTokenData.access_token, {
      httpOnly: true,
      maxAge: tokenMaxAge,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    if (successTokenData.refresh_token) {
      cookieStore.set('reddit_refresh_token', successTokenData.refresh_token, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }

    cookieStore.set('reddit_username', sanitizedUsername, {
      httpOnly: true,
      maxAge: tokenMaxAge,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return NextResponse.json(
      {
        success: true,
        username: sanitizedUsername,
      },
      { headers: RESPONSE_HEADERS }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', success: false },
        { headers: RESPONSE_HEADERS, status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.', success: false },
      { headers: RESPONSE_HEADERS, status: 500 }
    )
  }
}

async function handleLogout(request: NextRequest) {
  if (!getVerifiedOrigin(request.headers)) {
    return NextResponse.json(
      { error: 'Cross-origin requests are not allowed.', success: false },
      { headers: RESPONSE_HEADERS, status: 403 }
    )
  }
  const cookieStore = await cookies()
  cookieStore.delete(OAUTH_COOKIE)
  cookieStore.delete('reddit_access_token')
  cookieStore.delete('reddit_refresh_token')
  cookieStore.delete('reddit_username')
  return NextResponse.json({ success: true }, { headers: RESPONSE_HEADERS })
}

export async function GET(request: NextRequest) {
  if (isCrossSiteRequest(request)) {
    return NextResponse.json(
      { error: 'Cross-origin requests are not allowed.' },
      { headers: RESPONSE_HEADERS, status: 403 }
    )
  }
  const cookieStore = await cookies()
  const token = cookieStore.get('reddit_access_token')?.value
  const rawUsername = cookieStore.get('reddit_username')?.value
  const parsedUsername = token && rawUsername ? UsernameSchema.safeParse(rawUsername) : null

  return NextResponse.json(
    {
      isAuthenticated: Boolean(token && parsedUsername?.success),
      username: parsedUsername?.success ? parsedUsername.data : null,
    },
    { headers: RESPONSE_HEADERS }
  )
}

export async function POST(request: NextRequest) {
  if (isCrossSiteRequest(request)) {
    return NextResponse.json(
      { error: 'Cross-origin requests are not allowed.' },
      { headers: RESPONSE_HEADERS, status: 403 }
    )
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = AuthActionRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid authentication request.' },
      { headers: RESPONSE_HEADERS, status: 400 }
    )
  }

  if (parsed.data.action === 'authorize') {
    return handleAuthorize(request)
  }
  if (parsed.data.action === 'callback') {
    return handleCallback(request, parsed.data.code, parsed.data.state ?? null)
  }
  return handleLogout(request)
}
