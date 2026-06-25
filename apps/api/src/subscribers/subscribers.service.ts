import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  Provider,
  SubscriberCaptureSource,
  SubscriberTrackingMode,
} from '@prisma/client'
import type {
  CreateSubscriberSourceRequest,
  SubscriberHistoryEventDto,
  SubscriberHistoryPageDto,
  SubscriberSnapshotDto,
  SubscriberSourceDto,
} from '@spt/shared'
import {
  PublicationStatus,
  resolveSubscriberTrackingMode,
  SubscriberCaptureSource as SharedCaptureSource,
  SubscriberHistoryContentFilter,
  SubscriberHistoryEventType,
  SubscriberTrackingMode as SharedTrackingMode,
} from '@spt/shared'
import { PrismaService } from '../prisma/prisma.service'
import { TelegramBotService, TelegramService } from '../telegram/telegram.service'
import { VkService } from '../vk/vk.service'
import { parseVkGroupInput, vkGroupPollInput } from '../vk/vk-group.util'
import { parseYouTubeChannelInput } from '../youtube/youtube-channel.util'
import { YouTubeService } from '../youtube/youtube.service'
import { parseTelegramChannelInput } from './telegram-channel.util'
import { parseInstagramInput } from './instagram-account.util'

const HISTORY_PAGE_SIZE = 20
/** Unchanged automatic polls before writing a delta=0 CHECK snapshot. */
const UNCHANGED_CHECKS_FOR_CHECKPOINT = 5

const WEB_PROVIDER_IDS: Record<string, Provider> = {
  tg: Provider.TELEGRAM,
  vk: Provider.VK,
  youtube: Provider.YOUTUBE,
  instagram: Provider.INSTAGRAM,
}

const HISTORY_CONTENT_PROVIDERS: Provider[] = [
  Provider.TELEGRAM,
  Provider.VK,
  Provider.YOUTUBE,
  Provider.INSTAGRAM,
  Provider.CLUB_SOLO_PLATFORM,
  Provider.CLUB_SOLO_AUDIO,
  Provider.CLUB_SOLO_TEXT,
  Provider.DZEN,
]

interface HistoryContentFilterState {
  providers: Provider[]
  attachedOnly: boolean
  dedupeAttachments: boolean
  includeAttached: boolean
}

@Injectable()
export class SubscribersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(YouTubeService) private readonly youtube: YouTubeService,
    @Inject(VkService) private readonly vk: VkService,
    @Inject(TelegramBotService) private readonly telegramBots: TelegramBotService,
    @Inject(TelegramService) private readonly telegram: TelegramService,
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

  async deleteSource(userId: string, sourceId: string): Promise<void> {
    const source = await this.prisma.subscriberSource.findUnique({
      where: { id: sourceId },
    })

    if (!source) {
      throw new NotFoundException('Subscriber source not found')
    }
    if (source.userId !== userId) {
      throw new ForbiddenException()
    }

    await this.prisma.subscriberSource.delete({
      where: { id: sourceId },
    })
  }

  async createSource(
    userId: string,
    request: CreateSubscriberSourceRequest,
  ): Promise<SubscriberSourceDto> {
    const trimmed = request.input.trim()
    const hinted = this.resolveProviderFromRequest(request)

    if (hinted === Provider.INSTAGRAM) {
      return this.createInstagramSource(
        userId,
        trimmed,
        request.trackingMode,
        request,
      )
    }
    if (hinted === Provider.TELEGRAM) {
      return this.createTelegramSource(
        userId,
        trimmed,
        request.trackingMode,
        request,
      )
    }
    if (hinted === Provider.VK) {
      return this.createVkSource(userId, trimmed, request.trackingMode, request)
    }
    if (hinted === Provider.YOUTUBE) {
      return this.createYouTubeSource(
        userId,
        trimmed,
        request.trackingMode,
        request,
      )
    }

    if (parseTelegramChannelInput(trimmed)) {
      return this.createTelegramSource(
        userId,
        trimmed,
        request.trackingMode,
        request,
      )
    }
    if (parseVkGroupInput(trimmed)) {
      return this.createVkSource(userId, trimmed, request.trackingMode, request)
    }
    if (parseYouTubeChannelInput(trimmed)) {
      return this.createYouTubeSource(
        userId,
        trimmed,
        request.trackingMode,
        request,
      )
    }
    if (parseInstagramInput(trimmed)) {
      return this.createInstagramSource(
        userId,
        trimmed,
        request.trackingMode,
        request,
      )
    }
    throw new BadRequestException('Invalid channel or group URL')
  }

  private resolveProviderFromRequest(
    request: CreateSubscriberSourceRequest,
  ): Provider | null {
    if (!request.providerId) return null
    return WEB_PROVIDER_IDS[request.providerId] ?? null
  }

  private normalizeInitialCount(
    value: number | null | undefined,
  ): number | null {
    if (value === null || value === undefined) return null
    if (!Number.isFinite(value) || value < 0) return null
    return Math.floor(value)
  }

  private async applyInitialCountIfNeeded(
    source: {
      id: string
      provider: Provider
      externalId: string
      handle: string | null
      title: string | null
      profileUrl?: string | null
      trackingMode?: SubscriberTrackingMode
      subscriberCount: number | null
      lastChangedAt: Date | null
      lastCheckedAt: Date | null
    },
    initialCount: number | null,
  ): Promise<SubscriberSourceDto> {
    if (initialCount === null || source.subscriberCount !== null) {
      return this.toLiveDto(source, 0)
    }

    const now = new Date()

    await this.prisma.subscriberSnapshot.create({
      data: {
        sourceId: source.id,
        count: initialCount,
        delta: 0,
        captureSource: SubscriberCaptureSource.MANUAL,
      },
    })

    const updated = await this.prisma.subscriberSource.update({
      where: { id: source.id },
      data: {
        subscriberCount: initialCount,
        lastChangedAt: now,
        lastCheckedAt: now,
      },
    })

    return this.toLiveDto(updated, 0)
  }

  async createTelegramSource(
    userId: string,
    input: string,
    requestedMode?: SharedTrackingMode,
    request: CreateSubscriberSourceRequest = { input },
  ): Promise<SubscriberSourceDto> {
    const botConnection = await this.telegramBots.getConnection(userId)
    const trackingMode = resolveSubscriberTrackingMode(
      Provider.TELEGRAM,
      [],
      requestedMode ?? SharedTrackingMode.MANUAL,
      botConnection,
    )

    if (trackingMode === SubscriberTrackingMode.MANUAL) {
      return this.createTelegramSourceManual(userId, input, request)
    }

    const { connection, token } = await this.telegramBots.requireActiveBot(userId)
    const metrics = await this.telegram.verifyChannelAccess(token, input)
    const count = metrics.subscriberCount
    const now = new Date()

    const source = await this.prisma.subscriberSource.upsert({
      where: {
        userId_provider_externalId: {
          userId,
          provider: Provider.TELEGRAM,
          externalId: metrics.externalId,
        },
      },
      create: {
        userId,
        provider: Provider.TELEGRAM,
        externalId: metrics.externalId,
        handle: metrics.handle,
        title: metrics.title ?? metrics.handle,
        pollInput: metrics.pollInput,
        profileUrl: metrics.profileUrl,
        trackingMode: SubscriberTrackingMode.AUTOMATIC,
        telegramBotConnectionId: connection.id,
        subscriberCount: count,
        lastChangedAt: now,
        lastCheckedAt: now,
        snapshots: {
          create: {
            count,
            delta: 0,
            captureSource: SubscriberCaptureSource.SYNC,
          },
        },
      },
      update: {
        handle: metrics.handle,
        title: metrics.title ?? metrics.handle,
        pollInput: metrics.pollInput,
        profileUrl: metrics.profileUrl,
        telegramBotConnectionId: connection.id,
        trackingMode: SubscriberTrackingMode.AUTOMATIC,
        lastCheckedAt: now,
      },
    })

    return this.toLiveDto(source, 0)
  }

  async createTelegramSourceManual(
    userId: string,
    input: string,
    request: CreateSubscriberSourceRequest = { input },
  ): Promise<SubscriberSourceDto> {
    const parsed = parseTelegramChannelInput(input)
    if (!parsed) {
      throw new BadRequestException('Invalid Telegram channel or group URL')
    }

    const now = new Date()

    const source = await this.prisma.subscriberSource.upsert({
      where: {
        userId_provider_externalId: {
          userId,
          provider: Provider.TELEGRAM,
          externalId: parsed.externalId,
        },
      },
      create: {
        userId,
        provider: Provider.TELEGRAM,
        externalId: parsed.externalId,
        handle: parsed.handle,
        title: parsed.handle,
        pollInput: parsed.pollInput,
        profileUrl: parsed.profileUrl,
        trackingMode: SubscriberTrackingMode.MANUAL,
        subscriberCount: null,
        lastCheckedAt: now,
      },
      update: {
        handle: parsed.handle,
        title: parsed.handle,
        pollInput: parsed.pollInput,
        profileUrl: parsed.profileUrl,
        lastCheckedAt: now,
      },
    })

    return this.applyInitialCountIfNeeded(
      source,
      this.normalizeInitialCount(request.initialSubscriberCount),
    )
  }

  async createInstagramSource(
    userId: string,
    input: string,
    requestedMode?: SharedTrackingMode,
    request: CreateSubscriberSourceRequest = { input },
  ): Promise<SubscriberSourceDto> {
    const trackingMode = resolveSubscriberTrackingMode(
      Provider.INSTAGRAM,
      [],
      requestedMode ?? SharedTrackingMode.MANUAL,
    )

    if (trackingMode === SubscriberTrackingMode.MANUAL) {
      return this.createInstagramSourceManual(userId, input, request)
    }

    throw new BadRequestException(
      'Automatic Instagram subscriber tracking is not supported yet',
    )
  }

  async createInstagramSourceManual(
    userId: string,
    input: string,
    request: CreateSubscriberSourceRequest = { input },
  ): Promise<SubscriberSourceDto> {
    const parsed = parseInstagramInput(input)
    if (!parsed) {
      throw new BadRequestException('Invalid Instagram profile URL or handle')
    }

    const now = new Date()

    const source = await this.prisma.subscriberSource.upsert({
      where: {
        userId_provider_externalId: {
          userId,
          provider: Provider.INSTAGRAM,
          externalId: parsed.externalId,
        },
      },
      create: {
        userId,
        provider: Provider.INSTAGRAM,
        externalId: parsed.externalId,
        handle: parsed.handle,
        title: parsed.handle,
        pollInput: parsed.pollInput,
        profileUrl: parsed.profileUrl,
        trackingMode: SubscriberTrackingMode.MANUAL,
        subscriberCount: null,
        lastCheckedAt: now,
      },
      update: {
        handle: parsed.handle,
        title: parsed.handle,
        pollInput: parsed.pollInput,
        profileUrl: parsed.profileUrl,
        lastCheckedAt: now,
      },
    })

    return this.applyInitialCountIfNeeded(
      source,
      this.normalizeInitialCount(request.initialSubscriberCount),
    )
  }

  async createVkSource(
    userId: string,
    input: string,
    requestedMode?: SharedTrackingMode,
    request: CreateSubscriberSourceRequest = { input },
  ): Promise<SubscriberSourceDto> {
    const trackingMode = resolveSubscriberTrackingMode(
      Provider.VK,
      [],
      requestedMode ?? SharedTrackingMode.MANUAL,
    )

    if (trackingMode === SubscriberTrackingMode.MANUAL) {
      return this.createVkSourceManual(userId, input, request)
    }

    const metrics = await this.vk.getGroupMetrics(input)
    const count = metrics.subscriberCount
    const handle = metrics.handle ?? input.trim()
    const now = new Date()

    const source = await this.prisma.subscriberSource.upsert({
      where: {
        userId_provider_externalId: {
          userId,
          provider: Provider.VK,
          externalId: metrics.groupId,
        },
      },
      create: {
        userId,
        provider: Provider.VK,
        externalId: metrics.groupId,
        handle,
        title: metrics.title,
        pollInput: metrics.groupId,
        trackingMode: SubscriberTrackingMode.AUTOMATIC,
        subscriberCount: count,
        lastChangedAt: now,
        lastCheckedAt: now,
        snapshots: {
          create: {
            count,
            delta: 0,
            captureSource: SubscriberCaptureSource.SYNC,
          },
        },
      },
      update: {
        handle,
        title: metrics.title,
        pollInput: metrics.groupId,
        lastCheckedAt: now,
      },
    })

    return this.toLiveDto(source, 0)
  }

  async createVkSourceManual(
    userId: string,
    input: string,
    request: CreateSubscriberSourceRequest = { input },
  ): Promise<SubscriberSourceDto> {
    const lookup = parseVkGroupInput(input)
    if (!lookup) {
      throw new BadRequestException('Invalid VK group URL or screen name')
    }

    const pollInput = vkGroupPollInput(lookup)
    const handle =
      lookup.kind === 'id'
        ? `vk.com/club${lookup.groupId}`
        : `vk.com/${lookup.screenName}`
    const profileUrl = `https://${handle}`
    const now = new Date()

    const source = await this.prisma.subscriberSource.upsert({
      where: {
        userId_provider_externalId: {
          userId,
          provider: Provider.VK,
          externalId: pollInput,
        },
      },
      create: {
        userId,
        provider: Provider.VK,
        externalId: pollInput,
        handle,
        title: handle,
        pollInput,
        profileUrl,
        trackingMode: SubscriberTrackingMode.MANUAL,
        subscriberCount: null,
        lastCheckedAt: now,
      },
      update: {
        handle,
        title: handle,
        pollInput,
        profileUrl,
        lastCheckedAt: now,
      },
    })

    return this.applyInitialCountIfNeeded(
      source,
      this.normalizeInitialCount(request.initialSubscriberCount),
    )
  }

  async createYouTubeSource(
    userId: string,
    input: string,
    requestedMode?: SharedTrackingMode,
    _request: CreateSubscriberSourceRequest = { input },
  ): Promise<SubscriberSourceDto> {
    const trackingMode = resolveSubscriberTrackingMode(
      Provider.YOUTUBE,
      [],
      requestedMode ?? SharedTrackingMode.AUTOMATIC,
    )

    if (trackingMode === SubscriberTrackingMode.MANUAL) {
      throw new BadRequestException(
        'Manual YouTube subscriber tracking is not supported yet',
      )
    }

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
        trackingMode: SubscriberTrackingMode.AUTOMATIC,
        subscriberCount: count,
        lastChangedAt: now,
        lastCheckedAt: now,
        snapshots: {
          create: {
            count,
            delta: 0,
            captureSource: SubscriberCaptureSource.SYNC,
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

  async updateManualCount(
    userId: string,
    sourceId: string,
    count: number,
  ): Promise<SubscriberSourceDto> {
    if (!Number.isFinite(count) || count < 0) {
      throw new BadRequestException('Count must be a non-negative number')
    }

    const source = await this.prisma.subscriberSource.findUnique({
      where: { id: sourceId },
    })

    if (!source) {
      throw new NotFoundException('Subscriber source not found')
    }
    if (source.userId !== userId) {
      throw new ForbiddenException()
    }

    const oldCount = source.subscriberCount
    const now = new Date()
    const delta = oldCount === null ? 0 : count - oldCount

    if (oldCount !== null && delta === 0) {
      return this.toLiveDto(source, 0)
    }

    await this.prisma.subscriberSnapshot.create({
      data: {
        sourceId: source.id,
        count,
        delta,
        captureSource: SubscriberCaptureSource.MANUAL,
      },
    })

    const updated = await this.prisma.subscriberSource.update({
      where: { id: source.id },
      data: {
        subscriberCount: count,
        trackingMode: SubscriberTrackingMode.MANUAL,
        lastChangedAt: now,
        lastCheckedAt: now,
        unchangedSyncStreak: 0,
      },
    })

    return this.toLiveDto(updated, delta)
  }

  async syncForUser(userId: string): Promise<SubscriberSourceDto[]> {
    const sources = await this.prisma.subscriberSource.findMany({
      where: {
        userId,
        trackingMode: SubscriberTrackingMode.AUTOMATIC,
        provider: { in: [Provider.YOUTUBE, Provider.VK, Provider.TELEGRAM] },
      },
    })

    const results: SubscriberSourceDto[] = []

    for (const source of sources) {
      if (source.provider === Provider.VK) {
        results.push(await this.syncVkSource(source))
        continue
      }
      if (source.provider === Provider.TELEGRAM) {
        results.push(await this.syncTelegramSource(source))
        continue
      }
      results.push(await this.syncYouTubeSource(source))
    }

    return results
  }

  private async syncYouTubeSource(
    source: {
      id: string
      provider: Provider
      externalId: string
      handle: string | null
      title: string | null
      pollInput: string
      subscriberCount: number | null
      unchangedSyncStreak: number
      lastChangedAt: Date | null
      lastCheckedAt: Date | null
    },
  ): Promise<SubscriberSourceDto> {
    const metrics = await this.youtube.getChannelMetrics(source.pollInput)
    if (metrics.hiddenSubscribers) {
      return this.toLiveDto(source, 0)
    }

    const newCount = metrics.subscriberCount ?? source.subscriberCount ?? 0
    const now = new Date()
    const { sessionDelta, countChanged, nextStreak } =
      await this.recordAutomaticSync(source, newCount)

    const updated = await this.prisma.subscriberSource.update({
      where: { id: source.id },
      data: {
        subscriberCount: newCount,
        unchangedSyncStreak: nextStreak,
        handle: metrics.handle ?? source.handle,
        title: metrics.title ?? source.title,
        lastCheckedAt: now,
        ...(source.subscriberCount === null || countChanged
          ? { lastChangedAt: now }
          : {}),
      },
    })

    return this.toLiveDto(updated, sessionDelta)
  }

  private async syncTelegramSource(
    source: {
      id: string
      provider: Provider
      externalId: string
      handle: string | null
      title: string | null
      pollInput: string
      subscriberCount: number | null
      unchangedSyncStreak: number
      lastChangedAt: Date | null
      lastCheckedAt: Date | null
      telegramBotConnectionId: string | null
    },
  ): Promise<SubscriberSourceDto> {
    const token = await this.telegramBots.getDecryptedTokenForSource(
      source.telegramBotConnectionId,
    )
    if (!token) {
      return this.toLiveDto(source, 0)
    }

    try {
      const newCount = await this.telegram.getChannelMemberCount(
        token,
        source.pollInput,
      )
      const now = new Date()
      const { sessionDelta, countChanged, nextStreak } =
        await this.recordAutomaticSync(source, newCount)

      const updated = await this.prisma.subscriberSource.update({
        where: { id: source.id },
        data: {
          subscriberCount: newCount,
          unchangedSyncStreak: nextStreak,
          lastCheckedAt: now,
          ...(source.subscriberCount === null || countChanged
            ? { lastChangedAt: now }
            : {}),
        },
      })

      return this.toLiveDto(updated, sessionDelta)
    } catch {
      if (source.telegramBotConnectionId) {
        await this.telegramBots.markInvalid(source.telegramBotConnectionId)
      }
      return this.toLiveDto(source, 0)
    }
  }

  private async syncVkSource(
    source: {
      id: string
      provider: Provider
      externalId: string
      handle: string | null
      title: string | null
      pollInput: string
      subscriberCount: number | null
      unchangedSyncStreak: number
      lastChangedAt: Date | null
      lastCheckedAt: Date | null
    },
  ): Promise<SubscriberSourceDto> {
    const metrics = await this.vk.getGroupMetrics(source.pollInput)
    const newCount = metrics.subscriberCount
    const now = new Date()
    const { sessionDelta, countChanged, nextStreak } =
      await this.recordAutomaticSync(source, newCount)

    const updated = await this.prisma.subscriberSource.update({
      where: { id: source.id },
      data: {
        subscriberCount: newCount,
        unchangedSyncStreak: nextStreak,
        handle: metrics.handle ?? source.handle,
        title: metrics.title ?? source.title,
        lastCheckedAt: now,
        ...(source.subscriberCount === null || countChanged
          ? { lastChangedAt: now }
          : {}),
      },
    })

    return this.toLiveDto(updated, sessionDelta)
  }

  async getHistory(
    userId: string,
    sourceId: string,
    cursor?: string,
    limit = HISTORY_PAGE_SIZE,
    contentFilter?: string,
    publicationId?: string,
    since?: string,
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

    const pageSize = Math.min(Math.max(limit, 1), 50)
    const offset = cursor ? Number.parseInt(cursor, 10) : 0
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0

    const events = publicationId
      ? await this.buildPublicationScopedEventFeed(
          userId,
          source,
          publicationId,
          since,
        )
      : await this.buildEventFeed(
          userId,
          source,
          this.parseHistoryContentFilter(contentFilter, source.provider),
        )

    const page = events.slice(safeOffset, safeOffset + pageSize)
    const nextOffset = safeOffset + pageSize

    return {
      items: page,
      nextCursor: nextOffset < events.length ? String(nextOffset) : null,
    }
  }

  private parseHistoryContentFilter(
    raw: string | undefined,
    sourceProvider: Provider,
  ): HistoryContentFilterState {
    if (!raw) {
      return {
        providers: this.providersFromFilterIds([
          this.sourceProviderToFilterId(sourceProvider),
        ]),
        attachedOnly: false,
        dedupeAttachments: false,
        includeAttached: false,
      }
    }

    if (raw === SubscriberHistoryContentFilter.ALL) {
      return {
        providers: HISTORY_CONTENT_PROVIDERS,
        attachedOnly: false,
        dedupeAttachments: true,
        includeAttached: false,
      }
    }

    if (raw === SubscriberHistoryContentFilter.NONE) {
      return {
        providers: [],
        attachedOnly: false,
        dedupeAttachments: false,
        includeAttached: false,
      }
    }

    if (raw === SubscriberHistoryContentFilter.ATTACHED) {
      return {
        providers: [],
        attachedOnly: true,
        dedupeAttachments: false,
        includeAttached: false,
      }
    }

    const legacySingle = this.legacyProvidersForFilter(raw)
    if (legacySingle) {
      return {
        providers: legacySingle,
        attachedOnly: false,
        dedupeAttachments: false,
        includeAttached: false,
      }
    }

    const ids = raw.split(',').map((part) => part.trim()).filter(Boolean)
    const includeAttached = ids.includes('attached')
    const providerIds = ids.filter((id) => id !== 'attached')
    const providers = this.providersFromFilterIds(providerIds)
    const allIds = ['tg', 'vk', 'youtube', 'instagram', 'club', 'dzen']
    const dedupeAttachments =
      !includeAttached &&
      allIds.length === providerIds.length &&
      allIds.every((id) => providerIds.includes(id))

    if (providerIds.length === 0 && includeAttached) {
      return {
        providers: [],
        attachedOnly: true,
        dedupeAttachments: false,
        includeAttached: false,
      }
    }

    return {
      providers,
      attachedOnly: false,
      dedupeAttachments,
      includeAttached,
    }
  }

  private legacyProvidersForFilter(
    raw: string,
  ): Provider[] | null {
    switch (raw) {
      case SubscriberHistoryContentFilter.YOUTUBE:
        return [Provider.YOUTUBE]
      case SubscriberHistoryContentFilter.TELEGRAM:
        return [Provider.TELEGRAM]
      case SubscriberHistoryContentFilter.INSTAGRAM:
        return [Provider.INSTAGRAM]
      default:
        return null
    }
  }

  private sourceProviderToFilterId(sourceProvider: Provider): string {
    switch (sourceProvider) {
      case Provider.TELEGRAM:
        return 'tg'
      case Provider.VK:
        return 'vk'
      case Provider.YOUTUBE:
        return 'youtube'
      case Provider.INSTAGRAM:
        return 'instagram'
      case Provider.CLUB_SOLO_PLATFORM:
      case Provider.CLUB_SOLO_AUDIO:
      case Provider.CLUB_SOLO_TEXT:
        return 'club'
      case Provider.DZEN:
        return 'dzen'
      default:
        return 'youtube'
    }
  }

  private providersFromFilterIds(ids: string[]): Provider[] {
    const providers: Provider[] = []

    for (const id of ids) {
      switch (id) {
        case 'tg':
          providers.push(Provider.TELEGRAM)
          break
        case 'vk':
          providers.push(Provider.VK)
          break
        case 'youtube':
          providers.push(Provider.YOUTUBE)
          break
        case 'instagram':
          providers.push(Provider.INSTAGRAM)
          break
        case 'club':
          providers.push(
            Provider.CLUB_SOLO_PLATFORM,
            Provider.CLUB_SOLO_AUDIO,
            Provider.CLUB_SOLO_TEXT,
          )
          break
        case 'dzen':
          providers.push(Provider.DZEN)
          break
        default:
          break
      }
    }

    return [...new Set(providers)]
  }

  private async buildPublicationScopedEventFeed(
    userId: string,
    source: {
      id: string
      provider: Provider
      externalId: string
      handle: string | null
      title: string | null
    },
    publicationId: string,
    since?: string,
  ): Promise<SubscriberHistoryEventDto[]> {
    const publication = await this.prisma.publication.findFirst({
      where: {
        id: publicationId,
        stage: { topic: { userId } },
      },
    })

    if (!publication) {
      throw new NotFoundException('Publication not found')
    }

    if (publication.subscriberSourceId !== source.id) {
      throw new BadRequestException(
        'Publication is not linked to this subscriber source',
      )
    }

    const sinceDate = since
      ? new Date(since)
      : publication.status === PublicationStatus.PUBLISHED && publication.publishedAt
        ? publication.publishedAt
        : publication.createdAt

    if (Number.isNaN(sinceDate.getTime())) {
      throw new BadRequestException('Invalid since date')
    }

    const [allSnapshots, snapshotsSince, attachment] = await Promise.all([
      this.prisma.subscriberSnapshot.findMany({
        where: { sourceId: source.id },
        orderBy: [{ capturedAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.subscriberSnapshot.findMany({
        where: {
          sourceId: source.id,
          capturedAt: { gte: sinceDate },
        },
        orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.publicationChannelAttachment.findFirst({
        where: {
          publicationId: publication.id,
          subscriberSourceId: source.id,
        },
        include: { subscriberSource: true },
        orderBy: [{ attachedAt: 'desc' }, { id: 'desc' }],
      }),
    ])

    const events: SubscriberHistoryEventDto[] = []

    for (const snapshot of snapshotsSince) {
      events.push({
        id: `snap-${snapshot.id}`,
        type: SubscriberHistoryEventType.SUBSCRIBER_CHANGE,
        capturedAt: snapshot.capturedAt.toISOString(),
        count: snapshot.count,
        delta: snapshot.delta,
        captureSource: this.toSharedCaptureSource(snapshot.captureSource),
      })
    }

    const eventAt =
      publication.status === PublicationStatus.PUBLISHED &&
      publication.publishedAt
        ? publication.publishedAt
        : publication.createdAt

    events.push({
      id: `pub-${publication.id}`,
      type: SubscriberHistoryEventType.VIDEO_PUBLISHED,
      capturedAt: eventAt.toISOString(),
      publicationId: publication.id,
      publicationLabel: publication.label ?? publication.channelName,
      publicationUrl: publication.postUrl,
      publicationStatus: publication.status,
      publicationProvider: publication.provider,
      attachedToChannel: Boolean(attachment),
      subscribersAtEvent: this.subscribersAtTime(allSnapshots, eventAt),
    })

    if (attachment) {
      events.push({
        id: `attach-${attachment.id}`,
        type: SubscriberHistoryEventType.CHANNEL_ATTACHED,
        capturedAt: attachment.attachedAt.toISOString(),
        publicationId: publication.id,
        publicationLabel: publication.label ?? publication.channelName,
        publicationUrl: publication.postUrl,
        publicationStatus: publication.status,
        publicationProvider: publication.provider,
        attachedChannelHandle:
          attachment.subscriberSource.handle ??
          attachment.subscriberSource.title,
        subscribersAtEvent: this.subscribersAtTime(
          allSnapshots,
          attachment.attachedAt,
        ),
      })
    }

    return events.sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    )
  }

  private async buildEventFeed(
    userId: string,
    source: {
      id: string
      provider: Provider
      externalId: string
      handle: string | null
      title: string | null
    },
    contentFilter: HistoryContentFilterState,
  ): Promise<SubscriberHistoryEventDto[]> {
    const { providers, attachedOnly, dedupeAttachments, includeAttached } =
      contentFilter

    const publicationQueries: Promise<
      Awaited<ReturnType<typeof this.prisma.publication.findMany>>
    >[] = []

    if (attachedOnly) {
      publicationQueries.push(
        this.prisma.publication.findMany({
          where: {
            stage: { topic: { userId } },
            subscriberSourceId: source.id,
          },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        }),
      )
    } else if (providers.length > 0) {
      publicationQueries.push(
        this.prisma.publication.findMany({
          where: {
            stage: { topic: { userId } },
            provider: { in: providers },
          },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        }),
      )
      if (includeAttached) {
        publicationQueries.push(
          this.prisma.publication.findMany({
            where: {
              stage: { topic: { userId } },
              subscriberSourceId: source.id,
            },
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          }),
        )
      }
    }

    const [snapshots, publicationGroups, attachments] = await Promise.all([
      this.prisma.subscriberSnapshot.findMany({
        where: { sourceId: source.id },
        orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
      }),
      publicationQueries.length > 0
        ? Promise.all(publicationQueries)
        : Promise.resolve([]),
      this.prisma.publicationChannelAttachment.findMany({
        where: { subscriberSourceId: source.id },
        include: {
          publication: true,
          subscriberSource: true,
        },
        orderBy: [{ attachedAt: 'desc' }, { id: 'desc' }],
      }),
    ])

    const publications = [
      ...new Map(
        publicationGroups.flat().map((publication) => [publication.id, publication]),
      ).values(),
    ]

    const snapshotsAsc = [...snapshots].sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
    )

    const events: SubscriberHistoryEventDto[] = []

    for (const snapshot of snapshots) {
      events.push({
        id: `snap-${snapshot.id}`,
        type: SubscriberHistoryEventType.SUBSCRIBER_CHANGE,
        capturedAt: snapshot.capturedAt.toISOString(),
        count: snapshot.count,
        delta: snapshot.delta,
        captureSource: this.toSharedCaptureSource(snapshot.captureSource),
      })
    }

    const publicationIds = new Set(publications.map((publication) => publication.id))
    const attachedPublicationIds = new Set(
      attachments.map((attachment) => attachment.publicationId),
    )

    for (const publication of publications) {
      const eventAt =
        publication.status === PublicationStatus.PUBLISHED &&
        publication.publishedAt
          ? publication.publishedAt
          : publication.createdAt
      const attachedToChannel =
        dedupeAttachments && attachedPublicationIds.has(publication.id)

      events.push({
        id: `pub-${publication.id}`,
        type: SubscriberHistoryEventType.VIDEO_PUBLISHED,
        capturedAt: eventAt.toISOString(),
        publicationId: publication.id,
        publicationLabel: publication.label ?? publication.channelName,
        publicationUrl: publication.postUrl,
        publicationStatus: publication.status,
        publicationProvider: publication.provider,
        attachedToChannel: attachedToChannel || undefined,
        subscribersAtEvent: this.subscribersAtTime(snapshotsAsc, eventAt),
      })
    }

    for (const attachment of attachments) {
      if (
        dedupeAttachments &&
        publicationIds.has(attachment.publicationId)
      ) {
        continue
      }

      if (
        !attachedOnly &&
        !includeAttached &&
        providers.length > 0 &&
        !providers.includes(attachment.publication.provider)
      ) {
        continue
      }

      if (!attachedOnly && !includeAttached && providers.length === 0) {
        continue
      }

      events.push({
        id: `attach-${attachment.id}`,
        type: SubscriberHistoryEventType.CHANNEL_ATTACHED,
        capturedAt: attachment.attachedAt.toISOString(),
        publicationId: attachment.publicationId,
        publicationLabel:
          attachment.publication.label ?? attachment.publication.channelName,
        publicationUrl: attachment.publication.postUrl,
        publicationStatus: attachment.publication.status,
        publicationProvider: attachment.publication.provider,
        attachedChannelHandle:
          attachment.subscriberSource.handle ??
          attachment.subscriberSource.title,
        subscribersAtEvent: this.subscribersAtTime(
          snapshotsAsc,
          attachment.attachedAt,
        ),
      })
    }

    return events.sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    )
  }

  private subscribersAtTime(
    snapshotsAsc: Array<{ capturedAt: Date; count: number; delta: number }>,
    at: Date,
  ): number | null {
    let result: number | null = null

    for (const snapshot of snapshotsAsc) {
      if (snapshot.capturedAt.getTime() <= at.getTime()) {
        result = snapshot.count
      } else {
        break
      }
    }

    if (result !== null) return result

    const next = snapshotsAsc.find(
      (snapshot) => snapshot.capturedAt.getTime() > at.getTime(),
    )
    if (!next) return null

    return Math.max(0, next.count - next.delta)
  }

  private async toLiveDto(
    source: {
      id: string
      provider: Provider
      externalId: string
      handle: string | null
      title: string | null
      profileUrl?: string | null
      trackingMode?: SubscriberTrackingMode
      subscriberCount: number | null
      lastChangedAt: Date | null
      lastCheckedAt: Date | null
    },
    sessionDelta: number,
  ): Promise<SubscriberSourceDto> {
    const lastChange = await this.prisma.subscriberSnapshot.findFirst({
      where: { sourceId: source.id },
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
    })

    return {
      id: source.id,
      provider: source.provider,
      externalId: source.externalId,
      handle: source.handle,
      title: source.title,
      profileUrl: source.profileUrl ?? null,
      trackingMode: this.toSharedTrackingMode(
        source.trackingMode ?? SubscriberTrackingMode.AUTOMATIC,
      ),
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
    captureSource: SubscriberCaptureSource
    capturedAt: Date
  }): SubscriberSnapshotDto {
    return {
      id: snapshot.id,
      count: snapshot.count,
      delta: snapshot.delta,
      captureSource: this.toSharedCaptureSource(snapshot.captureSource),
      capturedAt: snapshot.capturedAt.toISOString(),
    }
  }

  private async recordAutomaticSync(
    source: {
      id: string
      subscriberCount: number | null
      unchangedSyncStreak: number
    },
    newCount: number,
  ): Promise<{
    sessionDelta: number
    countChanged: boolean
    nextStreak: number
  }> {
    const oldCount = source.subscriberCount

    if (oldCount === null) {
      await this.prisma.subscriberSnapshot.create({
        data: {
          sourceId: source.id,
          count: newCount,
          delta: 0,
          captureSource: SubscriberCaptureSource.SYNC,
        },
      })
      return { sessionDelta: 0, countChanged: true, nextStreak: 0 }
    }

    if (newCount !== oldCount) {
      const sessionDelta = newCount - oldCount
      await this.prisma.subscriberSnapshot.create({
        data: {
          sourceId: source.id,
          count: newCount,
          delta: sessionDelta,
          captureSource: SubscriberCaptureSource.SYNC,
        },
      })
      return { sessionDelta, countChanged: true, nextStreak: 0 }
    }

    const nextStreak = source.unchangedSyncStreak + 1
    if (nextStreak >= UNCHANGED_CHECKS_FOR_CHECKPOINT) {
      await this.prisma.subscriberSnapshot.create({
        data: {
          sourceId: source.id,
          count: newCount,
          delta: 0,
          captureSource: SubscriberCaptureSource.CHECK,
        },
      })
      return { sessionDelta: 0, countChanged: false, nextStreak: 0 }
    }

    return { sessionDelta: 0, countChanged: false, nextStreak }
  }

  private toSharedCaptureSource(
    source: SubscriberCaptureSource,
  ): SharedCaptureSource {
    if (source === SubscriberCaptureSource.MANUAL) {
      return SharedCaptureSource.MANUAL
    }
    if (source === SubscriberCaptureSource.CHECK) {
      return SharedCaptureSource.CHECK
    }
    return SharedCaptureSource.SYNC
  }

  private toSharedTrackingMode(
    mode: SubscriberTrackingMode,
  ): SharedTrackingMode {
    return mode === SubscriberTrackingMode.MANUAL
      ? SharedTrackingMode.MANUAL
      : SharedTrackingMode.AUTOMATIC
  }
}
