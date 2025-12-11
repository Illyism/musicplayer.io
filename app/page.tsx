"use client"

import { Suspense, useEffect, useState } from "react"
import { BrowsePanel } from "@/components/browse-panel"
import { PlaylistPanel } from "@/components/playlist-panel"
import { SongPanel } from "@/components/song-panel"
import { Controls } from "@/components/controls"
import { PageTitle } from "@/components/page-title"
import { useUrlParams } from "@/lib/hooks/use-url-params"
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts"
import { useLocalStorageSync } from "@/lib/hooks/use-local-storage-sync"
import { MessageToast } from "@/components/message-toast"
import { usePlaylistStore } from "@/lib/store"

function HomeContent() {
  useLocalStorageSync()
  useUrlParams()
  useKeyboardShortcuts()
  const currentSong = usePlaylistStore((state) => state.currentSong)
  const mobileView = usePlaylistStore((state) => state.mobileView)
  const setMobileView = usePlaylistStore((state) => state.setMobileView)
  const [showMobileSongPanel, setShowMobileSongPanel] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Detect screen size and reset mobileView when switching to desktop
  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.innerWidth >= 768 // md breakpoint
      setIsDesktop(desktop)
      
      // When switching to desktop, reset mobileView to show all panels
      if (desktop && mobileView !== "playlist") {
        // Don't reset if already on playlist, but ensure SongPanel is visible
        // The CSS will handle visibility, but we can reset mobileView for consistency
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [mobileView])

  // Show mobile panel when song is selected or when song tab is active
  useEffect(() => {
    if (currentSong && mobileView === "song") {
      setShowMobileSongPanel(true)
    } else if (mobileView !== "song") {
      setShowMobileSongPanel(false)
    }
  }, [currentSong, mobileView])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const error = params.get('error')
      
      if (error) {
        const { usePlaylistStore } = require('@/lib/store')
        const addMessage = usePlaylistStore.getState().addMessage
        
        const errorMessages: Record<string, string> = {
          auth_failed: 'Authentication failed. Please try again.',
          invalid_state: 'Invalid authentication state. Please try again.',
          no_code: 'No authorization code received. Please try again.',
          token_exchange_failed: 'Failed to exchange authorization code. Please try again.',
          no_token: 'No access token received. Please try again.',
          user_fetch_failed: 'Failed to fetch user information. Please try again.',
          callback_error: 'An error occurred during authentication. Please try again.',
        }
        
        addMessage({
          type: 'error',
          text: errorMessages[error] || 'An authentication error occurred.',
        })
        
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  return (
    <>
      <PageTitle />
      <MessageToast />
      <main className="flex flex-col md:flex-row h-screen pt-24 md:pt-12 pb-20 md:pb-16 bg-[#0a0a0a]">
        {/* Browse Panel - Mobile: Show when browse tab is active, Tablet+: Sidebar */}
        <div className={`md:block md:w-[18%] lg:w-[18%] bg-[#121212] border-r border-white/5 overflow-y-auto ${
          mobileView === "browse" ? "block" : "hidden"
        }`}>
          <BrowsePanel />
        </div>
        
        {/* Playlist Panel - Mobile: Show when playlist tab is active, Tablet: 60%, Desktop: 54% */}
        <div className={`md:w-[60%] lg:w-[54%] bg-[#121212] md:border-r border-white/5 overflow-y-auto ${
          mobileView === "playlist" ? "block w-full" : "hidden md:block"
        }`}>
          <PlaylistPanel />
        </div>
        
        {/* Song Panel - Single instance, always mounted */}
        {/* Desktop: Always visible as side panel (md:flex flex-1 overrides everything) */}
        {/* Mobile: Only visible when song tab active */}
        <div className={`
          bg-[#121212] overflow-y-auto
          ${mobileView === "song" 
            ? "fixed inset-0 top-24 bottom-20 z-40 block md:relative md:inset-auto md:top-auto md:bottom-auto md:z-auto md:flex md:flex-1" 
            : "hidden md:flex flex-1"
          }
        `}>
          <SongPanel onClose={mobileView === "song" ? () => {
            setMobileView("playlist")
          } : undefined} />
        </div>
        
        {/* Controls - Always at bottom */}
        <Controls />
      </main>
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#111]">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
