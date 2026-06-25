import { TelegramNetworkError, httpGetText } from './telegram.http'

const DEFAULT_TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

export interface TelegramApiResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

export interface TelegramApiCallOptions {
  apiBase?: string | null
  proxyUrl?: string | null
}

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
}

export interface TelegramChat {
  id: number
  type: string
  title?: string
  username?: string
}

export interface TelegramChatMember {
  status:
    | 'creator'
    | 'administrator'
    | 'member'
    | 'restricted'
    | 'left'
    | 'kicked'
}

export class TelegramApiError extends Error {
  constructor(
    message: string,
    readonly errorCode?: number,
    readonly unauthorized = false,
  ) {
    super(message)
    this.name = 'TelegramApiError'
  }
}

function resolveApiBase(apiBase?: string | null): string {
  const trimmed = apiBase?.trim()
  if (!trimmed) return DEFAULT_TELEGRAM_API_BASE
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

export async function callTelegramBotApi<T>(
  token: string,
  method: string,
  params?: Record<string, string | number>,
  options?: TelegramApiCallOptions,
): Promise<T> {
  const apiBase = resolveApiBase(options?.apiBase)
  const url = new URL(`${apiBase}${token}/${method}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value))
    }
  }

  let body: string
  try {
    body = await httpGetText(url, options?.proxyUrl)
  } catch (error) {
    if (error instanceof TelegramNetworkError) {
      throw error
    }
    throw new TelegramNetworkError('Unable to reach Telegram API', error)
  }

  let data: TelegramApiResponse<T>
  try {
    data = JSON.parse(body) as TelegramApiResponse<T>
  } catch {
    throw new TelegramNetworkError('Telegram API returned invalid JSON')
  }

  if (!data.ok) {
    const description = data.description ?? 'Telegram API request failed'
    const unauthorized =
      data.error_code === 401 || description.includes('Unauthorized')
    throw new TelegramApiError(description, data.error_code, unauthorized)
  }

  if (data.result === undefined) {
    throw new TelegramApiError('Telegram API returned empty result')
  }

  return data.result
}

export function isTelegramBotAdmin(member: TelegramChatMember): boolean {
  return member.status === 'creator' || member.status === 'administrator'
}

export const TELEGRAM_BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/

export { TelegramNetworkError } from './telegram.http'
