// components/song-panel.tsx
'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Music, ArrowUp, ArrowDown, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { usePlaylistStore } from '@/lib/store'
import { useAuth } from '@/lib/hooks/use-auth'
import { YouTubePlayer } from '@/components/players/youtube-player'
import { SoundCloudPlayer } from '@/components/players/soundcloud-player'
import { VimeoPlayer } from '@/components/players/vimeo-player'
import { MP3Player } from '@/components/players/mp3-player'
import { Comments } from '@/components/comments'
import { MessageCircle, Building2, TrendingUp } from 'lucide-react'

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
        duration: 10000,
        action: {
          label: 'Log In',
          onClick: login,
        },
      })
      return
    }

    if (!currentSong) return

    const newDirection = voteDirection === direction ? 0 : direction
    setVoteDirection(newDirection)

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentSong.name, // Reddit post fullname (e.g., "t3_abc123")
          dir: newDirection,
        }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error.message || 'Failed to vote.', { duration: 10000 })
        // Revert vote direction on error
        setVoteDirection(voteDirection)
      }
    } catch (error) {
      console.error('Vote error:', error)
      toast.error('Failed to vote. Please try again.', { duration: 10000 })
      // Revert vote direction on error
      setVoteDirection(voteDirection)
    }
  }

  if (!currentSong) {
    return (
      <div className="content-song py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-lg font-semibold mb-6">Current Song</h1>
        </div>

        {/* Promotional Content - Perfect Design */}
        <div className="space-y-4 mb-8">
          {/* SEO Audit */}
          <a
            href="https://seoaudit.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 p-4 rounded-lg bg-card border border-border hover:bg-secondary hover:border-primary/30 transition-all duration-200"
          >
            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                SEO Audit
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Get a SEO audit for your website
              </p>
            </div>
          </a>

          {/* LinkDR */}
          <a
            href="https://linkdr.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 p-4 rounded-lg bg-card border border-border hover:bg-secondary hover:border-primary/30 transition-all duration-200"
          >
            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                LinkDR
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Link Building Services
              </p>
            </div>
          </a>

          {/* MagicSpace SEO */}
          <a
            href="https://magicspaceseo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 p-4 rounded-lg bg-card border border-border hover:bg-secondary hover:border-primary/30 transition-all duration-200"
          >
            <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                MagicSpace SEO
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The best SEO agency for SaaS
              </p>
            </div>
          </a>
        </div>

        {/* Bottom Message */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-muted-foreground text-sm">
            Click on a song from the playlist and enjoy
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="@container content-song py-4 @md:py-6 px-4 @md:px-6 bg-background w-full h-full overflow-y-auto pb-24 @md:pb-28">
      {/* Header - Clean & Compact with Mobile Close */}
      <div className="mb-6 @md:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-base @md:text-lg font-bold mb-1">Now Playing</h1>
          <p className="text-xs text-muted-foreground">Current track details</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="@md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all "
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Video Player Area - Enhanced */}
      <div className="mb-8">
        {currentSong.type === 'youtube' && (
          <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-border">
            <YouTubePlayer song={currentSong} />
          </div>
        )}
        {currentSong.type === 'soundcloud' && (
          <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-border">
            <SoundCloudPlayer song={currentSong} />
          </div>
        )}
        {currentSong.type === 'vimeo' && (
          <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-border">
            <VimeoPlayer song={currentSong} />
          </div>
        )}
        {currentSong.type === 'mp3' && (
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl ring-1 ring-border">
            {currentSong.thumbnail &&
            currentSong.thumbnail !== 'self' &&
            currentSong.thumbnail !== 'default' &&
            currentSong.thumbnail !== 'nsfw' &&
            (currentSong.thumbnail.startsWith('http') || currentSong.thumbnail.startsWith('//')) ? (
              <Image
                src={
                  currentSong.thumbnail.startsWith('//')
                    ? `https:${currentSong.thumbnail}`
                    : currentSong.thumbnail
                }
                alt={currentSong.title}
                fill
                className="object-cover"
                sizes="100vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Music className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <MP3Player song={currentSong} />
            </div>
          </div>
        )}
      </div>

      {/* Song Title & Actions */}
      <div className="mb-8 px-4 @md:px-0">
        <h2 className="text-base @md:text-lg font-bold mb-2 leading-tight">{currentSong.title}</h2>
        <p className="text-sm text-muted-foreground mb-6">by {currentSong.author}</p>

        {/* Action Buttons - Clean */}
        <div className="flex items-center justify-center gap-2 @md:gap-3 mb-3 @md:mb-4">
          <button
            onClick={() => handleVote(1)}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-colors min-h-[60px] text-center ${
              voteDirection === 1
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
            }`}
            title="Upvote"
          >
            <ArrowUp
              className={`w-5 h-5 mb-1 mx-auto ${voteDirection === 1 ? 'text-primary' : 'text-muted-foreground'}`}
              strokeWidth={3}
            />
            <span className="text-xs text-center">Upvote</span>
          </button>
          <button
            onClick={() => handleVote(-1)}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-colors min-h-[60px] text-center ${
              voteDirection === -1
                ? 'bg-destructive/10 text-destructive'
                : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
            }`}
            title="Downvote"
          >
            <ArrowDown
              className={`w-5 h-5 mb-1 mx-auto ${voteDirection === -1 ? 'text-destructive' : 'text-muted-foreground'}`}
              strokeWidth={3}
            />
            <span className="text-xs text-center">Downvote</span>
          </button>
          <a
            href={`https://www.reddit.com${currentSong.permalink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center px-3 py-2 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors min-h-[60px] text-center"
            title="View on Reddit"
          >
            <svg
              className="w-5 h-5 mb-1 mx-auto"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#akarIconsRedditFill0)">
                <path
                  fillRule="evenodd"
                  d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12S5.373 0 12 0s12 5.373 12 12Zm-4.312-.942c.194.277.304.604.316.942a1.751 1.751 0 0 1-.972 1.596c.014.176.014.352 0 .528c0 2.688-3.132 4.872-6.996 4.872c-3.864 0-6.996-2.184-6.996-4.872a3.444 3.444 0 0 1 0-.528a1.75 1.75 0 1 1 1.932-2.868a8.568 8.568 0 0 1 4.68-1.476l.888-4.164a.372.372 0 0 1 .444-.288l2.94.588a1.2 1.2 0 1 1-.156.732L13.2 5.58l-.78 3.744a8.544 8.544 0 0 1 4.62 1.476a1.751 1.751 0 0 1 2.648.258ZM8.206 12.533a1.2 1.2 0 1 0 1.996 1.334a1.2 1.2 0 0 0-1.996-1.334Zm3.806 4.891c1.065.044 2.113-.234 2.964-.876a.335.335 0 1 0-.468-.48A3.936 3.936 0 0 1 12 16.8a3.924 3.924 0 0 1-2.496-.756a.324.324 0 0 0-.456.456a4.608 4.608 0 0 0 2.964.924Zm2.081-3.178c.198.132.418.25.655.25a1.199 1.199 0 0 0 1.212-1.248a1.2 1.2 0 1 0-1.867.998Z"
                  clipRule="evenodd"
                />
              </g>
              <defs>
                <clipPath id="akarIconsRedditFill0">
                  <path fill="#000000" d="M0 0h24v24H0z" />
                </clipPath>
              </defs>
            </svg>
            <span className="text-xs text-center">Reddit</span>
          </a>
          {currentSong.url && (
            <a
              href={currentSong.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-colors min-h-[60px] text-center ${
                currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be'
                  ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
              title={`Open on ${currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be' ? 'YouTube' : currentSong.domain}`}
            >
              {currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be' ? (
                <>
                  <svg
                    className="w-5 h-5 mb-1 mx-auto"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span className="text-xs text-center">YouTube</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5 mb-1 mx-auto" />
                  <span className="text-xs text-center">{currentSong.domain}</span>
                </>
              )}
            </a>
          )}
        </div>

        {/* Metadata - Clean Grid */}
        <div className="grid grid-cols-2 @md:grid-cols-4 gap-2 @md:gap-3 px-4 @md:px-0">
          <div className="p-3 bg-card rounded-lg border border-border hover:border-border/80 transition-colors">
            <div className="text-[10px] font-bold text-primary mb-1 leading-none">
              {currentSong.score?.toLocaleString() || '0'}
            </div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Karma
            </div>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border hover:border-border/80 transition-colors">
            <div
              className="text-[10px] font-semibold mb-1 truncate leading-tight"
              title={`/u/${currentSong.author}`}
            >
              /u/{currentSong.author || 'Unknown'}
            </div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Author
            </div>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border hover:border-border/80 transition-colors">
            <div className="text-[10px] font-semibold mb-1 leading-tight">
              {currentSong.created_ago ? currentSong.created_ago.replace(' ago', '') : 'N/A'}
            </div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Age
            </div>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border hover:border-border/80 transition-colors">
            <div
              className="text-[10px] font-semibold mb-1 truncate leading-tight"
              title={`/r/${currentSong.subreddit}`}
            >
              /r/{currentSong.subreddit || 'Unknown'}
            </div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Subreddit
            </div>
          </div>
        </div>
      </div>

      {/* Selftext */}
      {currentSong.selftext && (
        <div className="mb-8 p-5 bg-card rounded-xl border border-border hover:border-border/80 transition-all duration-200 shadow-lg">
          <div className="text-sm leading-relaxed prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: currentSong.selftext }} />
          </div>
        </div>
      )}

      {/* Comments Section - Enhanced */}
      <div className="mb-6 w-full max-w-full overflow-x-hidden pb-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold mb-1">Comments</h2>
            <p className="text-xs text-muted-foreground">
              {currentSong.num_comments} {currentSong.num_comments === 1 ? 'comment' : 'comments'}
            </p>
          </div>
        </div>
        <div className="mb-4 w-full max-w-full overflow-x-hidden">
          <Comments permalink={currentSong.permalink} />
        </div>
        {/* Comment Form - Enhanced */}
        <form
          className="mt-6 pt-6 border-t border-border space-y-4"
          onSubmit={async e => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const commentText = formData.get('comment') as string

            if (!isAuthenticated) {
              toast.error('You need to be logged in to post comments.', {
                duration: 10000,
                action: {
                  label: 'Log In',
                  onClick: login,
                },
              })
              return
            }

            if (!commentText || commentText.trim().length === 0) {
              toast.error('Please enter a comment.', { duration: 10000 })
              return
            }

            try {
              const response = await fetch('/api/add_comment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  thing_id: currentSong.name, // Reddit post fullname
                  text: commentText.trim(),
                }),
              })

              const data = await response.json()

              if (data.error) {
                toast.error(data.error.message || 'Failed to post comment.', { duration: 10000 })
              } else {
                toast.success('Comment posted successfully!', { duration: 5000 })
                // Clear form
                e.currentTarget.reset()
                // Reload comments (you might want to add a refresh function)
                window.location.reload()
              }
            } catch (error) {
              console.error('Comment error:', error)
              toast.error('Failed to post comment. Please try again.', { duration: 10000 })
            }
          }}
        >
          <Textarea
            name="comment"
            className="w-full p-4 bg-card border border-border rounded-xl resize-none focus:outline-hidden focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus-visible:ring-offset-0 text-sm min-h-[100px] transition-all duration-200"
            placeholder={isAuthenticated ? 'Add a comment...' : 'Log in to add a comment...'}
            rows={4}
            disabled={!isAuthenticated}
          />
          <Button
            type="submit"
            disabled={!isAuthenticated}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-200 py-3 rounded-xl"
          >
            {isAuthenticated ? 'Post Comment' : 'Log In to Comment'}
          </Button>
        </form>
      </div>
    </div>
  )
}
