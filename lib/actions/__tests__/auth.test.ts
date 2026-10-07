import { afterAll, afterEach, beforeEach, expect, mock, test } from 'bun:test'

const cookieValues = new Map<string, string>()
const cookieOptions = new Map<string, any>()
const cookieStore = {
  delete: (name: string) => {
    cookieValues.delete(name)
  },
  get: (name: string) => (cookieValues.has(name) ? { value: cookieValues.get(name) } : undefined),
  set: (name: string, value: string, options?: any) => {
    cookieValues.set(name, value)
    cookieOptions.set(name, options)
  },
}
mock.module('next/headers', () => ({
  cookies: async () => cookieStore,
  headers: async () => new Headers({ origin: 'https://musicplayer.io' }),
}))
const envKeys = [
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
  'REDDIT_REDIRECT_URI',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_REDDIT_CLIENT_ID',
] as const
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]))
process.env.REDDIT_CLIENT_ID = 'server-client'
process.env.REDDIT_CLIENT_SECRET = 'test-secret'
process.env.NEXT_PUBLIC_SITE_URL = 'https://wrong-origin.example'
const auth = await import('../auth')
const originalFetch = globalThis.fetch
let fetchMock: ReturnType<typeof mock>
let tokenRedirect: string | null

beforeEach(() => {
  process.env.REDDIT_CLIENT_ID = 'server-client'
  process.env.REDDIT_CLIENT_SECRET = 'test-secret'
  process.env.REDDIT_REDIRECT_URI = 'https://musicplayer.io/auth/callback'
  process.env.NEXT_PUBLIC_SITE_URL = 'https://wrong-origin.example'
  process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID = 'different-build-time-client'
  cookieValues.clear()
  cookieOptions.clear()
  cookieValues.set(
    'reddit_oauth_transaction',
    JSON.stringify({
      clientId: 'server-client',
      redirectUri: process.env.REDDIT_REDIRECT_URI,
      state: 'valid-state',
    })
  )
  tokenRedirect = null
  fetchMock = mock((url: string, options: any) => {
    if (url.includes('access_token')) {
      tokenRedirect = options.body.get('redirect_uri')
      if (tokenRedirect !== process.env.REDDIT_REDIRECT_URI) {
        return Response.json({ error: 'invalid_grant' }, { status: 400 })
      }
      return Response.json({
        access_token: 'test-access',
        expires_in: 3600,
        refresh_token: 'test-refresh',
      })
    }
    return Response.json({ name: 'illy' })
  })
  globalThis.fetch = fetchMock as any
})
afterEach(() => {
  globalThis.fetch = originalFetch
})
afterAll(() => {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = originalEnv[key]
    }
  }
})

test('token exchange uses the exact authorized redirect instead of a separate public site URL', async () => {
  const result = await auth.loginWithReddit('test-code', 'valid-state')
  expect(result.success).toBe(true)
  expect(tokenRedirect).toBe('https://musicplayer.io/auth/callback')
  expect(cookieOptions.get('reddit_access_token').httpOnly).toBe(true)
})

test('missing or mismatched OAuth state is rejected before contacting Reddit', async () => {
  const result = await auth.loginWithReddit('test-code', 'wrong-state')
  expect(result.success).toBe(false)
  expect(fetchMock).not.toHaveBeenCalled()
})

test('authorization uses runtime server credentials and saves a protected transaction', async () => {
  process.env.REDDIT_CLIENT_ID = 'runtime-client'
  const result = await auth.getRedditAuthorizationUrl()
  expect(result.error).toBeNull()
  const url = new URL(result.url ?? '')
  expect(url.searchParams.get('client_id')).toBe('runtime-client')
  expect(url.searchParams.get('redirect_uri')).toBe('https://musicplayer.io/auth/callback')
  const transaction = JSON.parse(cookieValues.get('reddit_oauth_transaction') ?? '{}')
  expect(transaction.state).toBe(url.searchParams.get('state'))
  expect(transaction.state.length).toBeGreaterThan(20)
  expect(cookieOptions.get('reddit_oauth_transaction').httpOnly).toBe(true)
  expect(cookieOptions.get('reddit_oauth_transaction').sameSite).toBe('lax')
})

test('missing configuration fails gracefully without breaking authentication status', async () => {
  delete process.env.REDDIT_CLIENT_ID
  const result = await auth.getRedditAuthorizationUrl()
  expect(result.url).toBeNull()
  expect(result.error).toContain('not configured')
  expect(await auth.getAuthStatus()).toEqual({ isAuthenticated: false, username: null })
  expect(fetchMock).not.toHaveBeenCalled()
})

test('a callback on a different host is rejected before redirecting to Reddit', async () => {
  process.env.REDDIT_REDIRECT_URI = 'https://another-host.example/auth/callback'
  const result = await auth.getRedditAuthorizationUrl()
  expect(result.url).toBeNull()
  expect(result.error).toContain('https://another-host.example')
})

test('authorization and exchange work without build-time public variables', async () => {
  delete process.env.REDDIT_REDIRECT_URI
  delete process.env.NEXT_PUBLIC_SITE_URL
  delete process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID
  const start = await auth.getRedditAuthorizationUrl()
  expect(start.error).toBeNull()
  const url = new URL(start.url ?? '')
  const redirect = url.searchParams.get('redirect_uri')
  fetchMock.mockImplementation((_url: string, options: any) => {
    if (options?.body) {
      expect(options.body.get('redirect_uri')).toBe(redirect)
      return Response.json({ access_token: 'test-access', expires_in: 3600 })
    }
    return Response.json({ name: 'illy' })
  })
  const result = await auth.loginWithReddit('test-code', url.searchParams.get('state'))
  expect(result.success).toBe(true)
})

test('consumed state cannot exchange the authorization code again', async () => {
  expect((await auth.loginWithReddit('test-code', 'valid-state')).success).toBe(true)
  fetchMock.mockClear()
  expect((await auth.loginWithReddit('test-code', 'valid-state')).success).toBe(false)
  expect(fetchMock).not.toHaveBeenCalled()
})

test('non-JSON token failures return a usable error without writing session cookies', async () => {
  fetchMock.mockImplementation(async () => new Response('<html>blocked</html>', { status: 403 }))
  const result = await auth.loginWithReddit('test-code', 'valid-state')
  expect(result.success).toBe(false)
  expect(result.error).toContain('Reddit could not complete')
  expect(cookieValues.has('reddit_access_token')).toBe(false)
})

test('expired or reused authorization codes prompt a fresh sign-in', async () => {
  fetchMock.mockImplementation(async () =>
    Response.json({ error: 'invalid_grant' }, { status: 400 })
  )
  const result = await auth.loginWithReddit('test-code', 'valid-state')
  expect(result.success).toBe(false)
  expect(result.error).toContain('sign in again')
})
