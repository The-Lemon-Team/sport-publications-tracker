import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type {
  InstagramAccountMetricsDto,
  InstagramMediaMetricsDto,
} from '@spt/shared'
import { extractInstagramShortcode } from './instagram-url.util'
import { graphGet, shortcodeToMediaId } from './instagram-graph.util'

interface FacebookPage {
  id: string
  name?: string
  instagram_business_account?: { id: string }
}

interface FacebookAccountsResponse {
  data?: FacebookPage[]
}

interface IgUserResponse {
  id: string
  username?: string
  name?: string
  followers_count?: number
  profile_picture_url?: string
}

interface IgMediaResponse {
  id: string
  caption?: string
  media_type?: string
  permalink?: string
  timestamp?: string
  thumbnail_url?: string
  like_count?: number
  comments_count?: number
}

interface IgInsightValue {
  name: string
  values?: Array<{ value?: number }>
}

interface IgInsightsResponse {
  data?: IgInsightValue[]
}

export interface ResolvedInstagramAccount {
  igUserId: string
  username: string | null
  name: string | null
  followersCount: number
  pageId: string | null
  pageName: string | null
  profilePictureUrl: string | null
}

@Injectable()
export class InstagramService {
  async resolveBusinessAccount(
    accessToken: string,
  ): Promise<ResolvedInstagramAccount> {
    const pages = await graphGet<FacebookAccountsResponse>(
      'me/accounts',
      accessToken,
      { fields: 'id,name,instagram_business_account' },
    )

    const page = pages.data?.find((item) => item.instagram_business_account?.id)
    const igUserId = page?.instagram_business_account?.id
    if (!igUserId) {
      throw new BadRequestException(
        'No Instagram Business or Creator account linked to a Facebook Page. ' +
          'Convert the account to Professional and link it to a Page in Meta settings.',
      )
    }

    const profile = await graphGet<IgUserResponse>(igUserId, accessToken, {
      fields: 'id,username,name,followers_count,profile_picture_url',
    })

    return {
      igUserId: profile.id,
      username: profile.username ?? null,
      name: profile.name ?? null,
      followersCount: profile.followers_count ?? 0,
      pageId: page?.id ?? null,
      pageName: page?.name ?? null,
      profilePictureUrl: profile.profile_picture_url ?? null,
    }
  }

  async getAccountMetrics(
    accessToken: string,
  ): Promise<InstagramAccountMetricsDto> {
    const account = await this.resolveBusinessAccount(accessToken)
    const handle = account.username ? `@${account.username}` : null

    return {
      igUserId: account.igUserId,
      title: account.name,
      handle,
      username: account.username,
      profilePictureUrl: account.profilePictureUrl,
      followerCount: account.followersCount,
    }
  }

  async getMediaMetrics(
    accessToken: string,
    url: string,
  ): Promise<InstagramMediaMetricsDto> {
    const shortcode = extractInstagramShortcode(url)
    if (!shortcode) {
      throw new BadRequestException('Invalid Instagram post URL')
    }

    let mediaId: string
    try {
      mediaId = shortcodeToMediaId(shortcode)
    } catch {
      throw new BadRequestException('Invalid Instagram post shortcode')
    }

    const account = await this.resolveBusinessAccount(accessToken)

    let media: IgMediaResponse
    try {
      media = await graphGet<IgMediaResponse>(mediaId, accessToken, {
        fields:
          'id,caption,media_type,permalink,timestamp,thumbnail_url,like_count,comments_count',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Instagram media lookup failed'
      if (message.toLowerCase().includes('permission')) {
        throw new UnauthorizedException(
          'Instagram token cannot access this media. Connect the account that owns the post.',
        )
      }
      throw new BadRequestException(
        'Post not found or not accessible via API. Only posts from your connected account are supported.',
      )
    }

    const views = await this.fetchMediaViews(accessToken, mediaId, media.media_type)

    return {
      mediaId: media.id,
      shortcode,
      igUserId: account.igUserId,
      caption: media.caption ?? null,
      mediaType: media.media_type ?? null,
      permalink: media.permalink ?? url.trim(),
      publishedAt: media.timestamp ?? null,
      thumbnailUrl: media.thumbnail_url ?? null,
      views,
      likes: media.like_count ?? 0,
      comments: media.comments_count ?? 0,
      shares: 0,
    }
  }

  private async fetchMediaViews(
    accessToken: string,
    mediaId: string,
    mediaType?: string,
  ): Promise<number> {
    const metric = this.insightMetricForMediaType(mediaType)
    if (!metric) return 0

    try {
      const insights = await graphGet<IgInsightsResponse>(
        `${mediaId}/insights`,
        accessToken,
        { metric },
      )
      const value = insights.data?.[0]?.values?.[0]?.value
      return typeof value === 'number' ? value : 0
    } catch {
      return 0
    }
  }

  private insightMetricForMediaType(mediaType?: string): string | null {
    switch (mediaType) {
      case 'REELS':
      case 'VIDEO':
        return 'plays'
      case 'IMAGE':
      case 'CAROUSEL_ALBUM':
        return 'reach'
      default:
        return 'impressions'
    }
  }
}
