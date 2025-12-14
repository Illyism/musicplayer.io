'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing login...')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      // Check for errors
      if (error) {
        setStatus(`Login failed: ${error}`)
        setTimeout(() => router.push('/'), 3000)
        return
      }

      // Verify state
      const savedState = localStorage.getItem('reddit_oauth_state')
      if (state !== savedState) {
        setStatus('Security check failed. Please try again.')
        setTimeout(() => router.push('/'), 3000)
        return
      }

      if (!code) {
        setStatus('No authorization code received')
        setTimeout(() => router.push('/'), 3000)
        return
      }

      try {
        // Exchange code for access token using Server Action
        const { loginWithReddit } = await import('@/lib/actions/auth')
        const result = await loginWithReddit(code)

        if (!result.success) {
          throw new Error(result.error || 'Authentication failed')
        }

        setStatus('Login successful! Redirecting...')
        setTimeout(() => router.push('/'), 1000)
      } catch (error: any) {
        setStatus(`Login failed: ${error.message}`)
        setTimeout(() => router.push('/'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">{status}</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
