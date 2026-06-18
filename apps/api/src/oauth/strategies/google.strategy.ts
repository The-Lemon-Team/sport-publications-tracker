import { Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
} from 'passport-google-oauth20'
import { OAuthProvider } from '@prisma/client'
import type { OAuthProfile } from '../oauth.types'

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(
  GoogleStrategy,
  'google',
) {
  constructor(@Inject(ConfigService) config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
    })
  }

  validate(
    accessToken: string,
    refreshToken: string,
    _params: { expires_in?: number },
    profile: GoogleProfile,
    done: (error: Error | null, user?: OAuthProfile) => void,
  ): void {
    done(null, {
      provider: OAuthProvider.GOOGLE,
      externalAccountId: profile.id,
      channelName: profile.displayName,
      accessToken,
      refreshToken: refreshToken || null,
      expiresAt: null,
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
      metadata: {
        emails: profile.emails,
        photos: profile.photos,
      },
    })
  }
}
