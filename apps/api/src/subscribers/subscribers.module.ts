import { Module } from '@nestjs/common'
import { VkModule } from '../vk/vk.module'
import { YouTubeModule } from '../youtube/youtube.module'
import { SubscribersController } from './subscribers.controller'
import { SubscribersService } from './subscribers.service'

@Module({
  imports: [YouTubeModule, VkModule],
  controllers: [SubscribersController],
  providers: [SubscribersService],
})
export class SubscribersModule {}
