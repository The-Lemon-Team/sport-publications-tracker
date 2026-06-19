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

/** OAuth providers used for read-only stats access */
export const OAuthProvider = {
  VK: 'VK',
  GOOGLE: 'GOOGLE',
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

export interface PublicationDto {
  id: string
  provider: Provider
  channelName: string
  label: string | null
  postUrl: string | null
  status: PublicationStatus
  publishedAt: string | null
  order: number
  snapshots: MetricSnapshotDto[]
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
  stages: StageDto[]
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
  [OAuthProvider.GOOGLE]: 'YouTube',
  [OAuthProvider.FACEBOOK]: 'Instagram',
}
