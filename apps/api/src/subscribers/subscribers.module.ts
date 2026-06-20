import { Module } from '@nestjs/common'
import { YouTubeModule } from '../youtube/youtube.module'
import { SubscribersController } from './subscribers.controller'
import { SubscribersService } from './subscribers.service'

@Module({
  imports: [YouTubeModule],
  controllers: [SubscribersController],
  providers: [SubscribersService],
})
export class SubscribersModule {}
