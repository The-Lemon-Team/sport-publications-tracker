import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function PublicationTrackingBadge({
  mode,
  onEdit,
}: {
  mode: 'manual' | 'live'
  onEdit?: () => void
}) {
  const isLive = mode === 'live'

  return (
    <div className="flex items-center gap-0.5">
      <Badge
        variant="outline"
        className={cn(
          'h-4 px-1 py-0 text-[9px] font-medium',
          isLive
            ? 'gap-1 text-emerald-700 dark:text-emerald-300'
            : 'text-amber-700 dark:text-amber-300',
        )}
      >
        {isLive ? (
          <>
            <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </>
        ) : (
          'Ручной учёт'
        )}
      </Badge>
      {onEdit ? (
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Редактировать публикацию"
          aria-label="Редактировать публикацию"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <Pencil className="size-2.5" />
        </button>
      ) : null}
    </div>
  )
}
