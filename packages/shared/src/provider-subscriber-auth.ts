import {
  Provider,
  SubscriberTrackingMode,
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

/** Which auth (if any) a subscriber source needs for automatic count sync. */
export const PROVIDER_SUBSCRIBER_AUTH: Partial<
  Record<Provider, ProviderSubscriberAuthRule>
> = {
  [Provider.YOUTUBE]: { requirement: 'none' },
  [Provider.VK]: { requirement: 'manual_only' },
  [Provider.TELEGRAM]: { requirement: 'manual_only' },
  [Provider.INSTAGRAM]: { requirement: 'manual_only' },
}

export function getProviderSubscriberAuthRule(
  provider: Provider,
): ProviderSubscriberAuthRule {
  return (
    PROVIDER_SUBSCRIBER_AUTH[provider] ?? { requirement: 'manual_only' }
  )
}

export function canUseAutomaticSubscriberTracking(
  provider: Provider,
  connections: OAuthConnectionRef[],
): boolean {
  const rule = PROVIDER_SUBSCRIBER_AUTH[provider]
  if (!rule) return false

  if (rule.requirement === 'none') return true
  if (rule.requirement === 'manual_only') return false
  if (rule.requirement === 'oauth' && rule.oauthProvider) {
    return isOAuthProviderConnected(connections, rule.oauthProvider)
  }

  return false
}

export function resolveSubscriberTrackingMode(
  provider: Provider,
  connections: OAuthConnectionRef[],
  requested?: SubscriberTrackingMode,
): SubscriberTrackingMode {
  if (!canUseAutomaticSubscriberTracking(provider, connections)) {
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
