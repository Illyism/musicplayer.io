import type { NextRequest } from 'next/server'

export function isCrossSiteRequest(request: NextRequest): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return true
  }
  const origin = request.headers.get('origin')
  if (!origin) {
    return false
  }
  try {
    const parsedOrigin = new URL(origin)
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = forwardedHost || request.headers.get('host') || request.nextUrl.host
    return parsedOrigin.host !== host
  } catch {
    return true
  }
}
