import { Module } from '@nestjs/common'
import { OAuthModule } from '../oauth/oauth.module'
import { TopicsModule } from '../topics/topics.module'
import { YouTubeModule } from '../youtube/youtube.module'
import { PublicationsController } from './publications.controller'
import { PublicationsService } from './publications.service'

@Module({
  imports: [TopicsModule, YouTubeModule, OAuthModule],
  controllers: [PublicationsController],
  providers: [PublicationsService],
})
export class PublicationsModule {}
