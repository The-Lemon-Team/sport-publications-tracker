import { getProviderUi } from './providers'
import type { SubscriberSnapshotDto } from '@spt/shared'

export interface ConnectableProvider {
  id: string
  baseSubscribers: number
  drift: [number, number]
  handle: string
}

export type SubscriberConnectionKind = 'oauth' | 'channel-url'

export interface SubscribableSourceType {
  id: string
  kind: SubscriberConnectionKind
  /** API OAuth route when it differs from `id` (e.g. instagram → facebook). */
  oauthRouteId?: string
  baseSubscribers: number
  drift: [number, number]
  defaultHandle: string
  addLabel: string
  addDescription: string
}

/** Sources available in the live subscribers block. */
export const SUBSCRIBABLE_SOURCE_TYPES: SubscribableSourceType[] = [
  {
    id: 'vk',
    kind: 'channel-url',
    baseSubscribers: 124300,
    drift: [-2, 9],
    defaultHandle: 'vk.com/studio.s10',
    addLabel: 'Группа VK',
    addDescription: 'Ссылка на группу vk.com/…',
  },
  {
    id: 'youtube',
    kind: 'channel-url',
    baseSubscribers: 89200,
    drift: [0, 14],
    defaultHandle: '@studio-s10',
    addLabel: 'Канал YouTube',
    addDescription: 'Ссылка или @handle канала',
  },
  {
    id: 'instagram',
    kind: 'oauth',
    oauthRouteId: 'facebook',
    baseSubscribers: 215800,
    drift: [-4, 18],
    defaultHandle: '@studio.s10',
    addLabel: 'Аккаунт Instagram',
    addDescription: 'Авторизация через Meta',
  },
]

/** Providers that require user OAuth for live subscriber counts. */
export const OAUTH_CONNECTABLE_PROVIDERS: ConnectableProvider[] =
  SUBSCRIBABLE_SOURCE_TYPES.filter((s) => s.kind === 'oauth').map((s) => ({
    id: s.id,
    baseSubscribers: s.baseSubscribers,
    drift: s.drift,
    handle: s.defaultHandle,
  }))

/** @deprecated Use OAUTH_CONNECTABLE_PROVIDERS */
export const CONNECTABLE_PROVIDERS = OAUTH_CONNECTABLE_PROVIDERS

export interface LiveSubscriberSource {
  key: string
  sourceId?: string
  /** OAuth connection id for VK / Instagram cards (revoke via API). */
  oauthConnectionId?: string
  providerId: string
  handle: string
  baseSubscribers: number
  drift: [number, number]
  /** When set, subscriber count is synced via the subscribers API. */
  pollInput?: string
  channelId?: string
  sessionDelta?: number
  lastChangedAt?: string | null
  lastChange?: SubscriberSnapshotDto | null
}

export interface StoredYouTubeChannel {
  key: string
  handle: string
  channelId: string
  pollInput: string
  subscriberCount: number
}

export const YOUTUBE_CHANNELS_STORAGE_KEY = 'spt:youtube-channels'

export function getConnectable(id: string): ConnectableProvider | undefined {
  return OAUTH_CONNECTABLE_PROVIDERS.find((p) => p.id === id)
}

export function getSubscribableSourceType(
  id: string,
): SubscribableSourceType | undefined {
  return SUBSCRIBABLE_SOURCE_TYPES.find((s) => s.id === id)
}

export function getOAuthApiRouteId(providerId: string): string {
  const source = getSubscribableSourceType(providerId)
  return source?.oauthRouteId ?? providerId
}

import { OAuthProvider } from '@spt/shared'

export function getOAuthConnectionProviderId(
  apiProvider: OAuthProvider,
): string {
  if (apiProvider === OAuthProvider.FACEBOOK) return 'instagram'
  if (apiProvider === OAuthProvider.VK) return 'vk'
  return apiProvider
}

export function providerOf(id: string) {
  return getProviderUi(id)
}

export function parseYouTubeChannelInput(
  input: string,
): { handle: string; key: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const atMatch = trimmed.match(/@([\w.-]+)/)
  if (atMatch) {
    const handle = `@${atMatch[1]}`
    return { handle, key: `youtube:${atMatch[1].toLowerCase()}` }
  }

  const channelMatch = trimmed.match(/channel\/(UC[\w-]+)/i)
  if (channelMatch) {
    const id = channelMatch[1]
    return { handle: id, key: `youtube:${id}` }
  }

  const customMatch = trimmed.match(/\/c\/([\w.-]+)/i)
  if (customMatch) {
    const handle = `@${customMatch[1]}`
    return { handle, key: `youtube:${customMatch[1].toLowerCase()}` }
  }

  if (/^@?[\w.-]+$/.test(trimmed)) {
    const normalized = trimmed.replace(/^@/, '').toLowerCase()
    const handle = `@${normalized}`
    return { handle, key: `youtube:${normalized}` }
  }

  return { handle: trimmed, key: `youtube:${trimmed.toLowerCase()}` }
}

export function parseVkGroupInput(
  input: string,
): { handle: string; key: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?vk\.(?:com|ru)\/(club|public|event)?(\d+|[\w.-]+)/i,
  )
  if (urlMatch) {
    const slug = urlMatch[2]
    const handle = `vk.com/${slug}`
    return { handle, key: `vk:${slug.toLowerCase()}` }
  }

  if (/^\d+$/.test(trimmed)) {
    return { handle: `vk.com/club${trimmed}`, key: `vk:${trimmed}` }
  }

  if (/^[\w.-]+$/.test(trimmed)) {
    const normalized = trimmed.toLowerCase()
    return { handle: `vk.com/${normalized}`, key: `vk:${normalized}` }
  }

  return null
}

export function loadStoredYouTubeChannels(): StoredYouTubeChannel[] {
  try {
    const raw = localStorage.getItem(YOUTUBE_CHANNELS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<
      StoredYouTubeChannel & { baseSubscribers?: number }
    >
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((channel) => {
        const channelId =
          channel.channelId ??
          (channel.key.startsWith('youtube:')
            ? channel.key.slice('youtube:'.length)
            : channel.key)
        const pollInput = channel.pollInput ?? channelId
        const subscriberCount =
          channel.subscriberCount ?? channel.baseSubscribers ?? 0
        if (!pollInput) return null
        return {
          key: channel.key,
          handle: channel.handle,
          channelId,
          pollInput,
          subscriberCount,
        }
      })
      .filter((channel): channel is StoredYouTubeChannel => channel !== null)
  } catch {
    return []
  }
}

export function saveStoredYouTubeChannels(channels: StoredYouTubeChannel[]) {
  localStorage.setItem(YOUTUBE_CHANNELS_STORAGE_KEY, JSON.stringify(channels))
}
