'use client'

import { ArrowSquareOut, ChatCircle, SignIn, ThumbsDown, ThumbsUp } from '@phosphor-icons/react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'
import { usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'

export function SongDetailsSidebar() {
  const { currentSong } = usePlayerStore()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  if (!currentSong) {
    return (
      <div className="hidden border-border border-l lg:flex lg:w-80 xl:w-96">
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div>
            <ChatCircle
              className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50"
              weight="fill"
            />
            <p className="text-muted-foreground">Select a song to view details</p>
          </div>
        </div>
      </div>
    )
  }

  const handleVote = (_type: 'up' | 'down') => {
    setShowLoginPrompt(true)
  }

  const handleComment = () => {
    setShowLoginPrompt(true)
  }

  return (
    <div className="hidden flex-col border-border border-l lg:flex lg:w-80 xl:w-96">
      {/* Header */}
      <div className="border-border border-b p-6">
        <h3 className="mb-1 font-bold text-lg">Now Playing</h3>
        <p className="text-muted-foreground text-sm">Song Details</p>
      </div>

      {/* Song Info */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* pb-24 = 96px for player controls */}
        <div className="space-y-6 p-6">
          {/* Thumbnail */}
          {currentSong.thumbnail && (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-secondary">
              <Image
                alt={currentSong.title}
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                src={currentSong.thumbnail}
                unoptimized={isRedditHostedImage(currentSong.thumbnail)}
              />
            </div>
          )}

          {/* Title & Author */}
          <div>
            <h4 className="mb-2 font-semibold text-base leading-tight">{currentSong.title}</h4>
            <p className="text-muted-foreground text-sm">by {currentSong.author}</p>
          </div>

          {/* Voting */}
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-secondary"
              onClick={() => handleVote('up')}
              type="button"
            >
              <ThumbsUp className="h-4 w-4" weight="fill" />
              <span className="font-medium text-sm">{currentSong.ups}</span>
            </button>
            <button
              className="flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-secondary"
              onClick={() => handleVote('down')}
              type="button"
            >
              <ThumbsDown className="h-4 w-4" weight="fill" />
              <span className="font-medium text-sm">{currentSong.downs || 0}</span>
            </button>
            <div className="ml-auto text-muted-foreground text-sm">Score: {currentSong.score}</div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="mb-1 text-muted-foreground">Subreddit</p>
              <a
                className="flex items-center gap-1 text-primary hover:underline"
                href={`https://reddit.com/r/${currentSong.subreddit}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                r/{currentSong.subreddit}
                <ArrowSquareOut className="h-3 w-3" weight="fill" />
              </a>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Source</p>
              <a
                className="flex items-center gap-1 text-primary capitalize hover:underline"
                href={currentSong.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {currentSong.type}
                <ArrowSquareOut className="h-3 w-3" weight="fill" />
              </a>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Comments</p>
              <p className="font-medium">{currentSong.num_comments}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Posted</p>
              <p className="font-medium">{currentSong.created_ago || 'Recently'}</p>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <a
              className="flex w-full items-center gap-2 rounded-md bg-secondary px-4 py-2 transition-colors hover:bg-secondary/80"
              href={`https://reddit.com${currentSong.permalink}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ArrowSquareOut className="h-4 w-4" weight="fill" />
              <span className="font-medium text-sm">View on Reddit</span>
            </a>
            <a
              className="flex w-full items-center gap-2 rounded-md bg-secondary px-4 py-2 transition-colors hover:bg-secondary/80"
              href={currentSong.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ArrowSquareOut className="h-4 w-4" weight="fill" />
              <span className="font-medium text-sm">Open {currentSong.type}</span>
            </a>
          </div>

          {/* Comments Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-semibold text-base">Comments</h4>
              <button
                className="text-primary text-sm hover:underline"
                onClick={handleComment}
                type="button"
              >
                Add Comment
              </button>
            </div>
            <div className="rounded-md border border-border bg-secondary/50 p-4 text-center">
              <ChatCircle
                className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50"
                weight="fill"
              />
              <p className="mb-3 text-muted-foreground text-sm">Login to view and post comments</p>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                onClick={() => setShowLoginPrompt(true)}
                type="button"
              >
                <SignIn className="h-4 w-4" weight="fill" />
                Login with Reddit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        // Backdrop is a dismissal affordance, not interactive content
        // biome-ignore lint/a11y/noStaticElementInteractions: overlay click-to-close
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowLoginPrompt(false)}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              setShowLoginPrompt(false)
            }
          }}
          role="presentation"
          tabIndex={-1}
        >
          {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stops bubbling to backdrop */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: escape handled on backdrop */}
          <div
            aria-label="Login required"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg border border-border bg-card p-6"
            onClick={e => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="mb-2 font-bold text-lg">Login Required</h3>
            <p className="mb-4 text-muted-foreground text-sm">
              You need to login with your Reddit account to vote and comment.
            </p>
            <div className="flex gap-2">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                onClick={() => {
                  setShowLoginPrompt(false)
                  toast.info('Reddit OAuth login is not configured yet.')
                }}
                type="button"
              >
                <SignIn className="h-4 w-4" weight="fill" />
                Login
              </button>
              <button
                className="flex-1 rounded-md bg-secondary px-4 py-2 font-medium text-sm transition-colors hover:bg-secondary/80"
                onClick={() => setShowLoginPrompt(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
