'use client'

import { Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const iconTransition =
  'absolute size-5 transition-[opacity,transform,filter] duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Button
      aria-label={label}
      className="relative size-11 rounded-full text-muted-foreground hover:text-foreground"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      <Sun
        aria-hidden
        className={cn(
          iconTransition,
          isDark ? 'scale-100 opacity-100 blur-none' : 'scale-25 opacity-0 blur-[4px]'
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          iconTransition,
          isDark ? 'scale-25 opacity-0 blur-[4px]' : 'scale-100 opacity-100 blur-none'
        )}
      />
    </Button>
  )
}
