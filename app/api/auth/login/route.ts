import { NextRequest, NextResponse } from "next/server"

/**
 * Login endpoint
 * Original: GET /login -> redirects to Reddit OAuth
 */
export async function GET(request: NextRequest) {
  const redirectBack = request.nextUrl.searchParams.get('redirect') || '/'
  
  const response = NextResponse.redirect(new URL('/api/auth/reddit', request.url))
  response.cookies.set('auth_redirect', redirectBack, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
  })
  return response
}
