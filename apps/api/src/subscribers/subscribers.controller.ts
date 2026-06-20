import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type {
  CreateSubscriberSourceRequest,
  SubscriberHistoryPageDto,
  SubscriberSourceDto,
} from '@spt/shared'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator'
import { SubscribersService } from './subscribers.service'

@Controller('subscribers')
@UseGuards(JwtAuthGuard)
export class SubscribersController {
  constructor(
    @Inject(SubscribersService) private readonly subscribers: SubscribersService,
  ) {}

  @Get('sources')
  findAll(@CurrentUser() user: RequestUser): Promise<SubscriberSourceDto[]> {
    return this.subscribers.findAllForUser(user.id)
  }

  @Post('sources')
  createSource(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateSubscriberSourceRequest,
  ): Promise<SubscriberSourceDto> {
    return this.subscribers.createYouTubeSource(user.id, body.input)
  }

  @Post('sync')
  sync(@CurrentUser() user: RequestUser): Promise<SubscriberSourceDto[]> {
    return this.subscribers.syncForUser(user.id)
  }

  @Get('sources/:id/history')
  getHistory(
    @CurrentUser() user: RequestUser,
    @Param('id') sourceId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<SubscriberHistoryPageDto> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined
    return this.subscribers.getHistory(
      user.id,
      sourceId,
      cursor,
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    )
  }
}
