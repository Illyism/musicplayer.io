import { type NextRequest, NextResponse } from 'next/server'
import { discoverCommunities } from '@/lib/community/discovery'
import { parseCommunityCategory } from '@/lib/community/types'

const CONTROL_CHAR_REGEX = /\p{Cc}/u

function isCrossSiteRequest(request: NextRequest): boolean {
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

/** Live OAuth discovery; old YAML membership/activity numbers are never served. */
export async function GET(request: NextRequest) {
  if (isCrossSiteRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 })
  }
  const query = request.nextUrl.searchParams.get('q') ?? ''
  const categoryValue = request.nextUrl.searchParams.get('category')
  const category = parseCommunityCategory(categoryValue)
  if (
    query.length > 64 ||
    CONTROL_CHAR_REGEX.test(query) ||
    (categoryValue !== null && category === null)
  ) {
    return NextResponse.json(
      { error: 'Use a search up to 64 characters and a supported music category.' },
      { status: 400 }
    )
  }
  try {
    const result = await discoverCommunities({ category, query })
    const resultExpiry = result.expiresAt === null ? Number.NaN : Date.parse(result.expiresAt)
    const cacheSeconds = Number.isFinite(resultExpiry)
      ? Math.max(0, Math.min(60, Math.floor((resultExpiry - Date.now()) / 1000)))
      : 60
    return NextResponse.json(result, {
      headers: { 'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}` },
    })
  } catch {
    return NextResponse.json(
      { error: 'Communities could not load. Please try again.' },
      { status: 503 }
    )
  }
}
