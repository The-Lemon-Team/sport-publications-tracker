import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type {
  MetricHistoryPageDto,
  PublicationDto,
} from '@spt/shared'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator'
import { UpdateManualMetricsDto } from './dto/update-manual-metrics.dto'
import { UpdateMetricTrackingModeDto } from './dto/update-metric-tracking-mode.dto'
import { UpdatePublicationDto } from './dto/update-publication.dto'
import { CreatePublicationDto } from './dto/create-publication.dto'
import { PublicationsService } from './publications.service'

@Controller('publications')
@UseGuards(JwtAuthGuard)
export class PublicationsController {
  constructor(
    @Inject(PublicationsService)
    private readonly publications: PublicationsService,
  ) {}

  @Post()
  createPublication(
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePublicationDto,
  ): Promise<PublicationDto> {
    return this.publications.createPublication(user.id, body)
  }

  @Patch(':id')
  updatePublication(
    @CurrentUser() user: RequestUser,
    @Param('id') publicationId: string,
    @Body() body: UpdatePublicationDto,
  ): Promise<PublicationDto> {
    return this.publications.updatePublication(user.id, publicationId, body)
  }

  @Delete(':id')
  deletePublication(
    @CurrentUser() user: RequestUser,
    @Param('id') publicationId: string,
  ): Promise<void> {
    return this.publications.deletePublication(user.id, publicationId)
  }

  @Patch(':id/metrics')
  updateManualMetrics(
    @CurrentUser() user: RequestUser,
    @Param('id') publicationId: string,
    @Body() body: UpdateManualMetricsDto,
  ): Promise<PublicationDto> {
    return this.publications.updateManualMetrics(
      user.id,
      publicationId,
      body.likes,
      body.comments,
    )
  }

  @Patch(':id/metric-tracking-mode')
  updateMetricTrackingMode(
    @CurrentUser() user: RequestUser,
    @Param('id') publicationId: string,
    @Body() body: UpdateMetricTrackingModeDto,
  ): Promise<PublicationDto> {
    return this.publications.updateMetricTrackingMode(
      user.id,
      publicationId,
      body.metricTrackingMode,
    )
  }

  @Get(':id/metric-history')
  getMetricHistory(
    @CurrentUser() user: RequestUser,
    @Param('id') publicationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<MetricHistoryPageDto> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined
    return this.publications.getMetricHistory(
      user.id,
      publicationId,
      cursor,
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    )
  }
}
