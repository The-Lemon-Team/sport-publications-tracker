import {
  MetricTrackingMode,
  OAuthConnectionStatus,
  OAuthProvider,
  Provider,
} from './types'

export type ProviderMetricAuthRequirement =
  | 'none'
  | 'oauth'
  | 'manual_only'
  | 'bot_token'

export interface ProviderMetricAuthRule {
  requirement: ProviderMetricAuthRequirement
  oauthProvider?: OAuthProvider
}

/** Which auth (if any) a publication provider needs for automatic metric sync. */
export const PROVIDER_METRIC_AUTH: Partial<
  Record<Provider, ProviderMetricAuthRule>
> = {
  [Provider.YOUTUBE]: { requirement: 'none' },
  [Provider.INSTAGRAM]: {
    requirement: 'oauth',
    oauthProvider: OAuthProvider.FACEBOOK,
  },
  [Provider.VK]: {
    requirement: 'oauth',
    oauthProvider: OAuthProvider.VK,
  },
  // Post metrics stay manual until MTProto (api_id/api_hash) is available.
  // Channel subscribers use Bot API separately — see telegram-integration.md.
  [Provider.TELEGRAM]: { requirement: 'manual_only' },
  [Provider.CLUB_SOLO_AUDIO]: { requirement: 'manual_only' },
  [Provider.CLUB_SOLO_PLATFORM]: { requirement: 'manual_only' },
  [Provider.CLUB_SOLO_TEXT]: { requirement: 'manual_only' },
  [Provider.DZEN]: { requirement: 'manual_only' },
  [Provider.NEWSLETTER]: { requirement: 'manual_only' },
  [Provider.TIKTOK]: { requirement: 'manual_only' },
  [Provider.CUSTOM]: { requirement: 'manual_only' },
}

export interface OAuthConnectionRef {
  provider: OAuthProvider
  status: OAuthConnectionStatus
}

export function isOAuthProviderConnected(
  connections: OAuthConnectionRef[],
  oauthProvider: OAuthProvider,
): boolean {
  return connections.some(
    (connection) =>
      connection.provider === oauthProvider &&
      connection.status === OAuthConnectionStatus.ACTIVE,
  )
}

export function canUseAutomaticMetricTracking(
  provider: Provider,
  connections: OAuthConnectionRef[],
): boolean {
  const rule = PROVIDER_METRIC_AUTH[provider]
  if (!rule) return false

  if (rule.requirement === 'none') return true
  if (rule.requirement === 'manual_only') return false
  if (rule.requirement === 'oauth' && rule.oauthProvider) {
    return isOAuthProviderConnected(connections, rule.oauthProvider)
  }

  return false
}

export function resolveMetricTrackingMode(
  provider: Provider,
  connections: OAuthConnectionRef[],
  requested?: MetricTrackingMode,
): MetricTrackingMode {
  if (!canUseAutomaticMetricTracking(provider, connections)) {
    return MetricTrackingMode.MANUAL
  }

  return requested ?? MetricTrackingMode.MANUAL
}

export function getProviderMetricAuthRule(
  provider: Provider,
): ProviderMetricAuthRule {
  return (
    PROVIDER_METRIC_AUTH[provider] ?? { requirement: 'manual_only' }
  )
}
