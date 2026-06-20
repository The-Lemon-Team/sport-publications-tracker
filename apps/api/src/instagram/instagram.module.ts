import { Module, forwardRef } from '@nestjs/common'
import { OAuthModule } from '../oauth/oauth.module'
import { InstagramController } from './instagram.controller'
import { InstagramService } from './instagram.service'

@Module({
  imports: [forwardRef(() => OAuthModule)],
  controllers: [InstagramController],
  providers: [InstagramService],
  exports: [InstagramService],
})
export class InstagramModule {}
