import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  MetricSnapshot,
  MetricHistoryEntry,
  Publication,
  Stage,
  Topic,
} from '@prisma/client'
import {
  MetricTrackingMode,
  pickHighlightMetricDeltas,
  type MetricSnapshotDto,
  type PublicationDto,
  type StageDto,
  type TopicDto,
} from '@spt/shared'
import { PrismaService } from '../prisma/prisma.service'

type PublicationWithMetrics = Publication & {
  snapshots: MetricSnapshot[]
  metricHistory?: MetricHistoryEntry[]
}

type TopicWithTree = Topic & {
  stages: (Stage & {
    publications: PublicationWithMetrics[]
  })[]
}

const publicationInclude = {
  snapshots: true,
  metricHistory: {
    orderBy: [{ capturedAt: 'desc' as const }, { id: 'desc' as const }],
    take: 1,
  },
}

const DEFAULT_STAGES = [
  { name: 'Анонс эфира', hint: 'Pre-stream announcements', order: 0 },
  { name: 'Эфир (live)', hint: 'Live broadcast', order: 1 },
  { name: 'Нарезки (shorts / reels)', hint: null, order: 2 },
] as const

@Injectable()
export class TopicsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createForUser(userId: string, name: string): Promise<TopicDto> {
    const topic = await this.prisma.withFreshConnection(async (db) => {
      const maxOrder = await db.topic.aggregate({
        where: { userId },
        _max: { order: true },
      })
      const order = (maxOrder._max.order ?? -1) + 1

      return db.topic.create({
        data: {
          userId,
          name: name.trim(),
          order,
          stages: {
            create: DEFAULT_STAGES.map((stage) => ({ ...stage })),
          },
        },
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: {
              publications: {
                orderBy: { order: 'asc' },
                include: publicationInclude,
              },
            },
          },
        },
      })
    })

    return this.toTopicDto(topic)
  }

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
                include: publicationInclude,
              },
            },
          },
        },
      }),
    )

    return topics.map((topic) => this.toTopicDto(topic))
  }

  async createStageForUser(
    userId: string,
    topicId: string,
    name: string,
    hint?: string,
  ): Promise<StageDto> {
    const stage = await this.prisma.withFreshConnection(async (db) => {
      const topic = await db.topic.findUnique({
        where: { id: topicId },
        include: {
          stages: {
            select: { order: true },
          },
        },
      })

      if (!topic) {
        throw new NotFoundException('Тема не найдена')
      }

      if (topic.userId !== userId) {
        throw new ForbiddenException()
      }

      const maxOrder = topic.stages.reduce(
        (max, current) => Math.max(max, current.order),
        -1,
      )

      return db.stage.create({
        data: {
          topicId,
          name: name.trim(),
          hint: hint?.trim() || null,
          order: maxOrder + 1,
        },
        include: {
          publications: {
            orderBy: { order: 'asc' },
            include: publicationInclude,
          },
        },
      })
    })

    return this.toStageDto(stage)
  }

  async updateStageForUser(
    userId: string,
    topicId: string,
    stageId: string,
    input: { name?: string; hint?: string | null },
  ): Promise<StageDto> {
    const stage = await this.prisma.withFreshConnection(async (db) => {
      const existing = await db.stage.findUnique({
        where: { id: stageId },
        include: { topic: true },
      })

      if (!existing) {
        throw new NotFoundException('Этап не найден')
      }

      if (existing.topicId !== topicId) {
        throw new BadRequestException('Этап не принадлежит теме')
      }

      if (existing.topic.userId !== userId) {
        throw new ForbiddenException()
      }

      const data: { name?: string; hint?: string | null } = {}

      if (input.name !== undefined) {
        const trimmed = input.name.trim()
        if (!trimmed) {
          throw new BadRequestException('Название этапа не может быть пустым')
        }
        data.name = trimmed
      }

      if (input.hint !== undefined) {
        data.hint = input.hint?.trim() || null
      }

      return db.stage.update({
        where: { id: stageId },
        data,
        include: {
          publications: {
            orderBy: { order: 'asc' },
            include: publicationInclude,
          },
        },
      })
    })

    return this.toStageDto(stage)
  }

  async reorderPublicationsForUser(
    userId: string,
    topicId: string,
    stageId: string,
    publicationIds: string[],
  ): Promise<StageDto> {
    const stage = await this.prisma.withFreshConnection(async (db) => {
      const existing = await db.stage.findUnique({
        where: { id: stageId },
        include: {
          topic: true,
          publications: true,
        },
      })

      if (!existing) {
        throw new NotFoundException('Этап не найден')
      }

      if (existing.topicId !== topicId) {
        throw new BadRequestException('Этап не принадлежит теме')
      }

      if (existing.topic.userId !== userId) {
        throw new ForbiddenException()
      }

      if (publicationIds.length !== existing.publications.length) {
        throw new BadRequestException('Неверный список публикаций')
      }

      const existingIds = new Set(existing.publications.map((pub) => pub.id))
      if (!publicationIds.every((id) => existingIds.has(id))) {
        throw new BadRequestException('Неверный список публикаций')
      }

      await db.$transaction(
        publicationIds.map((id, index) =>
          db.publication.update({
            where: { id },
            data: { order: index },
          }),
        ),
      )

      return db.stage.findUniqueOrThrow({
        where: { id: stageId },
        include: {
          publications: {
            orderBy: { order: 'asc' },
            include: publicationInclude,
          },
        },
      })
    })

    return this.toStageDto(stage)
  }

  async reorderStagesForUser(
    userId: string,
    topicId: string,
    stageIds: string[],
  ): Promise<TopicDto> {
    const topic = await this.prisma.withFreshConnection(async (db) => {
      const existing = await db.topic.findUnique({
        where: { id: topicId },
        include: { stages: true },
      })

      if (!existing) {
        throw new NotFoundException('Тема не найдена')
      }

      if (existing.userId !== userId) {
        throw new ForbiddenException()
      }

      if (stageIds.length !== existing.stages.length) {
        throw new BadRequestException('Неверный список этапов')
      }

      const existingIds = new Set(existing.stages.map((stage) => stage.id))
      if (!stageIds.every((id) => existingIds.has(id))) {
        throw new BadRequestException('Неверный список этапов')
      }

      await db.$transaction(
        stageIds.map((id, index) =>
          db.stage.update({
            where: { id },
            data: { order: index },
          }),
        ),
      )

      return db.topic.findUniqueOrThrow({
        where: { id: topicId },
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: {
              publications: {
                orderBy: { order: 'asc' },
                include: publicationInclude,
              },
            },
          },
        },
      })
    })

    return this.toTopicDto(topic)
  }

  private toTopicDto(topic: TopicWithTree): TopicDto {
    return {
      id: topic.id,
      name: topic.name,
      order: topic.order,
      createdAt: topic.createdAt.toISOString(),
      stages: topic.stages.map((stage) => this.toStageDto(stage)),
    }
  }

  private toStageDto(
    stage: Stage & {
      publications: PublicationWithMetrics[]
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

  toPublicationDto(publication: PublicationWithMetrics): PublicationDto {
    const lastHistory = publication.metricHistory?.[0]
    const highlightMetricDeltas =
      publication.metricTrackingMode === MetricTrackingMode.MANUAL &&
      lastHistory
        ? pickHighlightMetricDeltas({
            viewsDelta: lastHistory.viewsDelta,
            likesDelta: lastHistory.likesDelta,
            commentsDelta: lastHistory.commentsDelta,
          })
        : null

    return {
      id: publication.id,
      provider: publication.provider,
      channelName: publication.channelName,
      label: publication.label,
      postUrl: publication.postUrl,
      status: publication.status,
      publishedAt: publication.publishedAt?.toISOString() ?? null,
      metricTrackingMode: publication.metricTrackingMode,
      order: publication.order,
      snapshots: publication.snapshots.map((s) => this.toSnapshotDto(s)),
      highlightMetricDeltas,
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
