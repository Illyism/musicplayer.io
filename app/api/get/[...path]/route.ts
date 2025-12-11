import { NextRequest, NextResponse } from "next/server"

// In-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

/**
 * Proxy Reddit API requests
 * Original: GET /get/* -> proxies to Reddit API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  }
  const { path: pathSegments = [] } = await params
  let redditPath = pathSegments.join("/")
  const searchParams = request.nextUrl.searchParams

  // Remove .json if already present (hook includes it)
  if (redditPath.endsWith('.json')) {
    redditPath = redditPath.slice(0, -5) // Remove '.json'
  }

  // Build Reddit API URL - Reddit API always needs .json
  const redditUrl = `https://www.reddit.com/${redditPath}.json${searchParams.toString() ? `?${searchParams.toString()}` : ""}`

  // Check cache
  const cacheKey = redditUrl
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  }

  try {
    console.log(`[Reddit API] Fetching: ${redditUrl}`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    // Use minimal headers - Reddit blocks overly complex browser-like headers
    const response = await fetch(redditUrl, {
      headers: {
        "User-Agent": "RedditMusicPlayer/0.6.14 by illyism",
        "Accept": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Reddit API] Error ${response.status}:`, errorText)
      return NextResponse.json(
        { 
          error: "Failed to fetch from Reddit API",
          status: response.status,
          details: errorText.substring(0, 200) // Limit error text length
        },
        { 
          status: response.status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      )
    }

    const data = await response.json()

    // Validate response structure
    if (!data || typeof data !== 'object') {
      console.error("[Reddit API] Invalid response structure:", typeof data)
      return NextResponse.json(
        { error: "Invalid response from Reddit API" },
        { status: 500 }
      )
    }

    // Cache the response
    cache.set(cacheKey, { data, timestamp: Date.now() })

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error: any) {
    // Handle abort/timeout
    if (error?.name === 'AbortError') {
      console.error("[Reddit API] Request timeout:", redditUrl)
      return NextResponse.json(
        { error: "Request timeout - Reddit API took too long to respond" },
        { status: 504 }
      )
    }
    
    // Handle network errors
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      console.error("[Reddit API] Network error:", error.message)
      return NextResponse.json(
        { error: "Network error - Could not reach Reddit API" },
        { status: 503 }
      )
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.error("[Reddit API] JSON parse error:", error.message)
      return NextResponse.json(
        { error: "Invalid JSON response from Reddit API" },
        { status: 500 }
      )
    }
    
    // Generic error
    console.error("[Reddit API] Unexpected error:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      url: redditUrl
    })
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error?.message || "Unknown error",
        type: error?.name || "Error"
      },
      { status: 500 }
    )
  }
}
