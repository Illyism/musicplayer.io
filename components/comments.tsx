'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { toast } from 'sonner'

interface Comment {
  id: string
  author: string
  body: string
  body_html: string
  score: number
  created_ago: string
  replies: Comment[]
}

interface CommentsProps {
  permalink: string
}

// Recursive Comment Component
function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  const [showReplies, setShowReplies] = useState(true)
  const hasReplies = comment.replies && comment.replies.length > 0

  return (
    <div className={depth > 0 ? 'ml-4 pl-4 border-l-2 border-border' : ''}>
      <div className="p-4 rounded-lg bg-card border border-border mb-3 hover:border-border/80 transition-colors">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
          <div className="text-sm font-medium truncate">/u/{comment.author}</div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            • {comment.created_ago}
          </div>
        </div>
        <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
          {comment.body}
        </p>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUp className="h-3 w-3" />
            <span>{comment.score}</span>
          </div>
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
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
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Comments({ permalink }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!permalink) {
      setComments([])
      return
    }

    const loadComments = async () => {
      setLoading(true)
      setError(null)
      try {
        const { getComments } = await import('@/lib/actions/reddit')
        const data = await getComments(permalink)
        setComments(data.comments || [])
      } catch (error: any) {
        console.error('Failed to load comments:', error)
        const errorMessage =
          error?.message || 'Failed to load comments. The post may be private or rate-limited.'
        setError(errorMessage)
        toast.error(errorMessage, { duration: 10000 })
      } finally {
        setLoading(false)
      }
    }

    loadComments()
  }, [permalink])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 px-4 bg-card border border-destructive/50 rounded-xl">
        <p className="text-sm text-destructive font-medium mb-2">Failed to load comments</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-card border border-border rounded-xl">
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {comments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  )
}
