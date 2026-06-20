import { Module, type Provider } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { OAuthController } from './oauth.controller'
import { OAuthService } from './oauth.service'
import { VkOAuthStrategy } from './strategies/vk.strategy'
import { FacebookOAuthStrategy } from './strategies/facebook.strategy'

function oauthStrategyProviders(): Provider[] {
  const providers: Provider[] = [OAuthService]

  if (process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET) {
    providers.push(VkOAuthStrategy)
  }
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    providers.push(FacebookOAuthStrategy)
  }

  return providers
}

@Module({
  imports: [PassportModule.register({ session: false })],
  controllers: [OAuthController],
  providers: oauthStrategyProviders(),
  exports: [OAuthService],
})
export class OAuthModule {}