'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu, LogIn, Keyboard, LogOut, User } from 'lucide-react'
import { usePlayerStore } from '@/lib/store/player-store'
import { LoginModal } from './login-modal'
import { ThemeToggle } from './theme-toggle'
import { useAuth } from '@/lib/hooks/use-auth'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  showKeyboardModal?: boolean
  setShowKeyboardModal?: (show: boolean) => void
}

export function Header({ showKeyboardModal, setShowKeyboardModal }: HeaderProps) {
  const { mobileView, setMobileView, currentSong } = usePlayerStore()
  const { isAuthenticated, username, logout } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [internalShowKeyboardModal, setInternalShowKeyboardModal] = useState(false)

  // Use controlled or internal state
  const isKeyboardModalOpen = showKeyboardModal ?? internalShowKeyboardModal
  const setIsKeyboardModalOpen = setShowKeyboardModal ?? setInternalShowKeyboardModal

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-sm supports-backdrop-filter:bg-card/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
          <Image
            src="/favicon.ico"
            alt="Reddit Music Player"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <div className="hidden md:block">
            <h1 className="text-lg font-bold">Reddit Music</h1>
            <p className="text-xs text-muted-foreground">Stream from subreddits</p>
          </div>
        </Link>

        {/* Desktop - Login and Menu */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />
          {/* Keyboard Shortcuts Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsKeyboardModalOpen(true)}
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-5 w-5" />
          </Button>{' '}
          {/* Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Menu className="h-4 w-4" />
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/musicplayer-io/musicplayer.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Source Code
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://www.reddit.com/r/MusicPlayer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                  Reddit
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://il.ly/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Ilias Ism
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://magicbuddy.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.099.155.232.171.325.016.093.036.305.02.469z" />
                  </svg>
                  MagicBuddy
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://swissobserver.com/en/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  Swiss Observer
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://magicspace.agency/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  MagicSpace Agency
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Auth Button */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {username || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Signed in as {username}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLoginModal(true)}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="ml-auto flex gap-2 md:hidden">
          <button
            onClick={() => setMobileView('browse')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mobileView === 'browse'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setMobileView('playlist')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mobileView === 'playlist'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Playlist
          </button>
          <button
            onClick={() => setMobileView('player')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mobileView === 'player'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            disabled={!currentSong}
          >
            Player
          </button>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* Keyboard Shortcuts Modal */}
      <Dialog open={isKeyboardModalOpen} onOpenChange={setIsKeyboardModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Keyboard Shortcuts</DialogTitle>
            <DialogDescription>Quick controls for the player</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Playback Controls */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Playback
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50">
                  <span className="text-sm">Play / Pause</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary border border-border rounded">
                    Space
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50">
                  <span className="text-sm">Next Track</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary border border-border rounded">
                    →
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50">
                  <span className="text-sm">Previous Track</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary border border-border rounded">
                    ←
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50">
                  <span className="text-sm">Shuffle Playlist</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary border border-border rounded">
                    S
                  </kbd>
                </div>
              </div>
            </div>

            {/* Volume Controls */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Volume
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50">
                  <span className="text-sm">Volume Up</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary border border-border rounded">
                    ↑
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50">
                  <span className="text-sm">Volume Down</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary border border-border rounded">
                    ↓
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50">
                  <span className="text-sm">Mute / Unmute</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary border border-border rounded">
                    M
                  </kbd>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Navigation
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50">
                  <span className="text-sm">Show Keyboard Shortcuts</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary border border-border rounded">
                    ?
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50">
                  <span className="text-sm">Close Modals</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary border border-border rounded">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={() => setIsKeyboardModalOpen(false)} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
