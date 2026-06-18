import { Provider, type Provider as ProviderType } from '@spt/shared'

export interface ProviderUi {
  id: string
  provider: ProviderType
  name: string
  abbr: string
  color: string
  textColor: string
}

export const PROVIDER_UI: ProviderUi[] = [
  {
    id: 'tg',
    provider: Provider.TELEGRAM,
    name: 'Telegram',
    abbr: 'TG',
    color: '#229ED9',
    textColor: '#ffffff',
  },
  {
    id: 'vk',
    provider: Provider.VK,
    name: 'VKontakte',
    abbr: 'VK',
    color: '#0077FF',
    textColor: '#ffffff',
  },
  {
    id: 'youtube',
    provider: Provider.YOUTUBE,
    name: 'YouTube',
    abbr: 'YT',
    color: '#FF0033',
    textColor: '#ffffff',
  },
  {
    id: 'instagram',
    provider: Provider.INSTAGRAM,
    name: 'Instagram',
    abbr: 'IG',
    color: '#E1306C',
    textColor: '#ffffff',
  },
  {
    id: 'club',
    provider: Provider.CLUB_SOLO_AUDIO,
    name: 'Club Solo',
    abbr: 'CS',
    color: '#0F766E',
    textColor: '#ffffff',
  },
  {
    id: 'dzen',
    provider: Provider.DZEN,
    name: 'Дзен',
    abbr: 'DZ',
    color: '#262626',
    textColor: '#ffffff',
  },
]

const byProvider = new Map(
  PROVIDER_UI.map((item) => [item.provider, item]),
)
const byId = new Map(PROVIDER_UI.map((item) => [item.id, item]))

export function getProviderUiByEnum(provider: ProviderType): ProviderUi {
  return (
    byProvider.get(provider) ?? {
      id: provider.toLowerCase(),
      provider,
      name: provider,
      abbr: provider.slice(0, 2),
      color: '#64748B',
      textColor: '#ffffff',
    }
  )
}

export function getProviderUi(id: string): ProviderUi {
  return (
    byId.get(id) ?? {
      id,
      provider: Provider.CUSTOM,
      name: id,
      abbr: id.slice(0, 2).toUpperCase(),
      color: '#64748B',
      textColor: '#ffffff',
    }
  )
}

export function providerIdFromEnum(provider: ProviderType): string {
  return getProviderUiByEnum(provider).id
}
