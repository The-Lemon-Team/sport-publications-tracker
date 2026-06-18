import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Users } from 'lucide-react'
import { CONNECTABLE_PROVIDERS, providerOf } from '@/lib/provider-connections'
import { formatNumber } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProviderBadge } from './ProviderBadge'

type LiveState = Record<string, { count: number; delta: number }>

function randInt([min, max]: [number, number]) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function LiveSubscribers({
  connected,
  onConnect,
}: {
  connected: string[]
  onConnect: (id: string) => void
}) {
  const connectedSet = useMemo(
    () => CONNECTABLE_PROVIDERS.filter((p) => connected.includes(p.id)),
    [connected],
  )
  const pending = CONNECTABLE_PROVIDERS.filter(
    (p) => !connected.includes(p.id),
  )

  const [live, setLive] = useState<LiveState>({})

  useEffect(() => {
    setLive((prev) => {
      const next: LiveState = {}
      for (const cp of connectedSet) {
        next[cp.id] = prev[cp.id] ?? { count: cp.baseSubscribers, delta: 0 }
      }
      return next
    })
  }, [connectedSet])

  useEffect(() => {
    if (connectedSet.length === 0) return
    const interval = setInterval(() => {
      setLive((prev) => {
        const next: LiveState = { ...prev }
        for (const cp of connectedSet) {
          const current = next[cp.id]?.count ?? cp.baseSubscribers
          const delta = randInt(cp.drift)
          next[cp.id] = { count: current + delta, delta }
        }
        return next
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [connectedSet])

  if (connectedSet.length === 0) return null

  const totalSubscribers = connectedSet.reduce(
    (sum, cp) => sum + (live[cp.id]?.count ?? cp.baseSubscribers),
    0,
  )

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <h2 className="text-sm font-semibold tracking-tight">
            Подписчики в реальном времени
          </h2>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-4" />
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatNumber(totalSubscribers)}
          </span>
          <span className="hidden text-xs sm:inline">всего</span>
        </div>
      </div>

      <div className="grid gap-px overflow-hidden bg-border sm:grid-cols-3">
        {connectedSet.map((cp) => {
          const provider = providerOf(cp.id)
          const state = live[cp.id]
          const count = state?.count ?? cp.baseSubscribers
          const delta = state?.delta ?? 0
          const positive = delta >= 0
          return (
            <div
              key={cp.id}
              className="flex items-center gap-3 bg-card px-4 py-3.5"
            >
              <ProviderBadge providerId={cp.id} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-xs text-muted-foreground">
                  {provider.name}
                </p>
                <p className="font-mono text-lg font-semibold tabular-nums tracking-tight">
                  {formatNumber(count)}
                </p>
              </div>
              <span
                className={cn(
                  'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums',
                  positive
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive',
                )}
              >
                {positive ? (
                  <ArrowUp className="size-3" />
                ) : (
                  <ArrowDown className="size-3" />
                )}
                {positive ? '+' : ''}
                {delta}
              </span>
            </div>
          )
        })}

        {pending.map((cp) => {
          const provider = providerOf(cp.id)
          return (
            <div
              key={cp.id}
              className="flex items-center gap-3 bg-card px-4 py-3.5"
            >
              <ProviderBadge providerId={cp.id} className="opacity-40" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-xs text-muted-foreground">
                  {provider.name}
                </p>
                <p className="text-sm text-muted-foreground">Не подключено</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onConnect(cp.id)}>
                <Plus className="size-4" />
                Подключить
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
