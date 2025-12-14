"use client"

import React, { Suspense, useState, useEffect } from "react"
import { BrowsePanel } from "@/components/browse-panel"
import { PlaylistPanel } from "@/components/playlist-panel"
import { PlayerPanel } from "@/components/player-panel"
import { SongInfoSidebar } from "@/components/song-info-sidebar"
import { PlayerControls } from "@/components/player-controls"
import { Header } from "@/components/header"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { usePlayerStore } from "@/lib/store/player-store"
import { useInitializeApp } from "@/lib/hooks/use-initialize-app"
import { usePlayerHydration } from "@/lib/hooks/use-player-hydration"

function SubredditContent() {
  // Hydrate from localStorage (client-only)
  usePlayerHydration()
  
  // Initialize app (URL params, keyboard shortcuts, etc.)
  useInitializeApp()
  
  const mobileView = usePlayerStore((state) => state.mobileView)
  const currentSong = usePlayerStore((state) => state.currentSong)
  const [isDesktop, setIsDesktop] = useState(false)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)

  // Update page title when song changes
  useEffect(() => {
    if (currentSong) {
      document.title = `${currentSong.title} - Reddit Music Player`
    } else {
      document.title = 'Reddit Music Player'
    }
  }, [currentSong])

  // Detect desktop vs mobile to prevent multiple players
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024) // lg breakpoint
    }
    
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Global Keyboard Shortcuts */}
      <KeyboardShortcuts onShowShortcuts={() => setShowKeyboardModal(true)} />
      
      {/* Header */}
      <Header showKeyboardModal={showKeyboardModal} setShowKeyboardModal={setShowKeyboardModal} />
      
      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Browse Panel - Left (5% narrower) */}
        <div 
          className={`
            w-full md:w-72 lg:w-80 
            bg-card border-r border-border 
            overflow-y-auto
            ${mobileView === "browse" ? "block" : "hidden md:block"}
          `}
        >
          <BrowsePanel />
        </div>
        
        {/* Playlist Panel - Center */}
        <div 
          className={`
            flex-1 bg-background 
            overflow-y-auto
            ${mobileView === "playlist" ? "block" : "hidden md:block"}
          `}
        >
          <PlaylistPanel />
        </div>
        
        {/* Player Panel - Mobile ONLY (conditionally rendered) */}
        {!isDesktop && (
          <div 
            className={`
              w-full
              bg-card border-l border-border 
              overflow-y-auto
              ${mobileView === "player" ? "block" : "hidden"}
            `}
          >
            <PlayerPanel />
          </div>
        )}

        {/* Song Info Sidebar - Desktop ONLY (conditionally rendered) */}
        {isDesktop && <SongInfoSidebar />}
      </main>
      
      {/* Player Controls - Bottom */}
      <PlayerControls />
    </div>
  )
}

export default function SubredditPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SubredditContent />
    </Suspense>
  )
}
