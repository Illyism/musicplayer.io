'use client'

import {
  DotsThree,
  GithubLogo,
  House,
  Keyboard,
  Moon,
  RedditLogo,
  SignIn,
  SignOut,
  Stack,
  Sun,
  User,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { Brand } from '@/components/brand'
import { LoginModal } from '@/components/login-modal'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/hooks/use-auth'
import { usePlayerStore } from '@/lib/store/player-store'

interface HeaderProps {
  setShowKeyboardModal?: (show: boolean) => void
  showKeyboardModal?: boolean
}

const shortcutGroups = [
  {
    shortcuts: [
      ['Play or pause', 'Space'],
      ['Next track', '→'],
      ['Previous track', '←'],
      ['Shuffle', 'S'],
    ],
    title: 'Playback',
  },
  {
    shortcuts: [
      ['Turn up', '↑'],
      ['Turn down', '↓'],
      ['Mute or unmute', 'M'],
    ],
    title: 'Volume',
  },
  {
    shortcuts: [
      ['Show shortcuts', '?'],
      ['Close dialog', 'Esc'],
    ],
    title: 'Navigation',
  },
] as const

function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="pr-10">
          <DialogTitle>Keep the music moving</DialogTitle>
          <DialogDescription>A few keys are all you need.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 pt-2">
          {shortcutGroups.map(group => (
            <section className="grid gap-2" key={group.title}>
              <h3 className="font-medium text-muted-foreground text-xs">{group.title}</h3>
              {group.shortcuts.map(([label, key]) => (
                <div className="flex items-center justify-between gap-4 py-1" key={label}>
                  <span className="text-sm">{label}</span>
                  <kbd className="min-w-8 rounded-lg border bg-muted px-2 py-1 text-center font-medium text-xs">
                    {key}
                  </kbd>
                </div>
              ))}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function Header({ showKeyboardModal, setShowKeyboardModal }: HeaderProps) {
  const { isAuthenticated, username, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const mobileView = usePlayerStore(state => state.mobileView)
  const setMobileView = usePlayerStore(state => state.setMobileView)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [internalShowKeyboardModal, setInternalShowKeyboardModal] = useState(false)
  const isKeyboardModalOpen = showKeyboardModal ?? internalShowKeyboardModal
  const setIsKeyboardModalOpen = setShowKeyboardModal ?? setInternalShowKeyboardModal

  return (
    <>
      <header className="z-40 flex h-14 shrink-0 items-center justify-between gap-2 bg-background px-4 sm:h-[72px] sm:gap-4 sm:border-border/60 sm:border-b sm:px-6">
        <Link
          aria-label="Music Player for Reddit home"
          className="flex min-h-11 shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
          onClick={() => setMobileView('playlist')}
        >
          <Brand compact />
        </Link>
        <span className="hidden text-muted-foreground text-sm md:block">
          Good music. Human taste.
        </span>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            aria-label="Home"
            aria-pressed={mobileView !== 'library'}
            className="hidden lg:inline-flex"
            onClick={() => setMobileView('playlist')}
            size="icon"
            variant="ghost"
          >
            <House className="size-5" weight={mobileView === 'library' ? 'regular' : 'fill'} />
          </Button>
          <Button
            aria-label="Your library"
            aria-pressed={mobileView === 'library'}
            className="hidden lg:inline-flex"
            onClick={() => setMobileView('library')}
            size="icon"
            variant="ghost"
          >
            <Stack className="size-5" weight={mobileView === 'library' ? 'fill' : 'regular'} />
          </Button>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <Button
            aria-label="Keyboard shortcuts"
            className="hidden lg:inline-flex"
            onClick={() => setIsKeyboardModalOpen(true)}
            size="icon"
            variant="ghost"
          >
            <Keyboard className="size-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Open app menu" size="icon" variant="ghost">
                <DotsThree className="size-6" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Music Player for Reddit</DropdownMenuLabel>
              <DropdownMenuItem
                className="sm:hidden"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
                {resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsKeyboardModalOpen(true)}>
                <Keyboard />
                Keyboard shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://www.reddit.com/r/MusicPlayer/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <RedditLogo />
                  Join the community
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/musicplayer-io/musicplayer.io"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <GithubLogo />
                  View source
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="https://il.ly/" rel="noopener noreferrer" target="_blank">
                  <User />
                  Made by Ilias
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isAuthenticated ? (
                <>
                  <DropdownMenuLabel>Signed in as u/{username}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={logout}>
                    <SignOut />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => setShowLoginModal(true)}>
                  <SignIn />
                  Sign in with Reddit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Account menu"
                  className="hidden max-w-40 sm:inline-flex"
                  variant="secondary"
                >
                  <User />
                  <span className="truncate">u/{username || 'you'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Signed in as u/{username}</DropdownMenuLabel>
                <DropdownMenuItem onClick={logout}>
                  <SignOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button className="hidden sm:inline-flex" onClick={() => setShowLoginModal(true)}>
              <RedditLogo className="size-4" />
              Sign in
            </Button>
          )}
        </div>
      </header>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <ShortcutsDialog onOpenChange={setIsKeyboardModalOpen} open={isKeyboardModalOpen} />
    </>
  )
}
