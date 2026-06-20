import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { StageDto, TopicDto } from '@spt/shared'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator'
import { CreateStageDto } from './dto/create-stage.dto'
import { CreateTopicDto } from './dto/create-topic.dto'
import { ReorderPublicationsDto } from './dto/reorder-publications.dto'
import { ReorderStagesDto } from './dto/reorder-stages.dto'
import { UpdateStageDto } from './dto/update-stage.dto'
import { TopicsService } from './topics.service'

@Controller('topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(@Inject(TopicsService) private readonly topics: TopicsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser): Promise<TopicDto[]> {
    return this.topics.findAllForUser(user.id)
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateTopicDto,
  ): Promise<TopicDto> {
    return this.topics.createForUser(user.id, body.name)
  }

  @Post(':topicId/stages')
  createStage(
    @CurrentUser() user: RequestUser,
    @Param('topicId') topicId: string,
    @Body() body: CreateStageDto,
  ): Promise<StageDto> {
    return this.topics.createStageForUser(
      user.id,
      topicId,
      body.name,
      body.hint,
    )
  }

  @Patch(':topicId/stages/order')
  reorderStages(
    @CurrentUser() user: RequestUser,
    @Param('topicId') topicId: string,
    @Body() body: ReorderStagesDto,
  ): Promise<TopicDto> {
    return this.topics.reorderStagesForUser(user.id, topicId, body.stageIds)
  }

  @Patch(':topicId/stages/:stageId')
  updateStage(
    @CurrentUser() user: RequestUser,
    @Param('topicId') topicId: string,
    @Param('stageId') stageId: string,
    @Body() body: UpdateStageDto,
  ): Promise<StageDto> {
    return this.topics.updateStageForUser(user.id, topicId, stageId, body)
  }

  @Patch(':topicId/stages/:stageId/publications/order')
  reorderPublications(
    @CurrentUser() user: RequestUser,
    @Param('topicId') topicId: string,
    @Param('stageId') stageId: string,
    @Body() body: ReorderPublicationsDto,
  ): Promise<StageDto> {
    return this.topics.reorderPublicationsForUser(
      user.id,
      topicId,
      stageId,
      body.publicationIds,
    )
  }
}
