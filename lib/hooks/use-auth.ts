'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getAuthStatus,
  getRedditAuthorizationUrl,
  logout as logoutAction,
} from '@/lib/actions/auth'

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

  const login = useCallback(async () => {
    try {
      const result = await getRedditAuthorizationUrl()
      if (!result.url) {
        toast.error(result.error || 'Unable to start Reddit sign-in.')
        return
      }
      window.location.assign(result.url)
    } catch {
      toast.error('Unable to start Reddit sign-in. Please try again.')
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutAction()
    setAuthState({ isAuthenticated: false, username: null })
    window.location.reload()
  }, [])

  return {
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    login,
    logout,
    username: authState.username,
  }
}
