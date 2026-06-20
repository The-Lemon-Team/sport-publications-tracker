import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { CompactCalendarGrid } from '@/features/calendar/components/CompactCalendarGrid'
import { DateRangePresets } from '@/features/calendar/components/DateRangePresets'
import {
  formatDateRangeLabel,
  startOfMonth,
  type DateRangeValue,
} from '@/features/calendar/lib/calendar-utils'
import { HelpTooltip } from '@/components/HelpTooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DateRangePickerProps = {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  onClear: () => void
  size?: 'sm' | 'default'
  showPresets?: boolean
}

export function DateRangePicker({
  value,
  onChange,
  onClear,
  size = 'default',
  showPresets = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() =>
    startOfMonth(value.from ?? new Date()),
  )
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (value.from) {
      setCursor(startOfMonth(value.from))
    }
  }, [value.from])

  function handlePresetChange(next: DateRangeValue) {
    onChange(next)
    if (next.from) {
      setCursor(startOfMonth(next.from))
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-wrap items-center',
        showPresets ? 'gap-1' : 'gap-2',
      )}
    >
      {showPresets ? (
        <>
          <HelpTooltip text="Предвыбор: сегодня, текущая неделя (пн–сегодня) или месяц (1-е–сегодня)" />
          <DateRangePresets
            value={value}
            onChange={handlePresetChange}
            size={size}
          />
        </>
      ) : null}

      <Button
        type="button"
        size={size}
        variant={value.enabled ? 'secondary' : 'outline'}
        className="gap-1.5"
        onClick={() => setOpen((prev) => !prev)}
      >
        <CalendarDays className="size-3.5" />
        <span className="max-w-[10rem] truncate text-xs sm:max-w-none sm:text-sm">
          {value.enabled ? formatDateRangeLabel(value) : 'Период'}
        </span>
      </Button>

      <Button
        type="button"
        size={size}
        variant={!value.enabled ? 'secondary' : 'outline'}
        onClick={() => {
          onClear()
          setOpen(false)
        }}
      >
        Все
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[15.5rem] rounded-xl border border-border bg-popover p-3 shadow-lg">
          {showPresets ? (
            <div className="mb-2.5 border-b border-border pb-2.5">
              <DateRangePresets
                value={value}
                onChange={handlePresetChange}
                size="sm"
                className="w-full justify-between"
              />
            </div>
          ) : null}
          <CompactCalendarGrid
            cursor={cursor}
            onCursorChange={setCursor}
            range={value}
            onRangeChange={onChange}
            className="w-full"
          />
        </div>
      ) : null}
    </div>
  )
}
