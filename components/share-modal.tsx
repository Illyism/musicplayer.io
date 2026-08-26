// components/share-modal.tsx
'use client'

import { Check, Copy, ShareNetwork, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  subreddits: string[]
}

export function ShareModal({ isOpen, onClose, subreddits }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [copiedShort, setCopiedShort] = useState(false)

  // Generate URLs
  const baseUrl = typeof window === 'undefined' ? '' : window.location.origin
  const subredditString = subreddits.join('+')
  const fullLink = `${baseUrl}/r/${subredditString}?autoplay`
  const shortLink = fullLink // In production, you'd use a URL shortener

  useEffect(() => {
    if (isOpen) {
      // Focus first input when modal opens
      const input = document.getElementById('shareLink') as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    }
  }, [isOpen])

  const handleCopy = (text: string, type: 'full' | 'short') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'full') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        setCopiedShort(true)
        setTimeout(() => setCopiedShort(false), 2000)
      }
    })
  }

  const handleShare = (platform: 'twitter' | 'facebook' | 'reddit') => {
    const text = `I 💛 Music Player for Reddit. I'm listening to ${subreddits.map(s => `/r/${s}`).join(', ')}`

    let url = ''
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shortLink)}&via=musicplayer_io&related=musicplayer_io`
        break
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullLink)}`
        break
      case 'reddit': {
        const subredditLinks = subreddits.map(sub => `[/r/${sub}]`).join(' ')
        const redditText = `[Playlist] ${subredditLinks} 💛`
        url = `https://reddit.com/r/musicplayer/submit?title=${encodeURIComponent(redditText)}&url=${encodeURIComponent(fullLink)}&sub=musicplayer`
        break
      }
      default:
        break
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    // Backdrop is a dismissal affordance, not interactive content
    // biome-ignore lint/a11y/noStaticElementInteractions: overlay click-to-close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs"
      onClick={onClose}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          onClose()
        }
      }}
      role="presentation"
      tabIndex={-1}
    >
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stops bubbling to backdrop */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: escape handled on backdrop */}
      <div
        aria-label="Share your subreddit playlist"
        aria-modal="true"
        className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-lg">Share Your Subreddit Playlist</h2>
          <Button
            className="h-auto w-auto p-0 text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X className="h-5 w-5" weight="bold" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Full URL */}
          <div>
            <label className="mb-2 block text-muted-foreground text-sm" htmlFor="shareLink">
              Full URL
            </label>
            <div className="flex gap-2">
              <Input
                className="flex-1 border-border bg-background text-sm"
                id="shareLink"
                onClick={e => (e.target as HTMLInputElement).select()}
                readOnly
                type="text"
                value={fullLink}
              />
              <Button
                className="hover:text-primary"
                onClick={() => handleCopy(fullLink, 'full')}
                size="sm"
                variant="ghost"
              >
                {copied ? (
                  <Check className="h-4 w-4" weight="bold" />
                ) : (
                  <Copy className="h-4 w-4" weight="fill" />
                )}
              </Button>
            </div>
          </div>

          {/* Short URL */}
          <div>
            <label className="mb-2 block text-muted-foreground text-sm" htmlFor="shareShortLink">
              Short URL
            </label>
            <div className="flex gap-2">
              <Input
                className="flex-1 border-border bg-background text-sm"
                id="shareShortLink"
                onClick={e => (e.target as HTMLInputElement).select()}
                readOnly
                type="text"
                value={shortLink}
              />
              <Button
                className="hover:text-primary"
                onClick={() => handleCopy(shortLink, 'short')}
                size="sm"
                variant="ghost"
              >
                {copiedShort ? (
                  <Check className="h-4 w-4" weight="bold" />
                ) : (
                  <Copy className="h-4 w-4" weight="fill" />
                )}
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              className="flex-1 bg-[#1DA1F2] text-white hover:bg-[#1a8cd8]"
              onClick={() => handleShare('twitter')}
              size="sm"
            >
              <TwitterIcon className="mr-2 h-4 w-4" />
              Twitter
            </Button>
            <Button
              className="flex-1 bg-[#1877F2] text-white hover:bg-[#166fe5]"
              onClick={() => handleShare('facebook')}
              size="sm"
            >
              <FacebookIcon className="mr-2 h-4 w-4" />
              Facebook
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => handleShare('reddit')}
              size="sm"
            >
              <ShareNetwork className="mr-2 h-4 w-4" weight="fill" />
              Reddit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
