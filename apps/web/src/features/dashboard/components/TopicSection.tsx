import type { ComponentType } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ChevronDown,
  Eye,
  Layers3,
  MessageCircle,
  Pencil,
  Plus,
  ThumbsUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TopicView } from '@/lib/dashboard-utils'
import {
  aggregateTopicView,
  countPublicationViews,
  formatNumber,
} from '@/lib/dashboard-utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddStageDialog } from './AddStageDialog'
import { SortableStageList } from './SortableStageList'
import { StageRow } from './StageRow'

function SummaryCard({
  label,
  value,
  icon: Icon,
  compact = false,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center rounded-md border border-border bg-card',
        compact ? 'gap-1.5 px-2 py-1' : 'gap-2.5 rounded-lg px-3 py-2',
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary',
          compact ? 'size-6' : 'size-8',
        )}
      >
        <Icon className={compact ? 'size-3' : 'size-4'} />
      </span>
      <div className="leading-tight">
        <p className={cn('font-mono font-semibold', compact ? 'text-xs' : 'text-sm')}>
          {value}
        </p>
        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  )
}

export function TopicSection({
  topic,
  onAddPublication,
  onMetricsSaved,
  onCreateStage,
  onReorderStages,
  onUpdateStage,
  onUpdatePublicationLabel,
  onReorderPublications,
  isCreatingStage = false,
  nested = false,
}: {
  topic: TopicView
  onAddPublication: (topicId: string, stageId: string) => void
  onMetricsSaved?: (
    publicationId: string,
    metrics: { likes: number; comments: number },
    historyEntry: import('@spt/shared').MetricHistoryEntryDto,
  ) => void
  onCreateStage?: (
    topicId: string,
    input: { name: string; hint?: string },
  ) => Promise<void>
  onReorderStages?: (topicId: string, stageIds: string[]) => void
  onUpdateStage?: (
    topicId: string,
    stageId: string,
    input: { name?: string; hint?: string | null },
  ) => void
  onUpdatePublicationLabel?: (publicationId: string, label: string) => void
  onReorderPublications?: (
    topicId: string,
    stageId: string,
    publicationIds: string[],
  ) => void
  isCreatingStage?: boolean
  nested?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const totals = aggregateTopicView(topic)
  const counts = countPublicationViews(topic)

  return (
    <div
      className={cn(
        'overflow-hidden border border-border bg-card',
        nested ? 'rounded-lg' : 'rounded-2xl shadow-sm',
      )}
    >
      <div
        className={cn(
          'border-b border-border',
          nested
            ? 'bg-muted/15 px-2.5 py-2'
            : 'flex flex-col gap-4 bg-gradient-to-br from-accent/40 to-card p-4 md:p-5',
        )}
      >
        <div
          className={cn(
            'flex flex-wrap items-start justify-between',
            nested ? 'gap-2' : 'gap-3',
          )}
        >
          <div className={cn('flex items-start', nested ? 'gap-2' : 'gap-3')}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                'flex shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground',
                nested ? 'size-6' : 'mt-0.5 size-7',
              )}
            >
              <ChevronDown
                className={cn(
                  'transition-transform duration-200',
                  nested ? 'size-3.5' : 'size-4',
                  !open && '-rotate-90',
                )}
              />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={cn(
                    'font-semibold leading-tight',
                    nested ? 'text-sm' : 'text-lg',
                  )}
                >
                  {topic.name}
                </h3>
                {topic.translation ? (
                  <span className="text-xs text-muted-foreground">
                    {topic.translation}
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
                  {topic.category}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {topic.stages.length} этапа · {counts.published}/{counts.total}{' '}
                  опубликовано
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className={cn(
                'grid gap-1.5',
                nested
                  ? 'grid-cols-4'
                  : 'grid-cols-2 gap-2 sm:grid-cols-4',
              )}
            >
              <SummaryCard
                label={t('dashboard.summary.views')}
                value={formatNumber(totals.views)}
                icon={Eye}
                compact={nested}
              />
              <SummaryCard
                label={t('dashboard.summary.comments')}
                value={formatNumber(totals.comments)}
                icon={MessageCircle}
                compact={nested}
              />
              <SummaryCard
                label={t('dashboard.summary.likes')}
                value={formatNumber(totals.likes)}
                icon={ThumbsUp}
                compact={nested}
              />
              <SummaryCard
                label={t('dashboard.summary.stages')}
                value={String(topic.stages.length)}
                icon={Layers3}
                compact={nested}
              />
            </div>

            {onReorderStages ? (
              <Button
                type="button"
                variant={isEditing ? 'default' : 'outline'}
                size={nested ? 'sm' : 'default'}
                className={cn(
                  'shrink-0',
                  nested ? 'size-8 px-0' : 'size-9 px-0',
                )}
                onClick={() => setIsEditing((value) => !value)}
                aria-label={isEditing ? 'Завершить редактирование' : 'Редактировать тему'}
                title={isEditing ? 'Готово' : 'Редактировать'}
              >
                {isEditing ? (
                  <Check className={nested ? 'size-3.5' : 'size-4'} />
                ) : (
                  <Pencil className={nested ? 'size-3.5' : 'size-4'} />
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <div
          className={cn(
            'flex flex-col',
            nested ? 'gap-2 p-2.5' : 'gap-3 p-4 md:p-5',
          )}
        >
          {onReorderStages ? (
            <SortableStageList
              stages={topic.stages}
              compact={nested}
              isEditing={isEditing}
              onAddPublication={(stageId) =>
                onAddPublication(topic.id, stageId)
              }
              onMetricsSaved={onMetricsSaved}
              onReorder={(stageIds) => onReorderStages(topic.id, stageIds)}
              onStageChange={(stageId, input) =>
                onUpdateStage?.(topic.id, stageId, input)
              }
              onPublicationLabelChange={onUpdatePublicationLabel}
              onReorderPublications={(stageId, publicationIds) =>
                onReorderPublications?.(topic.id, stageId, publicationIds)
              }
            />
          ) : (
            topic.stages.map((stage, i) => (
              <StageRow
                key={stage.id}
                stage={stage}
                index={i}
                compact={nested}
                onAddPublication={(stageId) =>
                  onAddPublication(topic.id, stageId)
                }
                onMetricsSaved={onMetricsSaved}
              />
            ))
          )}

          {onCreateStage ? (
            <Button
              type="button"
              variant="outline"
              size={nested ? 'sm' : 'default'}
              className={cn(
                'w-full border-dashed',
                nested ? 'h-8 text-xs' : undefined,
              )}
              onClick={() => setStageDialogOpen(true)}
            >
              <Plus className={nested ? 'size-3.5' : 'size-4'} />
              Новый этап
            </Button>
          ) : null}
        </div>
      ) : null}

      {onCreateStage ? (
        <AddStageDialog
          open={stageDialogOpen}
          onOpenChange={setStageDialogOpen}
          isSubmitting={isCreatingStage}
          onSubmit={(input) => onCreateStage(topic.id, input)}
        />
      ) : null}
    </div>
  )
}
