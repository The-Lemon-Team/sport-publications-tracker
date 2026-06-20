import { CircleHelp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function HelpTooltip({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Подсказка"
      >
        <CircleHelp className="size-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
