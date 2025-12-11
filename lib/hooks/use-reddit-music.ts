import { useRef } from "react"
import { usePlaylistStore } from "@/lib/store"
import { parseSong, filterPlayableSongs } from "@/lib/utils/song-parser"

export function useRedditMusic() {
  const {
    selectedSubreddits,
    sortMethod,
    topMethod,
    searchQuery,
    setSongs,
    addSongs,
    setLoading,
    setAfter,
  } = usePlaylistStore()
  
  // Track ongoing requests to prevent duplicates
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchMusic = async (after?: string) => {
    // If search query exists, use search instead
    if (searchQuery) {
      return fetchSearch(searchQuery, after)
    }
    
    if (selectedSubreddits.length === 0) {
      // Default to listentothis if no subreddits selected
      return fetchMusicForSubreddits(["listentothis"], after)
    }
    
    return fetchMusicForSubreddits(selectedSubreddits, after)
  }

  const fetchSearch = async (query: string, after?: string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    setLoading(true)
    
    try {
      // Use our API route as proxy (handles CORS and Reddit blocking)
      const url = `/api/get/search.json`
      const params = new URLSearchParams()
      params.append("q", query)
      
      if (sortMethod === "top") {
        params.append("t", topMethod)
      }
      if (after) {
        params.append("after", after)
      }
      params.append("limit", "100")

      const fullUrl = `${url}?${params.toString()}`
      
      const response = await fetch(fullUrl, {
        signal: abortController.signal,
      })
      
      if (abortController.signal.aborted) {
        return []
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Fetch error:', response.status, errorText)
        throw new Error(`Reddit :: APIError :: Failed to fetch: ${response.status}`)
      }
      
      const data = await response.json()

      if (data.error) {
        console.error('Reddit API error:', data.error)
        throw new Error(`Reddit :: ${data.error.type} :: ${data.error.message}`)
      }

      if (!data || !data.data || !Array.isArray(data.data.children)) {
        console.error("Unexpected Reddit API response structure:", data)
        return []
      }

      const filteredItems = filterPlayableSongs(data.data.children)
      const parsedSongs = filteredItems.map((item: any) => {
        try {
          return parseSong(item.data)
        } catch (err) {
          console.error('Error parsing song:', err, item)
          return null
        }
      }).filter((song): song is NonNullable<typeof song> => song !== null)
      
      if (after) {
        addSongs(parsedSongs)
      } else {
        setSongs(parsedSongs)
      }
      
      const redditAfter = data.data.after || null
      setAfter(redditAfter)
      
      return parsedSongs
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return []
      }
      console.error("Error fetching search results:", error)
      throw error
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false)
        abortControllerRef.current = null
      }
    }
  }

  const fetchMusicForSubreddits = async (subreddits: string[], after?: string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    setLoading(true)
    
    try {
      const subredditString = subreddits.join("+")
      // Use our API route as proxy (handles CORS and Reddit blocking)
      const url = `/api/get/r/${subredditString}/${sortMethod}.json`
      const params = new URLSearchParams()
      
      if (sortMethod === "top") {
        params.append("t", topMethod)
      }
      if (after) {
        params.append("after", after)
      }
      params.append("limit", "100")

      const fullUrl = `${url}${params.toString() ? '?' + params.toString() : ''}`
      
      const response = await fetch(fullUrl, {
        signal: abortController.signal,
      })
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return []
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Fetch error:', response.status, errorText)
        throw new Error(`Reddit :: APIError :: Failed to fetch: ${response.status}`)
      }
      
      const data = await response.json()

      // Check for errors exactly like original
      if (data.error) {
        console.error('Reddit API error:', data.error)
        throw new Error(`Reddit :: ${data.error.type} :: ${data.error.message}`)
      }

      // Handle Reddit API response - exactly like original
      if (!data || !data.data || !Array.isArray(data.data.children)) {
        console.error("Unexpected Reddit API response structure:", data)
        return []
      }

      // Filter songs exactly like original Store.filterFunction
      const filteredItems = filterPlayableSongs(data.data.children)
      const parsedSongs = filteredItems.map((item: any) => {
        try {
          return parseSong(item.data)
        } catch (err) {
          console.error('Error parsing song:', err, item)
          return null
        }
      }).filter((song): song is NonNullable<typeof song> => song !== null)
      
      if (after) {
        addSongs(parsedSongs)
      } else {
        setSongs(parsedSongs)
      }
      
      // Set after for pagination - use Reddit's after field (null means no more results)
      const redditAfter = data.data.after || null
      setAfter(redditAfter)
      
      return parsedSongs
    } catch (error: any) {
      // Don't log errors for aborted requests
      if (error?.name === 'AbortError') {
        return []
      }
      console.error("Error fetching music:", error)
      
      // Show error message to user
      const { usePlaylistStore } = require("@/lib/store")
      usePlaylistStore.getState().addMessage({
        type: 'error',
        text: 'Failed to load music from Reddit.',
        buttons: [
          {
            text: 'Try again',
            className: 'yellow',
            callback: () => {
              fetchMusicForSubreddits(subreddits, after)
            }
          }
        ]
      })
      
      throw error
    } finally {
      // Only clear loading if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setLoading(false)
        abortControllerRef.current = null
      }
    }
  }

  return {
    fetchMusic,
    fetchMusicForSubreddits,
    fetchSearch,
  }
}

