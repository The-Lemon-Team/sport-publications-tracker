import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
  YouTubeChannelMetricsDto,
  YouTubeVideoMetricsDto,
} from '@spt/shared'
import { parseYouTubeChannelInput } from './youtube-channel.util'
import { extractYouTubeVideoId } from './youtube-url.util'

interface YouTubeVideosResponse {
  items?: Array<{
    id: string
    snippet?: {
      title?: string
      channelTitle?: string
      channelId?: string
      publishedAt?: string
      thumbnails?: { default?: { url?: string } }
    }
    statistics?: {
      viewCount?: string
      likeCount?: string
      commentCount?: string
    }
  }>
  error?: { message?: string; errors?: Array<{ reason?: string }> }
}

interface YouTubeChannelsResponse {
  items?: Array<{
    id: string
    snippet?: {
      title?: string
      customUrl?: string
      thumbnails?: { default?: { url?: string } }
    }
    statistics?: {
      subscriberCount?: string
      hiddenSubscriberCount?: boolean
    }
  }>
  error?: { message?: string; errors?: Array<{ reason?: string }> }
}

@Injectable()
export class YouTubeService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async getVideoMetrics(url: string): Promise<YouTubeVideoMetricsDto> {
    const videoId = extractYouTubeVideoId(url)
    if (!videoId) {
      throw new BadRequestException('Invalid YouTube URL')
    }

    const apiKey = this.config.get<string>('YOUTUBE_API_KEY')
    if (!apiKey) {
      throw new ServiceUnavailableException('YouTube API key is not configured')
    }

    const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos')
    endpoint.searchParams.set('part', 'statistics,snippet')
    endpoint.searchParams.set('id', videoId)
    endpoint.searchParams.set('key', apiKey)

    const response = await fetch(endpoint)
    const data = (await response.json()) as YouTubeVideosResponse

    if (!response.ok) {
      const reason = data.error?.errors?.[0]?.reason
      if (reason === 'quotaExceeded') {
        throw new ServiceUnavailableException('YouTube API quota exceeded')
      }
      throw new ServiceUnavailableException(
        data.error?.message ?? 'YouTube API request failed',
      )
    }

    const item = data.items?.[0]
    if (!item) {
      throw new BadRequestException('Video not found or is private')
    }

    const stats = item.statistics ?? {}

    return {
      videoId: item.id,
      title: item.snippet?.title ?? null,
      channelTitle: item.snippet?.channelTitle ?? null,
      channelId: item.snippet?.channelId ?? null,
      publishedAt: item.snippet?.publishedAt ?? null,
      thumbnailUrl: item.snippet?.thumbnails?.default?.url ?? null,
      views: Number(stats.viewCount ?? 0),
      likes: Number(stats.likeCount ?? 0),
      comments: Number(stats.commentCount ?? 0),
    }
  }

  async getChannelMetrics(input: string): Promise<YouTubeChannelMetricsDto> {
    const lookup = parseYouTubeChannelInput(input)
    if (!lookup) {
      throw new BadRequestException('Invalid YouTube channel URL or handle')
    }

    const apiKey = this.config.get<string>('YOUTUBE_API_KEY')
    if (!apiKey) {
      throw new ServiceUnavailableException('YouTube API key is not configured')
    }

    const endpoint = new URL('https://www.googleapis.com/youtube/v3/channels')
    endpoint.searchParams.set('part', 'statistics,snippet')
    if (lookup.kind === 'id') {
      endpoint.searchParams.set('id', lookup.channelId)
    } else {
      endpoint.searchParams.set('forHandle', lookup.handle)
    }
    endpoint.searchParams.set('key', apiKey)

    const response = await fetch(endpoint)
    const data = (await response.json()) as YouTubeChannelsResponse

    if (!response.ok) {
      const reason = data.error?.errors?.[0]?.reason
      if (reason === 'quotaExceeded') {
        throw new ServiceUnavailableException('YouTube API quota exceeded')
      }
      throw new ServiceUnavailableException(
        data.error?.message ?? 'YouTube API request failed',
      )
    }

    const item = data.items?.[0]
    if (!item) {
      throw new BadRequestException('Channel not found')
    }

    const stats = item.statistics ?? {}
    const hiddenSubscribers = stats.hiddenSubscriberCount === true
    const customUrl = item.snippet?.customUrl

    return {
      channelId: item.id,
      title: item.snippet?.title ?? null,
      handle: customUrl ? `@${customUrl.replace(/^@/, '')}` : null,
      thumbnailUrl: item.snippet?.thumbnails?.default?.url ?? null,
      subscriberCount: hiddenSubscribers
        ? null
        : Number(stats.subscriberCount ?? 0),
      hiddenSubscribers,
    }
  }

  async getChannelMetricsBatch(
    inputs: string[],
  ): Promise<YouTubeChannelMetricsDto[]> {
    const uniqueInputs = [...new Set(inputs.map((i) => i.trim()).filter(Boolean))]
    if (uniqueInputs.length === 0) return []

    const results = await Promise.all(
      uniqueInputs.map((input) => this.getChannelMetrics(input)),
    )
    return results
  }
}
