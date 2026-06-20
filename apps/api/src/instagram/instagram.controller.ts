import {
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common'
import type {
  InstagramAccountMetricsDto,
  InstagramMediaMetricsDto,
} from '@spt/shared'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator'
import { OAuthService } from '../oauth/oauth.service'
import { InstagramService } from './instagram.service'

@Controller('instagram')
@UseGuards(JwtAuthGuard)
export class InstagramController {
  constructor(
    @Inject(InstagramService) private readonly instagram: InstagramService,
    @Inject(OAuthService) private readonly oauth: OAuthService,
  ) {}

  @Get('account')
  getAccount(
    @CurrentUser() user: RequestUser,
  ): Promise<InstagramAccountMetricsDto> {
    const accessToken = this.oauth.requireFacebookAccessToken(user.id)
    return accessToken.then((token) => this.instagram.getAccountMetrics(token))
  }

  @Get('metrics')
  getMetrics(
    @CurrentUser() user: RequestUser,
    @Query('url') url: string,
  ): Promise<InstagramMediaMetricsDto> {
    return this.oauth
      .requireFacebookAccessToken(user.id)
      .then((token) => this.instagram.getMediaMetrics(token, url))
  }
}
