import { ExternalLink, X } from 'lucide-react'
import { SubscriberTrackingMode } from '@spt/shared'
import { useUpdateManualSubscriberCountMutation } from '@/app/api/baseApi'
import type { LiveSubscriberSource } from '@/lib/provider-connections'
import { providerOf } from '@/lib/provider-connections'
import { formatNumber } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'
import { ProviderBadge } from './ProviderBadge'
import { PublicationTrackingBadge } from './PublicationTrackingBadge'
import { SubscriberCountControl } from './SubscriberCountControl'
import { SubscriberDeltaBadge } from './SubscriberDeltaBadge'

export function SubscriberSourceCard({
  source,
  count,
  delta,
  editMode,
  isRemoving,
  onRemove,
  onOpenHistory,
}: {
  source: LiveSubscriberSource
  count: number | null
  delta: number
  editMode: boolean
  isRemoving: boolean
  onRemove: () => void
  onOpenHistory?: () => void
}) {
  const provider = providerOf(source.providerId)
  const isManual = source.trackingMode === SubscriberTrackingMode.MANUAL
  const isTracked = Boolean(source.sourceId)
  const showLiveBadge = isTracked && !isManual
  const [updateCount, { isLoading: isSaving }] =
    useUpdateManualSubscriberCountMutation()

  async function handleSaveCount(next: number) {
    if (!source.sourceId) return
    await updateCount({ sourceId: source.sourceId, count: next }).unwrap()
  }

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 rounded-lg border bg-white px-2.5 py-2 dark:bg-card',
        isManual
          ? 'border-amber-500/25 hover:border-amber-500/40'
          : 'border-border',
        editMode && 'ring-1 ring-primary/20',
      )}
    >
      {editMode ? (
        <button
          type="button"
          className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Удалить ${provider.name}`}
          disabled={isRemoving}
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </button>
      ) : null}

      <ProviderBadge providerId={source.providerId} size="sm" />

      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1">
          <p className="truncate text-[10px] text-muted-foreground">
            {provider.name}
          </p>
          {isTracked ? (
            <PublicationTrackingBadge
              mode={showLiveBadge ? 'live' : 'manual'}
            />
          ) : null}
        </div>
        <p className="truncate text-[10px] text-muted-foreground/80">
          {source.handle}
        </p>

        {isManual && isTracked ? (
          <div className="mt-0.5">
            <SubscriberCountControl
              value={count}
              editable
              isSaving={isSaving}
              onSave={handleSaveCount}
              onOpenHistory={onOpenHistory}
            />
          </div>
        ) : (
          <p className="font-mono text-sm font-semibold tabular-nums tracking-tight">
            {count === null ? '—' : formatNumber(count)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {source.profileUrl ? (
          <a
            href={source.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            title="Открыть"
          >
            <ExternalLink className="size-3" />
          </a>
        ) : null}

        {showLiveBadge && !editMode ? (
          <SubscriberDeltaBadge
            delta={delta}
            lastChangedAt={source.lastChangedAt ?? null}
            lastChange={source.lastChange ?? null}
            onClick={onOpenHistory}
          />
        ) : !isManual && !editMode ? (
          <SubscriberDeltaBadge
            delta={delta}
            lastChangedAt={source.lastChangedAt ?? null}
            lastChange={source.lastChange ?? null}
          />
        ) : null}
      </div>
    </div>
  )
}
