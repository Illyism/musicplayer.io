import { VinylRecord } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-3', compact && 'gap-2.5 sm:gap-3')}>
      <span
        className={cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background',
          compact && 'size-8 sm:size-10'
        )}
      >
        <VinylRecord
          aria-hidden="true"
          className={cn('size-7', compact && 'size-6 sm:size-7')}
          weight="regular"
        />
        <span
          className={cn(
            'absolute right-0 bottom-0 size-3 rounded-full border-2 border-background bg-reddit',
            compact && 'size-2.5 sm:size-3'
          )}
        />
      </span>
      <span className="flex flex-col">
        <span
          className={cn(
            'font-semibold text-lg leading-5 tracking-tight',
            compact && 'text-base sm:text-lg'
          )}
        >
          music player
        </span>
        <span
          className={cn(
            'mt-0.5 text-muted-foreground text-xs leading-4',
            compact && 'mt-0 text-[10px] leading-3 sm:mt-0.5 sm:text-xs sm:leading-4'
          )}
        >
          for <span className="font-medium text-reddit">Reddit</span>
        </span>
      </span>
    </span>
  )
}
