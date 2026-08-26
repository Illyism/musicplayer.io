// components/song-panel.tsx
'use client'

import {
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  Buildings,
  ChatCircle,
  MusicNote,
  TrendUp,
  X,
} from '@phosphor-icons/react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'
import { Comments } from '@/components/comments'
import { MP3Player } from '@/components/players/mp3-player'
import { SoundCloudPlayer } from '@/components/players/soundcloud-player'
import { VimeoPlayer } from '@/components/players/vimeo-player'
import { YouTubePlayer } from '@/components/players/youtube-player'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/hooks/use-auth'
import { usePlaylistStore } from '@/lib/store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'

interface SongPanelProps {
  onClose?: () => void
}

export function SongPanel({ onClose }: SongPanelProps = {}) {
  const currentSong = usePlaylistStore(state => state.currentSong)
  const { isAuthenticated, login } = useAuth()
  const [voteDirection, setVoteDirection] = useState<number>(0)

  const handleVote = async (direction: number) => {
    // Check if authenticated
    if (!isAuthenticated) {
      toast.error('You need to be logged in to vote.', {
        action: {
          label: 'Log In',
          onClick: login,
        },
        duration: 10_000,
      })
      return
    }

    if (!currentSong) {
      return
    }

    const newDirection = voteDirection === direction ? 0 : direction
    setVoteDirection(newDirection)

    try {
      const response = await fetch('/api/vote', {
        body: JSON.stringify({
          dir: newDirection,
          id: currentSong.name, // Reddit post fullname (e.g., "t3_abc123")
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error.message || 'Failed to vote.', { duration: 10_000 })
        // Revert vote direction on error
        setVoteDirection(voteDirection)
      }
    } catch (error) {
      console.error('Vote error:', error)
      toast.error('Failed to vote. Please try again.', { duration: 10_000 })
      // Revert vote direction on error
      setVoteDirection(voteDirection)
    }
  }

  if (!currentSong) {
    return (
      <div className="px-4 py-6 content-song">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-6 font-semibold text-lg">Current Song</h1>
        </div>

        {/* Promotional Content - Perfect Design */}
        <div className="mb-8 space-y-4">
          {/* SEO Audit */}
          <a
            className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-secondary"
            href="https://seoaudit.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 transition-transform group-hover:scale-105">
              <ChatCircle className="h-5 w-5 text-primary" weight="fill" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-semibold transition-colors group-hover:text-primary">
                SEO Audit
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Get a SEO audit for your website
              </p>
            </div>
          </a>

          {/* LinkDR */}
          <a
            className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-secondary"
            href="https://linkdr.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 transition-transform group-hover:scale-105">
              <Buildings className="h-5 w-5 text-primary" weight="fill" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-semibold transition-colors group-hover:text-primary">
                LinkDR
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Link Building Services
              </p>
            </div>
          </a>

          {/* MagicSpace SEO */}
          <a
            className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-secondary"
            href="https://magicspaceseo.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 transition-transform group-hover:scale-105">
              <TrendUp className="h-5 w-5 text-primary" weight="fill" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-semibold transition-colors group-hover:text-primary">
                MagicSpace SEO
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The best SEO agency for SaaS
              </p>
            </div>
          </a>
        </div>

        {/* Bottom Message */}
        <div className="mt-12 border-border border-t pt-8">
          <p className="text-center text-muted-foreground text-sm">
            Click on a song from the playlist and enjoy
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="@container h-full w-full overflow-y-auto bg-background @md:px-6 px-4 @md:py-6 py-4 @md:pb-28 pb-24 content-song">
      {/* Header - Clean & Compact with Mobile Close */}
      <div className="@md:mb-8 mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-bold @md:text-lg text-base">Now Playing</h1>
          <p className="text-muted-foreground text-xs">Current track details</p>
        </div>
        {onClose && (
          <button
            aria-label="Close"
            className="@md:hidden rounded-lg p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" weight="bold" />
          </button>
        )}
      </div>

      {/* Video Player Area - Enhanced */}
      <div className="mb-8">
        {currentSong.type === 'youtube' && (
          <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-border">
            <YouTubePlayer song={currentSong} />
          </div>
        )}
        {currentSong.type === 'soundcloud' && (
          <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-border">
            <SoundCloudPlayer song={currentSong} />
          </div>
        )}
        {currentSong.type === 'vimeo' && (
          <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-border">
            <VimeoPlayer song={currentSong} />
          </div>
        )}
        {currentSong.type === 'mp3' && (
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-border">
            {currentSong.thumbnail ? (
              <Image
                alt={currentSong.title}
                className="object-cover"
                fill
                sizes="100vw"
                src={currentSong.thumbnail}
                unoptimized={isRedditHostedImage(currentSong.thumbnail)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary">
                <MusicNote className="h-16 w-16 text-muted-foreground" weight="fill" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <MP3Player song={currentSong} />
            </div>
          </div>
        )}
      </div>

      {/* Song Title & Actions */}
      <div className="mb-8 @md:px-0 px-4">
        <h2 className="mb-2 font-bold @md:text-lg text-base leading-tight">{currentSong.title}</h2>
        <p className="mb-6 text-muted-foreground text-sm">by {currentSong.author}</p>

        {/* Action Buttons - Clean */}
        <div className="@md:mb-4 mb-3 flex items-center justify-center @md:gap-3 gap-2">
          <button
            className={`flex min-h-[60px] flex-col items-center justify-center rounded-md px-3 py-2 text-center transition-colors ${
              voteDirection === 1
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
            }`}
            onClick={() => handleVote(1)}
            title="Upvote"
            type="button"
          >
            <ArrowUp
              className={`mx-auto mb-1 h-5 w-5 ${voteDirection === 1 ? 'text-primary' : 'text-muted-foreground'}`}
              weight="fill"
            />
            <span className="text-center text-xs">Upvote</span>
          </button>
          <button
            className={`flex min-h-[60px] flex-col items-center justify-center rounded-md px-3 py-2 text-center transition-colors ${
              voteDirection === -1
                ? 'bg-destructive/10 text-destructive'
                : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
            }`}
            onClick={() => handleVote(-1)}
            title="Downvote"
            type="button"
          >
            <ArrowDown
              className={`mx-auto mb-1 h-5 w-5 ${voteDirection === -1 ? 'text-destructive' : 'text-muted-foreground'}`}
              weight="fill"
            />
            <span className="text-center text-xs">Downvote</span>
          </button>
          <a
            className="flex min-h-[60px] flex-col items-center justify-center rounded-md px-3 py-2 text-center text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
            href={`https://www.reddit.com${currentSong.permalink}`}
            rel="noopener noreferrer"
            target="_blank"
            title="View on Reddit"
          >
            <svg
              aria-hidden="true"
              className="mx-auto mb-1 h-5 w-5"
              fill="currentColor"
              focusable="false"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#akarIconsRedditFill0)">
                <path
                  clipRule="evenodd"
                  d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12S5.373 0 12 0s12 5.373 12 12Zm-4.312-.942c.194.277.304.604.316.942a1.751 1.751 0 0 1-.972 1.596c.014.176.014.352 0 .528c0 2.688-3.132 4.872-6.996 4.872c-3.864 0-6.996-2.184-6.996-4.872a3.444 3.444 0 0 1 0-.528a1.75 1.75 0 1 1 1.932-2.868a8.568 8.568 0 0 1 4.68-1.476l.888-4.164a.372.372 0 0 1 .444-.288l2.94.588a1.2 1.2 0 1 1-.156.732L13.2 5.58l-.78 3.744a8.544 8.544 0 0 1 4.62 1.476a1.751 1.751 0 0 1 2.648.258ZM8.206 12.533a1.2 1.2 0 1 0 1.996 1.334a1.2 1.2 0 0 0-1.996-1.334Zm3.806 4.891c1.065.044 2.113-.234 2.964-.876a.335.335 0 1 0-.468-.48A3.936 3.936 0 0 1 12 16.8a3.924 3.924 0 0 1-2.496-.756a.324.324 0 0 0-.456.456a4.608 4.608 0 0 0 2.964.924Zm2.081-3.178c.198.132.418.25.655.25a1.199 1.199 0 0 0 1.212-1.248a1.2 1.2 0 1 0-1.867.998Z"
                  fillRule="evenodd"
                />
              </g>
              <defs>
                <clipPath id="akarIconsRedditFill0">
                  <path d="M0 0h24v24H0z" fill="#000000" />
                </clipPath>
              </defs>
            </svg>
            <span className="text-center text-xs">Reddit</span>
          </a>
          {currentSong.url && (
            <a
              className={`flex min-h-[60px] flex-col items-center justify-center rounded-md px-3 py-2 text-center transition-colors ${
                currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be'
                  ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              href={currentSong.url}
              rel="noopener noreferrer"
              target="_blank"
              title={`Open on ${currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be' ? 'YouTube' : currentSong.domain}`}
            >
              {currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be' ? (
                <>
                  <svg
                    aria-hidden="true"
                    className="mx-auto mb-1 h-5 w-5"
                    fill="currentColor"
                    focusable="false"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span className="text-center text-xs">YouTube</span>
                </>
              ) : (
                <>
                  <ArrowSquareOut className="mx-auto mb-1 h-5 w-5" weight="fill" />
                  <span className="text-center text-xs">{currentSong.domain}</span>
                </>
              )}
            </a>
          )}
        </div>

        {/* Metadata - Clean Grid */}
        <div className="grid @md:grid-cols-4 grid-cols-2 @md:gap-3 gap-2 @md:px-0 px-4">
          <div className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-border/80">
            <div className="mb-1 font-bold text-[10px] text-primary leading-none">
              {currentSong.score?.toLocaleString() || '0'}
            </div>
            <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              Karma
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-border/80">
            <div
              className="mb-1 truncate font-semibold text-[10px] leading-tight"
              title={`/u/${currentSong.author}`}
            >
              /u/{currentSong.author || 'Unknown'}
            </div>
            <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              Author
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-border/80">
            <div className="mb-1 font-semibold text-[10px] leading-tight">
              {currentSong.created_ago ? currentSong.created_ago.replace(' ago', '') : 'N/A'}
            </div>
            <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              Age
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-border/80">
            <div
              className="mb-1 truncate font-semibold text-[10px] leading-tight"
              title={`/r/${currentSong.subreddit}`}
            >
              /r/{currentSong.subreddit || 'Unknown'}
            </div>
            <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              Subreddit
            </div>
          </div>
        </div>
      </div>

      {/* Selftext */}
      {currentSong.selftext && (
        <div className="mb-8 rounded-xl border border-border bg-card p-5 shadow-lg transition-all duration-200 hover:border-border/80">
          <div className="prose prose-invert max-w-none text-sm leading-relaxed">
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Reddit-provided selftext HTML */}
            <div dangerouslySetInnerHTML={{ __html: currentSong.selftext }} />
          </div>
        </div>
      )}

      {/* Comments Section - Enhanced */}
      <div className="mb-6 w-full max-w-full overflow-x-hidden pb-8">
        <div className="mb-6 flex items-center justify-between border-border border-b pb-4">
          <div>
            <h2 className="mb-1 font-bold text-xl">Comments</h2>
            <p className="text-muted-foreground text-xs">
              {currentSong.num_comments} {currentSong.num_comments === 1 ? 'comment' : 'comments'}
            </p>
          </div>
        </div>
        <div className="mb-4 w-full max-w-full overflow-x-hidden">
          <Comments permalink={currentSong.permalink} />
        </div>
        {/* Comment Form - Enhanced */}
        <form
          className="mt-6 space-y-4 border-border border-t pt-6"
          onSubmit={async e => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const commentText = formData.get('comment') as string

            if (!isAuthenticated) {
              toast.error('You need to be logged in to post comments.', {
                action: {
                  label: 'Log In',
                  onClick: login,
                },
                duration: 10_000,
              })
              return
            }

            if (!commentText || commentText.trim().length === 0) {
              toast.error('Please enter a comment.', { duration: 10_000 })
              return
            }

            try {
              const response = await fetch('/api/add_comment', {
                body: JSON.stringify({
                  text: commentText.trim(),
                  thing_id: currentSong.name, // Reddit post fullname
                }),
                headers: {
                  'Content-Type': 'application/json',
                },
                method: 'POST',
              })

              const data = await response.json()

              if (data.error) {
                toast.error(data.error.message || 'Failed to post comment.', { duration: 10_000 })
              } else {
                toast.success('Comment posted successfully!', { duration: 5000 })
                // Clear form
                e.currentTarget.reset()
                // Reload comments (you might want to add a refresh function)
                window.location.reload()
              }
            } catch (error) {
              console.error('Comment error:', error)
              toast.error('Failed to post comment. Please try again.', { duration: 10_000 })
            }
          }}
        >
          <Textarea
            className="min-h-[100px] w-full resize-none rounded-xl border border-border bg-card p-4 text-sm transition-all duration-200 focus:border-primary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus-visible:ring-offset-0"
            disabled={!isAuthenticated}
            name="comment"
            placeholder={isAuthenticated ? 'Add a comment...' : 'Log in to add a comment...'}
            rows={4}
          />
          <Button
            className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isAuthenticated}
            type="submit"
          >
            {isAuthenticated ? 'Post Comment' : 'Log In to Comment'}
          </Button>
        </form>
      </div>
    </div>
  )
}
