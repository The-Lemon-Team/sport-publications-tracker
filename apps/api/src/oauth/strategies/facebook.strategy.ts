import { Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import {
  Strategy as FacebookStrategy,
  Profile as FacebookProfile,
} from 'passport-facebook'
import { OAuthProvider } from '@prisma/client'
import type { OAuthProfile } from '../oauth.types'

@Injectable()
export class FacebookOAuthStrategy extends PassportStrategy(
  FacebookStrategy,
  'facebook',
) {
  constructor(@Inject(ConfigService) config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('FACEBOOK_APP_ID'),
      clientSecret: config.getOrThrow<string>('FACEBOOK_APP_SECRET'),
      callbackURL: config.getOrThrow<string>('FACEBOOK_CALLBACK_URL'),
      profileFields: ['id', 'displayName', 'email'],
      scope: [
        'email',
        'instagram_basic',
        'instagram_manage_insights',
        'pages_show_list',
        'pages_read_engagement',
      ],
    })
  }

  validate(
    accessToken: string,
    refreshToken: string,
    _params: { expires_in?: number },
    profile: FacebookProfile,
    done: (error: Error | null, user?: OAuthProfile) => void,
  ): void {
    done(null, {
      provider: OAuthProvider.FACEBOOK,
      externalAccountId: profile.id,
      channelName: profile.displayName,
      accessToken,
      refreshToken: refreshToken || null,
      expiresAt: null,
      scopes: [
        'email',
        'instagram_basic',
        'instagram_manage_insights',
        'pages_show_list',
        'pages_read_engagement',
      ],
      metadata: {
        emails: profile.emails,
      },
    })
  }
}
