import { useState } from 'react'
import type { MetricHistoryEntryDto } from '@spt/shared'
import {
  Check,
  Clock,
  ExternalLink,
  Eye,
  MessageCircle,
  Plus,
  ThumbsUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicationView } from '@/lib/dashboard-utils'
import { isManualMetricTracking } from '@/lib/metric-tracking'
import { getProviderUi } from '@/lib/providers'
import { CompactMetricDisplay } from './CompactMetricDisplay'
import { EditPublicationDialog } from './EditPublicationDialog'
import {
  MetricHistoryModal,
  type MetricHistoryFocus,
} from './MetricHistoryModal'
import { OfflinePublicationCard } from './OfflinePublicationCard'
import { ProviderBadge } from './ProviderBadge'
import { PublicationTrackingBadge } from './PublicationTrackingBadge'

function StatusDot({ status }: { status: PublicationView['status'] }) {
  if (status === 'published') {
    return (
      <span className="inline-flex size-4 items-center justify-center rounded-full bg-success text-success-foreground">
        <Check className="size-3" />
      </span>
    )
  }
  if (status === 'scheduled') {
    return (
      <span className="inline-flex size-4 items-center justify-center rounded-full bg-warning text-warning-foreground">
        <Clock className="size-3" />
      </span>
    )
  }
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground">
      <Plus className="size-2.5" />
    </span>
  )
}

function isPersistedPublication(publicationId: string) {
  return !publicationId.startsWith('pub-')
}

export function PublicationSlot({
  publication,
  compact = false,
  onMetricsSaved,
}: {
  publication: PublicationView
  compact?: boolean
  onMetricsSaved?: (
    publicationId: string,
    metrics: { likes: number; comments: number },
    historyEntry: MetricHistoryEntryDto,
  ) => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const canEdit = isPersistedPublication(publication.id)
  const openEdit = canEdit ? () => setEditOpen(true) : undefined

  const card = isManualMetricTracking(publication.metricTrackingMode) ? (
    <OfflinePublicationCard
      publication={publication}
      compact={compact}
      onMetricsSaved={onMetricsSaved}
      onEdit={openEdit}
    />
  ) : (
    <AutoTrackedPublicationCard
      publication={publication}
      compact={compact}
      onEdit={openEdit}
    />
  )

  return (
    <>
      {card}
      {canEdit ? (
        <EditPublicationDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          publication={publication}
        />
      ) : null}
    </>
  )
}

function AutoTrackedPublicationCard({
  publication,
  compact = false,
  onEdit,
}: {
  publication: PublicationView
  compact?: boolean
  onEdit?: () => void
}) {
  const provider = getProviderUi(publication.providerId)
  const isMissing = publication.status === 'missing'
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyMetric, setHistoryMetric] = useState<MetricHistoryFocus>('likes')

  function openHistory(metric: MetricHistoryFocus) {
    setHistoryMetric(metric)
    setHistoryOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          'group/slot relative flex flex-col border bg-card transition-colors',
          compact ? 'gap-1.5 rounded-lg p-2' : 'gap-2 rounded-xl p-3',
          isMissing
            ? 'border-dashed border-border bg-muted/30'
            : 'border-emerald-500/20 hover:border-emerald-500/35 hover:bg-emerald-500/5',
        )}
      >
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <ProviderBadge
              providerId={publication.providerId}
              size={compact ? 'xs' : 'sm'}
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium leading-tight">
                {publication.label}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {provider.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <PublicationTrackingBadge mode="live" onEdit={onEdit} />
            <StatusDot status={publication.status} />
          </div>
        </div>

        {isMissing ? (
          <p className="text-[11px] italic text-muted-foreground">Слот свободен</p>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CompactMetricDisplay
                icon={Eye}
                iconClassName="text-muted-foreground/80"
                value={publication.metrics.views}
                delta={publication.metricDeltas.views}
                onOpenHistory={() => openHistory('views')}
              />
              <CompactMetricDisplay
                icon={ThumbsUp}
                iconClassName="text-rose-500/80"
                value={publication.metrics.likes}
                delta={publication.metricDeltas.likes}
                onOpenHistory={() => openHistory('likes')}
              />
              <CompactMetricDisplay
                icon={MessageCircle}
                iconClassName="text-sky-500/80"
                value={publication.metrics.comments}
                delta={publication.metricDeltas.comments}
                onOpenHistory={() => openHistory('comments')}
              />
            </div>
            {publication.url ? (
              <a
                href={publication.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/slot:opacity-100"
                title="Открыть пост"
              >
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}
          </div>
        )}
      </div>

      {!isMissing ? (
        <MetricHistoryModal
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          publicationId={publication.id}
          providerId={publication.providerId}
          label={publication.label}
          metric={historyMetric}
          localHistory={
            publication.id.startsWith('pub-')
              ? (publication.metricHistory ?? [])
              : undefined
          }
        />
      ) : null}
    </>
  )
}
