import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Heart,
  Layers,
  MessageCircle,
} from 'lucide-react'
import type { TopicDto } from '@spt/shared'
import { PublicationStatus } from '@spt/shared'
import { formatNumber } from '@/features/content-table/lib/metrics'
import { ProviderBadge } from '@/features/dashboard/components/ProviderBadge'
import { formatSubscriberDate } from '@/lib/dashboard-utils'
import { providerIdFromEnum } from '@/lib/providers'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  filterTopicPublications,
  type TopicsFilterOptions,
} from '@/features/topics/lib/topic-filters'

const STATUS_LABELS: Record<PublicationStatus, string> = {
  [PublicationStatus.PUBLISHED]: 'Опубликовано',
  [PublicationStatus.PLANNED]: 'Запланировано',
}

function PublicationMetrics({
  status,
  metrics,
  compact,
}: {
  status: PublicationStatus
  metrics: { likes: number; comments: number }
  compact?: boolean
}) {
  if (status !== PublicationStatus.PUBLISHED) {
    return null
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center text-muted-foreground',
        compact ? 'gap-2 text-[11px]' : 'gap-3 text-xs',
      )}
    >
      <span className="inline-flex items-center gap-1 tabular-nums">
        <Heart className={compact ? 'size-3' : 'size-3.5'} />
        {formatNumber(metrics.likes)}
      </span>
      <span className="inline-flex items-center gap-1 tabular-nums">
        <MessageCircle className={compact ? 'size-3' : 'size-3.5'} />
        {formatNumber(metrics.comments)}
      </span>
    </div>
  )
}

function TopicListGroup({
  topic,
  filters,
  compact = false,
}: {
  topic: TopicDto
  filters: Pick<TopicsFilterOptions, 'dateRange'>
  compact?: boolean
}) {
  const [open, setOpen] = useState(true)
  const publications = filterTopicPublications(topic, filters)
  const totalPublications = topic.stages.reduce(
    (sum, stage) => sum + stage.publications.length,
    0,
  )

  return (
    <li
      className={cn(
        'overflow-hidden border border-border bg-muted/10',
        compact ? 'rounded-lg' : 'rounded-xl bg-card',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center text-left transition-colors hover:bg-muted/40',
          compact ? 'gap-2 px-2.5 py-2' : 'gap-3 px-4 py-3',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary',
            compact ? 'size-7' : 'size-10 rounded-lg',
          )}
        >
          <Layers className={compact ? 'size-3.5' : 'size-5'} />
        </span>

        <div className="min-w-0 flex-1">
          <p className={cn('truncate font-medium', compact ? 'text-sm' : undefined)}>
            {topic.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatSubscriberDate(topic.createdAt)} · {topic.stages.length}{' '}
            {topic.stages.length === 1 ? 'этап' : 'этапов'} ·{' '}
            {filters.dateRange.enabled
              ? `${publications.length} из ${totalPublications}`
              : totalPublications}{' '}
            {totalPublications === 1 ? 'публикация' : 'публикаций'}
          </p>
        </div>

        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        publications.length === 0 ? (
          <p
            className={cn(
              'border-t border-border text-muted-foreground',
              compact ? 'px-2.5 py-2 text-xs' : 'px-4 py-3 text-sm',
            )}
          >
            Нет публикаций для выбранного периода
          </p>
        ) : (
          <ul className="border-t border-border">
            {publications.map((pub) => (
              <li
                key={pub.id}
                className={cn(
                  'flex items-center gap-2 border-b border-border/60 last:border-b-0',
                  compact ? 'px-2.5 py-1.5 sm:pl-9' : 'gap-3 px-4 py-2.5 sm:pl-14',
                )}
              >
                <ProviderBadge
                  providerId={providerIdFromEnum(pub.provider)}
                  size={compact ? 'xs' : 'sm'}
                />

                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-medium', compact ? 'text-xs' : 'text-sm')}>
                    {pub.label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {pub.stageName}
                    {pub.date
                      ? ` · ${formatSubscriberDate(pub.date.toISOString())}`
                      : ''}
                  </p>
                </div>

                <Badge
                  variant={
                    pub.status === PublicationStatus.PUBLISHED
                      ? 'default'
                      : 'outline'
                  }
                  className="hidden shrink-0 sm:inline-flex"
                >
                  {STATUS_LABELS[pub.status]}
                </Badge>

                <PublicationMetrics
                  status={pub.status}
                  metrics={pub.metrics}
                  compact={compact}
                />

                {pub.postUrl ? (
                  <a
                    href={pub.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                    aria-label="Открыть публикацию"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-transparent" />
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </li>
  )
}

export function TopicsList({
  topics,
  filters,
  compact = false,
}: {
  topics: TopicDto[]
  filters: TopicsFilterOptions
  compact?: boolean
}) {
  return (
    <ul className={cn('flex flex-col', compact ? 'gap-1.5' : 'gap-3')}>
      {topics.map((topic) => (
        <TopicListGroup
          key={topic.id}
          topic={topic}
          filters={filters}
          compact={compact}
        />
      ))}
    </ul>
  )
}
