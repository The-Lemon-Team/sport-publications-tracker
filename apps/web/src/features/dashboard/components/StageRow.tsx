import { Eye, MessageCircle, Plus, ThumbsUp } from 'lucide-react'
import type { StageView } from '@/lib/dashboard-utils'
import { aggregateStageView, formatNumber } from '@/lib/dashboard-utils'
import { Badge } from '@/components/ui/badge'
import { PublicationSlot } from './PublicationSlot'

export function StageRow({
  stage,
  index,
  onAddPublication,
}: {
  stage: StageView
  index: number
  onAddPublication: (stageId: string) => void
}) {
  const totals = aggregateStageView(stage)
  const publishedCount = stage.publications.filter(
    (p) => p.status === 'published',
  ).length

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 md:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">
            {index + 1}
          </span>
          <div>
            <h4 className="text-sm font-semibold leading-tight">{stage.name}</h4>
            {stage.hint ? (
              <p className="text-xs text-muted-foreground">{stage.hint}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Eye className="size-3.5" />
              {formatNumber(totals.views)}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <ThumbsUp className="size-3.5" />
              {formatNumber(totals.likes)}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <MessageCircle className="size-3.5" />
              {formatNumber(totals.comments)}
            </span>
          </div>
          <Badge variant="secondary" className="font-mono">
            {publishedCount}/{stage.publications.length}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stage.publications.map((pub) => (
          <PublicationSlot key={pub.id} publication={pub} />
        ))}

        <button
          type="button"
          onClick={() => onAddPublication(stage.id)}
          className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-transparent text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40 hover:text-foreground"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plus className="size-4" />
          </span>
          <span className="text-xs font-medium">Add Publication</span>
        </button>
      </div>
    </div>
  )
}
