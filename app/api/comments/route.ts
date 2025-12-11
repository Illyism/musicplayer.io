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
    // Use old.reddit.com which is less likely to block serverless functions
    const redditUrl = `https://old.reddit.com${permalink}.json?sort=${sort}`

    const response = await fetch(redditUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://old.reddit.com/",
        "Origin": "https://old.reddit.com",
        "DNT": "1",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
      redirect: "follow",
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
