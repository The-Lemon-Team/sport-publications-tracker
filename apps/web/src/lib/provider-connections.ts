import { getProviderUi } from './providers'

export interface ConnectableProvider {
  id: string
  baseSubscribers: number
  drift: [number, number]
  handle: string
}

export const CONNECTABLE_PROVIDERS: ConnectableProvider[] = [
  {
    id: 'vk',
    baseSubscribers: 124300,
    drift: [-2, 9],
    handle: 'vk.com/studio.s10',
  },
  {
    id: 'youtube',
    baseSubscribers: 89200,
    drift: [0, 14],
    handle: '@studio-s10',
  },
  {
    id: 'instagram',
    baseSubscribers: 215800,
    drift: [-4, 18],
    handle: '@studio.s10',
  },
]

export function getConnectable(id: string): ConnectableProvider | undefined {
  return CONNECTABLE_PROVIDERS.find((p) => p.id === id)
}

export function providerOf(id: string) {
  return getProviderUi(id)
}
