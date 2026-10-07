'use client'

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
    if (action === 'vote') {
      return 'You need to sign in to vote on comments.'
    }
    if (action === 'reply') {
      return 'You need to sign in to reply to comments.'
    }
    if (action === 'comment') {
      return 'You need to sign in to comment.'
    }
    return 'Connect your Reddit account to vote and comment on songs.'
  }

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Sign in with Reddit</DialogTitle>
          <DialogDescription className="pt-2 text-base">{getMessage()}</DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 pt-4 sm:gap-0">
          <Button
            className="flex-1 sm:flex-initial"
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-initial"
            disabled={isSigningIn}
            onClick={handleLogin}
            type="button"
          >
            Sign in with Reddit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
