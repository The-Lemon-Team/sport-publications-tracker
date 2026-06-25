import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common'
import type {
  ConnectTelegramBotRequest,
  TelegramBotConnectionDto,
  VerifyTelegramChannelRequest,
  VerifyTelegramChannelResult,
} from '@spt/shared'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator'
import { TelegramBotService } from './telegram.service'

@Controller('telegram')
@UseGuards(JwtAuthGuard)
export class TelegramController {
  constructor(
    @Inject(TelegramBotService) private readonly bots: TelegramBotService,
  ) {}

  @Get('bot')
  getBot(
    @CurrentUser() user: RequestUser,
  ): Promise<TelegramBotConnectionDto | null> {
    return this.bots.getConnection(user.id)
  }

  @Post('bot')
  connectBot(
    @CurrentUser() user: RequestUser,
    @Body() body: ConnectTelegramBotRequest,
  ): Promise<TelegramBotConnectionDto> {
    return this.bots.connectBot(user.id, body.token)
  }

  @Delete('bot')
  revokeBot(@CurrentUser() user: RequestUser): Promise<void> {
    return this.bots.revokeBot(user.id)
  }

  @Post('verify-channel')
  verifyChannel(
    @CurrentUser() user: RequestUser,
    @Body() body: VerifyTelegramChannelRequest,
  ): Promise<VerifyTelegramChannelResult> {
    return this.bots.verifyChannel(user.id, body.input)
  }
}
