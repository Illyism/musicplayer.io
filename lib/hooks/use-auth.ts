"use client"

import { useState, useEffect } from "react"

interface User {
  name: string
  id: string
  icon_img?: string
  _json?: any
}

/**
 * Hook to manage authentication state
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // First, try to read from cookie (faster, no API call)
    const readUserFromCookie = () => {
      if (typeof document === 'undefined') return null
      
      const cookies = document.cookie.split(';')
      const userCookie = cookies.find(c => c.trim().startsWith('reddit_user='))
      
      if (userCookie) {
        try {
          const userJson = decodeURIComponent(userCookie.split('=')[1])
          return JSON.parse(userJson)
        } catch (e) {
          console.error('Failed to parse user cookie:', e)
        }
      }
      return null
    }

    // Check if user is logged in
    const checkAuth = async () => {
      // Try cookie first (fast path)
      const cookieUser = readUserFromCookie()
      if (cookieUser) {
        setUser(cookieUser)
        setLoading(false)
        // Still verify with API in background
        verifyWithAPI()
        return
      }

      // No cookie means not logged in - no need to call API
      // This prevents unnecessary 401 errors in logs
      setUser(null)
      setLoading(false)
    }

    // Verify with API (for token validation)
    const verifyWithAPI = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          // Token might be expired, clear user
          setUser(null)
        }
      } catch (error) {
        // Silent fail - cookie might still be valid
        console.error('Auth verification failed:', error)
      }
    }

    checkAuth()
  }, [])

  const login = () => {
    window.location.href = '/api/auth/login'
  }

  const logout = () => {
    window.location.href = '/api/auth/logout'
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  }
}

