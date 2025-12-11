"use client"

import { useEffect, useState, useRef } from "react"

interface Comment {
  data: {
    id: string
    author: string
    body: string
    body_html: string
    score: number
    created_utc: number
    replies?: {
      data: {
        children: Comment[]
      }
    }
    depth: number
  }
}

interface CommentsProps {
  permalink: string
}

export function Comments({ permalink }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState("top")
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchedRef = useRef<{ permalink: string; sort: string } | null>(null)

  useEffect(() => {
    if (!permalink) return

    // Skip if we already fetched for this exact permalink and sort
    if (lastFetchedRef.current?.permalink === permalink && lastFetchedRef.current?.sort === sort) {
      setLoading(false)
      return
    }

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const fetchComments = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/comments?permalink=${encodeURIComponent(permalink)}&sort=${sort}`,
          { signal }
        )
        
        // Check if request was aborted
        if (signal.aborted) return

        const data = await response.json()

        // Check again after async operation
        if (signal.aborted) return

        if (data.error) {
          setError(data.error.message || "Failed to load comments")
          setLoading(false)
          return
        }

        // Reddit API returns array: [post, comments]
        // We want the comments (second item)
        if (Array.isArray(data) && data.length > 1) {
          const commentsData = data[1]?.data?.children || []
          // Filter out "more" comments (kind !== 't1') and empty/deleted comments
          const validComments = commentsData.filter((c: any) => 
            c && 
            c.kind === 't1' && 
            c.data && 
            c.data.body && 
            c.data.body !== "[deleted]" && 
            c.data.body !== "[removed]" &&
            c.data.body.trim() !== ""
          )
          setComments(validComments)
          // Mark as fetched
          lastFetchedRef.current = { permalink, sort }
        } else {
          setComments([])
          lastFetchedRef.current = { permalink, sort }
        }
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'AbortError') return
        
        setError("Failed to load comments")
        console.error("Error loading comments:", err)
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchComments()

    // Cleanup: abort request if component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [permalink, sort])

  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() / 1000 - timestamp))
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    const days = Math.floor(seconds / 86400)
    if (days < 365) return `${days}d ago`
    const years = Math.floor(days / 365)
    return `${years}y ago`
  }

  // Decode HTML entities - exactly like original _.unescape from Underscore.js
  // Reddit's body_html contains HTML with encoded entities that need decoding
  const unescapeHtml = (html: string): string => {
    if (typeof window === 'undefined') return html // SSR safety
    
    // Method 1: Use textarea element (most reliable for HTML entity decoding)
    // Setting innerHTML on textarea and reading value decodes entities
    const textarea = document.createElement('textarea')
    textarea.innerHTML = html
    let decoded = textarea.value
    
    // Method 2: If textarea didn't work, use div method
    if (!decoded || decoded === html) {
      const div = document.createElement('div')
      div.innerHTML = html
      decoded = div.innerHTML
    }
    
    return decoded
  }

  // Flatten all comments (including replies) into a single list
  const flattenComments = (comments: Comment[]): Comment[] => {
    const flattened: Comment[] = []
    
    const traverse = (commentList: Comment[]) => {
      commentList.forEach((comment) => {
        if (comment.data && comment.data.body !== "[deleted]" && comment.data.body !== "[removed]") {
          flattened.push(comment)
          
          // Recursively add replies
          if (comment.data.replies && 
              comment.data.replies.data && 
              comment.data.replies.data.children) {
            traverse(comment.data.replies.data.children)
          }
        }
      })
    }
    
    traverse(comments)
    return flattened
  }

  const renderComment = (comment: Comment) => {
    if (!comment.data || comment.data.body === "[deleted]" || comment.data.body === "[removed]") {
      return null
    }

    // Get raw HTML from Reddit API
    const rawHtml = comment.data.body_html || comment.data.body || ""
    
    // Decode HTML entities if present
    const htmlContent = typeof window !== 'undefined' && rawHtml 
      ? unescapeHtml(rawHtml) 
      : rawHtml

    return (
      <div 
        key={comment.data.id} 
        className="comment-item mb-4 pb-4 border-b border-white/5 last:border-0"
        style={{ maxWidth: '100%' }}
      >
        {/* Comment - Flat List Style */}
        <div>
          {/* Username and metadata */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[#FDC00F] font-medium text-sm hover:underline cursor-pointer">
              {comment.data.author}
            </span>
            <span className="text-gray-500 text-xs">
              <span className="text-gray-400">{comment.data.score}</span> points • {formatTime(comment.data.created_utc)}
            </span>
          </div>
          
          {/* Comment body */}
          <div 
            className="text-white text-sm leading-relaxed overflow-hidden"
            style={{ 
              wordBreak: 'normal',
              overflowWrap: 'anywhere',
              whiteSpace: 'normal',
              lineHeight: '1.5',
              maxWidth: '100%',
              overflowX: 'hidden',
              wordSpacing: 'normal'
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#FDC00F] border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">No comments yet</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Sort Buttons - Clean */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
        <span className="text-xs text-gray-500">Sort:</span>
        <button
          onClick={() => setSort("top")}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            sort === "top" 
              ? "bg-[#FDC00F] text-black font-medium" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Top
        </button>
        <button
          onClick={() => setSort("new")}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            sort === "new" 
              ? "bg-[#FDC00F] text-black font-medium" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          New
        </button>
        <button
          onClick={() => setSort("best")}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            sort === "best" 
              ? "bg-[#FDC00F] text-black font-medium" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Best
        </button>
      </div>
      
      {/* Comments List - Flat, One by One */}
      <div className="w-full max-w-full overflow-x-hidden">
        {flattenComments(comments).map((comment) => renderComment(comment))}
      </div>
    </div>
  )
}

