'use client'

import { ArrowUp } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/errors/reddit-error'

interface Comment {
  author: string
  body: string
  body_html: string
  created_ago: string
  id: string
  replies: Comment[]
  score: number
}

interface CommentsProps {
  permalink: string
}

// Recursive Comment Component
function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  const [showReplies, setShowReplies] = useState(true)
  const hasReplies = comment.replies && comment.replies.length > 0

  return (
    <div className={depth > 0 ? 'ml-4 border-border border-l-2 pl-4' : ''}>
      <div className="mb-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80">
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="truncate font-medium text-sm">/u/{comment.author}</div>
          <div className="whitespace-nowrap text-muted-foreground text-xs">
            • {comment.created_ago}
          </div>
        </div>
        <p className="wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">
          {comment.body}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <ArrowUp className="h-3 w-3" weight="fill" />
            <span>{comment.score}</span>
          </div>
          {hasReplies && (
            <button
              className="text-primary text-xs transition-colors hover:text-primary/80"
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
            <CommentItem comment={reply} depth={depth + 1} key={reply.id} />
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
      } catch (loadError: any) {
        console.error('Failed to load comments:', loadError)
        const errorMessage = getErrorMessage(loadError)
        setError(errorMessage)
        toast.error(errorMessage, { duration: 10_000 })
      } finally {
        setLoading(false)
      }
    }

    loadComments()
  }, [permalink])

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Loading comments...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-card px-4 py-8 text-center">
        <p className="mb-2 font-medium text-destructive text-sm">Failed to load comments</p>
        <p className="text-muted-foreground text-xs">{error}</p>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-8 text-center">
        <p className="text-muted-foreground text-sm">No comments yet. Be the first to comment!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {comments.map(comment => (
        <CommentItem comment={comment} key={comment.id} />
      ))}
    </div>
  )
}
