import { NextRequest, NextResponse } from "next/server"

/**
 * Fetch comments for a Reddit post
 * Original: GET /comments -> fetches Reddit comments
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const permalink = searchParams.get("permalink")

  if (!permalink) {
    return NextResponse.json(
      { error: "Missing permalink parameter" },
      { status: 400 }
    )
  }

  try {
    // Reddit API returns comments in a specific format
    // The permalink should be like: /r/subreddit/comments/post_id/title/
    const sort = searchParams.get("sort") || "top"
    // Reddit API: /permalink.json?sort=top|new|best|controversial|old|qa
    const redditUrl = `https://www.reddit.com${permalink}.json?sort=${sort}`

    const response = await fetch(redditUrl, {
      headers: {
        "User-Agent": "RedditMusicPlayer/0.6.14 by illyism",
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: response.status }
      )
    }

    const data = await response.json()
    // Reddit API returns [post_data, comments_data]
    // Return the full array structure so component can access data[1]
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
