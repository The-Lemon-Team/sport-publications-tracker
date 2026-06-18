import { Module, type Provider } from '@nestjs/common'
import { OAuthController } from './oauth.controller'
import { OAuthService } from './oauth.service'
import { VkOAuthStrategy } from './strategies/vk.strategy'
import { GoogleOAuthStrategy } from './strategies/google.strategy'
import { FacebookOAuthStrategy } from './strategies/facebook.strategy'

function oauthStrategyProviders(): Provider[] {
  const providers: Provider[] = [OAuthService]

  if (process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET) {
    providers.push(VkOAuthStrategy)
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(GoogleOAuthStrategy)
  }
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    providers.push(FacebookOAuthStrategy)
  }

  return providers
}

@Module({
  controllers: [OAuthController],
  providers: oauthStrategyProviders(),
  exports: [OAuthService],
})
export class OAuthModule {}