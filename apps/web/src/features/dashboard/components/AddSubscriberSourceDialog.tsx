import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { Plus, Users } from 'lucide-react'

import {

  SubscriberTrackingMode,

  type SubscriberTrackingMode as SubscriberTrackingModeType,

  type VerifyTelegramChannelResult,

} from '@spt/shared'

import { useCreateSubscriberSourceMutation } from '@/app/api/baseApi'

import { useDashboardShell } from '@/features/dashboard/DashboardShellContext'

import {

  getSubscribableSourceType,

  parseInstagramInput,

  parseTelegramChannelInput,

  parseVkGroupInput,

  parseYouTubeChannelInput,

  providerOf,

} from '@/lib/provider-connections'

import {

  canUseLiveSubscriberTrackingForProviderId,

  getSubscriberLiveModeLockReason,

} from '@/lib/provider-subscriber-auth'

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

import { PublicationTrackingBadge } from './PublicationTrackingBadge'

import {

  getApiErrorMessage,

  TelegramChannelConnectSection,

} from './TelegramChannelConnectSection'



const CHANNEL_COPY: Record<

  string,

  {

    label: string

    placeholder: string

    hint: string

    notFoundError: string

    submitLabel: string

    emptyError: string

  }

> = {

  youtube: {

    label: 'Канал YouTube',

    placeholder: 'https://youtube.com/@studio-s10',

    hint: 'Поддерживаются ссылки вида youtube.com/@handle, /channel/… и /c/…',

    notFoundError:

      'Канал не найден или YouTube API недоступен. Проверьте ссылку.',

    submitLabel: 'Добавить канал',

    emptyError: 'Укажите ссылку на канал или @handle',

  },

  vk: {

    label: 'Группа VK',

    placeholder: 'https://vk.com/studio.s10',

    hint: 'Поддерживаются vk.com/screen_name, vk.com/club123 и vk.com/public123',

    notFoundError: 'Не удалось добавить группу. Проверьте ссылку.',

    submitLabel: 'Добавить группу',

    emptyError: 'Укажите ссылку на группу VK',

  },

  tg: {

    label: 'Канал Telegram',

    placeholder: 'https://t.me/studio_s10',

    hint: 'Поддерживаются t.me/handle и @handle. Для Live сначала подключите бота.',

    notFoundError: 'Не удалось добавить канал. Проверьте ссылку и права бота.',

    submitLabel: 'Добавить канал',

    emptyError: 'Укажите ссылку t.me/… или @handle',

  },

  instagram: {

    label: 'Профиль Instagram',

    placeholder: 'https://instagram.com/studio.s10',

    hint: 'Поддерживаются instagram.com/username и @handle',

    notFoundError: 'Не удалось добавить. Проверьте ссылку или @handle.',

    submitLabel: 'Добавить аккаунт',

    emptyError: 'Укажите ссылку instagram.com/… или @handle',

  },

}



function parseInput(providerId: string, url: string) {

  if (providerId === 'vk') return parseVkGroupInput(url)

  if (providerId === 'tg') return parseTelegramChannelInput(url)

  if (providerId === 'instagram') return parseInstagramInput(url)

  return parseYouTubeChannelInput(url)

}



function parseInitialCountDraft(draft: string): number | null {

  const trimmed = draft.trim()

  if (!trimmed) return null

  const parsed = Number.parseInt(trimmed, 10)

  if (!Number.isFinite(parsed) || parsed < 0) return null

  return parsed

}



export function AddSubscriberSourceDialog({

  open,

  providerId,

  onOpenChange,

  onAdded,

}: {

  open: boolean

  providerId: string

  onOpenChange: (open: boolean) => void

  onAdded: () => void

}) {

  const { oauthConnections, telegramBotConnection, refetchTelegramBot } =

    useDashboardShell()

  const [url, setUrl] = useState('')

  const [initialCountDraft, setInitialCountDraft] = useState('')

  const [error, setError] = useState<string | null>(null)

  const [liveTracking, setLiveTracking] = useState(false)

  const [channelVerified, setChannelVerified] =

    useState<VerifyTelegramChannelResult | null>(null)

  const [createSource, { isLoading }] = useCreateSubscriberSourceMutation()



  const isTelegram = providerId === 'tg'

  const sourceType = getSubscribableSourceType(providerId)

  const provider = providerOf(providerId)

  const isLinkOnly = sourceType?.kind === 'link-only'

  const showLiveToggle = sourceType?.kind === 'channel-url'

  const showInitialCount = isLinkOnly || !liveTracking

  const copy =

    CHANNEL_COPY[providerId] ?? {

      label: provider.name,

      placeholder: '',

      hint: '',

      notFoundError: 'Источник не найден. Проверьте ссылку.',

      submitLabel: 'Добавить',

      emptyError: 'Укажите ссылку',

    }



  const canUseLive = useMemo(

    () =>

      canUseLiveSubscriberTrackingForProviderId(

        providerId,

        oauthConnections,

        telegramBotConnection,

      ),

    [providerId, oauthConnections, telegramBotConnection],

  )

  const liveLockReason = useMemo(

    () =>

      getSubscriberLiveModeLockReason(

        providerId,

        oauthConnections,

        telegramBotConnection,

      ),

    [providerId, oauthConnections, telegramBotConnection],

  )



  const parsed = useMemo(() => {

    const trimmed = url.trim()

    if (!trimmed) return null

    return parseInput(providerId, trimmed)

  }, [providerId, url])



  const previewHandle = parsed?.handle ?? copy.placeholder

  const previewCount =

    isTelegram && liveTracking && channelVerified

      ? channelVerified.subscriberCount

      : null

  const liveRequiredForProvider =
    showLiveToggle && canUseLive && providerId === 'youtube'

  const tgLiveBlocked =

    isTelegram && liveTracking && (!channelVerified || !canUseLive)

  const submitDisabled =

    !url.trim() ||

    isLoading ||

    (liveRequiredForProvider && !liveTracking) ||

    tgLiveBlocked



  useEffect(() => {

    if (open) {

      setUrl('')

      setInitialCountDraft('')

      setError(null)

      setChannelVerified(null)

      setLiveTracking(

        canUseLiveSubscriberTrackingForProviderId(

          providerId,

          oauthConnections,

          telegramBotConnection,

        ) && providerId !== 'tg',

      )

    }

  }, [open, providerId, oauthConnections, telegramBotConnection])



  useEffect(() => {

    if (!canUseLive) {

      setLiveTracking(false)

    }

  }, [canUseLive, providerId])



  useEffect(() => {

    setChannelVerified(null)

  }, [url])



  useEffect(() => {

    if (isTelegram && channelVerified && canUseLive) {

      setLiveTracking(true)

    }

  }, [isTelegram, channelVerified, canUseLive])



  async function handleSubmit(e: FormEvent) {

    e.preventDefault()

    setError(null)



    if (!parsed) {

      setError(copy.emptyError)

      return

    }



    if (isTelegram && liveTracking && !channelVerified) {

      setError('Сначала проверьте канал — бот должен быть администратором.')

      return

    }



    const trackingMode: SubscriberTrackingModeType = liveTracking

      ? SubscriberTrackingMode.AUTOMATIC

      : SubscriberTrackingMode.MANUAL



    try {

      await createSource({

        input: url.trim(),

        providerId,

        trackingMode,

        initialSubscriberCount: showInitialCount

          ? parseInitialCountDraft(initialCountDraft)

          : null,

      }).unwrap()

      onAdded()

      onOpenChange(false)

    } catch (err) {

      setError(getApiErrorMessage(err, copy.notFoundError))

    }

  }



  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent onClose={() => onOpenChange(false)} className="relative">

        <DialogHeader>

          <div className="flex items-center gap-2">

            <ProviderBadge providerId={providerId} size="sm" />

            <DialogTitle>

              Добавить {sourceType?.addLabel ?? provider.name}

            </DialogTitle>

          </div>

          <DialogDescription>

            {isTelegram

              ? 'Подключите бота, добавьте его админом в канал и проверьте доступ перед Live-режимом.'

              : isLinkOnly

                ? 'Вставьте ссылку — канал появится в списке. Стартовое число подписчиков можно указать прямо в карточке.'

                : 'Укажите ссылку и проверьте карточку ниже. Live-режим можно включить, когда площадка поддерживается.'}

          </DialogDescription>

        </DialogHeader>



        <form onSubmit={handleSubmit} className="mt-4 space-y-4">

          {isTelegram ? (

            <TelegramChannelConnectSection

              botConnection={telegramBotConnection}

              channelInput={url}

              channelParsed={Boolean(parsed)}

              verified={channelVerified}

              onVerified={setChannelVerified}

              onBotConnected={() => void refetchTelegramBot()}

              disabled={isLoading}

            />

          ) : null}



          <div className="space-y-2">

            <Label htmlFor="channel-url">{copy.label}</Label>

            <Input

              id="channel-url"

              value={url}

              onChange={(e) => setUrl(e.target.value)}

              placeholder={copy.placeholder}

              autoFocus={!isTelegram}

              disabled={isLoading}

            />

            <p className="text-xs text-muted-foreground">{copy.hint}</p>

          </div>



          <div

            className={cn(

              'relative flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors',

              liveTracking

                ? 'border-emerald-500/30 bg-emerald-500/5'

                : 'border-amber-500/25 bg-card',

            )}

          >

            <ProviderBadge providerId={providerId} size="sm" />



            <div className="min-w-0 flex-1 leading-tight">

              <div className="flex items-center gap-1">

                <p className="truncate text-[10px] text-muted-foreground">

                  {provider.name}

                </p>

                <PublicationTrackingBadge

                  mode={liveTracking ? 'live' : 'manual'}

                />

              </div>

              <p

                className={cn(

                  'truncate text-[10px]',

                  parsed

                    ? 'text-foreground'

                    : 'text-muted-foreground/80',

                )}

              >

                {previewHandle}

              </p>

              {showInitialCount ? (

                <div className="mt-0.5 inline-flex items-center gap-1">

                  <Users className="size-3 shrink-0 text-primary/70" />

                  <input

                    type="number"

                    min={0}

                    inputMode="numeric"

                    value={initialCountDraft}

                    onChange={(e) => setInitialCountDraft(e.target.value)}

                    placeholder="—"

                    disabled={isLoading}

                    className={cn(

                      'h-5 w-14 border-0 border-b border-border/70 bg-transparent px-0.5 text-center',

                      'text-[11px] font-mono font-semibold tabular-nums text-foreground',

                      'transition-colors placeholder:text-muted-foreground/50',

                      'focus:border-primary focus:outline-none',

                      'disabled:cursor-not-allowed disabled:opacity-60',

                      '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',

                    )}

                    aria-label="Стартовое количество подписчиков"

                  />

                </div>

              ) : (

                <div className="mt-0.5 inline-flex items-center gap-1 text-muted-foreground">

                  <Users className="size-3 shrink-0 text-primary/70" />

                  <span className="font-mono text-[11px] font-semibold tabular-nums">

                    {previewCount === null ? '—' : previewCount.toLocaleString('ru-RU')}

                  </span>

                </div>

              )}

            </div>



            {showLiveToggle ? (

              <LiveModeCornerToggle

                checked={liveTracking}

                onCheckedChange={setLiveTracking}

                disabled={isLoading || (isTelegram && !channelVerified && canUseLive)}

                locked={!canUseLive}

                lockReason={liveLockReason ?? undefined}

              />

            ) : null}

          </div>



          {showInitialCount ? (

            <p className="text-[11px] leading-snug text-muted-foreground">

              Укажите текущее число подписчиков — позже его можно изменить в

              карточке на дашборде.

            </p>

          ) : null}



          {isTelegram && canUseLive && !channelVerified ? (

            <p className="text-[11px] leading-snug text-muted-foreground">

              Live включится после успешной проверки канала.

            </p>

          ) : null}



          {showLiveToggle && !canUseLive && liveLockReason ? (

            <p className="text-[11px] leading-snug text-muted-foreground">

              {liveLockReason}

            </p>

          ) : showLiveToggle && canUseLive && !liveTracking && !isTelegram ? (

            <p className="text-[11px] leading-snug text-muted-foreground">

              Включите Live — подписчики будут обновляться автоматически.

            </p>

          ) : showLiveToggle && liveTracking ? (

            <p className="text-[11px] leading-snug text-emerald-800/90 dark:text-emerald-200/90">

              Live-режим: счётчик подтягивается с площадки.

            </p>

          ) : null}



          {error ? (

            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">

              {error}

            </p>

          ) : null}



          <DialogFooter>

            <Button

              type="button"

              variant="outline"

              onClick={() => onOpenChange(false)}

              disabled={isLoading}

            >

              Отмена

            </Button>

            <Button type="submit" disabled={submitDisabled}>

              <Plus className="size-4" />

              {isLoading ? 'Сохраняем…' : copy.submitLabel}

            </Button>

          </DialogFooter>

        </form>

      </DialogContent>

    </Dialog>

  )

}


