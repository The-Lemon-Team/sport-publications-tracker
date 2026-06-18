import type { ComponentType } from 'react'
import { useState } from 'react'
import {
  ChevronDown,
  Eye,
  Layers3,
  MessageCircle,
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
import { StageRow } from './StageRow'

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="leading-tight">
        <p className="font-mono text-sm font-semibold">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  )
}

export function TopicSection({
  topic,
  onAddPublication,
}: {
  topic: TopicView
  onAddPublication: (topicId: string, stageId: string) => void
}) {
  const [open, setOpen] = useState(true)
  const totals = aggregateTopicView(topic)
  const counts = countPublicationViews(topic)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-br from-accent/40 to-card p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  'size-4 transition-transform duration-200',
                  !open && '-rotate-90',
                )}
              />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold leading-tight">
                  {topic.name}
                </h3>
                {topic.translation ? (
                  <span className="text-sm text-muted-foreground">
                    {topic.translation}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {topic.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {topic.stages.length} этапа · {counts.published}/{counts.total}{' '}
                  опубликовано
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryCard
              label="Views"
              value={formatNumber(totals.views)}
              icon={Eye}
            />
            <SummaryCard
              label="Comments"
              value={formatNumber(totals.comments)}
              icon={MessageCircle}
            />
            <SummaryCard
              label="Likes"
              value={formatNumber(totals.likes)}
              icon={ThumbsUp}
            />
            <SummaryCard
              label="Stages"
              value={String(topic.stages.length)}
              icon={Layers3}
            />
          </div>
        </div>
      </div>

      {open ? (
        <div className="flex flex-col gap-3 p-4 md:p-5">
          {topic.stages.map((stage, i) => (
            <StageRow
              key={stage.id}
              stage={stage}
              index={i}
              onAddPublication={(stageId) =>
                onAddPublication(topic.id, stageId)
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
