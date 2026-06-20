import { OAuthProvider } from '@prisma/client'

export interface OAuthProfile {
  provider: OAuthProvider
  externalAccountId: string
  channelName: string | null
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
  metadata: Record<string, unknown>
}

export interface OAuthStatePayload {
  userId: string
  returnUrl: string
  popup?: boolean
}
