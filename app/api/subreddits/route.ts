import { type NextRequest, NextResponse } from 'next/server'
import { discoverCommunities } from '@/lib/community/discovery'
import { parseCommunityCategory } from '@/lib/community/types'

/** Live OAuth discovery; old YAML membership/activity numbers are never served. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') ?? ''
  const categoryValue = request.nextUrl.searchParams.get('category')
  const category = parseCommunityCategory(categoryValue)
  if (query.length > 64 || (categoryValue !== null && category === null)) {
    return NextResponse.json(
      { error: 'Use a search up to 64 characters and a supported music category.' },
      { status: 400 }
    )
  }
  const result = await discoverCommunities({ category, query })
  const resultExpiry = result.expiresAt === null ? Number.NaN : Date.parse(result.expiresAt)
  const cacheSeconds = Number.isFinite(resultExpiry)
    ? Math.max(0, Math.min(60, Math.floor((resultExpiry - Date.now()) / 1000)))
    : 60
  return NextResponse.json(result, {
    headers: { 'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}` },
  })
}
