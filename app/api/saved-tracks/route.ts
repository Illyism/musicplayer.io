import { type NextRequest, NextResponse } from 'next/server'
import { parseSavedTrackIds, readSavedTracks } from '@/lib/listening/saved-tracks'
import { isCrossSiteRequest } from '@/lib/utils/cross-site'

const RESPONSE_HEADERS = { 'Cache-Control': 'private, no-store' }

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
