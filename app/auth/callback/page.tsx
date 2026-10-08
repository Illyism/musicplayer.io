'use client'

import { CheckCircle, CircleNotch, WarningCircle } from '@phosphor-icons/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'

function AuthStatus({ message }: { message: string }) {
  const hasError = message.startsWith('Login failed') || message.startsWith('No authorization')
  const isSuccess = message.startsWith('Login successful')
  let StatusIcon = CircleNotch
  if (hasError) {
    StatusIcon = WarningCircle
  } else if (isSuccess) {
    StatusIcon = CheckCircle
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-background px-6 text-center">
      <Link aria-label="Music Player for Reddit home" href="/">
        <Brand />
      </Link>
      <div className="flex max-w-sm flex-col items-center gap-4" role="status">
        <StatusIcon
          className={`size-7 text-muted-foreground ${hasError || isSuccess ? '' : 'motion-safe:animate-spin'}`}
        />
        <p className="text-balance font-medium text-lg">{message}</p>
        <p className="text-muted-foreground text-sm">
          {hasError
            ? 'Return to the player and try signing in again.'
            : 'Taking you back to the music.'}
        </p>
        {hasError ? (
          <Button asChild className="mt-2">
            <Link href="/">Back to music</Link>
          </Button>
        ) : null}
      </div>
    </main>
  )
}

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasProcessed = useRef(false)
  const [status, setStatus] = useState('Processing login...')

  useEffect(() => {
    // Reddit authorization codes are single-use, including under React Strict Mode.
    if (hasProcessed.current) {
      return
    }
    hasProcessed.current = true
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

      if (!code) {
        setStatus('No authorization code received')
        setTimeout(() => router.push('/'), 3000)
        return
      }

      try {
        // Exchange code for access token using Server Action
        const { loginWithReddit } = await import('@/lib/actions/auth')
        const result = await loginWithReddit(code, state)

        if (!result.success) {
          throw new Error(result.error || 'Authentication failed')
        }

        setStatus('Login successful! Redirecting...')
        setTimeout(() => router.push('/'), 1000)
      } catch (callbackError: any) {
        setStatus(`Login failed: ${callbackError.message}`)
        setTimeout(() => router.push('/'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return <AuthStatus message={status} />
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<AuthStatus message="Signing in with Reddit…" />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
