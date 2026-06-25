import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Users } from 'lucide-react'
import {
  useDeleteSubscriberSourceMutation,
  useRevokeOAuthConnectionMutation,
} from '@/app/api/baseApi'
import {
  SUBSCRIBABLE_SOURCE_TYPES,
  type LiveSubscriberSource,
  getLiveSubscriberDisplayDelta,
  getSubscribableSourceType,
  providerOf,
} from '@/lib/provider-connections'
import { formatNumber } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/card'
import { ProviderBadge } from './ProviderBadge'
import { AddSubscriberSourceDialog } from './AddSubscriberSourceDialog'
import { SubscriberHistoryModal } from './SubscriberHistoryModal'
import { SubscriberSourceCard } from './SubscriberSourceCard'

type LiveState = Record<string, { count: number; delta: number }>

function randInt([min, max]: [number, number]) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function AddSubscriberButton({
  availableTypes,
  connectingId,
  onConnectOAuth,
  onAddChannel,
  onOpenChange,
  align = 'right',
}: {
  availableTypes: typeof SUBSCRIBABLE_SOURCE_TYPES
  connectingId: string | null
  onConnectOAuth: (id: string) => void
  onAddChannel: (providerId: string) => void
  onOpenChange?: (open: boolean) => void
  align?: 'left' | 'center' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  if (availableTypes.length === 0) return null

  const menuPositionClass =
    align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : align === 'left'
        ? 'left-0'
        : 'right-0'

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 rounded-md px-2 pl-1.5 text-[11px] [&_svg]:size-3"
        disabled={Boolean(connectingId)}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex items-center">
          <span className="flex -space-x-1">
            {SUBSCRIBABLE_SOURCE_TYPES.map((source) => (
              <ProviderBadge
                key={source.id}
                providerId={source.id}
                size="xs"
                className="ring-2 ring-white dark:ring-card"
              />
            ))}
          </span>
          <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="size-2.5" />
          </span>
        </span>
        <span>Добавить</span>
        <ChevronDown
          className={cn(
            'opacity-60 transition-transform',
            open && 'rotate-180',
          )}
        />
      </Button>

      {open ? (
        <div
          className={cn(
            'absolute top-full z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-border bg-white shadow-lg dark:bg-card',
            menuPositionClass,
          )}
        >
          <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Подключить площадку
          </p>
          <ul className="p-1">
            {availableTypes.map((source) => {
              const isConnecting = connectingId === source.id
              return (
                <li key={source.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
                    disabled={Boolean(connectingId)}
                    onClick={() => {
                      setOpen(false)
                      if (source.kind === 'oauth') {
                        onConnectOAuth(source.id)
                      } else {
                        onAddChannel(source.id)
                      }
                    }}
                  >
                    <ProviderBadge providerId={source.id} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {source.addLabel}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {isConnecting ? 'Открываем…' : source.addDescription}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function RemoveSubscriberDialog({
  source,
  deleting,
  onConfirm,
  onOpenChange,
}: {
  source: LiveSubscriberSource | null
  deleting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const provider = source ? providerOf(source.providerId) : null

  return (
    <Dialog
      open={Boolean(source)}
      onOpenChange={(open) => {
        if (!open && !deleting) onOpenChange(false)
      }}
    >
      <DialogContent className="relative">
        <DialogHeader>
          <DialogTitle>Удалить площадку?</DialogTitle>
          <DialogDescription>
            {source && provider ? (
              <>
                {provider.name} · {source.handle} будет убран из блока
                «Подписчики в реальном времени». Это действие нельзя отменить.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? 'Удаляем…' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LiveSubscribers({
  sources,
  connectingId,
  onConnectOAuth,
  onYouTubeChannelAdded,
}: {
  sources: LiveSubscriberSource[]
  connectingId: string | null
  onConnectOAuth: (id: string) => void
  onYouTubeChannelAdded: () => void
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [dialogProviderId, setDialogProviderId] = useState<string | null>(null)
  const [historySource, setHistorySource] = useState<LiveSubscriberSource | null>(
    null,
  )
  const [editMode, setEditMode] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<LiveSubscriberSource | null>(
    null,
  )
  const [live, setLive] = useState<LiveState>({})
  const [deleteSubscriberSource, { isLoading: isDeletingSource }] =
    useDeleteSubscriberSourceMutation()
  const [revokeOAuthConnection, { isLoading: isRevokingOAuth }] =
    useRevokeOAuthConnectionMutation()

  const isRemoving = isDeletingSource || isRevokingOAuth

  const mockSources = useMemo(
    () => sources.filter((source) => !source.sourceId),
    [sources],
  )

  const sourceKeys = useMemo(
    () => sources.map((s) => s.key).join(','),
    [sources],
  )

  useEffect(() => {
    setLive((prev) => {
      const next: LiveState = {}
      for (const source of mockSources) {
        next[source.key] =
          prev[source.key] ?? { count: source.baseSubscribers, delta: 0 }
      }
      return next
    })
  }, [sourceKeys, mockSources])

  useEffect(() => {
    if (mockSources.length === 0) return
    const interval = setInterval(() => {
      setLive((prev) => {
        const next: LiveState = { ...prev }
        for (const source of mockSources) {
          const current = next[source.key]?.count ?? source.baseSubscribers
          const delta = randInt(source.drift)
          next[source.key] = { count: current + delta, delta }
        }
        return next
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [mockSources])

  useEffect(() => {
    if (sources.length === 0) {
      setEditMode(false)
    }
  }, [sources.length])

  const connectedProviderIds = useMemo(
    () => new Set(sources.map((s) => s.providerId)),
    [sources],
  )

  const availableTypes = SUBSCRIBABLE_SOURCE_TYPES.filter((source) => {
    if (source.kind === 'channel-url' || source.kind === 'link-only') return true
    return !connectedProviderIds.has(source.id)
  })

  const totalSubscribers = sources.reduce((sum, source) => {
    if (source.sourceId) {
      return sum + source.baseSubscribers
    }
    return sum + (live[source.key]?.count ?? source.baseSubscribers)
  }, 0)

  const hasSources = sources.length > 0

  async function handleConfirmRemove() {
    if (!pendingRemove) return

    try {
      if (pendingRemove.sourceId) {
        await deleteSubscriberSource(pendingRemove.sourceId).unwrap()
      } else if (pendingRemove.oauthConnectionId) {
        await revokeOAuthConnection(pendingRemove.oauthConnectionId).unwrap()
      } else {
        return
      }
      setPendingRemove(null)
    } catch {
      // Keep the dialog open so the user can retry or cancel.
    }
  }

  return (
    <>
      <section
        className={cn(
          'relative rounded-2xl border border-border bg-white dark:bg-card',
          addMenuOpen && 'z-30',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {hasSources ? (
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
            ) : null}
            <h2 className="text-sm font-semibold tracking-tight">
              Подписчики в реальном времени
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {hasSources ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" />
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatNumber(totalSubscribers)}
                </span>
                <span className="hidden text-xs sm:inline">всего</span>
              </div>
            ) : null}
            {hasSources ? (
              <div className="flex items-center gap-2">
                <AddSubscriberButton
                  availableTypes={availableTypes}
                  connectingId={connectingId}
                  onConnectOAuth={onConnectOAuth}
                  onAddChannel={setDialogProviderId}
                  onOpenChange={setAddMenuOpen}
                />
                <Button
                  type="button"
                  variant={editMode ? 'secondary' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  aria-pressed={editMode}
                  onClick={() => {
                    setEditMode((prev) => !prev)
                    if (editMode) {
                      setHistorySource(null)
                    }
                  }}
                >
                  {editMode ? (
                    <>
                      <Check className="size-4" />
                      <span>Готово</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="size-4" />
                      <span className="hidden sm:inline">Изменить</span>
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {hasSources ? (
          <div className="grid gap-2 p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sources.map((source) => {
              const isTracked = Boolean(source.sourceId)
              const count = isTracked
                ? (source.subscriberCount ?? source.baseSubscribers)
                : (live[source.key]?.count ?? source.baseSubscribers)
              const delta = isTracked
                ? getLiveSubscriberDisplayDelta(source)
                : (live[source.key]?.delta ?? 0)

              return (
                <SubscriberSourceCard
                  key={source.key}
                  source={source}
                  count={count}
                  delta={delta}
                  editMode={editMode}
                  isRemoving={isRemoving}
                  onRemove={() => setPendingRemove(source)}
                  onOpenHistory={
                    isTracked ? () => setHistorySource(source) : undefined
                  }
                />
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              Подключите группу VK, канал YouTube, Telegram или аккаунт
              Instagram — укажите ссылку и при необходимости стартовое число
              подписчиков.
            </p>
            <AddSubscriberButton
              availableTypes={availableTypes}
              connectingId={connectingId}
              onConnectOAuth={onConnectOAuth}
              onAddChannel={setDialogProviderId}
              onOpenChange={setAddMenuOpen}
              align="center"
            />
          </div>
        )}
      </section>

      <AddSubscriberSourceDialog
        open={Boolean(
          dialogProviderId &&
            getSubscribableSourceType(dialogProviderId)?.kind !== 'oauth',
        )}
        providerId={dialogProviderId ?? 'youtube'}
        onOpenChange={(open) => {
          if (!open) setDialogProviderId(null)
        }}
        onAdded={onYouTubeChannelAdded}
      />

      <SubscriberHistoryModal
        open={Boolean(historySource)}
        onOpenChange={(open) => {
          if (!open) setHistorySource(null)
        }}
        sourceId={historySource?.sourceId ?? null}
        providerId={historySource?.providerId ?? 'youtube'}
        handle={historySource?.handle ?? ''}
      />

      <RemoveSubscriberDialog
        source={pendingRemove}
        deleting={isRemoving}
        onConfirm={() => void handleConfirmRemove()}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
      />
    </>
  )
}
