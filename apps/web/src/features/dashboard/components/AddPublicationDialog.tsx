import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Eye, Loader2, MessageCircle, Plus, ThumbsUp } from 'lucide-react'
import { MetricTrackingMode, type MetricTrackingMode as MetricTrackingModeType } from '@spt/shared'
import { useLazyGetYouTubeMetricsQuery } from '@/app/api/baseApi'
import { useDashboardShell } from '@/features/dashboard/DashboardShellContext'
import {
  canUseAutomaticTrackingForProviderId,
  getLiveModeLockReason,
} from '@/lib/provider-metric-auth'
import { PROVIDER_UI, getProviderUi } from '@/lib/providers'
import type { PublicationViewStatus } from '@/lib/dashboard-utils'
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

export interface NewPublicationInput {
  providerId: string
  label: string
  channelName: string
  stageId: string
  url: string
  status: PublicationViewStatus
  metricTrackingMode?: MetricTrackingModeType
  metrics?: { views: number; likes: number; comments: number }
}

export interface StageOption {
  topicId: string
  topicName: string
  stageId: string
  stageName: string
}

export function AddPublicationDialog({
  open,
  onOpenChange,
  stageOptions,
  defaultStageKey,
  onSubmit,
  isSubmitting = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stageOptions: StageOption[]
  defaultStageKey?: string
  onSubmit: (topicId: string, input: NewPublicationInput) => void | Promise<void>
  isSubmitting?: boolean
}) {
  const { t } = useTranslation()
  const { oauthConnections } = useDashboardShell()
  const [providerId, setProviderId] = useState('tg')
  const [label, setLabel] = useState('')
  const [stageKey, setStageKey] = useState(defaultStageKey ?? '')
  const [url, setUrl] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [liveTracking, setLiveTracking] = useState(false)
  const [fetchYouTubeMetrics, { isFetching }] = useLazyGetYouTubeMetricsQuery()

  useEffect(() => {
    if (open) {
      const firstKey = stageOptions[0]
        ? `${stageOptions[0].topicId}::${stageOptions[0].stageId}`
        : ''
      setProviderId('tg')
      setLabel('')
      setStageKey(defaultStageKey ?? firstKey)
      setUrl('')
      setFetchError(null)
      setLiveTracking(false)
    }
  }, [open, defaultStageKey, stageOptions])

  const canUseLive = useMemo(
    () => canUseAutomaticTrackingForProviderId(providerId, oauthConnections),
    [providerId, oauthConnections],
  )
  const liveLockReason = useMemo(
    () => getLiveModeLockReason(providerId, oauthConnections),
    [providerId, oauthConnections],
  )

  useEffect(() => {
    if (!canUseLive) {
      setLiveTracking(false)
    }
  }, [canUseLive, providerId])

  const selectedStage = stageOptions.find(
    (s) => `${s.topicId}::${s.stageId}` === stageKey,
  )
  const provider = getProviderUi(providerId)
  const previewLabel =
    label.trim() || PROVIDER_UI.find((p) => p.id === providerId)?.name || 'Новая публикация'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedStage) return

    const trimmedUrl = url.trim()
    const provider = PROVIDER_UI.find((p) => p.id === providerId)
    let metrics: NewPublicationInput['metrics']
    let resolvedLabel = label.trim() || provider?.name || providerId
    let channelName = resolvedLabel
    const metricTrackingMode = liveTracking
      ? MetricTrackingMode.AUTOMATIC
      : MetricTrackingMode.MANUAL

    setFetchError(null)

    if (providerId === 'youtube' && trimmedUrl && liveTracking) {
      try {
        const data = await fetchYouTubeMetrics(trimmedUrl).unwrap()
        metrics = {
          views: data.views,
          likes: data.likes,
          comments: data.comments,
        }
        if (!label.trim() && data.title) {
          resolvedLabel = data.title
        }
        if (data.channelTitle) {
          channelName = data.channelTitle
        }
      } catch {
        setFetchError(
          'Не удалось загрузить статистику YouTube. Отключите Live-режим или проверьте YOUTUBE_API_KEY.',
        )
        return
      }
    }

    try {
      await onSubmit(selectedStage.topicId, {
        providerId,
        label: resolvedLabel,
        channelName,
        stageId: selectedStage.stageId,
        url: trimmedUrl,
        status: trimmedUrl ? 'published' : 'scheduled',
        metricTrackingMode,
        metrics,
      })
      onOpenChange(false)
    } catch {
      setFetchError('Не удалось сохранить публикацию. Попробуйте ещё раз.')
    }
  }

  const busy = isFetching || isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="relative">
        <DialogHeader>
          <DialogTitle>{t('dashboard.addPublication')}</DialogTitle>
          <DialogDescription>
            Привяжите новый пост к этапу контента. Выберите площадку, укажите
            метку и вставьте ссылку.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <select
              id="provider"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {PROVIDER_UI.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <div className="pt-1">
              <ProviderBadge providerId={providerId} size="sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pub-label">Custom label</Label>
            <Input
              id="pub-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="например, VK Юрий"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <select
              id="stage"
              value={stageKey}
              onChange={(e) => setStageKey(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {stageOptions.map((option) => (
                <option
                  key={`${option.topicId}::${option.stageId}`}
                  value={`${option.topicId}::${option.stageId}`}
                >
                  {option.topicName} — {option.stageName}
                </option>
              ))}
            </select>
          </div>

          <div
            className={cn(
              'relative flex flex-col gap-2 rounded-xl border p-3 transition-colors',
              liveTracking
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-border bg-card',
            )}
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <ProviderBadge providerId={providerId} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium leading-tight">
                    {previewLabel}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {provider.name}
                  </p>
                </div>
              </div>
              <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground">
                <Clock className="size-3" />
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="size-3" />0
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="size-3 text-rose-500/80" />0
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="size-3 text-sky-500/80" />0
                </span>
              </div>
              <LiveModeCornerToggle
                checked={liveTracking}
                onCheckedChange={setLiveTracking}
                disabled={busy}
                locked={!canUseLive}
                lockReason={liveLockReason ?? undefined}
              />
            </div>
            {!canUseLive && liveLockReason ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                {liveLockReason}
              </p>
            ) : canUseLive && !liveTracking ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                Включите Live — метрики будут обновляться автоматически по расписанию.
              </p>
            ) : liveTracking ? (
              <p className="text-[11px] leading-snug text-emerald-800/90 dark:text-emerald-200/90">
                Live-режим: статистика подтягивается с площадки по таймеру.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pub-url">Post URL</Label>
            <Input
              id="pub-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              {!liveTracking
                ? 'Ссылка опциональна — метрики зададите в карточке после создания.'
                : providerId === 'youtube'
                  ? 'Для публичного YouTube статистика подтянется по ссылке.'
                  : 'Оставьте пустым, чтобы создать запланированный слот с Live-обновлениями.'}
            </p>
          </div>

          {fetchError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {fetchError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={!selectedStage || busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {busy ? 'Сохраняем…' : t('dashboard.addPublication')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
