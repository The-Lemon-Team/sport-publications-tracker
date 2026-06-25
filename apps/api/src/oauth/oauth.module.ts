import { Module, forwardRef, type Provider } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthModule } from '../auth/auth.module'
import { InstagramModule } from '../instagram/instagram.module'
import { OAuthController } from './oauth.controller'
import { OAuthService } from './oauth.service'
import { FacebookOAuthStrategy } from './strategies/facebook.strategy'
// import { VkOAuthService } from './vk-oauth.service'

function oauthStrategyProviders(): Provider[] {
  const providers: Provider[] = [OAuthService]

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    providers.push(FacebookOAuthStrategy)
  }

  return providers
}

@Module({
  imports: [
    PassportModule.register({ session: false }),
    forwardRef(() => AuthModule),
    forwardRef(() => InstagramModule),
  ],
  controllers: [OAuthController],
  providers: oauthStrategyProviders(),
  exports: [OAuthService],
})
export class OAuthModule {}