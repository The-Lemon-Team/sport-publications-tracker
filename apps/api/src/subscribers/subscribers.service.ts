import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Provider } from '@prisma/client'
import type {
  SubscriberHistoryPageDto,
  SubscriberSnapshotDto,
  SubscriberSourceDto,
} from '@spt/shared'
import { PrismaService } from '../prisma/prisma.service'
import { YouTubeService } from '../youtube/youtube.service'

const HISTORY_PAGE_SIZE = 20

@Injectable()
export class SubscribersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(YouTubeService) private readonly youtube: YouTubeService,
  ) {}

  async findAllForUser(userId: string): Promise<SubscriberSourceDto[]> {
    const sources = await this.prisma.subscriberSource.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })

    return Promise.all(
      sources.map(async (source) => this.toLiveDto(source, 0)),
    )
  }

  async createYouTubeSource(
    userId: string,
    input: string,
  ): Promise<SubscriberSourceDto> {
    const metrics = await this.youtube.getChannelMetrics(input)

    if (metrics.hiddenSubscribers) {
      throw new BadRequestException(
        'This channel hides its subscriber count',
      )
    }

    const count = metrics.subscriberCount ?? 0
    const handle =
      metrics.handle ??
      (input.trim().startsWith('@') ? input.trim() : `@${input.trim()}`)
    const now = new Date()

    const source = await this.prisma.subscriberSource.upsert({
      where: {
        userId_provider_externalId: {
          userId,
          provider: Provider.YOUTUBE,
          externalId: metrics.channelId,
        },
      },
      create: {
        userId,
        provider: Provider.YOUTUBE,
        externalId: metrics.channelId,
        handle,
        title: metrics.title,
        pollInput: metrics.channelId,
        subscriberCount: count,
        lastChangedAt: now,
        lastCheckedAt: now,
        snapshots: {
          create: {
            count,
            delta: 0,
          },
        },
      },
      update: {
        handle,
        title: metrics.title,
        pollInput: metrics.channelId,
        lastCheckedAt: now,
      },
    })

    return this.toLiveDto(source, 0)
  }

  async syncForUser(userId: string): Promise<SubscriberSourceDto[]> {
    const sources = await this.prisma.subscriberSource.findMany({
      where: { userId, provider: Provider.YOUTUBE },
    })

    const results: SubscriberSourceDto[] = []

    for (const source of sources) {
      const metrics = await this.youtube.getChannelMetrics(source.pollInput)
      if (metrics.hiddenSubscribers) {
        results.push(await this.toLiveDto(source, 0))
        continue
      }

      const newCount = metrics.subscriberCount ?? source.subscriberCount ?? 0
      const oldCount = source.subscriberCount
      const now = new Date()
      let sessionDelta = 0

      if (oldCount === null) {
        await this.prisma.subscriberSnapshot.create({
          data: { sourceId: source.id, count: newCount, delta: 0 },
        })
      } else if (newCount !== oldCount) {
        sessionDelta = newCount - oldCount
        await this.prisma.subscriberSnapshot.create({
          data: {
            sourceId: source.id,
            count: newCount,
            delta: sessionDelta,
          },
        })
      }

      const updated = await this.prisma.subscriberSource.update({
        where: { id: source.id },
        data: {
          subscriberCount: newCount,
          handle: metrics.handle ?? source.handle,
          title: metrics.title ?? source.title,
          lastCheckedAt: now,
          ...(oldCount === null || newCount !== oldCount
            ? { lastChangedAt: now }
            : {}),
        },
      })

      results.push(await this.toLiveDto(updated, sessionDelta))
    }

    return results
  }

  async getHistory(
    userId: string,
    sourceId: string,
    cursor?: string,
    limit = HISTORY_PAGE_SIZE,
  ): Promise<SubscriberHistoryPageDto> {
    const source = await this.prisma.subscriberSource.findUnique({
      where: { id: sourceId },
    })

    if (!source) {
      throw new NotFoundException('Subscriber source not found')
    }
    if (source.userId !== userId) {
      throw new ForbiddenException()
    }

    const take = Math.min(Math.max(limit, 1), 50)
    const cursorFilter = cursor ? this.decodeCursor(cursor) : null

    const snapshots = await this.prisma.subscriberSnapshot.findMany({
      where: {
        sourceId,
        ...(cursorFilter
          ? {
              OR: [
                { capturedAt: { lt: cursorFilter.capturedAt } },
                {
                  capturedAt: cursorFilter.capturedAt,
                  id: { lt: cursorFilter.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    })

    const hasMore = snapshots.length > take
    const items = hasMore ? snapshots.slice(0, take) : snapshots
    const last = items.at(-1)

    return {
      items: items.map((snapshot) => this.toSnapshotDto(snapshot)),
      nextCursor:
        hasMore && last
          ? this.encodeCursor(last.capturedAt, last.id)
          : null,
    }
  }

  private async toLiveDto(
    source: {
      id: string
      provider: Provider
      externalId: string
      handle: string | null
      title: string | null
      subscriberCount: number | null
      lastChangedAt: Date | null
      lastCheckedAt: Date | null
    },
    sessionDelta: number,
  ): Promise<SubscriberSourceDto> {
    const lastChange = await this.prisma.subscriberSnapshot.findFirst({
      where: { sourceId: source.id, delta: { not: 0 } },
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
    })

    return {
      id: source.id,
      provider: source.provider,
      externalId: source.externalId,
      handle: source.handle,
      title: source.title,
      subscriberCount: source.subscriberCount,
      lastChangedAt: source.lastChangedAt?.toISOString() ?? null,
      lastCheckedAt: source.lastCheckedAt?.toISOString() ?? null,
      sessionDelta,
      lastChange: lastChange ? this.toSnapshotDto(lastChange) : null,
    }
  }

  private toSnapshotDto(snapshot: {
    id: string
    count: number
    delta: number
    capturedAt: Date
  }): SubscriberSnapshotDto {
    return {
      id: snapshot.id,
      count: snapshot.count,
      delta: snapshot.delta,
      capturedAt: snapshot.capturedAt.toISOString(),
    }
  }

  private encodeCursor(capturedAt: Date, id: string): string {
    return `${capturedAt.toISOString()}|${id}`
  }

  private decodeCursor(cursor: string): { capturedAt: Date; id: string } | null {
    const [iso, id] = cursor.split('|')
    if (!iso || !id) return null
    const capturedAt = new Date(iso)
    if (Number.isNaN(capturedAt.getTime())) return null
    return { capturedAt, id }
  }
}
