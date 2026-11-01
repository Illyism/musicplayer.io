export async function getRedditAuthorizationUrl(): Promise<{
  error: string | null
  url: string | null
}> {
  try {
    const response = await fetch('/api/auth', {
      body: JSON.stringify({ action: 'authorize' }),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const data = await response.json().catch(() => null)
    return {
      error: typeof data?.error === 'string' ? data.error : null,
      url: typeof data?.url === 'string' ? data.url : null,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to start Reddit sign-in.',
      url: null,
    }
  }
}

export async function loginWithReddit(
  code: string,
  state: string | null
): Promise<{
  error?: string
  success: boolean
  username?: string
}> {
  try {
    const response = await fetch('/api/auth', {
      body: JSON.stringify({ action: 'callback', code, state }),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const data = await response.json().catch(() => null)
    if (!(response.ok && data?.success)) {
      return {
        error:
          typeof data?.error === 'string' ? data.error : 'Authentication failed. Please try again.',
        success: false,
      }
    }
    return {
      success: true,
      username: typeof data.username === 'string' ? data.username : undefined,
    }
  } catch {
    return { error: 'Authentication failed. Please try again.', success: false }
  }
}

export async function logout(): Promise<{ success: boolean }> {
  await fetch('/api/auth', {
    body: JSON.stringify({ action: 'logout' }),
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  }).catch(() => null)
  return { success: true }
}

export async function getAuthStatus(): Promise<{
  isAuthenticated: boolean
  username: string | null
}> {
  try {
    const response = await fetch('/api/auth', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
    if (!response.ok) {
      return { isAuthenticated: false, username: null }
    }
    const data = await response.json().catch(() => null)
    return {
      isAuthenticated: Boolean(data?.isAuthenticated),
      username: typeof data?.username === 'string' ? data.username : null,
    }
  } catch {
    return { isAuthenticated: false, username: null }
  }
}
