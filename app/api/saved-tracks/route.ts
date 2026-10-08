import { type NextRequest, NextResponse } from 'next/server'
import { parseSavedTrackIds, readSavedTracks } from '@/lib/listening/saved-tracks'

const RESPONSE_HEADERS = { 'Cache-Control': 'private, no-store' }

/** Public post reads restore the caller's own bookmark metadata; no Reddit writes. */
export async function GET(request: NextRequest) {
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
