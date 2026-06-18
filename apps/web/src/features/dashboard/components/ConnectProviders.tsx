import { Check, PlugZap, ShieldCheck } from 'lucide-react'
import { CONNECTABLE_PROVIDERS, providerOf } from '@/lib/provider-connections'
import { formatNumber } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProviderBadge } from './ProviderBadge'

export function ConnectProviders({
  connected,
  onConnect,
  onConnectAll,
}: {
  connected: string[]
  onConnect: (id: string) => void
  onConnectAll: () => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 md:px-6">
      <div className="flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <PlugZap className="size-7" />
        </span>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Подключите соцсети, чтобы видеть статистику
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Пока не подключена ни одна площадка. Авторизуйтесь в VK, YouTube и
            Instagram — и мы начнём собирать метрики публикаций и считать
            подписчиков в реальном времени.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3">
          {CONNECTABLE_PROVIDERS.map((cp) => {
            const provider = providerOf(cp.id)
            const isConnected = connected.includes(cp.id)
            return (
              <div
                key={cp.id}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center transition-colors',
                  isConnected ? 'border-primary/40' : 'border-border',
                )}
              >
                <ProviderBadge providerId={cp.id} />
                <div className="leading-tight">
                  <p className="text-sm font-medium">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{cp.handle}</p>
                </div>
                <Button
                  size="sm"
                  variant={isConnected ? 'secondary' : 'outline'}
                  className="w-full"
                  disabled={isConnected}
                  onClick={() => onConnect(cp.id)}
                >
                  {isConnected ? (
                    <>
                      <Check className="size-4" />
                      Подключено
                    </>
                  ) : (
                    'Авторизоваться'
                  )}
                </Button>
                {isConnected ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatNumber(cp.baseSubscribers)} подписчиков
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button size="lg" onClick={onConnectAll}>
            <PlugZap className="size-4" />
            Подключить все площадки
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Доступ только на чтение статистики. Отозвать можно в любой момент.
          </p>
        </div>
      </div>
    </div>
  )
}
