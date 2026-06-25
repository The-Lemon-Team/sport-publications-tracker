import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { SubscriberSnapshotDto } from '@spt/shared'
import { formatNumber, formatSubscriberDate } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'

export function SubscriberDeltaBadge({
  delta,
  lastChangedAt,
  lastChange,
  onClick,
}: {
  delta: number
  lastChangedAt: string | null
  lastChange: SubscriberSnapshotDto | null
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const positive = delta > 0
  const negative = delta < 0
  const unchanged = delta === 0

  useEffect(() => {
    if (!hovered) return
    function handlePointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setHovered(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [hovered])

  const displayDate = lastChange?.capturedAt ?? lastChangedAt ?? null

  return (
    <div ref={ref} className="relative flex flex-col items-end gap-0.5">
      <button
        type="button"
        className={cn(
          'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums transition-colors',
          positive && 'bg-success/10 text-success',
          negative && 'bg-destructive/10 text-destructive',
          unchanged && 'bg-muted text-muted-foreground',
          onClick && 'cursor-pointer hover:opacity-80',
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        aria-label="История изменений подписчиков"
      >
        {positive ? (
          <ArrowUp className="size-3" />
        ) : negative ? (
          <ArrowDown className="size-3" />
        ) : (
          <ArrowUp className="size-3 opacity-40" />
        )}
        {positive ? '+' : ''}
        {delta}
      </button>

      {displayDate ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {formatSubscriberDate(displayDate)}
        </span>
      ) : null}

      {hovered && (lastChange || displayDate) ? (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-border bg-popover p-3 text-left shadow-lg">
          <p className="text-xs font-medium">Изменение подписчиков</p>
          {lastChange ? (
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between gap-2">
                <dt>Дата</dt>
                <dd className="tabular-nums text-foreground">
                  {formatSubscriberDate(lastChange.capturedAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Изменение</dt>
                <dd
                  className={cn(
                    'tabular-nums',
                    lastChange.delta > 0
                      ? 'text-success'
                      : lastChange.delta < 0
                        ? 'text-destructive'
                        : 'text-foreground',
                  )}
                >
                  {lastChange.delta > 0 ? '+' : ''}
                  {lastChange.delta}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Стало</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(lastChange.count)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {unchanged
                ? 'Без изменений с последней проверки'
                : 'История появится после первого изменения'}
            </p>
          )}
          {onClick ? (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Нажмите, чтобы открыть полную историю
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
