'use client'

import { Suspense, useEffect, useState } from 'react'
import { BrowsePanel } from '@/components/browse-panel'
import { Header } from '@/components/header'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { PlayerControls } from '@/components/player-controls'
import { PlayerPanel } from '@/components/player-panel'
import { PlaylistPanel } from '@/components/playlist-panel'
import { SongInfoSidebar } from '@/components/song-info-sidebar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useInitializeApp } from '@/lib/hooks/use-initialize-app'
import { usePlayerHydration } from '@/lib/hooks/use-player-hydration'
import { usePlayerStore } from '@/lib/store/player-store'

function HomeContent() {
  // Hydrate from localStorage (client-only)
  usePlayerHydration()

  // Initialize app (URL params, keyboard shortcuts, etc.)
  useInitializeApp()

  const mobileView = usePlayerStore(state => state.mobileView)
  const currentSong = usePlayerStore(state => state.currentSong)
  const [isDesktop, setIsDesktop] = useState(false)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)

  // Update page title when song changes
  useEffect(() => {
    if (currentSong) {
      document.title = `${currentSong.title} - Music Player for Reddit`
    } else {
      document.title = 'Music Player for Reddit'
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
    <div className="flex h-screen flex-col bg-background">
      {/* Global Keyboard Shortcuts */}
      <KeyboardShortcuts onShowShortcuts={() => setShowKeyboardModal(true)} />

      {/* Header */}
      <Header setShowKeyboardModal={setShowKeyboardModal} showKeyboardModal={showKeyboardModal} />

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {isDesktop ? (
          <ResizablePanelGroup className="h-full" direction="horizontal">
            {/* Browse Panel - Left */}
            <ResizablePanel
              className="overflow-y-auto border-border border-r bg-sidebar"
              defaultSize="18%"
              maxSize="28%"
              minSize="14%"
            >
              <BrowsePanel />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Playlist Panel - Center */}
            <ResizablePanel
              className="overflow-y-auto bg-background"
              defaultSize="52%"
              minSize="30%"
            >
              <PlaylistPanel />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Song Info Sidebar - Right */}
            <ResizablePanel
              className="flex flex-col border-border border-l bg-card"
              defaultSize="30%"
              maxSize="45%"
              minSize="20%"
            >
              <SongInfoSidebar isDesktop={isDesktop} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          /* Mobile Layout - Non-resizable */
          <>
            <div
              className={`w-full overflow-y-auto border-border border-r bg-card ${mobileView === 'browse' ? 'block' : 'hidden'}
              `}
            >
              <BrowsePanel />
            </div>

            <div
              className={`w-full overflow-y-auto bg-background ${mobileView === 'playlist' ? 'block' : 'hidden'}
              `}
            >
              <PlaylistPanel />
            </div>

            {!isDesktop && (
              <div
                className={`w-full overflow-y-auto border-border border-l bg-card ${mobileView === 'player' ? 'block' : 'hidden'}
                `}
              >
                <PlayerPanel isDesktop={isDesktop} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Player Controls - Bottom */}
      <PlayerControls />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
