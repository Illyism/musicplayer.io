"use client"

import { useState, useEffect } from "react"
import { X, Copy, Check, Twitter, Facebook, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#1a1a1a] border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-medium">Share Your Subreddit Playlist</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white transition-colors h-auto w-auto p-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Full URL */}
          <div>
            <label htmlFor="shareLink" className="block text-sm text-gray-400 mb-2">
              Full URL
            </label>
            <div className="flex gap-2">
              <Input
                id="shareLink"
                type="text"
                value={fullLink}
                readOnly
                className="flex-1 bg-[#111] border-border text-white text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                onClick={() => handleCopy(fullLink, 'full')}
                size="sm"
                variant="ghost"
                className="text-white hover:text-[#FDC00F]"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Short URL */}
          <div>
            <label htmlFor="shareShortLink" className="block text-sm text-gray-400 mb-2">
              Short URL
            </label>
            <div className="flex gap-2">
              <Input
                id="shareShortLink"
                type="text"
                value={shortLink}
                readOnly
                className="flex-1 bg-[#111] border-border text-white text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                onClick={() => handleCopy(shortLink, 'short')}
                size="sm"
                variant="ghost"
                className="text-white hover:text-[#FDC00F]"
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
              <Twitter className="w-4 h-4 mr-2" />
              Twitter
            </Button>
            <Button
              onClick={() => handleShare('facebook')}
              size="sm"
              className="flex-1 bg-[#1877F2] hover:bg-[#166fe5] text-white"
            >
              <Facebook className="w-4 h-4 mr-2" />
              Facebook
            </Button>
            <Button
              onClick={() => handleShare('reddit')}
              size="sm"
              className="flex-1 bg-[#FF4500] hover:bg-[#e63e00] text-white"
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

