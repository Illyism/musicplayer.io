'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LoginModalProps {
  action?: string
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose, action }: LoginModalProps) {
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID || 'YOUR_CLIENT_ID'
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`)
    const scope = 'identity,read,vote,submit'
    const state = Math.random().toString(36).slice(7)

    localStorage.setItem('reddit_oauth_state', state)

    const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${clientId}&response_type=code&state=${state}&redirect_uri=${redirectUri}&duration=permanent&scope=${scope}`

    window.location.href = authUrl
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
