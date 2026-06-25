import { Module } from '@nestjs/common'
import { TelegramModule } from '../telegram/telegram.module'
import { VkModule } from '../vk/vk.module'
import { YouTubeModule } from '../youtube/youtube.module'
import { SubscribersController } from './subscribers.controller'
import { SubscribersService } from './subscribers.service'

@Module({
  imports: [YouTubeModule, VkModule, TelegramModule],
  controllers: [SubscribersController],
  providers: [SubscribersService],
})
export class SubscribersModule {}
