import type { LucideIcon } from 'lucide-react'
import { formatNumber } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'
import { DeltaBadge } from './CompactMetricControl'

export function CompactMetricDisplay({
  icon: Icon,
  iconClassName,
  value,
  delta,
  onOpenHistory,
}: {
  icon: LucideIcon
  iconClassName: string
  value: number
  delta?: number
  onOpenHistory?: () => void
}) {
  const historyEnabled = onOpenHistory !== undefined

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-dashed border-border/60',
        'bg-transparent px-1 py-0.5',
      )}
    >
      {historyEnabled ? (
        <button
          type="button"
          onClick={onOpenHistory}
          title="История"
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-dashed border-border/70',
            'bg-transparent px-1.5 py-0.5 transition-all',
            'hover:border-border hover:bg-gradient-to-br hover:from-muted/55 hover:to-muted/20',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30',
          )}
        >
          <Icon className={cn('size-3 shrink-0', iconClassName)} />
          {delta !== undefined ? <DeltaBadge delta={delta} /> : null}
        </button>
      ) : (
        <span className="inline-flex items-center px-1.5 py-0.5">
          <Icon className={cn('size-3 shrink-0', iconClassName)} />
        </span>
      )}
      <span className="px-0.5 font-mono text-[11px] tabular-nums text-foreground">
        {formatNumber(value)}
      </span>
    </div>
  )
}
