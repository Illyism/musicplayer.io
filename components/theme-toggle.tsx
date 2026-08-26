'use client'

import { Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button aria-label="Toggle theme" size="icon" variant="ghost">
        <Sun className="h-5 w-5" weight="fill" />
      </Button>
    )
  }

  return (
    <Button
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      size="icon"
      variant="ghost"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" weight="fill" />
      ) : (
        <Moon className="h-5 w-5" weight="fill" />
      )}
    </Button>
  )
}
