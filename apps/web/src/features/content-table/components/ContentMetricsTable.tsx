import { ChevronRight, Check, Clock, CircleSlash } from 'lucide-react'
import { flexRender } from '@tanstack/react-table'
import {
  PROVIDER_LABELS,
  PublicationStatus,
  type TopicDto,
} from '@spt/shared'
import { cn } from '@/lib/utils'
import { useContentTable } from '../hooks/useContentTable'
import {
  engagementRate,
  formatNumber,
  type ContentTableRow,
} from '../lib/metrics'

function StatusBadge({ status }: { status: PublicationStatus }) {
  if (status === PublicationStatus.PUBLISHED) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--color-success)]">
        <Check className="size-3.5" />
        <span className="text-xs font-medium">Опубликовано</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[var(--color-warning)]">
      <Clock className="size-3.5" />
      <span className="text-xs font-medium">Запланировано</span>
    </span>
  )
}

function ProviderPill({ provider }: { provider: ContentTableRow['provider'] }) {
  if (!provider) return null
  const label = PROVIDER_LABELS[provider]
  return (
    <span className="rounded-md bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
      {label.slice(0, 2)}
    </span>
  )
}

interface ContentMetricsTableProps {
  topics: TopicDto[]
  onAddPublication?: (topicId: string, stageId: string) => void
}

export function ContentMetricsTable({
  topics,
  onAddPublication,
}: ContentMetricsTableProps) {
  const {
    table,
    toggleTopic,
    toggleStage,
    isTopicExpanded,
    isStageExpanded,
  } = useContentTable(topics)

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/60"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-[var(--color-muted-foreground)]',
                    header.id !== 'name' && 'text-right',
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const data = row.original

            if (data.kind === 'topic') {
              const expanded = isTopicExpanded(data.topicId)
              return (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b-2 border-[var(--color-border)] bg-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/60"
                  onClick={() => toggleTopic(data.topicId)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={cn(
                          'size-4 text-[var(--color-muted-foreground)] transition-transform',
                          expanded && 'rotate-90',
                        )}
                      />
                      <span className="font-semibold">{data.name}</span>
                      <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs">
                        {data.publishedCount}/{data.totalCount}
                      </span>
                    </div>
                  </td>
                  <td />
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                    {formatNumber(data.metrics.views)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                    {formatNumber(data.metrics.likes)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                    {formatNumber(data.metrics.comments)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    {engagementRate(data.metrics)}
                  </td>
                  <td />
                </tr>
              )
            }

            if (data.kind === 'stage' && data.stageId) {
              const expanded = isStageExpanded(data.topicId, data.stageId)
              return (
                <tr
                  key={row.id}
                  className="cursor-pointer bg-[var(--color-muted)]/30 hover:bg-[var(--color-muted)]/50"
                  onClick={() => toggleStage(data.topicId, data.stageId!)}
                >
                  <td className="py-2 pl-9 pr-4">
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={cn(
                          'size-3.5 text-[var(--color-muted-foreground)] transition-transform',
                          expanded && 'rotate-90',
                        )}
                      />
                      <span className="font-medium">{data.name}</span>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        · {data.childCount}
                      </span>
                    </div>
                  </td>
                  <td />
                  <td className="px-4 py-2 text-right font-mono text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    {formatNumber(data.metrics.views)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    {formatNumber(data.metrics.likes)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    {formatNumber(data.metrics.comments)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    {engagementRate(data.metrics)}
                  </td>
                  <td className="pr-4 text-right">
                    {onAddPublication && (
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-accent)]"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddPublication(data.topicId, data.stageId!)
                        }}
                      >
                        +
                      </button>
                    )}
                  </td>
                </tr>
              )
            }

            return (
              <tr key={row.id} className="border-b border-[var(--color-border)]/50">
                <td className="py-2 pl-[3.75rem] pr-4">
                  <div className="flex items-center gap-2.5">
                    <ProviderPill provider={data.provider} />
                    <span className="truncate font-medium">{data.name}</span>
                    {data.channelName && (
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {data.channelName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {data.status ? (
                    <StatusBadge status={data.status} />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
                      <CircleSlash className="size-3.5" />
                      <span className="text-xs">—</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {data.status === PublicationStatus.PUBLISHED
                    ? formatNumber(data.metrics.views)
                    : '—'}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {data.status === PublicationStatus.PUBLISHED
                    ? formatNumber(data.metrics.likes)
                    : '—'}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {data.status === PublicationStatus.PUBLISHED
                    ? formatNumber(data.metrics.comments)
                    : '—'}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-[var(--color-muted-foreground)] tabular-nums">
                  {data.status === PublicationStatus.PUBLISHED
                    ? engagementRate(data.metrics)
                    : '—'}
                </td>
                <td />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
