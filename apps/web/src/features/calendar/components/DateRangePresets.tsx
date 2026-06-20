import {
  DATE_RANGE_PRESET_LABELS,
  getDateRangePreset,
  matchesDateRangePreset,
  type DateRangePreset,
  type DateRangeValue,
} from '@/features/calendar/lib/calendar-utils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PRESETS: DateRangePreset[] = ['day', 'week', 'month']

type DateRangePresetsProps = {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  size?: 'sm' | 'default'
  className?: string
}

export function DateRangePresets({
  value,
  onChange,
  size = 'sm',
  className,
}: DateRangePresetsProps) {
  return (
    <div
      className={cn(
        'flex items-center rounded-lg border border-border p-0.5',
        className,
      )}
      role="group"
      aria-label="Предвыбор периода"
    >
      {PRESETS.map((preset) => {
        const isActive = matchesDateRangePreset(value, preset)
        return (
          <Button
            key={preset}
            type="button"
            size={size}
            variant={isActive ? 'secondary' : 'ghost'}
            className={cn(
              'h-7 px-2 text-xs',
              size === 'default' && 'h-8 px-2.5 text-sm',
            )}
            onClick={() => onChange(getDateRangePreset(preset))}
          >
            {DATE_RANGE_PRESET_LABELS[preset]}
          </Button>
        )
      })}
    </div>
  )
}
