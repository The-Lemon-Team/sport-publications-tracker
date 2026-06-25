import { useState } from 'react'
import { Bot, CheckCircle2, Loader2 } from 'lucide-react'
import {
  TelegramBotConnectionStatus,
  type TelegramBotConnectionDto,
  type VerifyTelegramChannelResult,
} from '@spt/shared'
import {
  useConnectTelegramBotMutation,
  useVerifyTelegramChannelMutation,
} from '@/app/api/baseApi'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string | string[] } }).data
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return fallback
}

export function TelegramChannelConnectSection({
  botConnection,
  channelInput,
  channelParsed,
  verified,
  onVerified,
  onBotConnected,
  disabled,
}: {
  botConnection: TelegramBotConnectionDto | null
  channelInput: string
  channelParsed: boolean
  verified: VerifyTelegramChannelResult | null
  onVerified: (result: VerifyTelegramChannelResult | null) => void
  onBotConnected: () => void
  disabled?: boolean
}) {
  const [botTokenDraft, setBotTokenDraft] = useState('')
  const [botError, setBotError] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const [connectBot, { isLoading: isConnectingBot }] =
    useConnectTelegramBotMutation()
  const [verifyChannel, { isLoading: isVerifying }] =
    useVerifyTelegramChannelMutation()

  const botActive =
    botConnection?.status === TelegramBotConnectionStatus.ACTIVE

  async function handleConnectBot() {
    setBotError(null)
    const token = botTokenDraft.trim()
    if (!token) {
      setBotError('Вставьте токен бота от @BotFather')
      return
    }

    try {
      await connectBot({ token }).unwrap()
      setBotTokenDraft('')
      onBotConnected()
    } catch (error) {
      setBotError(
        getApiErrorMessage(error, 'Не удалось подключить бота. Проверьте токен.'),
      )
    }
  }

  async function handleVerifyChannel() {
    setVerifyError(null)
    onVerified(null)

    const input = channelInput.trim()
    if (!input) {
      setVerifyError('Сначала укажите ссылку на канал')
      return
    }

    try {
      const result = await verifyChannel({ input }).unwrap()
      onVerified(result)
    } catch (error) {
      setVerifyError(
        getApiErrorMessage(
          error,
          'Не удалось проверить канал. Убедитесь, что бот добавлен администратором.',
        ),
      )
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <p className="text-sm font-medium">Telegram-бот</p>
        </div>

        {botActive ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-2 text-xs text-emerald-900 dark:text-emerald-100">
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span>
              Бот{' '}
              <span className="font-medium">
                @{botConnection.botUsername ?? botConnection.botId}
              </span>{' '}
              подключён
            </span>
          </div>
        ) : (
          <>
            <Label htmlFor="telegram-bot-token" className="text-xs">
              Токен от @BotFather
            </Label>
            <Input
              id="telegram-bot-token"
              type="password"
              autoComplete="off"
              value={botTokenDraft}
              onChange={(e) => setBotTokenDraft(e.target.value)}
              placeholder="123456789:AAH…"
              disabled={disabled || isConnectingBot}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Создайте бота в @BotFather и вставьте выданный токен. Он хранится
              зашифрованно и нужен для Live-подписчиков.
            </p>
            {botError ? (
              <p className="text-xs text-destructive">{botError}</p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || isConnectingBot || !botTokenDraft.trim()}
              onClick={handleConnectBot}
            >
              {isConnectingBot ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Проверяем…
                </>
              ) : (
                'Подключить бота'
              )}
            </Button>
          </>
        )}
      </div>

      {botActive ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs text-muted-foreground">
            Добавьте бота{' '}
            <span className="font-medium text-foreground">
              @{botConnection?.botUsername ?? '…'}
            </span>{' '}
            администратором канала, затем нажмите «Проверить канал».
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              disabled || isVerifying || !channelParsed || !channelInput.trim()
            }
            onClick={handleVerifyChannel}
          >
            {isVerifying ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Проверяем…
              </>
            ) : (
              'Проверить канал'
            )}
          </Button>
          {verified ? (
            <div
              className={cn(
                'flex items-center gap-2 rounded-md border border-emerald-500/30',
                'bg-emerald-500/5 px-2.5 py-2 text-xs text-emerald-900 dark:text-emerald-100',
              )}
            >
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span>
                {verified.title ?? verified.handle}:{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {verified.subscriberCount.toLocaleString('ru-RU')}
                </span>{' '}
                подписчиков
              </span>
            </div>
          ) : null}
          {verifyError ? (
            <p className="text-xs text-destructive">{verifyError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { getApiErrorMessage }
