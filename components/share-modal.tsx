// components/share-modal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check, Share2 } from 'lucide-react'

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
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
      case 'reddit':
        const subredditLinks = subreddits.map(sub => `[/r/${sub}]`).join(' ')
        const redditText = `[Playlist] ${subredditLinks} 💛`
        url = `https://reddit.com/r/musicplayer/submit?title=${encodeURIComponent(redditText)}&url=${encodeURIComponent(fullLink)}&sub=musicplayer`
        break
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Share Your Subreddit Playlist</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground transition-colors h-auto w-auto p-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Full URL */}
          <div>
            <label htmlFor="shareLink" className="block text-sm text-muted-foreground mb-2">
              Full URL
            </label>
            <div className="flex gap-2">
              <Input
                id="shareLink"
                type="text"
                value={fullLink}
                readOnly
                className="flex-1 bg-background border-border text-sm"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <Button
                onClick={() => handleCopy(fullLink, 'full')}
                size="sm"
                variant="ghost"
                className="hover:text-primary"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Short URL */}
          <div>
            <label htmlFor="shareShortLink" className="block text-sm text-muted-foreground mb-2">
              Short URL
            </label>
            <div className="flex gap-2">
              <Input
                id="shareShortLink"
                type="text"
                value={shortLink}
                readOnly
                className="flex-1 bg-background border-border text-sm"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <Button
                onClick={() => handleCopy(shortLink, 'short')}
                size="sm"
                variant="ghost"
                className="hover:text-primary"
              >
                {copiedShort ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={() => handleShare('twitter')}
              size="sm"
              className="flex-1 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
            >
              <TwitterIcon className="w-4 h-4 mr-2" />
              Twitter
            </Button>
            <Button
              onClick={() => handleShare('facebook')}
              size="sm"
              className="flex-1 bg-[#1877F2] hover:bg-[#166fe5] text-white"
            >
              <FacebookIcon className="w-4 h-4 mr-2" />
              Facebook
            </Button>
            <Button
              onClick={() => handleShare('reddit')}
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Reddit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
