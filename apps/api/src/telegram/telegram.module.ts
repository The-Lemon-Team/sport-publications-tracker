import { Module } from '@nestjs/common'
import { TelegramBotService, TelegramService } from './telegram.service'
import { TelegramController } from './telegram.controller'

@Module({
  controllers: [TelegramController],
  providers: [TelegramService, TelegramBotService],
  exports: [TelegramService, TelegramBotService],
})
export class TelegramModule {}
