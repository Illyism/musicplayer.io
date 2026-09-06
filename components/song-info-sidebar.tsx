'use client'

import {
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  ChatCircle,
  MusicNote,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { usePlayerStore } from '@/lib/store/player-store'
import { LoginModal } from './login-modal'
import { MediaPlayerFrame } from './media-player-frame'

interface Comment {
  author: string
  body: string
  created_ago: string
  id: string
  replies: Comment[] // Changed from number to array
  score: number
}

// Recursive Comment Component
function CommentItem({
  comment,
  depth = 0,
  onLogin,
}: {
  comment: Comment
  depth?: number
  onLogin: (action: string) => void
}) {
  const [showReplies, setShowReplies] = useState(true)
  const hasReplies = comment.replies && comment.replies.length > 0

  return (
    <div className={depth > 0 ? 'ml-4 border-border border-l-2 pl-4' : ''}>
      <div className="mb-3 rounded-lg bg-secondary p-4">
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="truncate font-medium text-sm">/u/{comment.author}</div>
          <div className="whitespace-nowrap text-muted-foreground text-xs">
            • {comment.created_ago}
          </div>
        </div>
        <p className="wrap-break-word whitespace-pre-wrap text-sm">{comment.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button
            className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
            onClick={() => onLogin('vote')}
            type="button"
          >
            <ArrowUp className="h-3 w-3" weight="fill" />
            <span>{comment.score}</span>
          </button>
          <button
            className="text-muted-foreground text-xs hover:text-foreground"
            onClick={() => onLogin('reply')}
            type="button"
          >
            Reply
          </button>
          {hasReplies && (
            <button
              className="text-primary text-xs hover:underline"
              onClick={() => setShowReplies(!showReplies)}
              type="button"
            >
              {showReplies ? 'Hide' : 'Show'} {comment.replies.length}{' '}
              {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {hasReplies && showReplies && (
        <div className="space-y-3">
          {comment.replies.map(reply => (
            <CommentItem comment={reply} depth={depth + 1} key={reply.id} onLogin={onLogin} />
          ))}
        </div>
      )}
    </div>
  )
}

interface SongInfoSidebarProps {
  isDesktop: boolean
}

export function SongInfoSidebar({ isDesktop }: SongInfoSidebarProps) {
  const { currentSong } = usePlayerStore()
  const _currentSongId = currentSong?.id
  const currentSongPermalink = currentSong?.permalink
  const [comment, setComment] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginAction, setLoginAction] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)

  const handleLogin = (action: string) => {
    setLoginAction(action)
    setShowLoginModal(true)
  }

  const handleAddComment = () => {
    if (!comment.trim()) {
      return
    }
    handleLogin('comment')
  }

  // Load comments when song ID changes (not when object reference changes)
  useEffect(() => {
    if (!currentSongPermalink) {
      setComments([])
      return
    }

    const loadComments = async () => {
      setLoadingComments(true)
      try {
        const { getComments } = await import('@/lib/actions/reddit')
        const data = await getComments(currentSongPermalink)
        setComments(data.comments || [])
      } catch (error) {
        console.error('Failed to load comments:', error)
      } finally {
        setLoadingComments(false)
      }
    }

    loadComments()
  }, [currentSongPermalink]) // Only reload when song identity changes

  if (!currentSong) {
    return (
      <div className="hidden h-full w-full flex-col border-border border-l bg-card lg:flex">
        <div className="flex-1 overflow-y-auto pb-24">
          {/* Current Song Header */}
          <div className="border-border border-b p-6">
            <div className="flex items-center gap-3">
              <MusicNote className="h-5 w-5" weight="fill" />
              <h3 className="font-bold text-lg">Current Song</h3>
            </div>
          </div>

          {/* Empty State with Links */}
          <div className="space-y-6 p-6">
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <MusicNote className="h-8 w-8 text-muted-foreground" weight="fill" />
              </div>
              <p className="text-muted-foreground text-sm">Select a song to start playing</p>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              {/* Placeholder quick link — wire up a destination before shipping */}
              <div className="flex items-start gap-3 rounded-lg bg-secondary p-4">
                <ChatCircle aria-hidden="true" className="mt-0.5 h-5 w-5" weight="fill" />
                <div>
                  <div className="font-medium text-sm">SEO Audit</div>
                  <div className="text-muted-foreground text-xs">
                    Get a SEO audit for your website
                  </div>
                </div>
              </div>
              {/* Placeholder quick link — wire up a destination before shipping */}
              <div className="flex items-start gap-3 rounded-lg bg-secondary p-4">
                <svg
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5"
                  focusable="false"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                <div>
                  <div className="font-medium text-sm">LinkDR</div>
                  <div className="text-muted-foreground text-xs">Link Building Services</div>
                </div>
              </div>
              {/* Placeholder quick link — wire up a destination before shipping */}
              <div className="flex items-start gap-3 rounded-lg bg-secondary p-4">
                <svg
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5"
                  focusable="false"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                <div>
                  <div className="font-medium text-sm">MagicSpace SEO</div>
                  <div className="text-muted-foreground text-xs">The best SEO agency for SaaS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get platform name
  const getPlatformName = () => {
    if (currentSong.type === 'youtube') {
      return 'YouTube'
    }
    if (currentSong.type === 'soundcloud') {
      return 'SoundCloud'
    }
    if (currentSong.type === 'vimeo') {
      return 'Vimeo'
    }
    return 'Link'
  }

  return (
    <div className="hidden h-full w-full flex-col bg-card lg:flex">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="space-y-4">
          {/* Video Player - FIRST! */}
          {/* Only render player on desktop to prevent duplicate players */}
          {isDesktop && <MediaPlayerFrame playerKeyPrefix="desktop-player" song={currentSong} />}

          {/* Content with padding */}
          <div className="space-y-5">
            {/* Song Title & Actions */}
            <div className="px-4">
              <h2 className="mb-1.5 line-clamp-2 font-bold text-base leading-tight">
                {currentSong.title}
              </h2>
              <p className="mb-4 text-muted-foreground text-xs">
                by <span className="font-medium">u/{currentSong.author}</span>
              </p>

              {/* Action Buttons - Clean & Polished */}
              <div className="mb-4 grid grid-cols-4 gap-2">
                <button
                  className="group flex min-h-[58px] flex-col items-center justify-center rounded-lg bg-primary/10 px-2 py-2.5 text-center text-primary transition-colors hover:bg-primary/15"
                  onClick={() => handleLogin('upvote')}
                  title="Upvote"
                  type="button"
                >
                  <ArrowUp
                    className="mx-auto mb-1 h-5 w-5 transition-transform group-active:scale-95"
                    weight="fill"
                  />
                  <span className="font-medium text-xs">Upvote</span>
                </button>
                <button
                  className="group flex min-h-[58px] flex-col items-center justify-center rounded-lg bg-secondary/60 px-2 py-2.5 text-center text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleLogin('downvote')}
                  title="Downvote"
                  type="button"
                >
                  <ArrowDown
                    className="mx-auto mb-1 h-5 w-5 transition-transform group-active:scale-95"
                    weight="fill"
                  />
                  <span className="font-medium text-xs">Downvote</span>
                </button>
                <a
                  className="group flex min-h-[58px] flex-col items-center justify-center rounded-lg bg-secondary/60 px-2 py-2.5 text-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  href={`https://www.reddit.com${currentSong.permalink}`}
                  rel="noopener noreferrer"
                  target="_blank"
                  title="View on Reddit"
                >
                  <svg
                    aria-hidden="true"
                    className="mx-auto mb-1 h-5 w-5 transition-transform group-active:scale-95"
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
                  <span className="font-medium text-xs">Reddit</span>
                </a>
                {currentSong.url && (
                  <a
                    className={`group flex min-h-[58px] flex-col items-center justify-center rounded-lg px-2 py-2.5 text-center transition-colors ${
                      currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be'
                        ? 'bg-secondary/60 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                        : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                          className="mx-auto mb-1 h-5 w-5 transition-transform group-active:scale-95"
                          fill="currentColor"
                          focusable="false"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        <span className="font-medium text-xs">YouTube</span>
                      </>
                    ) : (
                      <>
                        <ArrowSquareOut
                          className="mx-auto mb-1 h-5 w-5 transition-transform group-active:scale-95"
                          weight="fill"
                        />
                        <span className="font-medium text-xs">{getPlatformName()}</span>
                      </>
                    )}
                  </a>
                )}
              </div>

              {/* Metadata - 2x2 Grid Only */}
              <div className="grid grid-cols-2 gap-2">
                <div className="group rounded-lg border border-border bg-secondary p-3 transition-colors hover:border-primary/30">
                  <div className="mb-1 font-bold text-lg text-primary leading-none">
                    {currentSong.score?.toLocaleString() || '0'}
                  </div>
                  <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Karma
                  </div>
                </div>
                <div className="group rounded-lg border border-border bg-secondary p-3 transition-colors hover:border-border/80">
                  <div
                    className="mb-1.5 truncate font-bold text-sm leading-tight"
                    title={`/u/${currentSong.author}`}
                  >
                    /u/{currentSong.author || 'Unknown'}
                  </div>
                  <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Author
                  </div>
                </div>
                <div className="group rounded-lg border border-border bg-secondary p-3 transition-colors hover:border-border/80">
                  <div className="mb-1.5 font-bold text-sm leading-tight">
                    {currentSong.created_ago ? currentSong.created_ago.replace(' ago', '') : 'N/A'}
                  </div>
                  <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Age
                  </div>
                </div>
                <div className="group rounded-lg border border-border bg-secondary p-3 transition-colors hover:border-border/80">
                  <div
                    className="mb-1.5 truncate font-bold text-sm leading-tight"
                    title={`/r/${currentSong.subreddit}`}
                  >
                    /r/{currentSong.subreddit || 'Unknown'}
                  </div>
                  <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Subreddit
                  </div>
                </div>
              </div>
            </div>

            {/* Selftext */}
            {currentSong.selftext && (
              <div className="mx-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80">
                <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Reddit-provided selftext HTML */}
                  <div dangerouslySetInnerHTML={{ __html: currentSong.selftext }} />
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="px-4">
              <h3 className="mb-3 font-bold text-base">Comments</h3>

              {/* Comment Input */}
              <div className="space-y-3">
                <textarea
                  className="h-24 w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  value={comment}
                />
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                  onClick={handleAddComment}
                  type="button"
                >
                  <PaperPlaneTilt className="h-4 w-4" weight="fill" />
                  Add Comment
                </button>
              </div>

              {/* Existing Comments */}
              <div className="mt-6 space-y-3">
                {(() => {
                  if (loadingComments) {
                    return (
                      <div className="py-8 text-center">
                        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-muted-foreground text-sm">Loading comments...</p>
                      </div>
                    )
                  }
                  if (comments.length === 0) {
                    return (
                      <div className="py-8 text-center text-muted-foreground text-sm">
                        No comments yet. Be the first to comment!
                      </div>
                    )
                  }
                  return comments.map(songComment => (
                    <CommentItem comment={songComment} key={songComment.id} onLogin={handleLogin} />
                  ))
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        action={loginAction}
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
}
