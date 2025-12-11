import { NextRequest, NextResponse } from "next/server"

/**
 * Logout endpoint
 * Original: GET /logout -> clears session and redirects
 */
export async function GET(request: NextRequest) {
  const redirectBack = request.nextUrl.searchParams.get('redirect') || '/'
  const response = NextResponse.redirect(new URL(redirectBack, request.url))

  response.cookies.delete('reddit_access_token')
  response.cookies.delete('reddit_refresh_token')
  response.cookies.delete('reddit_user')
  response.cookies.delete('oauth_state')
  response.cookies.delete('auth_redirect')

  return response
}



