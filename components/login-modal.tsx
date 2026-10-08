'use client'

import { CircleNotch, RedditLogo } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getRedditAuthorizationUrl } from '@/lib/actions/auth'

interface LoginModalProps {
  action?: string
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose, action }: LoginModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const handleLogin = async () => {
    setError(null)
    setIsSigningIn(true)
    try {
      const result = await getRedditAuthorizationUrl()
      if (!result.url) {
        setError(result.error || 'Unable to start Reddit sign-in.')
        return
      }
      window.location.assign(result.url)
    } catch {
      setError('Unable to start Reddit sign-in. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  const getMessage = () => {
    if (action === 'vote' || action === 'upvote' || action === 'downvote') {
      return 'Connect your account to vote with the community.'
    }
    if (action === 'reply') {
      return 'Connect your account to join the conversation.'
    }
    if (action === 'comment') {
      return 'Connect your account to share what you think.'
    }
    return 'Keep the music playing. Connect your account to vote and join the conversation.'
  }

  return (
    <Dialog
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
      open={isOpen}
    >
      <DialogContent className="gap-6 sm:max-w-md">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-reddit/10 text-reddit">
          <RedditLogo aria-hidden className="size-8" weight="fill" />
        </div>
        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="text-balance text-2xl leading-tight">
            Sign in with Reddit
          </DialogTitle>
          <DialogDescription className="text-pretty text-sm leading-relaxed">
            {getMessage()}
          </DialogDescription>
        </DialogHeader>

        {error !== null && (
          <p className="rounded-xl bg-destructive/10 p-3 text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2 sm:space-x-0">
          <Button
            className="h-11 rounded-full px-5 text-sm sm:flex-1"
            onClick={onClose}
            type="button"
            variant="ghost"
          >
            Keep listening
          </Button>
          <Button
            className="h-11 gap-2 rounded-full px-5 text-sm sm:flex-1"
            disabled={isSigningIn}
            onClick={handleLogin}
            type="button"
          >
            {isSigningIn ? (
              <CircleNotch aria-hidden className="size-4 animate-spin" />
            ) : (
              <RedditLogo aria-hidden className="size-4 text-reddit" weight="fill" />
            )}
            {isSigningIn ? 'Connecting…' : 'Continue with Reddit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
