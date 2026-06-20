import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { formatNumber } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'

export type MetricField = 'likes' | 'comments'

export function DeltaBadge({
  delta,
  prominent = false,
}: {
  delta: number
  /** Stronger styling for attention-worthy negative changes. */
  prominent?: boolean
}) {
  if (delta === 0) return null

  return (
    <span
      className={cn(
        'font-mono text-[9px] font-semibold leading-none tabular-nums',
        delta > 0 && 'text-emerald-600 dark:text-emerald-400',
        delta < 0 &&
          (prominent
            ? 'rounded bg-destructive/15 px-1 py-0.5 text-destructive ring-1 ring-destructive/25'
            : 'text-destructive'),
      )}
    >
      {delta > 0 ? '+' : ''}
      {formatNumber(delta)}
    </span>
  )
}

export function CompactMetricControl({
  field,
  icon: Icon,
  iconClassName,
  value,
  delta,
  onSave,
  onOpenHistory,
  isSaving = false,
  prominentDelta = false,
}: {
  field: MetricField
  icon: LucideIcon
  iconClassName: string
  value: number
  delta: number
  onSave: (value: number) => Promise<void>
  onOpenHistory: () => void
  isSaving?: boolean
  prominentDelta?: boolean
}) {
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function resetDraft() {
    setDraft(String(value))
  }

  async function commit() {
    const trimmed = draft.trim()
    if (!trimmed) {
      resetDraft()
      return
    }

    const parsed = Number.parseInt(trimmed, 10)
    if (!Number.isFinite(parsed)) {
      resetDraft()
      return
    }

    const next = Math.max(0, parsed)
    setDraft(String(next))

    if (next !== value) {
      await onSave(next)
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-dashed border-border/60',
        'bg-transparent px-1 py-0.5',
      )}
    >
      <button
        type="button"
        onClick={onOpenHistory}
        disabled={isSaving}
        title="История"
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-dashed border-border/70',
          'bg-transparent px-1.5 py-0.5 transition-all',
          'hover:border-border hover:bg-gradient-to-br hover:from-muted/55 hover:to-muted/20',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <Icon className={cn('size-3 shrink-0', iconClassName)} />
        <DeltaBadge delta={delta} prominent={prominentDelta} />
      </button>

      <div className="relative inline-flex items-center">
        <input
          ref={inputRef}
          type="number"
          min={0}
          inputMode="numeric"
          value={draft}
          disabled={isSaving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void commit()
              inputRef.current?.blur()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              resetDraft()
              inputRef.current?.blur()
            }
          }}
          onBlur={() => {
            void commit()
          }}
          className={cn(
            'h-5 w-10 border-0 border-b border-border/70 bg-transparent px-0.5 text-center',
            'text-[11px] font-mono tabular-nums text-foreground',
            'transition-colors placeholder:text-muted-foreground/50',
            'focus:border-primary focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          )}
          aria-label={
            field === 'likes' ? 'Количество лайков' : 'Количество комментариев'
          }
        />
        {isSaving ? (
          <Loader2 className="absolute -right-3.5 size-2.5 animate-spin text-muted-foreground" />
        ) : null}
      </div>
    </div>
  )
}
