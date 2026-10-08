'use client'

import { Check, Copy, FacebookLogo, RedditLogo, ShareNetwork, XLogo } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { type Song, usePlayerStore } from '@/lib/store/player-store'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  song?: Song
  subreddits: string[]
}

function ShareLink({
  copied,
  id,
  label,
  onCopy,
  value,
}: {
  copied: boolean
  id: string
  label: string
  onCopy: () => void
  value: string
}) {
  return (
    <div className="space-y-2">
      <label className="font-medium text-sm" htmlFor={id}>
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          className="h-11 rounded-xl px-3 text-sm md:text-sm"
          id={id}
          onFocus={event => event.currentTarget.select()}
          readOnly
          value={value}
        />
        <Button
          aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
          className="h-11 min-w-11 rounded-xl px-3 text-sm"
          onClick={onCopy}
          type="button"
          variant="secondary"
        >
          {copied ? (
            <Check aria-hidden className="size-4" weight="bold" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </div>
    </div>
  )
}

export function ShareModal({ isOpen, onClose, subreddits, song }: ShareModalProps) {
  const sortMethod = usePlayerStore(state => state.sortMethod)
  const topPeriod = usePlayerStore(state => state.topPeriod)
  const [copied, setCopied] = useState<'full' | 'short' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const params = new URLSearchParams()

  params.set('sort', sortMethod)
  if (sortMethod === 'top' && topPeriod !== 'week') {
    params.set('t', topPeriod)
  }

  const subredditString = subreddits.join('+')
  const query = params.toString()
  const path = subredditString ? `/r/${subredditString}` : '/'
  const playlistPath = `${path}${query ? `?${query}` : ''}`
  const fullLink = song
    ? `https://www.reddit.com${song.permalink}`
    : `https://musicplayer.io${playlistPath}`
  const shortLink = song ? song.url : `http://r.il.ly${playlistPath}`
  let shareText = subreddits.length
    ? `I'm listening to ${subreddits.map(sub => `r/${sub}`).join(', ')} on Music Player for Reddit.`
    : 'Find your next favorite song on Music Player for Reddit.'
  if (song) {
    shareText = `Listen to ${song.title}, shared in r/${song.subreddit}.`
  }
  const platforms = [
    {
      Icon: XLogo,
      label: 'X',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullLink)}`,
    },
    {
      Icon: FacebookLogo,
      label: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullLink)}`,
    },
    {
      Icon: RedditLogo,
      label: 'Reddit',
      url: `https://reddit.com/submit?title=${encodeURIComponent('Music worth sharing. A playlist from Reddit.')}&url=${encodeURIComponent(fullLink)}`,
    },
  ]

  useEffect(
    () => () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    },
    []
  )

  const handleCopy = async (value: string, type: 'full' | 'short') => {
    setError(null)
    try {
      await navigator.clipboard.writeText(value)
      setCopied(type)
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(null), 2000)
    } catch {
      setError('Could not copy the link. Select it above to copy it manually.')
    }
  }

  return (
    <Dialog
      onOpenChange={open => {
        if (!open) {
          setCopied(null)
          setError(null)
          onClose()
        }
      }}
      open={isOpen}
    >
      <DialogContent className="gap-6 sm:max-w-md">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          <ShareNetwork aria-hidden className="size-6" />
        </div>
        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="text-2xl leading-tight">
            {song ? 'Share this track' : 'Share your mix'}
          </DialogTitle>
          <DialogDescription className="text-pretty leading-relaxed">
            {song
              ? song.title
              : 'Share this mix. Your communities and sort order come along with it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ShareLink
            copied={copied === 'full'}
            id="share-playlist-link"
            label={song ? 'Reddit post' : 'Playlist link'}
            onCopy={() => handleCopy(fullLink, 'full')}
            value={fullLink}
          />
          <ShareLink
            copied={copied === 'short'}
            id="share-short-link"
            label={song ? 'Track link' : 'Short link'}
            onCopy={() => handleCopy(shortLink, 'short')}
            value={shortLink}
          />
          <p aria-live="polite" className="sr-only" role="status">
            {copied ? 'Link copied to clipboard.' : ''}
          </p>
          {error !== null && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 border-border border-t pt-5">
          {platforms.map(({ Icon, label, url }) => (
            <Button
              asChild
              className="h-auto min-h-14 flex-col gap-1 rounded-2xl px-1 py-2 text-xs sm:h-11 sm:min-h-11 sm:flex-row sm:gap-2 sm:rounded-full sm:text-sm"
              key={label}
              variant="outline"
            >
              <a href={url} rel="noopener noreferrer" target="_blank">
                <Icon aria-hidden className="size-4" />
                {label}
              </a>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
