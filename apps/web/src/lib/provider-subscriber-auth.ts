import {
  canUseAutomaticSubscriberTracking,
  getProviderSubscriberAuthRule,
  OAuthProvider,
  type OAuthConnectionDto,
  type TelegramBotConnectionDto,
} from '@spt/shared'
import { getProviderUi } from './providers'

export function canUseLiveSubscriberTrackingForProviderId(
  providerId: string,
  connections: OAuthConnectionDto[],
  telegramBot?: TelegramBotConnectionDto | null,
): boolean {
  const { provider } = getProviderUi(providerId)
  return canUseAutomaticSubscriberTracking(provider, connections, telegramBot)
}

export function getSubscriberLiveModeLockReason(
  providerId: string,
  connections: OAuthConnectionDto[],
  telegramBot?: TelegramBotConnectionDto | null,
): string | null {
  const { provider, name } = getProviderUi(providerId)

  if (canUseAutomaticSubscriberTracking(provider, connections, telegramBot)) {
    return null
  }

  const rule = getProviderSubscriberAuthRule(provider)

  if (rule.requirement === 'bot_token') {
    return `Подключите Telegram-бота (токен от @BotFather), чтобы включить Live-счётчик для ${name}.`
  }

  if (rule.requirement === 'manual_only') {
    if (providerId === 'vk' || providerId === 'instagram') {
      return `Live-режим для ${name} скоро появится — пока подписчиков вводите вручную.`
    }
    return `Live-режим для ${name} недоступен — счётчик ведётся вручную.`
  }

  if (rule.requirement === 'oauth' && rule.oauthProvider) {
    const oauthLabel =
      rule.oauthProvider === OAuthProvider.FACEBOOK ? 'Instagram' : 'VK'
    return `Авторизуйтесь в ${oauthLabel}, чтобы включить Live-счётчик подписчиков.`
  }

  return 'Live-режим для этой площадки недоступен — счётчик ведётся вручную.'
}
