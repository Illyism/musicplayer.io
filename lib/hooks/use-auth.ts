'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import { getAuthStatus, logout as logoutAction } from '@/lib/actions/auth'

export function useAuth() {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean
    username: string | null
  }>({ isAuthenticated: false, username: null })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch auth status from server
    getAuthStatus().then(status => {
      setAuthState({
        isAuthenticated: status.isAuthenticated,
        username: status.username,
      })
      setIsLoading(false)
    })
  }, [])

  const login = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID || 'YOUR_CLIENT_ID'
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback')
    const scope = 'identity,read,vote,submit'
    const state = Math.random().toString(36).substring(2)

    // Store state in localStorage for verification (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.setItem('reddit_oauth_state', state)
    }

    const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${clientId}&response_type=code&state=${state}&redirect_uri=${redirectUri}&duration=permanent&scope=${scope}`

    window.location.href = authUrl
  }, [])

  const logout = useCallback(async () => {
    await logoutAction()
    setAuthState({ isAuthenticated: false, username: null })
    window.location.reload()
  }, [])

  return {
    isAuthenticated: authState.isAuthenticated,
    username: authState.username,
    isLoading,
    login,
    logout,
  }
}
