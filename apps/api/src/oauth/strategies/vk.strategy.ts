import { Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { Strategy as VkStrategy, Profile as VkProfile } from 'passport-vkontakte'
import { OAuthProvider } from '@prisma/client'
import type { OAuthProfile } from '../oauth.types'

@Injectable()
export class VkOAuthStrategy extends PassportStrategy(VkStrategy, 'vkontakte') {
  constructor(@Inject(ConfigService) config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('VK_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('VK_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('VK_CALLBACK_URL'),
      scope: ['stats', 'offline'],
      profileFields: ['id', 'displayName', 'photo_100'],
      state: false,
    })
  }

  validate(
    accessToken: string,
    refreshToken: string,
    params: { expires_in?: number },
    profile: VkProfile,
  ): OAuthProfile {
    const expiresAt = params.expires_in
      ? new Date(Date.now() + params.expires_in * 1000)
      : null

    return {
      provider: OAuthProvider.VK,
      externalAccountId: profile.id,
      channelName: profile.displayName,
      accessToken,
      refreshToken: refreshToken || null,
      expiresAt,
      scopes: ['stats', 'offline'],
      metadata: { profile: profile._json },
    }
  }
}
