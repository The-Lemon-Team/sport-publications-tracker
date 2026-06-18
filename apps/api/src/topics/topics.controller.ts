import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import type { TopicDto } from '@spt/shared'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator'
import { TopicsService } from './topics.service'

@Controller('topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  constructor(@Inject(TopicsService) private readonly topics: TopicsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser): Promise<TopicDto[]> {
    return this.topics.findAllForUser(user.id)
  }
}
