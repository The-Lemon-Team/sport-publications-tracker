import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  MetricCaptureSource,
  MetricSnapshotKind,
  MetricTrackingMode,
  Provider,
  PublicationStatus,
  pickHighlightMetricDeltas,
  resolveMetricTrackingMode,
  type MetricHistoryEntryDto,
  type MetricHistoryPageDto,
  type PublicationDto,
} from '@spt/shared'
import type { PrismaClient } from '@prisma/client'
import { OAuthService } from '../oauth/oauth.service'
import { PrismaService } from '../prisma/prisma.service'
import { TopicsService } from '../topics/topics.service'
import { YouTubeService } from '../youtube/youtube.service'
import type { CreatePublicationDto } from './dto/create-publication.dto'
import type { UpdatePublicationDto } from './dto/update-publication.dto'

const HISTORY_PAGE_SIZE = 20

const publicationForDtoInclude = {
  snapshots: true,
  metricHistory: {
    orderBy: [{ capturedAt: 'desc' as const }, { id: 'desc' as const }],
    take: 1,
  },
}

type SnapshotMetrics = {
  views: number
  likes: number
  comments: number
  shares: number
}

@Injectable()
export class PublicationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TopicsService) private readonly topics: TopicsService,
    @Inject(YouTubeService) private readonly youtube: YouTubeService,
    @Inject(OAuthService) private readonly oauth: OAuthService,
  ) {}

  async createPublication(
    userId: string,
    dto: CreatePublicationDto,
  ): Promise<PublicationDto> {
    const stage = await this.prisma.withFreshConnection((db) =>
      db.stage.findUnique({
        where: { id: dto.stageId },
        include: { topic: true },
      }),
    )

    if (!stage) {
      throw new NotFoundException('Этап не найден')
    }

    if (stage.topic.userId !== userId) {
      throw new ForbiddenException()
    }

    const metricTrackingMode = resolveMetricTrackingMode(
      dto.provider,
      await this.oauth.listConnections(userId),
      dto.metricTrackingMode,
    )
    const postUrl = dto.postUrl?.trim() || null
    const status =
      dto.status ??
      (postUrl ? PublicationStatus.PUBLISHED : PublicationStatus.PLANNED)

    let initialMetrics = dto.initialMetrics

    if (
      !initialMetrics &&
      metricTrackingMode === MetricTrackingMode.AUTOMATIC &&
      dto.provider === Provider.YOUTUBE &&
      postUrl
    ) {
      const videoMetrics = await this.youtube.getVideoMetrics(postUrl)
      initialMetrics = {
        views: videoMetrics.views,
        likes: videoMetrics.likes,
        comments: videoMetrics.comments,
      }
    }

    const maxOrder = await this.prisma.withFreshConnection((db) =>
      db.publication.aggregate({
        where: { stageId: dto.stageId },
        _max: { order: true },
      }),
    )
    const order = (maxOrder._max.order ?? -1) + 1

    const publication = await this.prisma.withFreshConnection(async (db) => {
      const created = await db.publication.create({
        data: {
          stageId: dto.stageId,
          provider: dto.provider,
          channelName: dto.channelName.trim(),
          label: dto.label?.trim() || null,
          postUrl,
          status,
          publishedAt:
            status === PublicationStatus.PUBLISHED ? new Date() : null,
          metricTrackingMode,
          order,
        },
        include: { snapshots: true },
      })

      if (initialMetrics) {
        await this.seedInitialMetrics(db, created.id, initialMetrics)
      }

      return db.publication.findUniqueOrThrow({
        where: { id: created.id },
        include: { snapshots: true },
      })
    })

    return this.topics.toPublicationDto(publication)
  }

  async updatePublication(
    userId: string,
    publicationId: string,
    dto: UpdatePublicationDto,
  ): Promise<PublicationDto> {
    const publication = await this.getOwnedPublication(userId, publicationId)
    const connections = await this.oauth.listConnections(userId)

    const previousMode = publication.metricTrackingMode as MetricTrackingMode
    let nextMode = previousMode

    if (dto.metricTrackingMode !== undefined) {
      nextMode = resolveMetricTrackingMode(
        publication.provider as Provider,
        connections,
        dto.metricTrackingMode,
      )
      if (nextMode !== dto.metricTrackingMode) {
        throw new BadRequestException(
          'Автоматический учёт (Live) недоступен для этой площадки без авторизации',
        )
      }
    }

    const postUrl =
      dto.postUrl !== undefined
        ? dto.postUrl?.trim() || null
        : publication.postUrl
    const label =
      dto.label !== undefined ? dto.label.trim() || null : publication.label

    const modeChangingToLive =
      previousMode === MetricTrackingMode.MANUAL &&
      nextMode === MetricTrackingMode.AUTOMATIC
    const modeChangingToManual =
      previousMode === MetricTrackingMode.AUTOMATIC &&
      nextMode === MetricTrackingMode.MANUAL

    let syncedMetrics: Pick<
      SnapshotMetrics,
      'views' | 'likes' | 'comments'
    > | null = null

    if (
      modeChangingToLive &&
      publication.provider === Provider.YOUTUBE &&
      postUrl
    ) {
      const videoMetrics = await this.youtube.getVideoMetrics(postUrl)
      syncedMetrics = {
        views: videoMetrics.views,
        likes: videoMetrics.likes,
        comments: videoMetrics.comments,
      }
    }

    const updated = await this.prisma.withFreshConnection(async (db) => {
      const liveSnapshot = publication.snapshots.find(
        (snapshot) => snapshot.kind === MetricSnapshotKind.LIVE,
      )
      const currentMetrics = this.snapshotToMetrics(liveSnapshot)

      if (modeChangingToManual) {
        const lastEntry = await db.metricHistoryEntry.findFirst({
          where: { publicationId },
          orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
        })
        const previousMetrics = lastEntry
          ? {
              views: lastEntry.views,
              likes: lastEntry.likes,
              comments: lastEntry.comments,
              shares: lastEntry.shares,
            }
          : currentMetrics

        const highlight = pickHighlightMetricDeltas({
          viewsDelta: currentMetrics.views - previousMetrics.views,
          likesDelta: currentMetrics.likes - previousMetrics.likes,
          commentsDelta: currentMetrics.comments - previousMetrics.comments,
        })

        const previousForHistory: SnapshotMetrics = {
          views: currentMetrics.views - (highlight?.views ?? 0),
          likes: currentMetrics.likes - (highlight?.likes ?? 0),
          comments: currentMetrics.comments - (highlight?.comments ?? 0),
          shares: currentMetrics.shares,
        }

        await this.recordTransitionHistory(
          db,
          publicationId,
          MetricCaptureSource.MANUAL,
          currentMetrics,
          previousForHistory,
        )
      }

      if (modeChangingToLive) {
        const nextMetrics = syncedMetrics
          ? { ...currentMetrics, ...syncedMetrics }
          : currentMetrics

        if (syncedMetrics) {
          await this.upsertLiveSnapshot(db, publicationId, nextMetrics)
        }

        await this.recordTransitionHistory(
          db,
          publicationId,
          MetricCaptureSource.SYNC,
          nextMetrics,
          currentMetrics,
        )
      }

      const data: {
        label?: string | null
        postUrl?: string | null
        metricTrackingMode?: MetricTrackingMode
        status?: PublicationStatus
        publishedAt?: Date | null
      } = {}

      if (dto.label !== undefined) {
        data.label = label
      }

      if (dto.postUrl !== undefined) {
        data.postUrl = postUrl
        if (postUrl && publication.status === PublicationStatus.PLANNED) {
          data.status = PublicationStatus.PUBLISHED
          data.publishedAt = new Date()
        } else if (!postUrl && publication.status === PublicationStatus.PUBLISHED) {
          data.status = PublicationStatus.PLANNED
          data.publishedAt = null
        }
      }

      if (dto.metricTrackingMode !== undefined) {
        data.metricTrackingMode = nextMode
      }

      await db.publication.update({
        where: { id: publicationId },
        data,
      })

      return db.publication.findUniqueOrThrow({
        where: { id: publicationId },
        include: publicationForDtoInclude,
      })
    })

    return this.topics.toPublicationDto(updated)
  }

  async deletePublication(
    userId: string,
    publicationId: string,
  ): Promise<void> {
    await this.getOwnedPublication(userId, publicationId)

    await this.prisma.withFreshConnection((db) =>
      db.publication.delete({
        where: { id: publicationId },
      }),
    )
  }

  async updateMetricTrackingMode(
    userId: string,
    publicationId: string,
    metricTrackingMode: MetricTrackingMode,
  ): Promise<PublicationDto> {
    const publication = await this.getOwnedPublication(userId, publicationId)
    const connections = await this.oauth.listConnections(userId)
    const resolvedMode = resolveMetricTrackingMode(
      publication.provider as Provider,
      connections,
      metricTrackingMode,
    )

    if (resolvedMode !== metricTrackingMode) {
      throw new BadRequestException(
        'Автоматический учёт (Live) недоступен для этой площадки без авторизации',
      )
    }

    if (publication.metricTrackingMode === resolvedMode) {
      const withHistory = await this.prisma.withFreshConnection((db) =>
        db.publication.findUniqueOrThrow({
          where: { id: publicationId },
          include: publicationForDtoInclude,
        }),
      )
      return this.topics.toPublicationDto(withHistory)
    }

    return this.updatePublication(userId, publicationId, {
      metricTrackingMode: resolvedMode,
    })
  }

  async updateManualMetrics(
    userId: string,
    publicationId: string,
    likes: number,
    comments: number,
  ): Promise<PublicationDto> {
    const publication = await this.getOwnedPublication(userId, publicationId)

    if (publication.metricTrackingMode !== MetricTrackingMode.MANUAL) {
      throw new BadRequestException(
        'Ручное обновление доступно только для публикаций с ручным учётом метрик',
      )
    }

    const liveSnapshot = publication.snapshots.find(
      (snapshot) => snapshot.kind === MetricSnapshotKind.LIVE,
    )
    const previousLikes = liveSnapshot?.likes ?? 0
    const previousComments = liveSnapshot?.comments ?? 0
    const likesDelta = likes - previousLikes
    const commentsDelta = comments - previousComments

    if (likesDelta === 0 && commentsDelta === 0) {
      return this.topics.toPublicationDto(publication)
    }

    const updated = await this.prisma.withFreshConnection(async (db) => {
      await db.metricSnapshot.upsert({
        where: {
          publicationId_kind: {
            publicationId,
            kind: MetricSnapshotKind.LIVE,
          },
        },
        create: {
          publicationId,
          kind: MetricSnapshotKind.LIVE,
          likes,
          comments,
          views: liveSnapshot?.views ?? 0,
          shares: liveSnapshot?.shares ?? 0,
        },
        update: {
          likes,
          comments,
          capturedAt: new Date(),
        },
      })

      await db.metricHistoryEntry.create({
        data: {
          publicationId,
          source: MetricCaptureSource.MANUAL,
          likes,
          comments,
          views: liveSnapshot?.views ?? 0,
          shares: liveSnapshot?.shares ?? 0,
          likesDelta,
          commentsDelta,
          viewsDelta: 0,
        },
      })

      return db.publication.findUniqueOrThrow({
        where: { id: publicationId },
        include: publicationForDtoInclude,
      })
    })

    return this.topics.toPublicationDto(updated)
  }

  async getMetricHistory(
    userId: string,
    publicationId: string,
    cursor?: string,
    limit = HISTORY_PAGE_SIZE,
  ): Promise<MetricHistoryPageDto> {
    await this.getOwnedPublication(userId, publicationId)

    const entries = await this.prisma.withFreshConnection((db) =>
      db.metricHistoryEntry.findMany({
        where: { publicationId },
        orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
      }),
    )

    const hasMore = entries.length > limit
    const page = hasMore ? entries.slice(0, limit) : entries

    return {
      items: page.map((entry) => this.toHistoryDto(entry)),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    }
  }

  private async getOwnedPublication(userId: string, publicationId: string) {
    const publication = await this.prisma.withFreshConnection((db) =>
      db.publication.findUnique({
        where: { id: publicationId },
        include: {
          snapshots: true,
          stage: {
            include: {
              topic: true,
            },
          },
        },
      }),
    )

    if (!publication) {
      throw new NotFoundException('Публикация не найдена')
    }

    if (publication.stage.topic.userId !== userId) {
      throw new ForbiddenException()
    }

    return publication
  }

  private snapshotToMetrics(
    snapshot?: {
      views: number
      likes: number
      comments: number
      shares: number
    } | null,
  ): SnapshotMetrics {
    return {
      views: snapshot?.views ?? 0,
      likes: snapshot?.likes ?? 0,
      comments: snapshot?.comments ?? 0,
      shares: snapshot?.shares ?? 0,
    }
  }

  private async upsertLiveSnapshot(
    db: PrismaClient,
    publicationId: string,
    metrics: SnapshotMetrics,
  ) {
    await db.metricSnapshot.upsert({
      where: {
        publicationId_kind: {
          publicationId,
          kind: MetricSnapshotKind.LIVE,
        },
      },
      create: {
        publicationId,
        kind: MetricSnapshotKind.LIVE,
        ...metrics,
      },
      update: {
        ...metrics,
        capturedAt: new Date(),
      },
    })
  }

  private async recordTransitionHistory(
    db: PrismaClient,
    publicationId: string,
    source: MetricCaptureSource,
    metrics: SnapshotMetrics,
    previous: SnapshotMetrics,
  ) {
    await db.metricHistoryEntry.create({
      data: {
        publicationId,
        source,
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        likesDelta: metrics.likes - previous.likes,
        commentsDelta: metrics.comments - previous.comments,
        viewsDelta: metrics.views - previous.views,
      },
    })
  }

  private async seedInitialMetrics(
    db: PrismaClient,
    publicationId: string,
    metrics: { views: number; likes: number; comments: number },
  ) {
    const snapshotPayload = {
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: 0,
    }

    await db.metricSnapshot.createMany({
      data: [
        {
          publicationId,
          kind: MetricSnapshotKind.AT_PUBLISH,
          ...snapshotPayload,
        },
        {
          publicationId,
          kind: MetricSnapshotKind.LIVE,
          ...snapshotPayload,
        },
      ],
    })

    await db.metricHistoryEntry.create({
      data: {
        publicationId,
        source: MetricCaptureSource.SYNC,
        ...snapshotPayload,
        likesDelta: 0,
        commentsDelta: 0,
        viewsDelta: 0,
      },
    })
  }

  private toHistoryDto(entry: {
    id: string
    source: MetricCaptureSource
    likes: number
    comments: number
    views: number
    shares: number
    likesDelta: number
    commentsDelta: number
    viewsDelta: number
    capturedAt: Date
  }): MetricHistoryEntryDto {
    return {
      id: entry.id,
      source: entry.source,
      likes: entry.likes,
      comments: entry.comments,
      views: entry.views,
      shares: entry.shares,
      likesDelta: entry.likesDelta,
      commentsDelta: entry.commentsDelta,
      viewsDelta: entry.viewsDelta,
      capturedAt: entry.capturedAt.toISOString(),
    }
  }
}
