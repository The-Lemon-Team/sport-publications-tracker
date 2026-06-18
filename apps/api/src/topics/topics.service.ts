import { Inject, Injectable } from '@nestjs/common'
import {
  type Publication,
  type MetricSnapshot,
  type Stage,
  type Topic,
} from '@prisma/client'
import type {
  MetricSnapshotDto,
  PublicationDto,
  StageDto,
  TopicDto,
} from '@spt/shared'
import { PrismaService } from '../prisma/prisma.service'

type TopicWithTree = Topic & {
  stages: (Stage & {
    publications: (Publication & { snapshots: MetricSnapshot[] })[]
  })[]
}

@Injectable()
export class TopicsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string): Promise<TopicDto[]> {
    const topics = await this.prisma.withFreshConnection((db) =>
      db.topic.findMany({
        where: { userId },
        orderBy: { order: 'asc' },
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: {
              publications: {
                orderBy: { order: 'asc' },
                include: { snapshots: true },
              },
            },
          },
        },
      }),
    )

    return topics.map((topic) => this.toTopicDto(topic))
  }

  private toTopicDto(topic: TopicWithTree): TopicDto {
    return {
      id: topic.id,
      name: topic.name,
      order: topic.order,
      stages: topic.stages.map((stage) => this.toStageDto(stage)),
    }
  }

  private toStageDto(
    stage: Stage & {
      publications: (Publication & { snapshots: MetricSnapshot[] })[]
    },
  ): StageDto {
    return {
      id: stage.id,
      name: stage.name,
      hint: stage.hint,
      order: stage.order,
      publications: stage.publications.map((pub) => this.toPublicationDto(pub)),
    }
  }

  private toPublicationDto(
    publication: Publication & { snapshots: MetricSnapshot[] },
  ): PublicationDto {
    return {
      id: publication.id,
      provider: publication.provider,
      channelName: publication.channelName,
      label: publication.label,
      postUrl: publication.postUrl,
      status: publication.status,
      publishedAt: publication.publishedAt?.toISOString() ?? null,
      order: publication.order,
      snapshots: publication.snapshots.map((s) => this.toSnapshotDto(s)),
    }
  }

  private toSnapshotDto(snapshot: MetricSnapshot): MetricSnapshotDto {
    return {
      kind: snapshot.kind,
      views: snapshot.views,
      likes: snapshot.likes,
      comments: snapshot.comments,
      shares: snapshot.shares,
      capturedAt: snapshot.capturedAt.toISOString(),
    }
  }
}
