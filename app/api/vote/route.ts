import { NextRequest, NextResponse } from "next/server"
import { refreshRedditToken } from "@/lib/auth/refresh-token"

/**
 * Vote on Reddit post or comment
 * Original: POST /vote -> votes on Reddit
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
    const { id, dir } = body // dir: 1 = upvote, -1 = downvote, 0 = remove vote

    // Try to vote
    let voteResponse = await fetch('https://oauth.reddit.com/api/vote', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RedditMusicPlayer/0.6.14 by illyism',
      },
      body: new URLSearchParams({
        id,
        dir: dir.toString(),
      }),
    })

    // If token expired, try to refresh
    if (!voteResponse.ok && voteResponse.status === 401 && refreshToken) {
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
        voteResponse = await fetch('https://oauth.reddit.com/api/vote', {
          method: 'POST',
          headers: {
            'Authorization': `bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'RedditMusicPlayer/0.6.14 by illyism',
          },
          body: new URLSearchParams({
            id,
            dir: dir.toString(),
          }),
        })
        
        if (!voteResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to vote' },
            { status: voteResponse.status }
          )
        }
        
        return response
      }
    }

    if (!voteResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to vote' },
        { status: voteResponse.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error voting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
