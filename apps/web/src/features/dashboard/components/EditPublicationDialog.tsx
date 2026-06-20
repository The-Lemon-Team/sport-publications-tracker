import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { MetricTrackingMode } from '@spt/shared'
import {
  useDeletePublicationMutation,
  useUpdatePublicationMutation,
} from '@/app/api/baseApi'
import { useDashboardShell } from '@/features/dashboard/DashboardShellContext'
import {
  canUseAutomaticTrackingForProviderId,
  getLiveModeLockReason,
} from '@/lib/provider-metric-auth'
import { isLiveMetricTracking } from '@/lib/metric-tracking'
import { getProviderUi } from '@/lib/providers'
import type { PublicationView } from '@/lib/dashboard-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/card'
import { LiveModeCornerToggle } from './LiveModeCornerToggle'
import { ProviderBadge } from './ProviderBadge'

function DeletePublicationConfirmDialog({
  open,
  publication,
  deleting,
  onConfirm,
  onOpenChange,
}: {
  open: boolean
  publication: PublicationView
  deleting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const provider = getProviderUi(publication.providerId)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !deleting) onOpenChange(false)
      }}
    >
      <DialogContent className="relative">
        <DialogHeader>
          <DialogTitle>Удалить публикацию?</DialogTitle>
          <DialogDescription>
            {provider.name} · {publication.label} будет удалена вместе с историей
            метрик. Это действие нельзя отменить.
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

export function EditPublicationDialog({
  open,
  onOpenChange,
  publication,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  publication: PublicationView
}) {
  const { oauthConnections } = useDashboardShell()
  const [label, setLabel] = useState(publication.label)
  const [url, setUrl] = useState(publication.url)
  const [liveTracking, setLiveTracking] = useState(
    isLiveMetricTracking(publication.metricTrackingMode),
  )
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [updatePublication, { isLoading }] = useUpdatePublicationMutation()
  const [deletePublication, { isLoading: isDeleting }] =
    useDeletePublicationMutation()

  const provider = getProviderUi(publication.providerId)

  useEffect(() => {
    if (!open) return
    setLabel(publication.label)
    setUrl(publication.url)
    setLiveTracking(isLiveMetricTracking(publication.metricTrackingMode))
    setError(null)
    setConfirmDeleteOpen(false)
  }, [open, publication])

  const canUseLive = useMemo(
    () =>
      canUseAutomaticTrackingForProviderId(
        publication.providerId,
        oauthConnections,
      ),
    [publication.providerId, oauthConnections],
  )
  const liveLockReason = useMemo(
    () => getLiveModeLockReason(publication.providerId, oauthConnections),
    [publication.providerId, oauthConnections],
  )

  useEffect(() => {
    if (!canUseLive) {
      setLiveTracking(false)
    }
  }, [canUseLive, open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedUrl = url.trim()
    const nextMode = liveTracking
      ? MetricTrackingMode.AUTOMATIC
      : MetricTrackingMode.MANUAL
    const modeChanged =
      nextMode !== publication.metricTrackingMode

    try {
      await updatePublication({
        publicationId: publication.id,
        label: label.trim(),
        postUrl: trimmedUrl || null,
        metricTrackingMode: modeChanged ? nextMode : undefined,
      }).unwrap()
      onOpenChange(false)
    } catch {
      setError('Не удалось сохранить изменения. Попробуйте ещё раз.')
    }
  }

  async function handleConfirmDelete() {
    try {
      await deletePublication(publication.id).unwrap()
      setConfirmDeleteOpen(false)
      onOpenChange(false)
    } catch {
      // Keep the dialog open so the user can retry or cancel.
    }
  }

  const modeChanged =
    (liveTracking ? MetricTrackingMode.AUTOMATIC : MetricTrackingMode.MANUAL) !==
    publication.metricTrackingMode
  const isBusy = isLoading || isDeleting

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isBusy) onOpenChange(false)
        }}
      >
        <DialogContent onClose={() => onOpenChange(false)} className="relative">
          <DialogHeader>
            <DialogTitle>Редактирование публикации</DialogTitle>
            <DialogDescription>
              Измените метку, ссылку или режим учёта метрик. Площадку изменить
              нельзя.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Площадка</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 opacity-80">
                <ProviderBadge providerId={publication.providerId} size="sm" />
                <span className="text-sm text-muted-foreground">{provider.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-pub-label">Custom label</Label>
              <Input
                id="edit-pub-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="например, VK Юрий"
                disabled={isBusy}
              />
            </div>

            <div
              className={cn(
                'flex flex-col gap-2 rounded-xl border p-3 transition-colors',
                liveTracking
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border bg-card',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">Режим учёта</Label>
                <LiveModeCornerToggle
                  checked={liveTracking}
                  onCheckedChange={setLiveTracking}
                  disabled={isBusy}
                  locked={!canUseLive}
                  lockReason={liveLockReason ?? undefined}
                />
              </div>
              {!canUseLive && liveLockReason ? (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {liveLockReason}
                </p>
              ) : modeChanged && liveTracking ? (
                <p className="text-[11px] leading-snug text-emerald-800/90 dark:text-emerald-200/90">
                  При включении Live в истории появится запись «Авто» — дальнейшие
                  обновления тоже будут отмечены как auto.
                </p>
              ) : modeChanged && !liveTracking ? (
                <p className="text-[11px] leading-snug text-amber-800/90 dark:text-amber-200/90">
                  При переходе на ручной учёт в истории появится запись «Вручную» с
                  текущими значениями.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-pub-url">Post URL</Label>
              <Input
                id="edit-pub-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                disabled={isBusy}
              />
              <p className="text-xs text-muted-foreground">
                {!liveTracking
                  ? 'Ссылка опциональна — метрики вводите в карточке.'
                  : publication.providerId === 'youtube'
                    ? 'Для YouTube при включении Live статистика подтянется по ссылке.'
                    : 'Ссылка нужна для автоматического обновления метрик.'}
              </p>
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isBusy}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Удалить
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isBusy}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={isBusy}>
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isLoading ? 'Сохраняем…' : 'Сохранить'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeletePublicationConfirmDialog
        open={confirmDeleteOpen}
        publication={publication}
        deleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onOpenChange={setConfirmDeleteOpen}
      />
    </>
  )
}
