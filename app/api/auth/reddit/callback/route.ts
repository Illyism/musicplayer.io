import { NextRequest, NextResponse } from "next/server"
import { redditAuthConfig } from "@/lib/auth/config"

/**
 * Reddit OAuth callback
 * Original: GET /auth/reddit/callback -> handles OAuth callback
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Check for OAuth errors
  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  // Verify state
  const storedState = request.cookies.get('oauth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/?error=invalid_state', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  const { clientId, clientSecret, redirectUri, tokenUrl } = redditAuthConfig

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'User-Agent': 'RedditMusicPlayer/0.6.14 by illyism',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token } = tokenData

    if (!access_token) {
      return NextResponse.redirect(new URL('/?error=no_token', request.url))
    }

    // Get user info from Reddit
    const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `bearer ${access_token}`,
        'User-Agent': 'RedditMusicPlayer/0.6.14 by illyism',
      },
    })

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL('/?error=user_fetch_failed', request.url))
    }

    const userData = await userResponse.json()

    // Get redirect URL
    const redirectBack = request.cookies.get('auth_redirect')?.value || '/'

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectBack, request.url))

    // Store auth data in httpOnly cookies
    response.cookies.set('reddit_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    if (refresh_token) {
      response.cookies.set('reddit_refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    }

    // Store user data in a cookie (for client-side access)
    response.cookies.set('reddit_user', JSON.stringify({
      name: userData.name,
      id: userData.id,
      icon_img: userData.icon_img,
    }), {
      httpOnly: false, // Needs to be accessible from client
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    // Clear OAuth state cookie
    response.cookies.delete('oauth_state')
    response.cookies.delete('auth_redirect')

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/?error=callback_error', request.url))
  }
}
