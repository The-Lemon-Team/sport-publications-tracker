import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Clock,
  FileText,
  Link2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  PublicationStatus,
  SubscriberCaptureSource,
  SubscriberHistoryContentFilter,
  SubscriberHistoryEventType,
  SUBSCRIBER_HISTORY_CONTENT_PROVIDER_IDS,
  type SubscriberHistoryContentProviderId,
  type SubscriberHistoryEventDto,
} from '@spt/shared'
import { useLazyGetSubscriberHistoryQuery } from '@/app/api/baseApi'
import { formatNumber, formatSubscriberDate } from '@/lib/dashboard-utils'
import { getProviderUi, providerIdFromEnum } from '@/lib/providers'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ProviderBadge } from './ProviderBadge'

const CONTENT_PROVIDER_IDS = SUBSCRIBER_HISTORY_CONTENT_PROVIDER_IDS

function defaultEnabledProviders(): Set<SubscriberHistoryContentProviderId> {
  return new Set()
}

function serializeContentFilter(
  enabled: Set<SubscriberHistoryContentProviderId>,
  includeAttached: boolean,
): string {
  if (enabled.size === 0 && !includeAttached) {
    return SubscriberHistoryContentFilter.NONE
  }

  if (enabled.size === 0 && includeAttached) {
    return SubscriberHistoryContentFilter.ATTACHED
  }

  const allEnabled = CONTENT_PROVIDER_IDS.every((id) => enabled.has(id))
  if (allEnabled && !includeAttached) {
    return SubscriberHistoryContentFilter.ALL
  }

  const parts: string[] = [...enabled].sort()
  if (includeAttached) {
    parts.push(SubscriberHistoryContentFilter.ATTACHED)
  }
  return parts.join(',')
}

function publicationEventLabel(
  providerId: string,
  isScheduled: boolean,
): string {
  const labels: Record<string, [string, string]> = {
    youtube: ['Опубликовано видео', 'Запланировано видео'],
    tg: ['Опубликован пост', 'Запланирован пост'],
    vk: ['Опубликована запись', 'Запланирована запись'],
    instagram: ['Опубликована публикация', 'Запланирована публикация'],
    club: ['Опубликован контент', 'Запланирован контент'],
    dzen: ['Опубликована статья', 'Запланирована статья'],
  }
  const pair = labels[providerId] ?? [
    'Опубликован контент',
    'Запланирован контент',
  ]
  return isScheduled ? pair[1] : pair[0]
}

function ScheduledStatusHint() {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

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

  return (
    <span ref={ref} className="relative inline-flex">
      <span
        className="inline-flex size-4 cursor-help items-center justify-center rounded-full bg-warning/15 text-warning"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Запланировано"
      >
        <Clock className="size-2.5" />
      </span>
      {hovered ? (
        <span className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-border bg-popover px-2.5 py-2 text-left text-[10px] text-muted-foreground shadow-lg">
          Эта публикация запланирована и ещё не вышла
        </span>
      ) : null}
    </span>
  )
}

function SubscriberChangeEvent({ entry }: { entry: SubscriberHistoryEventDto }) {
  const delta = entry.delta ?? 0
  const isManual = entry.captureSource === SubscriberCaptureSource.MANUAL

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border px-2.5 py-2">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Users className="size-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium">
            {isManual ? 'Ручное изменение' : 'Изменение подписчиков'}
          </p>
        </div>
        <p className="font-mono text-sm font-semibold tabular-nums">
          {formatNumber(entry.count ?? 0)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {formatSubscriberDate(entry.capturedAt)}
        </p>
      </div>
      <span
        className={cn(
          'flex shrink-0 items-center gap-0.5 font-mono text-xs tabular-nums',
          delta > 0 && 'text-success',
          delta < 0 && 'text-destructive',
          delta === 0 && 'text-muted-foreground',
        )}
      >
        {delta > 0 ? (
          <TrendingUp className="size-3" />
        ) : delta < 0 ? (
          <TrendingDown className="size-3" />
        ) : null}
        {delta > 0 ? '+' : ''}
        {delta}
      </span>
    </div>
  )
}

function ContentPublishedEvent({ entry }: { entry: SubscriberHistoryEventDto }) {
  const isScheduled = entry.publicationStatus === PublicationStatus.PLANNED
  const providerId = entry.publicationProvider
    ? providerIdFromEnum(entry.publicationProvider)
    : 'youtube'

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border px-2.5 py-2">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
        <FileText className="size-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <ProviderBadge providerId={providerId} size="sm" />
          <p className="truncate text-xs font-medium">
            {publicationEventLabel(providerId, isScheduled)}
          </p>
          {entry.attachedToChannel ? (
            <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">
              прикреплено
            </span>
          ) : null}
          {isScheduled ? <ScheduledStatusHint /> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {entry.publicationLabel}
        </p>
        {entry.subscribersAtEvent != null ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Подписчиков:{' '}
            <span className="font-mono font-medium text-foreground">
              {formatNumber(entry.subscribersAtEvent)}
            </span>
          </p>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          {formatSubscriberDate(entry.capturedAt)}
        </p>
      </div>
      {entry.publicationUrl ? (
        <a
          href={entry.publicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[10px] text-primary hover:underline"
        >
          Открыть
        </a>
      ) : null}
    </div>
  )
}

function ChannelAttachedEvent({ entry }: { entry: SubscriberHistoryEventDto }) {
  const providerId = entry.publicationProvider
    ? providerIdFromEnum(entry.publicationProvider)
    : 'youtube'

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
        <Link2 className="size-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <ProviderBadge providerId={providerId} size="sm" />
          <p className="truncate text-xs font-medium">Прикреплено к каналу</p>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {entry.publicationLabel}
        </p>
        {entry.attachedChannelHandle ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Канал:{' '}
            <span className="font-medium text-foreground">
              {entry.attachedChannelHandle}
            </span>
          </p>
        ) : null}
        {entry.subscribersAtEvent != null ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Подписчиков:{' '}
            <span className="font-mono font-medium text-foreground">
              {formatNumber(entry.subscribersAtEvent)}
            </span>
          </p>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          {formatSubscriberDate(entry.capturedAt)}
        </p>
      </div>
    </div>
  )
}

function HistoryEventItem({ entry }: { entry: SubscriberHistoryEventDto }) {
  if (entry.type === SubscriberHistoryEventType.CHANNEL_ATTACHED) {
    return <ChannelAttachedEvent entry={entry} />
  }
  if (entry.type === SubscriberHistoryEventType.VIDEO_PUBLISHED) {
    return <ContentPublishedEvent entry={entry} />
  }
  return <SubscriberChangeEvent entry={entry} />
}

function FilterToggleCell({
  label,
  icon,
  checked,
  onCheckedChange,
}: {
  label: string
  icon?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-lg border border-border bg-background px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1">
        {icon}
        <span className="truncate text-[10px] font-medium">{label}</span>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        size="sm"
      />
    </div>
  )
}

function ContentFilterControls({
  enabledProviders,
  includeAttached,
  onProvidersChange,
  onIncludeAttachedChange,
}: {
  enabledProviders: Set<SubscriberHistoryContentProviderId>
  includeAttached: boolean
  onProvidersChange: (next: Set<SubscriberHistoryContentProviderId>) => void
  onIncludeAttachedChange: (checked: boolean) => void
}) {
  const allEnabled = CONTENT_PROVIDER_IDS.every((id) => enabledProviders.has(id))

  function setAll(checked: boolean) {
    onProvidersChange(
      checked
        ? new Set(CONTENT_PROVIDER_IDS)
        : new Set<SubscriberHistoryContentProviderId>(),
    )
  }

  function toggleProvider(
    id: SubscriberHistoryContentProviderId,
    checked: boolean,
  ) {
    const next = new Set(enabledProviders)
    if (checked) {
      next.add(id)
    } else {
      next.delete(id)
    }
    onProvidersChange(next)
  }

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-border bg-muted/20 p-2.5">
      <p className="text-[10px] font-medium text-muted-foreground">
        Учитывать контент
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        <FilterToggleCell
          label="Прикрепленные"
          icon={
            <span className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <Link2 className="size-2" />
            </span>
          }
          checked={includeAttached}
          onCheckedChange={onIncludeAttachedChange}
        />

        {CONTENT_PROVIDER_IDS.map((id) => {
          const provider = getProviderUi(id)
          const checked = enabledProviders.has(id)

          return (
            <FilterToggleCell
              key={id}
              label={provider.abbr}
              icon={<ProviderBadge providerId={id} size="xs" />}
              checked={checked}
              onCheckedChange={(value) => toggleProvider(id, value)}
            />
          )
        })}

        <FilterToggleCell
          label="Включить все"
          checked={allEnabled}
          onCheckedChange={setAll}
        />
      </div>
    </div>
  )
}

function PublicationScopeFilter({
  publicationLabel,
}: {
  publicationLabel: string
}) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/20 p-2.5">
      <p className="text-[10px] font-medium text-muted-foreground">
        Фильтр
      </p>
      <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2">
        <FileText className="size-3 shrink-0 text-violet-600 dark:text-violet-400" />
        <span className="truncate text-xs font-medium">
          Публикация: {publicationLabel}
        </span>
      </div>
    </div>
  )
}

export function SubscriberHistoryModal({
  open,
  onOpenChange,
  sourceId,
  providerId,
  handle,
  publicationScope,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceId: string | null
  providerId: string
  handle: string
  publicationScope?: {
    publicationId: string
    publicationLabel: string
    since?: string | null
  } | null
}) {
  const defaultProviders = useMemo(() => defaultEnabledProviders(), [])
  const [enabledProviders, setEnabledProviders] =
    useState<Set<SubscriberHistoryContentProviderId>>(defaultProviders)
  const [includeAttached, setIncludeAttached] = useState(true)
  const contentFilter = useMemo(
    () => serializeContentFilter(enabledProviders, includeAttached),
    [enabledProviders, includeAttached],
  )
  const [items, setItems] = useState<SubscriberHistoryEventDto[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [fetchHistory, { isFetching }] = useLazyGetSubscriberHistoryQuery()

  useEffect(() => {
    if (!open || publicationScope) return
    setEnabledProviders(defaultProviders)
    setIncludeAttached(true)
  }, [open, sourceId, defaultProviders, publicationScope])

  const loadPage = useCallback(
    async (nextCursor?: string, reset = false) => {
      if (!sourceId) return
      const page = await fetchHistory({
        sourceId,
        cursor: nextCursor,
        filter: publicationScope ? undefined : contentFilter,
        publicationId: publicationScope?.publicationId,
        since: publicationScope?.since ?? undefined,
      }).unwrap()

      setItems((prev) => (reset ? page.items : [...prev, ...page.items]))
      setCursor(page.nextCursor)
      setHasMore(Boolean(page.nextCursor))
    },
    [fetchHistory, sourceId, contentFilter, publicationScope],
  )

  useEffect(() => {
    if (!open || !sourceId) return
    setItems([])
    setCursor(null)
    setHasMore(true)
    void loadPage(undefined, true)
  }, [open, sourceId, contentFilter, publicationScope, loadPage])

  useEffect(() => {
    if (!open || !hasMore || isFetching) return
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
  }, [open, hasMore, isFetching, cursor, loadPage])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="relative max-h-[85vh] max-w-md overflow-hidden"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 pr-8">
            <ProviderBadge providerId={providerId} size="sm" />
            <div className="min-w-0">
              <DialogTitle>История подписчиков</DialogTitle>
              <DialogDescription className="truncate">{handle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {publicationScope ? (
          <PublicationScopeFilter
            publicationLabel={publicationScope.publicationLabel}
          />
        ) : (
          <ContentFilterControls
            enabledProviders={enabledProviders}
            includeAttached={includeAttached}
            onProvidersChange={setEnabledProviders}
            onIncludeAttachedChange={setIncludeAttached}
          />
        )}

        <div className="mt-3 max-h-[45vh] space-y-1.5 overflow-y-auto pr-1">
          {items.length === 0 && !isFetching ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Событий пока не зафиксировано
            </p>
          ) : (
            items.map((entry) => (
              <HistoryEventItem key={entry.id} entry={entry} />
            ))
          )}

          {isFetching ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Загрузка…
            </p>
          ) : null}

          <div ref={sentinelRef} className="h-1" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
