import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function LiveModeCornerToggle({
  checked,
  onCheckedChange,
  disabled,
  locked,
  lockReason,
}: {
  /** When true, live (automatic) metric sync is enabled. */
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** When true, live mode cannot be enabled (manual is the only option). */
  locked?: boolean
  lockReason?: string
}) {
  const isLocked = locked ?? false
  const isDisabled = disabled || isLocked
  const title =
    lockReason ??
    (checked
      ? 'Live: метрики обновляются автоматически по расписанию'
      : 'Ручной учёт: метрики вводите сами')

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 shadow-sm transition-colors',
        checked
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : 'border-border bg-muted/40',
        isLocked ? 'cursor-default opacity-90' : 'cursor-pointer',
      )}
      title={title}
      onClick={() => !isDisabled && onCheckedChange(!checked)}
      onKeyDown={(e) => {
        if (isDisabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onCheckedChange(!checked)
        }
      }}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
    >
      <span
        className={cn(
          'text-[10px] font-medium leading-none',
          checked
            ? 'text-emerald-800 dark:text-emerald-200'
            : 'text-muted-foreground',
        )}
      >
        Live
      </span>
      {checked ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse"
          aria-hidden
        />
      ) : null}
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={isDisabled}
        className="scale-90 data-[state=checked]:bg-emerald-600"
        aria-label="Live-режим"
        onClick={(e) => {
          e.stopPropagation()
          if (!isDisabled) onCheckedChange(!checked)
        }}
      />
    </div>
  )
}
