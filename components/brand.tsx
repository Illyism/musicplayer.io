import { Play } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/utils'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-2xl leading-none font-extrabold tracking-[-0.04em]',
        compact && 'text-xl sm:text-2xl'
      )}
    >
      <span className="text-reddit">r/</span>
      <Play
        aria-hidden="true"
        className={cn('text-reddit mr-1 -ml-0.5 size-6', compact && 'size-5 sm:size-6')}
        weight="fill"
      />
      <span className="text-foreground">musicplayer</span>
    </span>
  )
}
