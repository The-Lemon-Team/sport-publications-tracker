import { useCallback, useEffect, useRef, useState } from 'react'
import type { MetricHistoryEntryDto } from '@spt/shared'
import { MetricCaptureSource } from '@spt/shared'
import { useLazyGetMetricHistoryQuery } from '@/app/api/baseApi'
import { formatNumber, formatSubscriberDate } from '@/lib/dashboard-utils'
import { METRIC_CAPTURE_SOURCE_LABELS } from '@/lib/metric-tracking'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/card'
import { ProviderBadge } from './ProviderBadge'

function SourceBadge({ source }: { source: MetricHistoryEntryDto['source'] }) {
  const manual = source === MetricCaptureSource.MANUAL
  return (
    <Badge
      variant="outline"
      className={cn(
        'px-1.5 py-0 text-[10px] font-medium',
        manual
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
      )}
    >
      {METRIC_CAPTURE_SOURCE_LABELS[source]}
    </Badge>
  )
}

function DeltaValue({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <span
      className={cn(
        'font-mono text-xs tabular-nums',
        value > 0 && 'text-emerald-600 dark:text-emerald-400',
        value < 0 && 'text-destructive',
        value === 0 && 'text-muted-foreground',
      )}
      title={label}
    >
      {value > 0 ? '+' : ''}
      {formatNumber(value)}
    </span>
  )
}

export type MetricHistoryFocus = 'views' | 'likes' | 'comments'

const METRIC_LABELS: Record<MetricHistoryFocus, string> = {
  views: 'просмотров',
  likes: 'лайков',
  comments: 'комментариев',
}

function metricValue(entry: MetricHistoryEntryDto, metric: MetricHistoryFocus) {
  if (metric === 'views') return entry.views
  if (metric === 'likes') return entry.likes
  return entry.comments
}

function metricDelta(entry: MetricHistoryEntryDto, metric: MetricHistoryFocus) {
  if (metric === 'views') return entry.viewsDelta
  if (metric === 'likes') return entry.likesDelta
  return entry.commentsDelta
}

export function MetricHistoryModal({
  open,
  onOpenChange,
  publicationId,
  providerId,
  label,
  localHistory,
  metric,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  publicationId: string | null
  providerId: string
  label: string
  localHistory?: MetricHistoryEntryDto[]
  metric?: MetricHistoryFocus
}) {
  const [items, setItems] = useState<MetricHistoryEntryDto[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [fetchHistory, { isFetching }] = useLazyGetMetricHistoryQuery()
  const useLocalHistory = localHistory !== undefined

  const loadPage = useCallback(
    async (nextCursor?: string, reset = false) => {
      if (!publicationId || useLocalHistory) return
      const page = await fetchHistory({
        publicationId,
        cursor: nextCursor,
      }).unwrap()

      setItems((prev) => (reset ? page.items : [...prev, ...page.items]))
      setCursor(page.nextCursor)
      setHasMore(Boolean(page.nextCursor))
    },
    [fetchHistory, publicationId, useLocalHistory],
  )

  useEffect(() => {
    if (!open) return

    if (useLocalHistory) {
      setItems(localHistory ?? [])
      setCursor(null)
      setHasMore(false)
      return
    }

    if (!publicationId) return
    setItems([])
    setCursor(null)
    setHasMore(true)
    void loadPage(undefined, true)
  }, [open, publicationId, loadPage, useLocalHistory, localHistory])

  useEffect(() => {
    if (!open || !hasMore || isFetching || useLocalHistory) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && cursor) {
          void loadPage(cursor)
        }
      },
      { rootMargin: '120px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [open, hasMore, isFetching, cursor, loadPage, useLocalHistory])

  const modalTitle = metric
    ? `История ${METRIC_LABELS[metric]}`
    : 'История метрик'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="relative max-h-[80vh] max-w-md overflow-hidden"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 pr-8">
            <ProviderBadge providerId={providerId} size="sm" />
            <div className="min-w-0">
              <DialogTitle>{modalTitle}</DialogTitle>
              <DialogDescription className="truncate">{label}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {items.length === 0 && !isFetching ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Изменений пока не зафиксировано
            </p>
          ) : (
            items.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatSubscriberDate(entry.capturedAt)}
                  </span>
                  <SourceBadge source={entry.source} />
                </div>

                {metric ? (
                  <div className="mt-2">
                    <p className="font-mono text-sm font-medium tabular-nums">
                      {formatNumber(metricValue(entry, metric))}
                      <span className="ml-1.5 text-xs font-normal">
                        <DeltaValue
                          value={metricDelta(entry, metric)}
                          label={`Δ ${METRIC_LABELS[metric]}`}
                        />
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Просмотры
                      </p>
                      <p className="font-mono font-medium tabular-nums">
                        {formatNumber(entry.views)}
                        <span className="ml-1.5 text-xs font-normal">
                          <DeltaValue value={entry.viewsDelta} label="Δ просмотров" />
                        </span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Лайки
                        </p>
                        <p className="font-mono font-medium tabular-nums">
                          {formatNumber(entry.likes)}
                          <span className="ml-1.5 text-xs font-normal">
                            <DeltaValue value={entry.likesDelta} label="Δ лайков" />
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Комментарии
                        </p>
                        <p className="font-mono font-medium tabular-nums">
                          {formatNumber(entry.comments)}
                          <span className="ml-1.5 text-xs font-normal">
                            <DeltaValue
                              value={entry.commentsDelta}
                              label="Δ комментариев"
                            />
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {!useLocalHistory ? <div ref={sentinelRef} className="h-1" /> : null}
          {isFetching ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Загрузка…
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
