/** Publication platform — maps to Excel columns (ТГ, VK, YouTube, Инста, Клуб Solo, …) */
export const Provider = {
  TELEGRAM: 'TELEGRAM',
  VK: 'VK',
  YOUTUBE: 'YOUTUBE',
  INSTAGRAM: 'INSTAGRAM',
  CLUB_SOLO_PLATFORM: 'CLUB_SOLO_PLATFORM',
  CLUB_SOLO_AUDIO: 'CLUB_SOLO_AUDIO',
  CLUB_SOLO_TEXT: 'CLUB_SOLO_TEXT',
  NEWSLETTER: 'NEWSLETTER',
  TIKTOK: 'TIKTOK',
  DZEN: 'DZEN',
  CUSTOM: 'CUSTOM',
} as const
export type Provider = (typeof Provider)[keyof typeof Provider]

export const PublicationStatus = {
  PLANNED: 'PLANNED',
  PUBLISHED: 'PUBLISHED',
} as const
export type PublicationStatus =
  (typeof PublicationStatus)[keyof typeof PublicationStatus]

/** AT_PUBLISH = snapshot at publication time; LIVE = cron-updated current stats */
export const MetricSnapshotKind = {
  AT_PUBLISH: 'AT_PUBLISH',
  LIVE: 'LIVE',
} as const
export type MetricSnapshotKind =
  (typeof MetricSnapshotKind)[keyof typeof MetricSnapshotKind]

/** AUTOMATIC = platform API / cron; MANUAL = user-maintained counts */
export const MetricTrackingMode = {
  AUTOMATIC: 'AUTOMATIC',
  MANUAL: 'MANUAL',
} as const
export type MetricTrackingMode =
  (typeof MetricTrackingMode)[keyof typeof MetricTrackingMode]

/** Origin of a metric history row */
export const MetricCaptureSource = {
  SYNC: 'SYNC',
  MANUAL: 'MANUAL',
} as const
export type MetricCaptureSource =
  (typeof MetricCaptureSource)[keyof typeof MetricCaptureSource]

/** OAuth providers used for read-only stats access */
export const OAuthProvider = {
  VK: 'VK',
  FACEBOOK: 'FACEBOOK',
} as const
export type OAuthProvider = (typeof OAuthProvider)[keyof typeof OAuthProvider]

export const OAuthConnectionStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const
export type OAuthConnectionStatus =
  (typeof OAuthConnectionStatus)[keyof typeof OAuthConnectionStatus]

export interface Metrics {
  views: number
  likes: number
  comments: number
  shares: number
}

export interface MetricSnapshotDto {
  kind: MetricSnapshotKind
  views: number
  likes: number
  comments: number
  shares: number
  capturedAt: string
}

export interface MetricHistoryEntryDto {
  id: string
  source: MetricCaptureSource
  likes: number
  comments: number
  views: number
  shares: number
  likesDelta: number
  commentsDelta: number
  viewsDelta: number
  capturedAt: string
}

export interface MetricHistoryPageDto {
  items: MetricHistoryEntryDto[]
  nextCursor: string | null
}

export interface UpdateManualMetricsRequest {
  views: number
  likes: number
  comments: number
}

export interface UpdateMetricTrackingModeRequest {
  metricTrackingMode: MetricTrackingMode
}

export interface UpdatePublicationRequest {
  label?: string
  postUrl?: string | null
  metricTrackingMode?: MetricTrackingMode
  subscriberSourceId?: string | null
}

export interface PublicationDto {
  id: string
  provider: Provider
  channelName: string
  label: string | null
  postUrl: string | null
  status: PublicationStatus
  publishedAt: string | null
  metricTrackingMode: MetricTrackingMode
  subscriberSourceId: string | null
  subscriberSourceHandle: string | null
  order: number
  snapshots: MetricSnapshotDto[]
  /** Significant negative deltas from the latest history row (manual cards). */
  highlightMetricDeltas?: {
    views: number
    likes: number
    comments: number
  } | null
}

export interface StageDto {
  id: string
  name: string
  hint: string | null
  order: number
  publications: PublicationDto[]
}

export interface TopicDto {
  id: string
  name: string
  order: number
  createdAt: string
  stages: StageDto[]
}

export interface CreateTopicRequest {
  name: string
}

export interface CreateStageRequest {
  name: string
  hint?: string
}

export interface ReorderStagesRequest {
  stageIds: string[]
}

export interface UpdateStageRequest {
  name?: string
  hint?: string | null
}

export interface ReorderPublicationsRequest {
  publicationIds: string[]
}

export interface OAuthConnectionDto {
  id: string
  provider: OAuthProvider
  channelName: string | null
  externalAccountId: string
  status: OAuthConnectionStatus
  subscriberCount: number | null
  expiresAt: string | null
}

export interface UserDto {
  id: string
  email: string
  name: string | null
}

export interface AuthTokensDto {
  accessToken: string
  refreshToken: string
  user: UserDto
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface UpdateProfileRequest {
  name?: string
  email?: string
  currentPassword?: string
  newPassword?: string
}

export interface CreatePublicationRequest {
  stageId: string
  provider: Provider
  channelName: string
  label?: string
  postUrl?: string
  status?: PublicationStatus
  metricTrackingMode?: MetricTrackingMode
  subscriberSourceId?: string | null
  /** Initial stats fetched when adding (e.g. YouTube URL lookup). */
  initialMetrics?: Pick<Metrics, 'views' | 'likes' | 'comments'>
}

/** Public video stats from YouTube Data API (server API key, no user OAuth). */
export interface YouTubeVideoMetricsDto {
  videoId: string
  title: string | null
  channelTitle: string | null
  channelId: string | null
  publishedAt: string | null
  thumbnailUrl: string | null
  views: number
  likes: number
  comments: number
}

/** Public channel stats from YouTube Data API (subscriber count, no user OAuth). */
export interface YouTubeChannelMetricsDto {
  channelId: string
  title: string | null
  handle: string | null
  thumbnailUrl: string | null
  subscriberCount: number | null
  hiddenSubscribers: boolean
}

/** Public group stats from VK API (service token, no user OAuth). */
export interface VkGroupMetricsDto {
  groupId: string
  title: string | null
  handle: string | null
  subscriberCount: number
}

/** Instagram account stats from Graph API (user OAuth via Meta). */
export interface InstagramAccountMetricsDto {
  igUserId: string
  title: string | null
  handle: string | null
  username: string | null
  profilePictureUrl: string | null
  followerCount: number
}

/** Instagram post stats from Graph API (user OAuth via Meta). */
export interface InstagramMediaMetricsDto {
  mediaId: string
  shortcode: string
  igUserId: string
  caption: string | null
  mediaType: string | null
  permalink: string
  publishedAt: string | null
  thumbnailUrl: string | null
  views: number
  likes: number
  comments: number
  shares: number
}

export interface SubscriberSnapshotDto {
  id: string
  count: number
  delta: number
  captureSource: SubscriberCaptureSource
  capturedAt: string
}

export const SubscriberTrackingMode = {
  AUTOMATIC: 'AUTOMATIC',
  MANUAL: 'MANUAL',
} as const
export type SubscriberTrackingMode =
  (typeof SubscriberTrackingMode)[keyof typeof SubscriberTrackingMode]

export const SubscriberCaptureSource = {
  SYNC: 'SYNC',
  MANUAL: 'MANUAL',
} as const
export type SubscriberCaptureSource =
  (typeof SubscriberCaptureSource)[keyof typeof SubscriberCaptureSource]

export const SubscriberHistoryEventType = {
  SUBSCRIBER_CHANGE: 'SUBSCRIBER_CHANGE',
  VIDEO_PUBLISHED: 'VIDEO_PUBLISHED',
  CHANNEL_ATTACHED: 'CHANNEL_ATTACHED',
} as const
export type SubscriberHistoryEventType =
  (typeof SubscriberHistoryEventType)[keyof typeof SubscriberHistoryEventType]

export const SubscriberHistoryContentFilter = {
  YOUTUBE: 'youtube',
  TELEGRAM: 'telegram',
  INSTAGRAM: 'instagram',
  ALL: 'all',
  ATTACHED: 'attached',
  NONE: 'none',
} as const
export type SubscriberHistoryContentFilter =
  (typeof SubscriberHistoryContentFilter)[keyof typeof SubscriberHistoryContentFilter]

/** Provider ids used in subscriber history content toggles (matches PROVIDER_UI). */
export const SUBSCRIBER_HISTORY_CONTENT_PROVIDER_IDS = [
  'tg',
  'vk',
  'youtube',
  'instagram',
  'club',
  'dzen',
] as const
export type SubscriberHistoryContentProviderId =
  (typeof SUBSCRIBER_HISTORY_CONTENT_PROVIDER_IDS)[number]

export interface SubscriberHistoryEventDto {
  id: string
  type: SubscriberHistoryEventType
  capturedAt: string
  count?: number
  delta?: number
  captureSource?: SubscriberCaptureSource
  publicationId?: string
  publicationLabel?: string
  publicationUrl?: string | null
  publicationStatus?: PublicationStatus
  publicationProvider?: Provider
  attachedChannelHandle?: string | null
  /** Set when publication is linked to this channel and all content filters are active. */
  attachedToChannel?: boolean
  subscribersAtEvent?: number | null
}

export interface SubscriberSourceDto {
  id: string
  provider: Provider
  externalId: string
  handle: string | null
  title: string | null
  profileUrl: string | null
  trackingMode: SubscriberTrackingMode
  subscriberCount: number | null
  lastChangedAt: string | null
  lastCheckedAt: string | null
  /** Delta from the most recent sync (0 if count unchanged). */
  sessionDelta: number
  /** Latest snapshot with a non-zero delta, for tooltip display. */
  lastChange: SubscriberSnapshotDto | null
}

export interface SubscriberHistoryPageDto {
  items: SubscriberHistoryEventDto[]
  nextCursor: string | null
}

export interface CreateSubscriberSourceRequest {
  input: string
  trackingMode?: SubscriberTrackingMode
  /** Starting subscriber count for manual / offline sources. */
  initialSubscriberCount?: number | null
  /** Web provider id (tg, vk, youtube, instagram) when input is ambiguous. */
  providerId?: string
}

export interface UpdateManualSubscriberCountRequest {
  count: number
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  [Provider.TELEGRAM]: 'Telegram',
  [Provider.VK]: 'VKontakte',
  [Provider.YOUTUBE]: 'YouTube',
  [Provider.INSTAGRAM]: 'Instagram',
  [Provider.CLUB_SOLO_PLATFORM]: 'Клуб Solo',
  [Provider.CLUB_SOLO_AUDIO]: 'Клуб Solo (аудио)',
  [Provider.CLUB_SOLO_TEXT]: 'Клуб Solo (текст)',
  [Provider.NEWSLETTER]: 'Рассылка',
  [Provider.TIKTOK]: 'TikTok',
  [Provider.DZEN]: 'Дзен',
  [Provider.CUSTOM]: 'Другое',
}

export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  [OAuthProvider.VK]: 'VKontakte',
  [OAuthProvider.FACEBOOK]: 'Instagram',
}
