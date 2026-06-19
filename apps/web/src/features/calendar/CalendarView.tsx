import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import type { TopicDto } from '@spt/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type CalendarPublication = {
  id: string
  label: string
  provider: string
  topicName: string
  stageName: string
  postUrl: string | null
  status: string
  date: Date
}

function flattenPublications(topics: TopicDto[]): CalendarPublication[] {
  const items: CalendarPublication[] = []

  for (const topic of topics) {
    for (const stage of topic.stages) {
      for (const pub of stage.publications) {
        const dateStr = pub.publishedAt ?? pub.snapshots[0]?.capturedAt
        if (!dateStr) continue
        items.push({
          id: pub.id,
          label: pub.label ?? pub.channelName,
          provider: pub.provider,
          topicName: topic.name,
          stageName: stage.name,
          postUrl: pub.postUrl,
          status: pub.status,
          date: new Date(dateStr),
        })
      }
    }
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTHS = [
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
]

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function PublicationCard({ pub }: { pub: CalendarPublication }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 text-left">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-snug">{pub.label}</p>
        {pub.postUrl ? (
          <a
            href={pub.postUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {pub.topicName} · {pub.stageName}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
          {pub.provider}
        </Badge>
        <Badge
          variant={pub.status === 'PUBLISHED' ? 'default' : 'secondary'}
          className="px-1.5 py-0 text-[10px]"
        >
          {pub.status === 'PUBLISHED' ? 'Опубликовано' : 'Запланировано'}
        </Badge>
      </div>
    </div>
  )
}

export function CalendarView({ topics }: { topics: TopicDto[] }) {
  const publications = useMemo(() => flattenPublications(topics), [topics])
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selected, setSelected] = useState<Date | null>(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = []

    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d))
    }

    return cells
  }, [year, month])

  const pubsByDay = useMemo(() => {
    const map = new Map<string, CalendarPublication[]>()
    for (const pub of publications) {
      const key = `${pub.date.getFullYear()}-${pub.date.getMonth()}-${pub.date.getDate()}`
      const list = map.get(key) ?? []
      list.push(pub)
      map.set(key, list)
    }
    return map
  }, [publications])

  const selectedPubs = useMemo(() => {
    if (!selected) return []
    const key = `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}`
    return pubsByDay.get(key) ?? []
  }, [selected, pubsByDay])

  const today = new Date()

  function prevMonth() {
    setCursor(new Date(year, month - 1, 1))
    setSelected(null)
  }

  function nextMonth() {
    setCursor(new Date(year, month + 1, 1))
    setSelected(null)
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <section className="flex-1 rounded-2xl border border-border bg-card p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex gap-1">
              <Button variant="outline" size="icon-sm" onClick={prevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={nextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="aspect-square" />
              }

              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
              const count = pubsByDay.get(key)?.length ?? 0
              const isToday = sameDay(day, today)
              const isSelected = selected ? sameDay(day, selected) : false

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(day)}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted',
                  )}
                >
                  <span>{day.getDate()}</span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        'mt-0.5 size-1.5 rounded-full',
                        isSelected ? 'bg-primary-foreground' : 'bg-primary',
                      )}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

        <aside className="w-full space-y-4 lg:w-80">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">
              {selected
                ? selected.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Выберите день'}
            </h3>
            {selected ? (
              selectedPubs.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2">
                  {selectedPubs.map((pub) => (
                    <PublicationCard key={pub.id} pub={pub} />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Нет публикаций в этот день
                </p>
              )
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Нажмите на день в календаре, чтобы увидеть публикации
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Все публикации</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {publications.length}{' '}
              {publications.length === 1
                ? 'публикация'
                : publications.length < 5
                  ? 'публикации'
                  : 'публикаций'}
            </p>
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {publications.map((pub) => (
                <li
                  key={pub.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-muted-foreground">
                    {pub.date.toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                  <span className="truncate font-medium">{pub.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}
