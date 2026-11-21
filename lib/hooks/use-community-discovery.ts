'use client'

import { useEffect, useState } from 'react'
import type { CommunityCategory, CommunityDiscoveryResult } from '@/lib/community/types'
import { usePlayerStore } from '@/lib/store/player-store'

const clientCache = new Map<string, { data: CommunityDiscoveryResult; expiresAt: number }>()
const pendingRequests = new Map<string, Promise<CommunityDiscoveryResult>>()

async function loadDiscovery(
  params: URLSearchParams,
  refresh: boolean
): Promise<CommunityDiscoveryResult> {
  const key = params.toString()
  const cached = clientCache.get(key)
  if (!refresh && cached && cached.expiresAt > Date.now()) {
    return cached.data
  }
  const pending = pendingRequests.get(key)
  if (pending) {
    return pending
  }
  const request = (async () => {
    const response = await fetch(`/api/subreddits?${params}`, {
      cache: refresh ? 'reload' : 'default',
    })
    if (!response.ok) {
      throw new Error('Communities could not load. Please try again.')
    }
    const result: CommunityDiscoveryResult = await response.json()
    if (clientCache.size >= 20) {
      const oldest = clientCache.keys().next().value
      if (oldest !== undefined) {
        clientCache.delete(oldest)
      }
    }
    const cacheExpiry = Date.now() + 60_000
    const resultExpiry = result.expiresAt === null ? Number.NaN : Date.parse(result.expiresAt)
    clientCache.set(key, {
      data: result,
      expiresAt: Number.isFinite(resultExpiry) ? Math.min(cacheExpiry, resultExpiry) : cacheExpiry,
    })
    return result
  })()
  pendingRequests.set(key, request)
  try {
    return await request
  } finally {
    pendingRequests.delete(key)
  }
}

export function useCommunityDiscovery(query = '', category: CommunityCategory | null = null) {
  const [data, setData] = useState<CommunityDiscoveryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (query.trim()) {
        params.set('q', query.trim())
      }
      if (category) {
        params.set('category', category)
      }
      try {
        const result = await loadDiscovery(params, attempt > 0)
        if (!cancelled) {
          setData(result)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error ? requestError.message : 'Communities could not load.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    let started = false
    let unsubscribe: (() => void) | undefined
    const runOnce = () => {
      if (started) {
        return
      }
      started = true
      unsubscribe?.()
      load()
    }

    if (!query.trim() && attempt === 0 && usePlayerStore.getState().loading) {
      unsubscribe = usePlayerStore.subscribe(state => {
        if (!state.loading) {
          runOnce()
        }
      })
    }

    let delayMs = 0
    if (query.trim()) {
      delayMs = 350
    } else if (usePlayerStore.getState().loading && attempt === 0) {
      delayMs = 800
    }
    const timeout = setTimeout(runOnce, delayMs)
    return () => {
      clearTimeout(timeout)
      unsubscribe?.()
      cancelled = true
    }
  }, [attempt, category, query])

  return { data, error, loading, refresh: () => setAttempt(value => value + 1) }
}
