"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Share2 } from "lucide-react"
import { usePlayerStore } from "@/lib/store/player-store"
import { useRedditAPI } from "@/lib/hooks/use-reddit-api"
import _ from "lodash"

interface Subreddit {
  name: string
  key: string
  category: string
  subscribers: number
  description: string
}

export function BrowsePanel() {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [customSubreddit, setCustomSubreddit] = useState("")
  const [showShareModal, setShowShareModal] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'full' | 'short' | null>(null)
  const [mounted, setMounted] = useState(false)
  
  const { 
    selectedSubreddits, 
    setSelectedSubreddits,
    searchQuery,
    setSearchQuery,
    sortMethod,
    topPeriod,
  } = usePlayerStore()
  const { fetchFromSubreddits, fetchSearch } = useRedditAPI()

  // Fix hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load all subreddits from API
  useEffect(() => {
    fetch("/api/subreddits")
      .then((res) => res.json())
      .then((data) => setSubreddits(data))
      .catch((err) => console.error("Failed to load subreddits:", err))
  }, [])

  const toggleSubreddit = async (key: string) => {
    const newSelected = selectedSubreddits.includes(key)
      ? selectedSubreddits.filter((s) => s !== key)
      : [...selectedSubreddits, key]

    setSelectedSubreddits(newSelected)

    // Fetch immediately with current sort settings
    if (newSelected.length > 0) {
      await fetchFromSubreddits(newSelected)
    }
  }

  const removeSubreddit = async (key: string) => {
    const newSelected = selectedSubreddits.filter((s) => s !== key)
    setSelectedSubreddits(newSelected)

    // Fetch if there are still subreddits selected
    if (newSelected.length > 0) {
      await fetchFromSubreddits(newSelected)
    }
  }

  const handleSearch = async () => {
    const query = searchInput.trim()
    if (query.length < 3) return

    setSearchQuery(query)
    setSelectedSubreddits([])
    await fetchSearch(query)
  }

  const addCustomSubreddit = async () => {
    const name = customSubreddit.trim().toLowerCase().replace(/^\/?r\//, "")
    
    // Validate name
    if (!name) {
      setCustomSubreddit("")
      return
    }
    
    // Check if already selected
    if (selectedSubreddits.includes(name)) {
      alert(`r/${name} is already in your playlist!`)
      setCustomSubreddit("")
      return
    }

    // Add to selected
    const newSelected = [...selectedSubreddits, name]
    setSelectedSubreddits(newSelected)
    setCustomSubreddit("")
    
    // Fetch songs from this subreddit
    try {
      await fetchFromSubreddits(newSelected)
    } catch (error) {
      console.error(`Failed to fetch from r/${name}:`, error)
      // Remove if fetch fails
      setSelectedSubreddits(selectedSubreddits)
      alert(`Could not load r/${name}. Please check the subreddit name.`)
    }
  }

  const handleShare = () => {
    setShowShareModal(true)
    setCopyStatus(null)
  }

  const getShareUrls = () => {
    const subs = selectedSubreddits.join('+')
    const params = new URLSearchParams()
    if (subs) params.append('r', subs)
    if (sortMethod !== 'hot') params.append('sort', sortMethod)
    if (sortMethod === 'top' && topPeriod !== 'week') params.append('t', topPeriod)
    
    const queryString = params.toString()
    const fullUrl = `https://musicplayer.io${queryString ? `?${queryString}` : ''}`
    const shortUrl = `http://r.il.ly/r/${subs}${queryString ? `?${params.toString()}` : ''}`
    
    return { fullUrl, shortUrl }
  }

  const copyToClipboard = async (text: string, type: 'full' | 'short') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus(type)
      setTimeout(() => setCopyStatus(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const { fullUrl, shortUrl } = getShareUrls()

  // Group subreddits by category
  const groupedSubreddits = _.groupBy(subreddits, "category")

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Browse Subreddits</h2>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search Reddit..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-4 py-2.5 bg-secondary border-0 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* My Subreddit Playlist */}
      <div className="p-6 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold mb-1">My Subreddit Playlist</h3>
            <p className="text-xs text-muted-foreground">
              {mounted ? `${selectedSubreddits.length} subreddit${selectedSubreddits.length !== 1 ? 's' : ''} selected` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Share Playlist"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {selectedSubreddits.length > 0 ? (
          <div className="space-y-2 mb-4">
            {selectedSubreddits.map((sub) => (
              <div
                key={sub}
                className="flex items-center justify-between px-4 py-2.5 bg-secondary rounded-lg"
              >
                <span className="text-sm font-medium">{sub}</span>
                <button
                  onClick={() => toggleSubreddit(sub)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No subreddits selected
          </div>
        )}

        {/* Add Custom Subreddit */}
        <div className="flex gap-2 items-center">
          <div className="px-3 h-11 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-sm font-medium text-gray-400 border border-white/10 flex-shrink-0">
            /r/
          </div>
          <input
            type="text"
            placeholder="custom-subreddit"
            value={customSubreddit}
            onChange={(e) => setCustomSubreddit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomSubreddit()}
            className="flex-1 min-w-0 px-3 h-11 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            onClick={addCustomSubreddit}
            className="h-11 w-11 flex items-center justify-center bg-[#FDC00F] text-black rounded-lg hover:bg-[#f99b1d] transition-colors flex-shrink-0"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Subreddit List */}
      <div className="flex-1 overflow-y-auto pb-24">
        {Object.entries(groupedSubreddits).map(([category, subs]) => (
          <div key={category} className="border-b border-border last:border-0">
            {/* Category Header - More Prominent */}
            <div className="sticky top-0 z-10 px-6 py-3 bg-primary/10 border-l-4 border-primary backdrop-blur-sm">
              <h4 className="text-sm font-bold text-primary uppercase tracking-wide">{category}</h4>
              <p className="text-xs text-muted-foreground">{subs.length} subreddits</p>
            </div>

            {/* Subreddits */}
            <div>
              {subs.map((sub) => {
                const isSelected = selectedSubreddits.includes(sub.key)
                return (
                  <button
                    key={sub.key}
                    onClick={() => toggleSubreddit(sub.key)}
                    className={`w-full flex items-center justify-between px-6 py-3 hover:bg-secondary/50 transition-colors ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{sub.name}</div>
                      {sub.subscribers && (
                        <div className="text-xs text-muted-foreground">
                          {sub.subscribers.toLocaleString()} members
                        </div>
                      )}
                    </div>
                    {isSelected ? (
                      <div className="text-xs text-primary font-medium">✓</div>
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-card rounded-lg p-6 max-w-2xl w-full border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Share Your Subreddit Playlist</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-secondary rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Full URL */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Full URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fullUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => copyToClipboard(fullUrl, 'full')}
                  className="px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
                >
                  {copyStatus === 'full' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Short URL */}
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">Short URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shortUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => copyToClipboard(shortUrl, 'short')}
                  className="px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
                >
                  {copyStatus === 'short' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="flex items-center gap-3">
              <a
                href={`https://plus.google.com/share?url=${encodeURIComponent(fullUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                title="Share on Google+"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 11v2.4h3.97c-.16 1.029-1.2 3.02-3.97 3.02-2.39 0-4.34-1.979-4.34-4.42 0-2.44 1.95-4.42 4.34-4.42 1.36 0 2.27.58 2.79 1.08l1.9-1.83C10.47 5.69 8.89 5 7 5c-3.87 0-7 3.13-7 7s3.13 7 7 7c4.04 0 6.721-2.84 6.721-6.84 0-.46-.051-.81-.111-1.16H7zm0 0l17 2h-3v3h-2v-3h-3v-2h3V8h2v3h3v2z"/>
                </svg>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title="Share on Facebook"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent('Check out this music playlist!')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
                title="Share on Twitter"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a
                href={`https://reddit.com/submit?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent('Check out this music playlist!')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                title="Share on Reddit"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}