import {
  Provider,
  SubscriberTrackingMode,
  TelegramBotConnectionStatus,
} from './types'
import {
  type OAuthConnectionRef,
  type ProviderMetricAuthRequirement,
  type ProviderMetricAuthRule,
  canUseAutomaticMetricTracking,
  getProviderMetricAuthRule,
  isOAuthProviderConnected,
} from './provider-metric-auth'

export type ProviderSubscriberAuthRequirement = ProviderMetricAuthRequirement

export interface ProviderSubscriberAuthRule extends ProviderMetricAuthRule {}

export interface TelegramBotConnectionRef {
  status: TelegramBotConnectionStatus
}

/** Which auth (if any) a subscriber source needs for automatic count sync. */
export const PROVIDER_SUBSCRIBER_AUTH: Partial<
  Record<Provider, ProviderSubscriberAuthRule>
> = {
  [Provider.YOUTUBE]: { requirement: 'none' },
  [Provider.VK]: { requirement: 'manual_only' },
  [Provider.TELEGRAM]: { requirement: 'bot_token' },
  [Provider.INSTAGRAM]: { requirement: 'manual_only' },
}

export function getProviderSubscriberAuthRule(
  provider: Provider,
): ProviderSubscriberAuthRule {
  return (
    PROVIDER_SUBSCRIBER_AUTH[provider] ?? { requirement: 'manual_only' }
  )
}

export function isTelegramBotConnected(
  connection?: TelegramBotConnectionRef | null,
): boolean {
  return connection?.status === TelegramBotConnectionStatus.ACTIVE
}

export function canUseAutomaticSubscriberTracking(
  provider: Provider,
  connections: OAuthConnectionRef[],
  telegramBot?: TelegramBotConnectionRef | null,
): boolean {
  const rule = PROVIDER_SUBSCRIBER_AUTH[provider]
  if (!rule) return false

  if (rule.requirement === 'none') return true
  if (rule.requirement === 'manual_only') return false
  if (rule.requirement === 'bot_token') {
    return isTelegramBotConnected(telegramBot)
  }
  if (rule.requirement === 'oauth' && rule.oauthProvider) {
    return isOAuthProviderConnected(connections, rule.oauthProvider)
  }

  return false
}

export function resolveSubscriberTrackingMode(
  provider: Provider,
  connections: OAuthConnectionRef[],
  requested?: SubscriberTrackingMode,
  telegramBot?: TelegramBotConnectionRef | null,
): SubscriberTrackingMode {
  if (!canUseAutomaticSubscriberTracking(provider, connections, telegramBot)) {
    return SubscriberTrackingMode.MANUAL
  }

  return requested ?? SubscriberTrackingMode.MANUAL
}

/** Re-export metric auth helpers where subscriber and publication rules align. */
export {
  canUseAutomaticMetricTracking,
  getProviderMetricAuthRule,
  isOAuthProviderConnected,
}
