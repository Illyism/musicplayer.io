import { NextRequest, NextResponse } from "next/server"
import { redditAuthConfig } from "@/lib/auth/config"
import crypto from "crypto"

/**
 * Reddit OAuth initiation
 * Original: GET /auth/reddit -> redirects to Reddit OAuth
 */
export async function GET(request: NextRequest) {
  const { clientId, redirectUri, scope, authUrl } = redditAuthConfig

  if (!clientId) {
    return NextResponse.json(
      { error: 'Reddit OAuth not configured. Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.' },
      { status: 500 }
    )
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex')
  
  // Store state in cookie
  const response = NextResponse.redirect(
    `${authUrl}?client_id=${clientId}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&duration=permanent&scope=${encodeURIComponent(scope)}`
  )
  
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  })
  
  return response
}
