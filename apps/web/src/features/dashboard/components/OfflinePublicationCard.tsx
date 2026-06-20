import { useState } from 'react'
import { Check, Clock, ExternalLink, MessageCircle, ThumbsUp } from 'lucide-react'
import type { MetricHistoryEntryDto } from '@spt/shared'
import { MetricCaptureSource } from '@spt/shared'
import { useUpdateManualMetricsMutation } from '@/app/api/baseApi'
import { hasHighlightMetricDeltas } from '@spt/shared'
import type { PublicationView } from '@/lib/dashboard-utils'
import { getProviderUi } from '@/lib/providers'
import { cn } from '@/lib/utils'
import {
  CompactMetricControl,
  type MetricField,
} from './CompactMetricControl'
import { MetricHistoryModal, type MetricHistoryFocus } from './MetricHistoryModal'
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
  return null
}

export function OfflinePublicationCard({
  publication,
  compact = false,
  onMetricsSaved,
  onEdit,
}: {
  publication: PublicationView
  compact?: boolean
  onMetricsSaved?: (
    publicationId: string,
    metrics: { likes: number; comments: number },
    historyEntry: MetricHistoryEntryDto,
  ) => void
  onEdit?: () => void
}) {
  const provider = getProviderUi(publication.providerId)
  const hasHighlight = hasHighlightMetricDeltas(publication.highlightMetricDeltas)
  const likesDelta = publication.highlightMetricDeltas?.likes ?? 0
  const commentsDelta = publication.highlightMetricDeltas?.comments ?? 0
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyMetric, setHistoryMetric] = useState<MetricHistoryFocus>('likes')
  const [savingField, setSavingField] = useState<MetricField | null>(null)
  const [updateMetrics] = useUpdateManualMetricsMutation()

  async function handleSaveMetric(field: MetricField, newValue: number) {
    const likes =
      field === 'likes' ? newValue : publication.metrics.likes
    const comments =
      field === 'comments' ? newValue : publication.metrics.comments

    const likesDelta = likes - publication.metrics.likes
    const commentsDelta = comments - publication.metrics.comments

    if (likesDelta === 0 && commentsDelta === 0) return

    const historyEntry: MetricHistoryEntryDto = {
      id: `hist-local-${Date.now()}`,
      source: MetricCaptureSource.MANUAL,
      likes,
      comments,
      views: publication.metrics.views,
      shares: 0,
      likesDelta,
      commentsDelta,
      viewsDelta: 0,
      capturedAt: new Date().toISOString(),
    }

    const isPersistedPublication = !publication.id.startsWith('pub-')

    setSavingField(field)
    try {
      if (isPersistedPublication) {
        await updateMetrics({
          publicationId: publication.id,
          likes,
          comments,
        }).unwrap()
      }

      onMetricsSaved?.(publication.id, { likes, comments }, historyEntry)
    } finally {
      setSavingField(null)
    }
  }

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
          hasHighlight
            ? 'border-destructive/30 bg-destructive/[0.03] hover:border-destructive/45 hover:bg-destructive/[0.06]'
            : 'border-amber-500/25 hover:border-amber-500/40 hover:bg-amber-500/5',
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
            <PublicationTrackingBadge mode="manual" onEdit={onEdit} />
            <StatusDot status={publication.status} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CompactMetricControl
              field="likes"
              icon={ThumbsUp}
              iconClassName="text-rose-500/80"
              value={publication.metrics.likes}
              delta={likesDelta}
              prominentDelta={hasHighlight && likesDelta < 0}
              isSaving={savingField === 'likes'}
              onSave={(value) => handleSaveMetric('likes', value)}
              onOpenHistory={() => openHistory('likes')}
            />
            <CompactMetricControl
              field="comments"
              icon={MessageCircle}
              iconClassName="text-sky-500/80"
              value={publication.metrics.comments}
              delta={commentsDelta}
              prominentDelta={hasHighlight && commentsDelta < 0}
              isSaving={savingField === 'comments'}
              onSave={(value) => handleSaveMetric('comments', value)}
              onOpenHistory={() => openHistory('comments')}
            />
          </div>
          {publication.url ? (
            <a
              href={publication.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/slot:opacity-100"
              title="Открыть пост"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>

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
    </>
  )
}
