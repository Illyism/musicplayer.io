import { NextRequest, NextResponse } from "next/server"
import { refreshRedditToken } from "@/lib/auth/refresh-token"

/**
 * Post a comment to Reddit
 * Original: POST /add_comment -> posts comment to Reddit
 */
export async function POST(request: NextRequest) {
  let accessToken = request.cookies.get('reddit_access_token')?.value
  const refreshToken = request.cookies.get('reddit_refresh_token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { parent, text } = body

    if (!parent || !text) {
      return NextResponse.json(
        { error: 'Missing parent or text' },
        { status: 400 }
      )
    }

    // Try to post comment
    let commentResponse = await fetch('https://oauth.reddit.com/api/comment', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RedditMusicPlayer/0.6.14 by illyism',
      },
      body: new URLSearchParams({
        parent,
        text,
        api_type: 'json',
      }),
    })

    // If token expired, try to refresh
    if (!commentResponse.ok && commentResponse.status === 401 && refreshToken) {
      const newTokens = await refreshRedditToken(refreshToken)
      
      if (newTokens) {
        accessToken = newTokens.access_token
        
        // Update cookies
        const response = NextResponse.json({ success: true })
        
        response.cookies.set('reddit_access_token', newTokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
        })
        
        if (newTokens.refresh_token) {
          response.cookies.set('reddit_refresh_token', newTokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365,
          })
        }
        
        // Retry with new token
        commentResponse = await fetch('https://oauth.reddit.com/api/comment', {
          method: 'POST',
          headers: {
            'Authorization': `bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'RedditMusicPlayer/0.6.14 by illyism',
          },
          body: new URLSearchParams({
            parent,
            text,
            api_type: 'json',
          }),
        })
        
        if (!commentResponse.ok) {
          const errorText = await commentResponse.text()
          console.error('Comment failed:', errorText)
          return NextResponse.json(
            { error: 'Failed to post comment' },
            { status: commentResponse.status }
          )
        }
        
        return response
      }
    }

    if (!commentResponse.ok) {
      const errorText = await commentResponse.text()
      console.error('Comment failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to post comment' },
        { status: commentResponse.status }
      )
    }

    const data = await commentResponse.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error posting comment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
