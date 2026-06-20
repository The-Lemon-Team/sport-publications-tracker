import {
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common'
import type {
  YouTubeChannelMetricsDto,
  YouTubeVideoMetricsDto,
} from '@spt/shared'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { YouTubeService } from './youtube.service'

@Controller('youtube')
@UseGuards(JwtAuthGuard)
export class YouTubeController {
  constructor(@Inject(YouTubeService) private readonly youtube: YouTubeService) {}

  @Get('metrics')
  getMetrics(@Query('url') url: string): Promise<YouTubeVideoMetricsDto> {
    return this.youtube.getVideoMetrics(url)
  }

  @Get('channel')
  getChannel(
    @Query('input') input: string,
  ): Promise<YouTubeChannelMetricsDto> {
    return this.youtube.getChannelMetrics(input)
  }

  @Get('channels')
  getChannels(
    @Query('input') input: string | string[],
  ): Promise<YouTubeChannelMetricsDto[]> {
    const inputs = Array.isArray(input) ? input : input ? [input] : []
    return this.youtube.getChannelMetricsBatch(inputs)
  }
}
