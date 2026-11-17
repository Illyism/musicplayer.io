import { VinylRecord } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/utils'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-3', compact && 'gap-2.5 sm:gap-3')}>
      <span
        className={cn(
          'bg-foreground text-background relative flex size-10 shrink-0 items-center justify-center rounded-full',
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
            'border-background bg-reddit absolute right-0 bottom-0 size-3 rounded-full border-2',
            compact && 'size-2.5 sm:size-3'
          )}
        />
      </span>
      <span className="flex flex-col">
        <span
          className={cn(
            'text-lg leading-5 font-semibold tracking-tight',
            compact && 'text-base sm:text-lg'
          )}
        >
          music player
        </span>
        <span
          className={cn(
            'text-muted-foreground mt-0.5 text-xs leading-4',
            compact && 'mt-0 text-[10px] leading-3 sm:mt-0.5 sm:text-xs sm:leading-4'
          )}
        >
          for <span className="text-reddit font-medium">Reddit</span>
        </span>
      </span>
    </span>
  )
}
