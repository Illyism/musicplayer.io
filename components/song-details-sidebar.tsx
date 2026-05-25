'use client'

import Image from 'next/image'
import { ArrowSquareOut, ChatCircle, SignIn, ThumbsDown, ThumbsUp } from '@phosphor-icons/react'
import { usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'
import { useState } from 'react'

export function SongDetailsSidebar() {
  const { currentSong } = usePlayerStore()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  if (!currentSong) {
    return (
      <div className="hidden lg:flex lg:w-80 xl:w-96 border-l border-border">
        <div className="flex-1 p-6 flex items-center justify-center text-center">
          <div>
            <ChatCircle
              className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50"
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
    <div className="hidden lg:flex lg:w-80 xl:w-96 border-l border-border flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-bold mb-1">Now Playing</h3>
        <p className="text-sm text-muted-foreground">Song Details</p>
      </div>

      {/* Song Info */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* pb-24 = 96px for player controls */}
        <div className="p-6 space-y-6">
          {/* Thumbnail */}
          {currentSong.thumbnail && (
            <div className="aspect-video rounded-lg overflow-hidden bg-secondary relative">
              <Image
                src={currentSong.thumbnail}
                alt={currentSong.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized={isRedditHostedImage(currentSong.thumbnail)}
              />
            </div>
          )}

          {/* Title & Author */}
          <div>
            <h4 className="text-base font-semibold mb-2 leading-tight">{currentSong.title}</h4>
            <p className="text-sm text-muted-foreground">by {currentSong.author}</p>
          </div>

          {/* Voting */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleVote('up')}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              <ThumbsUp className="h-4 w-4" weight="fill" />
              <span className="text-sm font-medium">{currentSong.ups}</span>
            </button>
            <button
              onClick={() => handleVote('down')}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              <ThumbsDown className="h-4 w-4" weight="fill" />
              <span className="text-sm font-medium">{currentSong.downs || 0}</span>
            </button>
            <div className="ml-auto text-sm text-muted-foreground">Score: {currentSong.score}</div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Subreddit</p>
              <a
                href={`https://reddit.com/r/${currentSong.subreddit}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                r/{currentSong.subreddit}
                <ArrowSquareOut className="h-3 w-3" weight="fill" />
              </a>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Source</p>
              <a
                href={currentSong.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 capitalize"
              >
                {currentSong.type}
                <ArrowSquareOut className="h-3 w-3" weight="fill" />
              </a>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Comments</p>
              <p className="font-medium">{currentSong.num_comments}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Posted</p>
              <p className="font-medium">{currentSong.created_ago || 'Recently'}</p>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <a
              href={`https://reddit.com${currentSong.permalink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
            >
              <ArrowSquareOut className="h-4 w-4" weight="fill" />
              <span className="text-sm font-medium">View on Reddit</span>
            </a>
            <a
              href={currentSong.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
            >
              <ArrowSquareOut className="h-4 w-4" weight="fill" />
              <span className="text-sm font-medium">Open {currentSong.type}</span>
            </a>
          </div>

          {/* Comments Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold">Comments</h4>
              <button onClick={handleComment} className="text-sm text-primary hover:underline">
                Add Comment
              </button>
            </div>
            <div className="rounded-md border border-border bg-secondary/50 p-4 text-center">
              <ChatCircle
                className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50"
                weight="fill"
              />
              <p className="text-sm text-muted-foreground mb-3">Login to view and post comments</p>
              <button
                onClick={() => setShowLoginPrompt(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
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
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="bg-card rounded-lg p-6 max-w-sm w-full border border-border"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Login Required</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You need to login with your Reddit account to vote and comment.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowLoginPrompt(false)
                  alert('Reddit OAuth login would be implemented here')
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <SignIn className="h-4 w-4" weight="fill" />
                Login
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
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
