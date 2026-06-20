import type { ReactNode } from 'react'
import { Download, Plus } from 'lucide-react'
import { HelpTooltip } from '@/components/HelpTooltip'
import { DateRangePicker } from '@/features/calendar/components/DateRangePicker'
import type { DateRangeValue } from '@/features/calendar/lib/calendar-utils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TopicsSectionProps = {
  dateRange: DateRangeValue
  onDateRangeChange: (value: DateRangeValue) => void
  onClearDateRange: () => void
  onAddTopic: () => void
  children: ReactNode
  empty?: ReactNode
  className?: string
}

export function TopicsSection({
  dateRange,
  onDateRangeChange,
  onClearDateRange,
  onAddTopic,
  children,
  empty,
  className,
}: TopicsSectionProps) {
  const isEmpty = empty != null

  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm',
        className,
      )}
    >
      <header className="relative z-20 flex flex-col gap-2 border-b border-border bg-muted/25 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-semibold tracking-tight">Темы</h2>
          <HelpTooltip text="В Excel это (Название видео / контента)" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <DateRangePicker
            size="sm"
            showPresets
            value={dateRange}
            onChange={onDateRangeChange}
            onClear={onClearDateRange}
          />

          <span className="group relative inline-flex cursor-not-allowed">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5"
              disabled
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export excel</span>
            </Button>
            <span
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              Находится в разработке
            </span>
          </span>

          <Button size="sm" className="h-8 px-2.5" onClick={onAddTopic}>
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Новая тема</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-2 p-2.5 sm:p-3">
        {isEmpty ? empty : children}
      </div>
    </section>
  )
}
