import { type NextRequest, NextResponse } from 'next/server'
import { parseSavedTrackIds, readSavedTracks } from '@/lib/listening/saved-tracks'

const RESPONSE_HEADERS = { 'Cache-Control': 'private, no-store' }

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

/** Public post reads restore the caller's own bookmark metadata; no Reddit writes. */
export async function GET(request: NextRequest) {
  if (isCrossSiteRequest(request)) {
    return NextResponse.json(
      { error: 'Cross-origin requests are not allowed.' },
      { headers: RESPONSE_HEADERS, status: 403 }
    )
  }
  const ids = parseSavedTrackIds(request.nextUrl.searchParams.get('ids'))
  if (!ids) {
    return NextResponse.json(
      { error: 'Provide between 1 and 100 comma-separated Reddit post IDs.' },
      { headers: RESPONSE_HEADERS, status: 400 }
    )
  }
  try {
    return NextResponse.json(await readSavedTracks(ids), { headers: RESPONSE_HEADERS })
  } catch {
    return NextResponse.json(
      { error: 'Saved tracks could not be refreshed. Please try again.' },
      { headers: RESPONSE_HEADERS, status: 503 }
    )
  }
}
