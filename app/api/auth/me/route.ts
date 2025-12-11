import { NextRequest, NextResponse } from "next/server"
import { redditAuthConfig } from "@/lib/auth/config"
import { refreshRedditToken } from "@/lib/auth/refresh-token"

/**
 * Get current user info
 * Original: GET /me.json -> returns user object
 */
export async function GET(request: NextRequest) {
  let accessToken = request.cookies.get('reddit_access_token')?.value
  const refreshToken = request.cookies.get('reddit_refresh_token')?.value

  if (!accessToken) {
    return NextResponse.json(
      { error: { type: 'NotAuthenticated', message: 'You need to be logged in.' } },
      { status: 401 }
    )
  }

  try {
    // Get fresh user info from Reddit
    let userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `bearer ${accessToken}`,
        'User-Agent': 'RedditMusicPlayer/0.6.14 by illyism',
      },
    })

    // If token expired, try to refresh
    if (!userResponse.ok && userResponse.status === 401 && refreshToken) {
      const newTokens = await refreshRedditToken(refreshToken)
      
      if (newTokens) {
        accessToken = newTokens.access_token
        
        // Update cookies
        const response = NextResponse.json({ user: null }) // Will be set below
        
        response.cookies.set('reddit_access_token', newTokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
        
        if (newTokens.refresh_token) {
          response.cookies.set('reddit_refresh_token', newTokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365, // 1 year
          })
        }
        
        // Retry with new token
        userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
          headers: {
            'Authorization': `bearer ${accessToken}`,
            'User-Agent': 'RedditMusicPlayer/0.6.14 by illyism',
          },
        })
        
        if (!userResponse.ok) {
          return NextResponse.json(
            { error: { type: 'TokenExpired', message: 'Session expired. Please log in again.' } },
            { status: 401 }
          )
        }
        
        const userData = await userResponse.json()
        
        // Update user cookie
        response.cookies.set('reddit_user', JSON.stringify({
          name: userData.name,
          id: userData.id,
          icon_img: userData.icon_img,
        }), {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
        })
        
        return NextResponse.json({
          user: {
            name: userData.name,
            id: userData.id,
            icon_img: userData.icon_img,
            _json: userData,
          },
        }, {
          headers: response.headers,
        })
      }
    }

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: { type: 'TokenExpired', message: 'Session expired. Please log in again.' } },
        { status: 401 }
      )
    }

    const userData = await userResponse.json()

    return NextResponse.json({
      user: {
        name: userData.name,
        id: userData.id,
        icon_img: userData.icon_img,
        _json: userData,
      },
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: { type: 'APIError', message: 'Failed to fetch user info.' } },
      { status: 500 }
    )
  }
}
