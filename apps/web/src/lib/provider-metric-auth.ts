import {
  canUseAutomaticMetricTracking,
  getProviderMetricAuthRule,
  OAuthProvider,
  type OAuthConnectionDto,
} from '@spt/shared'
import { getProviderUi, providerIdFromEnum } from './providers'

export function canUseAutomaticTrackingForProviderId(
  providerId: string,
  connections: OAuthConnectionDto[],
): boolean {
  const { provider } = getProviderUi(providerId)
  return canUseAutomaticMetricTracking(provider, connections)
}

export function getLiveModeLockReason(
  providerId: string,
  connections: OAuthConnectionDto[],
): string | null {
  const { provider, name } = getProviderUi(providerId)
  if (canUseAutomaticMetricTracking(provider, connections)) {
    return null
  }

  const rule = getProviderMetricAuthRule(provider)

  if (rule.requirement === 'manual_only') {
    return `Live-режим для ${name} недоступен — метрики вводятся вручную.`
  }

  if (rule.requirement === 'oauth' && rule.oauthProvider) {
    const oauthLabel =
      rule.oauthProvider === OAuthProvider.FACEBOOK ? 'Instagram' : 'VK'
    return `Авторизуйтесь в ${oauthLabel}, чтобы включить Live-режим с автообновлением метрик.`
  }

  return 'Live-режим для этой площадки недоступен — метрики вводятся вручную.'
}

/** @deprecated Use getLiveModeLockReason */
export const getManualOnlyHint = getLiveModeLockReason

export { providerIdFromEnum }
