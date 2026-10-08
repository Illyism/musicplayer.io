'use client'

import { ArrowClockwise, ArrowUp, ChatCircle, ChatCircleText } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors/reddit-error'

interface Comment {
  author: string
  body: string
  created_ago: string
  id: string
  replies: Comment[]
  score: number
}

interface CommentsProps {
  onLogin?: (action: string) => void
  permalink: string
}

function CommentItem({
  comment,
  depth = 0,
  onLogin,
}: {
  comment: Comment
  depth?: number
  onLogin?: (action: string) => void
}) {
  const [showReplies, setShowReplies] = useState(false)
  const hasReplies = comment.replies.length > 0

  return (
    <article className={depth > 0 ? 'ml-2 border-border border-l pl-3' : ''}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="max-w-full truncate font-medium">u/{comment.author}</span>
        <span className="text-muted-foreground">{comment.created_ago}</span>
      </div>
      <p className="wrap-break-word mt-2 whitespace-pre-wrap text-foreground/85 text-sm leading-relaxed">
        {comment.body}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-muted-foreground">
        {onLogin ? (
          <Button
            aria-label={`Upvote comment by ${comment.author}`}
            className="h-11 gap-1 rounded-full px-2 text-muted-foreground text-xs"
            onClick={() => onLogin('vote')}
            type="button"
            variant="ghost"
          >
            <ArrowUp className="size-3.5" />
            <span className="tabular-nums">{comment.score}</span>
          </Button>
        ) : (
          <span className="flex h-11 items-center gap-1 px-2 text-xs tabular-nums">
            <ArrowUp className="size-3.5" />
            {comment.score}
          </span>
        )}
        {onLogin ? (
          <Button
            className="h-11 gap-1 rounded-full px-2 text-muted-foreground text-xs"
            onClick={() => onLogin('reply')}
            type="button"
            variant="ghost"
          >
            <ChatCircleText className="size-3.5" />
            Reply
          </Button>
        ) : null}
        {hasReplies && (
          <Button
            aria-expanded={showReplies}
            className="h-11 rounded-full px-2 text-muted-foreground text-xs"
            onClick={() => setShowReplies(!showReplies)}
            type="button"
            variant="ghost"
          >
            {showReplies ? 'Hide' : 'Show'} {comment.replies.length}{' '}
            {comment.replies.length === 1 ? 'reply' : 'replies'}
          </Button>
        )}
      </div>
      {hasReplies && showReplies ? (
        <div className="mt-2 space-y-4">
          {comment.replies.map(reply => (
            <CommentItem comment={reply} depth={depth + 1} key={reply.id} onLogin={onLogin} />
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function Comments({ permalink, onLogin }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: retry intentionally restarts the request after the user chooses Try again.
  useEffect(() => {
    if (!permalink) {
      setComments([])
      setLoading(false)
      return
    }

    let cancelled = false
    const loadComments = async () => {
      setLoading(true)
      setError(null)
      try {
        const { getComments } = await import('@/lib/actions/reddit')
        const data = await getComments(permalink)
        if (!cancelled) {
          setComments(data.comments || [])
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(loadError))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadComments()
    return () => {
      cancelled = true
    }
  }, [permalink, retry])

  if (loading) {
    return (
      <div aria-busy="true" className="space-y-5 py-4" role="status">
        <span className="sr-only">Loading comments</span>
        {[1, 2, 3].map(item => (
          <div className="space-y-3" key={item}>
            <div className="h-3 w-24 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-full animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 py-4" role="status">
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button
          className="h-11 rounded-full"
          onClick={() => setRetry(retry + 1)}
          variant="secondary"
        >
          <ArrowClockwise className="size-4" />
          Try again
        </Button>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <ChatCircle className="size-7 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">The conversation is just getting started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {comments.map(comment => (
        <CommentItem comment={comment} key={comment.id} onLogin={onLogin} />
      ))}
    </div>
  )
}
