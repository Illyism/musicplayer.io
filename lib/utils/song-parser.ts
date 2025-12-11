import { Song } from "@/lib/store"

export function parseSong(item: any): Song {
  // Fix thumbnail URL - handle various thumbnail formats
  let thumbnail = item.thumbnail
  if (thumbnail) {
    if (thumbnail.startsWith("http:")) {
      thumbnail = thumbnail.replace("http:", "https:")
    } else if (thumbnail.startsWith("//")) {
      thumbnail = "https:" + thumbnail
    }
    // Use preview images if available
    if (item.preview && item.preview.images && item.preview.images[0]) {
      const previewUrl = item.preview.images[0].source?.url || 
                        item.preview.images[0].resolutions?.[item.preview.images[0].resolutions.length - 1]?.url
      if (previewUrl) {
        thumbnail = previewUrl.replace(/&amp;/g, "&")
      }
    }
  }

  // Determine song type
  let type: Song["type"] = "none"
  let playable = false

  if (item.domain === "youtube.com" || item.domain === "youtu.be" || item.domain === "m.youtube.com") {
    type = "youtube"
    playable = true
  } else if (item.domain === "soundcloud.com") {
    type = "soundcloud"
    playable = true
  } else if (item.url && item.url.endsWith(".mp3")) {
    type = "mp3"
    playable = true
  } else if (item.domain === "vimeo.com") {
    type = "vimeo"
    playable = true
  } else if (item.is_self) {
    // Self post, not playable
    playable = false
  }

  // Calculate time ago
  const createdAgo = timeSince(new Date(item.created_utc * 1000))

  return {
    id: item.id,
    name: item.name,
    title: item.title,
    author: item.author,
    url: item.url,
    domain: item.domain,
    thumbnail: thumbnail,
    score: item.score,
    ups: item.ups || 0,
    downs: item.downs || 0,
    created_utc: item.created_utc,
    created_ago: createdAgo,
    num_comments: item.num_comments,
    subreddit: item.subreddit,
    permalink: item.permalink,
    is_self: item.is_self,
    selftext: item.selftext,
    selftext_html: item.selftext_html,
    type,
    playable,
    media: item.media,
  }
}

function timeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) {
    return Math.floor(interval) + "y"
  }
  interval = seconds / 2592000
  if (interval > 1) {
    return Math.floor(interval) + "mo"
  }
  interval = seconds / 86400
  if (interval > 1) {
    return Math.floor(interval) + "d"
  }
  interval = seconds / 3600
  if (interval > 1) {
    return Math.floor(interval) + "h"
  }
  interval = seconds / 60
  if (interval > 1) {
    return Math.floor(interval) + "m"
  }
  return Math.floor(seconds) + "s"
}

export function filterPlayableSongs(items: any[]): any[] {
  if (!items || !Array.isArray(items)) {
    return []
  }
  
  return items.filter((item) => {
    if (!item || !item.data) return false
    
    const data = item.data
    // Filter out self posts - exactly like original Store.filterFunction
    if (data.is_self === true) return false
    
    // Check if it's a playable domain - exactly like original
    return (
      data.domain === "youtube.com" ||
      data.domain === "youtu.be" ||
      data.domain === "m.youtube.com" ||
      data.domain === "soundcloud.com" ||
      data.domain === "vimeo.com" ||
      (data.url && typeof data.url === 'string' && data.url.endsWith(".mp3"))
    )
  })
}

