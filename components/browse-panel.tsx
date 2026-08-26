'use client'

import { MagnifyingGlass, Plus, ShareNetwork } from '@phosphor-icons/react'
import _ from 'lodash'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRedditAPI } from '@/lib/hooks/use-reddit-api'
import { usePlayerStore } from '@/lib/store/player-store'

const CUSTOM_SUBREDDIT_PREFIX_REGEX = /^\/?r\//

interface Subreddit {
  category: string
  description: string
  key: string
  name: string
  subscribers: number
}

export function BrowsePanel() {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [customSubreddit, setCustomSubreddit] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'full' | 'short' | null>(null)
  const [mounted, setMounted] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const { selectedSubreddits, setSelectedSubreddits, setSearchQuery, sortMethod, topPeriod } =
    usePlayerStore()
  const { fetchFromSubreddits, fetchSearch } = useRedditAPI()

  // Update URL path when subreddits change
  const updateUrlPath = (subs: string[]) => {
    if (subs.length === 0) {
      router.push('/')
    } else {
      const slug = subs.join('+')
      const newPath = `/r/${slug}`
      if (pathname !== newPath) {
        router.push(newPath)
      }
    }
  }

  // Fix hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load all subreddits from API
  useEffect(() => {
    fetch('/api/subreddits')
      .then(res => res.json())
      .then(data => setSubreddits(data))
      .catch(err => console.error('Failed to load subreddits:', err))
  }, [])

  const toggleSubreddit = async (key: string) => {
    const newSelected = selectedSubreddits.includes(key)
      ? selectedSubreddits.filter(s => s !== key)
      : [...selectedSubreddits, key]

    setSelectedSubreddits(newSelected)
    updateUrlPath(newSelected)

    // Fetch immediately with current sort settings
    if (newSelected.length > 0) {
      await fetchFromSubreddits(newSelected)
    }
  }

  const handleSearch = async () => {
    const query = searchInput.trim()
    if (query.length < 3) {
      return
    }

    setSearchQuery(query)
    setSelectedSubreddits([])
    updateUrlPath([])
    await fetchSearch(query)
  }

  const addCustomSubreddit = async () => {
    const name = customSubreddit.trim().toLowerCase().replace(CUSTOM_SUBREDDIT_PREFIX_REGEX, '')

    // Validate name
    if (!name) {
      setCustomSubreddit('')
      return
    }

    // Check if already selected
    if (selectedSubreddits.includes(name)) {
      toast.info(`r/${name} is already in your playlist!`)
      setCustomSubreddit('')
      return
    }

    // Add to selected
    const newSelected = [...selectedSubreddits, name]
    setSelectedSubreddits(newSelected)
    updateUrlPath(newSelected)
    setCustomSubreddit('')

    // Fetch songs from this subreddit
    try {
      await fetchFromSubreddits(newSelected)
    } catch (error) {
      console.error(`Failed to fetch from r/${name}:`, error)
      // Remove if fetch fails
      setSelectedSubreddits(selectedSubreddits)
      updateUrlPath(selectedSubreddits)
      toast.error(`Could not load r/${name}. Please check the subreddit name.`)
    }
  }

  const handleShare = () => {
    setShowShareModal(true)
    setCopyStatus(null)
  }

  const getShareUrls = () => {
    const subs = selectedSubreddits.join('+')
    const params = new URLSearchParams()
    if (sortMethod !== 'hot') {
      params.append('sort', sortMethod)
    }
    if (sortMethod === 'top' && topPeriod !== 'week') {
      params.append('t', topPeriod)
    }

    const queryString = params.toString()
    const path = subs ? `/r/${subs}` : '/'
    const fullUrl = `https://musicplayer.io${path}${queryString ? `?${queryString}` : ''}`
    const shortUrl = `http://r.il.ly${path}${queryString ? `?${queryString}` : ''}`

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
  const groupedSubreddits = _.groupBy(subreddits, 'category')

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="border-sidebar-border border-b p-4">
        <div className="mb-3">
          <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            Browse
          </h2>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            className="h-9 flex-1 rounded-lg border border-border bg-background/70 px-3 text-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search Reddit..."
            type="text"
            value={searchInput}
          />
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={handleSearch}
            type="button"
          >
            <MagnifyingGlass className="h-4 w-4" weight="fill" />
          </button>
        </div>
      </div>

      {/* My Subreddit Playlist */}
      <div className="border-sidebar-border border-b bg-secondary/25 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="mb-0.5 font-bold text-sm">Your Library</h3>
            <p className="text-muted-foreground text-xs">
              {mounted
                ? `${selectedSubreddits.length} subreddit${selectedSubreddits.length === 1 ? '' : 's'} selected`
                : 'Loading...'}
            </p>
          </div>
          <button
            className="rounded-lg p-2 transition-colors hover:bg-secondary"
            onClick={handleShare}
            title="Share Playlist"
            type="button"
          >
            <ShareNetwork className="h-4 w-4" weight="fill" />
          </button>
        </div>

        {selectedSubreddits.length > 0 ? (
          <div className="mb-4 space-y-2">
            {selectedSubreddits.map(sub => (
              <div
                className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2"
                key={sub}
              >
                <span className="font-medium text-sm">{sub}</span>
                <button
                  className="text-muted-foreground text-xs hover:text-foreground"
                  onClick={() => toggleSubreddit(sub)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-xs">
            No subreddits selected
          </div>
        )}

        {/* Add Custom Subreddit */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/70 px-3 font-medium text-muted-foreground text-sm">
            /r/
          </div>
          <input
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background/70 px-3 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-hidden focus:ring-2 focus:ring-primary"
            onChange={e => setCustomSubreddit(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomSubreddit()}
            placeholder="custom-subreddit"
            type="text"
            value={customSubreddit}
          />
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={addCustomSubreddit}
            type="button"
          >
            <Plus className="h-4 w-4" weight="bold" />
          </button>
        </div>
      </div>

      {/* Subreddit List */}
      <div className="flex-1 overflow-y-auto pb-24">
        {Object.entries(groupedSubreddits).map(([category, subs]) => (
          <div className="border-border border-b last:border-0" key={category}>
            {/* Category Header - More Prominent */}
            <div className="sticky top-0 z-10 border-primary border-l-2 bg-sidebar/95 px-4 py-2.5 backdrop-blur-xs">
              <h4 className="font-bold text-primary text-xs uppercase tracking-wide">{category}</h4>
              <p className="text-muted-foreground text-xs">{subs.length} subreddits</p>
            </div>

            {/* Subreddits */}
            <div>
              {subs.map(sub => {
                const isSelected = selectedSubreddits.includes(sub.key)
                const newSelected = isSelected
                  ? selectedSubreddits.filter(s => s !== sub.key)
                  : [...selectedSubreddits, sub.key]
                const href = newSelected.length > 0 ? `/r/${newSelected.join('+')}` : '/'

                return (
                  <a
                    className={`flex w-full items-center justify-between px-4 py-2.5 transition-colors hover:bg-secondary/50 ${
                      isSelected ? 'bg-primary/15 text-primary' : ''
                    }`}
                    href={href}
                    key={sub.key}
                    onClick={e => {
                      e.preventDefault()
                      toggleSubreddit(sub.key)
                    }}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm leading-tight">{sub.name}</div>
                      {sub.subscribers && (
                        <div className="text-muted-foreground text-xs">
                          {sub.subscribers.toLocaleString()} members
                        </div>
                      )}
                    </div>
                    {isSelected ? (
                      <div className="font-medium text-primary text-xs">✓</div>
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" weight="bold" />
                    )}
                  </a>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        // Backdrop is a dismissal affordance, not interactive content
        // biome-ignore lint/a11y/noStaticElementInteractions: overlay click-to-close
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowShareModal(false)}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              setShowShareModal(false)
            }
          }}
          role="presentation"
          tabIndex={-1}
        >
          {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stops bubbling to backdrop */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: escape handled on backdrop */}
          <div
            aria-label="Share your subreddit playlist"
            aria-modal="true"
            className="w-full max-w-2xl rounded-lg border border-border bg-card p-6"
            onClick={e => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-bold text-xl">Share Your Subreddit Playlist</h3>
              <button
                className="rounded-md p-2 transition-colors hover:bg-secondary"
                onClick={() => setShowShareModal(false)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  focusable="false"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </button>
            </div>

            {/* Full URL */}
            <div className="mb-4">
              <label className="mb-2 block font-bold text-sm" htmlFor="share-full-url">
                Full URL
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                  id="share-full-url"
                  readOnly
                  type="text"
                  value={fullUrl}
                />
                <button
                  className="rounded-lg bg-secondary px-4 py-3 font-medium text-sm transition-colors hover:bg-secondary/80"
                  onClick={() => copyToClipboard(fullUrl, 'full')}
                  type="button"
                >
                  {copyStatus === 'full' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Short URL */}
            <div className="mb-6">
              <label className="mb-2 block font-bold text-sm" htmlFor="share-short-url">
                Short URL
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                  id="share-short-url"
                  readOnly
                  type="text"
                  value={shortUrl}
                />
                <button
                  className="rounded-lg bg-secondary px-4 py-3 font-medium text-sm transition-colors hover:bg-secondary/80"
                  onClick={() => copyToClipboard(shortUrl, 'short')}
                  type="button"
                >
                  {copyStatus === 'short' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="flex items-center gap-3">
              <a
                aria-label="Share on Google+"
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 transition-colors hover:bg-red-700"
                href={`https://plus.google.com/share?url=${encodeURIComponent(fullUrl)}`}
                rel="noopener noreferrer"
                target="_blank"
                title="Share on Google+"
              >
                <span className="sr-only">Share on Google+</span>
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-white"
                  fill="currentColor"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path d="M7 11v2.4h3.97c-.16 1.029-1.2 3.02-3.97 3.02-2.39 0-4.34-1.979-4.34-4.42 0-2.44 1.95-4.42 4.34-4.42 1.36 0 2.27.58 2.79 1.08l1.9-1.83C10.47 5.69 8.89 5 7 5c-3.87 0-7 3.13-7 7s3.13 7 7 7c4.04 0 6.721-2.84 6.721-6.84 0-.46-.051-.81-.111-1.16H7zm0 0l17 2h-3v3h-2v-3h-3v-2h3V8h2v3h3v2z" />
                </svg>
              </a>
              <a
                aria-label="Share on Facebook"
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 transition-colors hover:bg-blue-700"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`}
                rel="noopener noreferrer"
                target="_blank"
                title="Share on Facebook"
              >
                <span className="sr-only">Share on Facebook</span>
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-white"
                  fill="currentColor"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                aria-label="Share on Twitter"
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500 transition-colors hover:bg-sky-600"
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent('Check out this music playlist!')}`}
                rel="noopener noreferrer"
                target="_blank"
                title="Share on Twitter"
              >
                <span className="sr-only">Share on Twitter</span>
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-white"
                  fill="currentColor"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a
                aria-label="Share on Reddit"
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600 transition-colors hover:bg-orange-700"
                href={`https://reddit.com/submit?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent('Check out this music playlist!')}`}
                rel="noopener noreferrer"
                target="_blank"
                title="Share on Reddit"
              >
                <span className="sr-only">Share on Reddit</span>
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 text-white"
                  fill="currentColor"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
