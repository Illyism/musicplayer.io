'use client'

import { ArrowUp, ArrowDown, ExternalLink, Music2, MessageCircle, Send } from 'lucide-react'
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
  replies: Comment[] // Changed from number to array
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
    <div className={depth > 0 ? 'ml-4 pl-4 border-l-2 border-border' : ''}>
      <div className="p-4 rounded-lg bg-secondary mb-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
          <div className="text-sm font-medium truncate">/u/{comment.author}</div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            • {comment.created_ago}
          </div>
        </div>
        <p className="text-sm whitespace-pre-wrap wrap-break-word">{comment.body}</p>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <button
            onClick={() => onLogin('vote')}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowUp className="h-3 w-3" />
            <span>{comment.score}</span>
          </button>
          <button
            onClick={() => onLogin('reply')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reply
          </button>
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-primary hover:underline"
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
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} onLogin={onLogin} />
          ))}
        </div>
      )}
    </div>
  )
}

export function SongInfoSidebar() {
  const { currentSong } = usePlayerStore()
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
    if (!comment.trim()) return
    handleLogin('comment')
  }

  // Load comments when song changes
  useEffect(() => {
    if (!currentSong) {
      setComments([])
      return
    }

    const loadComments = async () => {
      setLoadingComments(true)
      try {
        const { getComments } = await import('@/lib/actions/reddit')
        const data = await getComments(currentSong.permalink)
        setComments(data.comments || [])
      } catch (error) {
        console.error('Failed to load comments:', error)
      } finally {
        setLoadingComments(false)
      }
    }

    loadComments()
  }, [currentSong])

  if (!currentSong) {
    return (
      <div className="hidden lg:flex lg:w-80 xl:w-96 border-l border-border bg-card flex-col">
        <div className="flex-1 overflow-y-auto pb-24">
          {/* Current Song Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Music2 className="h-5 w-5" />
              <h3 className="text-lg font-bold">Current Song</h3>
            </div>
          </div>

          {/* Empty State with Links */}
          <div className="p-6 space-y-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Music2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Select a song to start playing</p>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <a
                href="#"
                className="flex items-start gap-3 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <MessageCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">SEO Audit</div>
                  <div className="text-xs text-muted-foreground">
                    Get a SEO audit for your website
                  </div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-start gap-3 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <svg
                  className="h-5 w-5 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
                <div>
                  <div className="font-medium text-sm">LinkDR</div>
                  <div className="text-xs text-muted-foreground">Link Building Services</div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-start gap-3 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <svg
                  className="h-5 w-5 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <div>
                  <div className="font-medium text-sm">MagicSpace SEO</div>
                  <div className="text-xs text-muted-foreground">The best SEO agency for SaaS</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get platform name
  const getPlatformName = () => {
    if (currentSong.type === 'youtube') return 'YouTube'
    if (currentSong.type === 'soundcloud') return 'SoundCloud'
    if (currentSong.type === 'vimeo') return 'Vimeo'
    return 'Link'
  }

  return (
    <div className="hidden lg:flex lg:w-80 xl:w-96 border-l border-border bg-card flex-col">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="space-y-6">
          {/* Video Player - FIRST! */}
          <div className="aspect-video bg-black">
            {currentSong.type === 'youtube' && <YouTubePlayer song={currentSong} />}
            {currentSong.type === 'soundcloud' && <SoundCloudPlayer song={currentSong} />}
            {currentSong.type === 'vimeo' && <VimeoPlayer song={currentSong} />}
            {currentSong.type === 'mp3' && <MP3Player song={currentSong} />}
            {currentSong.type === 'none' && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Cannot play this media</p>
              </div>
            )}
          </div>

          {/* Content with padding */}
          <div className="space-y-8">
            {/* Song Title & Actions */}
            <div className="px-6">
              <h2 className="text-base md:text-lg font-bold text-white mb-2 leading-tight line-clamp-2">
                {currentSong.title}
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                by <span className="font-medium text-gray-300">{currentSong.author}</span>
              </p>

              {/* Action Buttons - Clean & Polished */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <button
                  onClick={() => handleLogin('upvote')}
                  className="group flex flex-col items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 min-h-[70px] text-center text-gray-400 hover:text-[#FDC00F] hover:bg-[#FDC00F]/10 hover:shadow-lg hover:shadow-[#FDC00F]/20"
                  title="Upvote"
                >
                  <ArrowUp
                    className="w-6 h-6 mb-1.5 mx-auto transition-transform group-hover:scale-110"
                    strokeWidth={2.5}
                  />
                  <span className="text-xs font-medium">Upvote</span>
                </button>
                <button
                  onClick={() => handleLogin('downvote')}
                  className="group flex flex-col items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 min-h-[70px] text-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:shadow-lg hover:shadow-red-500/20"
                  title="Downvote"
                >
                  <ArrowDown
                    className="w-6 h-6 mb-1.5 mx-auto transition-transform group-hover:scale-110"
                    strokeWidth={2.5}
                  />
                  <span className="text-xs font-medium">Downvote</span>
                </button>
                <a
                  href={`https://www.reddit.com${currentSong.permalink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center justify-center px-4 py-3 rounded-xl text-gray-400 hover:text-[#FF4500] hover:bg-[#FF4500]/10 transition-all duration-200 min-h-[70px] text-center hover:shadow-lg hover:shadow-[#FF4500]/20"
                  title="View on Reddit"
                >
                  <svg
                    className="w-6 h-6 mb-1.5 mx-auto transition-transform group-hover:scale-110"
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
                  <span className="text-xs font-medium">Reddit</span>
                </a>
                {currentSong.url && (
                  <a
                    href={currentSong.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex flex-col items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 min-h-[70px] text-center ${
                      currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be'
                        ? 'text-gray-400 hover:text-red-500 hover:bg-red-500/10 hover:shadow-lg hover:shadow-red-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/10 hover:shadow-lg'
                    }`}
                    title={`Open on ${currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be' ? 'YouTube' : currentSong.domain}`}
                  >
                    {currentSong.domain === 'youtube.com' || currentSong.domain === 'youtu.be' ? (
                      <>
                        <svg
                          className="w-6 h-6 mb-1.5 mx-auto transition-transform group-hover:scale-110"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        <span className="text-xs font-medium">YouTube</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-6 h-6 mb-1.5 mx-auto transition-transform group-hover:scale-110" />
                        <span className="text-xs font-medium">{getPlatformName()}</span>
                      </>
                    )}
                  </a>
                )}
              </div>

              {/* Metadata - 2x2 Grid Only */}
              <div className="grid grid-cols-2 gap-3">
                <div className="group p-4 bg-linear-to-br from-[#1a1a1a] to-[#161616] rounded-xl border border-white/5 hover:border-[#FDC00F]/30 transition-all duration-200 hover:shadow-lg hover:shadow-[#FDC00F]/10">
                  <div className="text-xl font-bold text-[#FDC00F] mb-1.5 leading-none">
                    {currentSong.score?.toLocaleString() || '0'}
                  </div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Karma
                  </div>
                </div>
                <div className="group p-4 bg-linear-to-br from-[#1a1a1a] to-[#161616] rounded-xl border border-white/5 hover:border-white/20 transition-all duration-200 hover:shadow-lg">
                  <div
                    className="text-sm font-bold text-white mb-1.5 truncate leading-tight"
                    title={`/u/${currentSong.author}`}
                  >
                    /u/{currentSong.author || 'Unknown'}
                  </div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Author
                  </div>
                </div>
                <div className="group p-4 bg-linear-to-br from-[#1a1a1a] to-[#161616] rounded-xl border border-white/5 hover:border-white/20 transition-all duration-200 hover:shadow-lg">
                  <div className="text-sm font-bold text-gray-200 mb-1.5 leading-tight">
                    {currentSong.created_ago ? currentSong.created_ago.replace(' ago', '') : 'N/A'}
                  </div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Age
                  </div>
                </div>
                <div className="group p-4 bg-linear-to-br from-[#1a1a1a] to-[#161616] rounded-xl border border-white/5 hover:border-white/20 transition-all duration-200 hover:shadow-lg">
                  <div
                    className="text-sm font-bold text-gray-200 mb-1.5 truncate leading-tight"
                    title={`/r/${currentSong.subreddit}`}
                  >
                    /r/{currentSong.subreddit || 'Unknown'}
                  </div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Subreddit
                  </div>
                </div>
              </div>
            </div>

            {/* Selftext */}
            {currentSong.selftext && (
              <div className="mx-6 p-6 bg-linear-to-br from-[#1a1a1a] to-[#141414] rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl">
                <div className="text-sm text-gray-300 leading-relaxed prose prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: currentSong.selftext }} />
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="px-6">
              <h3 className="text-lg font-bold mb-4">Comments</h3>

              {/* Comment Input */}
              <div className="space-y-3">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full h-32 px-4 py-3 bg-background border border-border rounded-lg resize-none focus:outline-hidden focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  onClick={handleAddComment}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Add Comment
                </button>
              </div>

              {/* Existing Comments */}
              <div className="mt-6 space-y-3">
                {loadingComments ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading comments...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No comments yet. Be the first to comment!
                  </div>
                ) : (
                  comments.map(comment => (
                    <CommentItem key={comment.id} comment={comment} onLogin={handleLogin} />
                  ))
                )}
              </div>
            </div>
          </div>
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
