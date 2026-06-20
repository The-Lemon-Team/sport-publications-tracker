export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

export const MONTH_LABELS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const

export type DateRangeValue = {
  enabled: boolean
  from: Date | null
  to: Date | null
}

export const EMPTY_DATE_RANGE: DateRangeValue = {
  enabled: false,
  from: null,
  to: null,
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isAfterToday(date: Date): boolean {
  return startOfDay(date).getTime() > startOfDay(new Date()).getTime()
}

export function isAfterCurrentMonth(cursor: Date): boolean {
  const now = new Date()
  return (
    cursor.getFullYear() > now.getFullYear() ||
    (cursor.getFullYear() === now.getFullYear() &&
      cursor.getMonth() > now.getMonth())
  )
}

export function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []

  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }

  return cells
}

export function normalizeDateRange(from: Date, to: Date): { from: Date; to: Date } {
  const start = startOfDay(from)
  const end = startOfDay(to)
  return start.getTime() <= end.getTime()
    ? { from: start, to: end }
    : { from: end, to: start }
}

export function isDateInRange(
  date: Date,
  from: Date | null,
  to: Date | null,
): boolean {
  if (!from || !to) return false
  const { from: start, to: end } = normalizeDateRange(from, to)
  const time = startOfDay(date).getTime()
  return time >= start.getTime() && time <= end.getTime()
}

export type DateRangePreset = 'day' | 'week' | 'month'

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const diff = (d.getDay() + 6) % 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function clampEndToToday(end: Date, today: Date): Date {
  return end.getTime() > today.getTime() ? today : end
}

export function getDateRangePreset(
  preset: DateRangePreset,
  referenceDate: Date = new Date(),
): DateRangeValue {
  const today = startOfDay(referenceDate)

  switch (preset) {
    case 'day':
      return { enabled: true, from: today, to: today }
    case 'week': {
      const from = startOfWeek(today)
      const to = clampEndToToday(endOfWeek(today), today)
      return { enabled: true, from, to }
    }
    case 'month': {
      const from = startOfMonth(today)
      const to = clampEndToToday(endOfMonth(today), today)
      return { enabled: true, from, to }
    }
  }
}

export function matchesDateRangePreset(
  range: DateRangeValue,
  preset: DateRangePreset,
  referenceDate: Date = new Date(),
): boolean {
  if (!range.enabled || !range.from || !range.to) return false
  const expected = getDateRangePreset(preset, referenceDate)
  if (!expected.from || !expected.to) return false
  return (
    sameDay(range.from, expected.from) && sameDay(range.to, expected.to)
  )
}

export function formatDateRangeLabel(range: DateRangeValue): string {
  if (!range.enabled || !range.from || !range.to) {
    return 'Период'
  }

  const { from, to } = normalizeDateRange(range.from, range.to)
  const sameMonth =
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth()

  if (sameDay(from, to)) {
    return from.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (sameMonth) {
    const month = from.toLocaleDateString('ru-RU', { month: 'short' })
    return `${from.getDate()}–${to.getDate()} ${month} ${from.getFullYear()}`
  }

  const fromLabel = from.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
  const toLabel = to.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${fromLabel} – ${toLabel}`
}
