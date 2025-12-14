'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

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
    <div className={depth > 0 ? 'ml-4 pl-4 border-l-2 border-white/10' : ''}>
      <div className="p-4 rounded-lg bg-[#181818] border border-white/5 mb-3 hover:border-white/10 transition-colors">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
          <div className="text-sm font-medium text-white truncate">/u/{comment.author}</div>
          <div className="text-xs text-gray-500 whitespace-nowrap">• {comment.created_ago}</div>
        </div>
        <p className="text-sm text-gray-300 whitespace-pre-wrap wrap-break-word leading-relaxed">
          {comment.body}
        </p>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <ArrowUp className="h-3 w-3" />
            <span>{comment.score}</span>
          </div>
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-[#FDC00F] hover:text-[#f99b1d] transition-colors"
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

  useEffect(() => {
    if (!permalink) {
      setComments([])
      return
    }

    const loadComments = async () => {
      setLoading(true)
      try {
        const { getComments } = await import('@/lib/actions/reddit')
        const data = await getComments(permalink)
        setComments(data.comments || [])
      } catch (error) {
        console.error('Failed to load comments:', error)
      } finally {
        setLoading(false)
      }
    }

    loadComments()
  }, [permalink])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-[#FDC00F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-400">Loading comments...</p>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-[#181818] border border-white/5 rounded-xl">
        <p className="text-sm text-gray-400">No comments yet. Be the first to comment!</p>
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
