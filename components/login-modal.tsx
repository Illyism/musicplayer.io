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
  isOpen: boolean
  onClose: () => void
  action?: string
}

export function LoginModal({ isOpen, onClose, action }: LoginModalProps) {
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID || 'YOUR_CLIENT_ID'
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback')
    const scope = 'identity,read,vote,submit'
    const state = Math.random().toString(36).substring(7)

    localStorage.setItem('reddit_oauth_state', state)

    const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${clientId}&response_type=code&state=${state}&redirect_uri=${redirectUri}&duration=permanent&scope=${scope}`

    window.location.href = authUrl
  }

  const getMessage = () => {
    if (action === 'vote') return 'You need to sign in to vote on comments.'
    if (action === 'reply') return 'You need to sign in to reply to comments.'
    if (action === 'comment') return 'You need to sign in to comment.'
    return 'Connect your Reddit account to vote and comment on songs.'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Sign in with Reddit</DialogTitle>
          <DialogDescription className="text-base pt-2">{getMessage()}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleLogin}
            className="flex-1 sm:flex-initial bg-[#FF4500] hover:bg-[#ff5722] text-white"
          >
            Sign in with Reddit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
