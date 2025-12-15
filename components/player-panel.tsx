'use client'

import { Music, ExternalLink, MessageCircle, ArrowUp } from 'lucide-react'
import { usePlayerStore } from '@/lib/store/player-store'
import { LoginModal } from './login-modal'
import { YouTubePlayer } from './players/youtube-player'
import { SoundCloudPlayer } from './players/soundcloud-player'
import { VimeoPlayer } from './players/vimeo-player'
import { MP3Player } from './players/mp3-player'
import { useState, useEffect } from 'react'

interface Comment {
  id: string
  author: string
  body: string
  body_html: string
  score: number
  created_ago: string
  replies: Comment[]
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
    <div className={depth > 0 ? 'ml-4 pl-4 border-l-2 border-border' : ''}>
      <div className="p-3 rounded-lg bg-secondary mb-2">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span className="font-medium">/u/{comment.author}</span>
          <span className="text-muted-foreground">• {comment.created_ago}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap wrap-break-word mb-2">{comment.body}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onLogin('vote')}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowUp className="h-3 w-3" />
            <span>{comment.score}</span>
          </button>
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-muted-foreground hover:text-foreground"
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
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} onLogin={onLogin} />
          ))}
        </div>
      )}
    </div>
  )
}

export function PlayerPanel() {
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

    console.log('[Mobile] Loading comments for:', currentSong.title)
    setLoadingComments(true)

    const loadComments = async () => {
      try {
        const { getComments } = await import('@/lib/actions/reddit')
        const data = await getComments(currentSong.permalink)
        console.log('[Mobile] Comments loaded:', data.comments?.length || 0)
        setComments(data.comments || [])
      } catch (error) {
        console.error('[Mobile] Failed to load comments:', error)
      } finally {
        setLoadingComments(false)
      }
    }

    loadComments()
  }, [currentSong?.id]) // Only reload when song ID changes, not object reference

  const handleLogin = (action: string) => {
    setLoginAction(action)
    setShowLoginModal(true)
  }

  if (!currentSong) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Music className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No song playing</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Select a song from the playlist to start listening
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      {/* Player */}
      <div className="relative aspect-video bg-black shrink-0">
        {currentSong.type === 'youtube' && <YouTubePlayer key={`player-mobile-${currentSong.id}-youtube`} song={currentSong} />}
        {currentSong.type === 'soundcloud' && <SoundCloudPlayer key={`player-mobile-${currentSong.id}-soundcloud`} song={currentSong} />}
        {currentSong.type === 'vimeo' && <VimeoPlayer key={`player-mobile-${currentSong.id}-vimeo`} song={currentSong} />}
        {currentSong.type === 'mp3' && <MP3Player key={`player-mobile-${currentSong.id}-mp3`} song={currentSong} />}
        {currentSong.type === 'none' && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Cannot play this media</p>
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="p-4 space-y-4">
        {/* Title & Artist */}
        <div>
          <h2 className="text-lg font-bold mb-1 line-clamp-2">{currentSong.title}</h2>
          <p className="text-sm text-muted-foreground">by {currentSong.author}</p>
        </div>

        {/* Stats - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-xl font-bold text-primary">{currentSong.score.toLocaleString()}</p>
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Karma</p>
          </div>
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-xl font-bold">{currentSong.num_comments.toLocaleString()}</p>
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Comments</p>
          </div>
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-sm font-medium truncate">{currentSong.author}</p>
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Author</p>
          </div>
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-sm font-medium">{currentSong.created_ago}</p>
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Age</p>
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
            <span className="font-medium truncate ml-2">{currentSong.domain}</span>
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-2">
          <a
            href={`https://reddit.com${currentSong.permalink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Reddit
          </a>
          {currentSong.url && (
            <a
              href={currentSong.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Source
            </a>
          )}
        </div>

        {/* Comments Section */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Comments</h3>
            <span className="text-sm text-muted-foreground">
              ({currentSong.num_comments.toLocaleString()})
            </span>
          </div>

          {loadingComments ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Showing {comments.length} top comments
              </p>
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} onLogin={handleLogin} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-secondary/30 rounded-lg border border-border">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium mb-1">No comments yet</p>
              <p className="text-xs text-muted-foreground">Be the first to comment on Reddit!</p>
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        action={loginAction}
      />
    </div>
  )
}
