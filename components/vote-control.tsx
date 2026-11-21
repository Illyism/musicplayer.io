'use client'

import { ArrowDown, ArrowUp } from '@phosphor-icons/react'
import { useState } from 'react'
import { LoginModal } from '@/components/login-modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function VoteControl({ score, className }: { score: number; className?: string }) {
  const [showLoginModal, setShowLoginModal] = useState(false)

  return (
    <>
      <div
        className={cn('bg-muted inline-flex h-10 shrink-0 items-center rounded-full', className)}
      >
        <Button
          aria-label="Upvote track"
          className="text-reddit hover:text-reddit size-10 rounded-full"
          onClick={() => setShowLoginModal(true)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowUp className="size-4" weight="bold" />
        </Button>
        <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
          {score.toLocaleString()}
        </span>
        <Button
          aria-label="Downvote track"
          className="text-muted-foreground hover:text-foreground size-10 rounded-full"
          onClick={() => setShowLoginModal(true)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowDown className="size-4" weight="bold" />
        </Button>
      </div>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  )
}
