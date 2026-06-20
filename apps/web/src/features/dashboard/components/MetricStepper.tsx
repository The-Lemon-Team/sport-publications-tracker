import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const QUICK_STEPS = [1, 5, 10, 50] as const

function clampNonNegative(value: number): number {
  return Math.max(0, Math.trunc(value))
}

export function MetricStepper({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  function setValue(next: number) {
    onChange(clampNonNegative(next))
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="size-8 shrink-0 px-0"
          disabled={disabled || value <= 0}
          onClick={() => setValue(value - 1)}
          aria-label={`Уменьшить ${label}`}
        >
          <Minus className="size-3.5" />
        </Button>

        <Input
          id={id}
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10)
            setValue(Number.isFinite(parsed) ? parsed : 0)
          }}
          className="h-8 text-center font-mono tabular-nums"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="size-8 shrink-0 px-0"
          disabled={disabled}
          onClick={() => setValue(value + 1)}
          aria-label={`Увеличить ${label}`}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {QUICK_STEPS.map((step) => (
          <Button
            key={step}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            className={cn('h-7 px-2 font-mono text-[11px] tabular-nums')}
            onClick={() => setValue(value + step)}
          >
            +{step}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || value === 0}
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={() => setValue(0)}
        >
          Сброс
        </Button>
      </div>
    </div>
  )
}
