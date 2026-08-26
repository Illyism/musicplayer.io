'use client'

import { ArrowSquareOut, ArrowUp, ChatCircle, MusicNote } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { usePlayerStore } from '@/lib/store/player-store'
import { LoginModal } from './login-modal'
import { MediaPlayerFrame } from './media-player-frame'

interface Comment {
  author: string
  body: string
  body_html: string
  created_ago: string
  id: string
  replies: Comment[]
  score: number
}

// Comment Component for Mobile
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
      <div className="mb-2 rounded-lg bg-secondary p-3">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="font-medium">/u/{comment.author}</span>
          <span className="text-muted-foreground">• {comment.created_ago}</span>
        </div>
        <p className="wrap-break-word mb-2 whitespace-pre-wrap text-sm">{comment.body}</p>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
            onClick={() => onLogin('vote')}
            type="button"
          >
            <ArrowUp className="h-3 w-3" weight="fill" />
            <span>{comment.score}</span>
          </button>
          {hasReplies && (
            <button
              className="text-muted-foreground text-xs hover:text-foreground"
              onClick={() => setShowReplies(!showReplies)}
              type="button"
            >
              {showReplies ? 'Hide' : 'Show'} {comment.replies.length}{' '}
              {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>
      {hasReplies && showReplies && (
        <div className="mt-2">
          {comment.replies.map(reply => (
            <CommentItem comment={reply} depth={depth + 1} key={reply.id} onLogin={onLogin} />
          ))}
        </div>
      )}
    </div>
  )
}

interface PlayerPanelProps {
  isDesktop: boolean
}

export function PlayerPanel({ isDesktop }: PlayerPanelProps) {
  const currentSong = usePlayerStore(state => state.currentSong)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginAction, setLoginAction] = useState('')

  // Fetch comments when song ID changes (not when object reference changes)
  useEffect(() => {
    if (!currentSong) {
      setComments([])
      return
    }

    const songTitle = currentSong.title
    const songPermalink = currentSong.permalink

    console.log('[Mobile] Loading comments for:', songTitle)
    setLoadingComments(true)

    const loadComments = async () => {
      try {
        const { getComments } = await import('@/lib/actions/reddit')
        const data = await getComments(songPermalink)
        console.log('[Mobile] Comments loaded:', data.comments?.length || 0)
        setComments(data.comments || [])
      } catch (error) {
        console.error('[Mobile] Failed to load comments:', error)
      } finally {
        setLoadingComments(false)
      }
    }

    loadComments()
  }, [currentSong?.id, currentSong?.title, currentSong?.permalink, currentSong]) // Only reload when song ID changes, not object reference

  const handleLogin = (action: string) => {
    setLoginAction(action)
    setShowLoginModal(true)
  }

  if (!currentSong) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <MusicNote className="h-10 w-10 text-primary" weight="fill" />
        </div>
        <h3 className="mb-2 font-semibold text-lg">No song playing</h3>
        <p className="max-w-xs text-muted-foreground text-sm">
          Select a song from the playlist to start listening
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-24">
      {/* Player */}
      {/* Only render player on mobile to prevent duplicate players */}
      {!isDesktop && (
        <MediaPlayerFrame className="shrink-0" playerKeyPrefix="mobile-player" song={currentSong} />
      )}

      {/* Song Info */}
      <div className="space-y-4 p-4">
        {/* Title & Artist */}
        <div>
          <h2 className="mb-1 line-clamp-2 font-bold text-lg">{currentSong.title}</h2>
          <p className="text-muted-foreground text-sm">by {currentSong.author}</p>
        </div>

        {/* Stats - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary p-3">
            <p className="font-bold text-primary text-xl">{currentSong.score.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Karma</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <p className="font-bold text-xl">{currentSong.num_comments.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Comments</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <p className="truncate font-medium text-sm">{currentSong.author}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Author</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <p className="font-medium text-sm">{currentSong.created_ago}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Age</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subreddit</span>
            <span className="font-medium">r/{currentSong.subreddit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Domain</span>
            <span className="ml-2 truncate font-medium">{currentSong.domain}</span>
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-2">
          <a
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 font-medium text-sm transition-colors hover:bg-secondary/80"
            href={`https://reddit.com${currentSong.permalink}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ArrowSquareOut className="h-4 w-4" weight="fill" />
            Reddit
          </a>
          {currentSong.url && (
            <a
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 font-medium text-sm transition-colors hover:bg-secondary/80"
              href={currentSong.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ArrowSquareOut className="h-4 w-4" weight="fill" />
              Source
            </a>
          )}
        </div>

        {/* Comments Section */}
        <div className="mt-4 border-border border-t pt-4">
          <div className="mb-4 flex items-center gap-2">
            <ChatCircle className="h-5 w-5 text-primary" weight="fill" />
            <h3 className="font-bold text-base">Comments</h3>
            <span className="text-muted-foreground text-sm">
              ({currentSong.num_comments.toLocaleString()})
            </span>
          </div>

          {(() => {
            if (loadingComments) {
              return (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-muted-foreground text-sm">Loading comments...</p>
                </div>
              )
            }
            if (comments.length > 0) {
              return (
                <div className="space-y-2">
                  <p className="mb-2 text-muted-foreground text-xs">
                    Showing {comments.length} top comments
                  </p>
                  {comments.map(songComment => (
                    <CommentItem comment={songComment} key={songComment.id} onLogin={handleLogin} />
                  ))}
                </div>
              )
            }
            return (
              <div className="rounded-lg border border-border bg-secondary/30 py-12 text-center">
                <ChatCircle
                  className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50"
                  weight="fill"
                />
                <p className="mb-1 font-medium text-sm">No comments yet</p>
                <p className="text-muted-foreground text-xs">Be the first to comment on Reddit!</p>
              </div>
            )
          })()}
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
