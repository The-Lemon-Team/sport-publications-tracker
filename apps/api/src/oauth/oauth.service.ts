import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuthConnectionStatus, OAuthProvider, Prisma } from '@prisma/client'
import type { OAuthConnectionDto } from '@spt/shared'
import { TokenCryptoService } from '../common/crypto/token-crypto.service'
import { PrismaService } from '../prisma/prisma.service'
import type { OAuthProfile, OAuthStatePayload } from './oauth.types'

@Injectable()
export class OAuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenCryptoService) private readonly crypto: TokenCryptoService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  buildAuthorizeUrl(
    provider: OAuthProvider,
    userId: string,
    popup = false,
  ): string {
    const returnUrl = this.config.getOrThrow<string>('WEB_URL')
    const state = Buffer.from(
      JSON.stringify({ userId, returnUrl, popup }),
    ).toString('base64url')

    const routes: Record<OAuthProvider, string> = {
      [OAuthProvider.VK]: '/api/oauth/vk',
      [OAuthProvider.FACEBOOK]: '/api/oauth/facebook',
    }

    const apiUrl = this.config.getOrThrow<string>('API_URL')
    return `${apiUrl}${routes[provider]}?state=${state}`
  }

  async upsertConnection(
    userId: string,
    profile: OAuthProfile,
  ): Promise<OAuthConnectionDto> {
    const data = {
      channelName: profile.channelName,
      accessTokenEnc: this.crypto.encrypt(profile.accessToken),
      refreshTokenEnc: profile.refreshToken
        ? this.crypto.encrypt(profile.refreshToken)
        : null,
      scopes: profile.scopes,
      status: OAuthConnectionStatus.ACTIVE,
      expiresAt: profile.expiresAt,
      metadata: profile.metadata as Prisma.InputJsonValue,
    }

    const connection = await this.prisma.withFreshConnection((db) =>
      db.oAuthConnection.upsert({
        where: {
          userId_provider_externalAccountId: {
            userId,
            provider: profile.provider,
            externalAccountId: profile.externalAccountId,
          },
        },
        create: {
          userId,
          provider: profile.provider,
          externalAccountId: profile.externalAccountId,
          ...data,
        },
        update: data,
      }),
    )

    return this.toDto(connection)
  }

  async listConnections(userId: string): Promise<OAuthConnectionDto[]> {
    const rows = await this.prisma.withFreshConnection((db) =>
      db.oAuthConnection.findMany({
        where: { userId },
        orderBy: { provider: 'asc' },
      }),
    )
    return rows.map((row) => this.toDto(row))
  }

  async revokeConnection(userId: string, connectionId: string): Promise<void> {
    await this.prisma.withFreshConnection((db) =>
      db.oAuthConnection.updateMany({
        where: { id: connectionId, userId },
        data: { status: OAuthConnectionStatus.REVOKED },
      }),
    )
  }

  getDecryptedAccessToken(connection: {
    accessTokenEnc: string
  }): string {
    return this.crypto.decrypt(connection.accessTokenEnc)
  }

  getDecryptedRefreshToken(connection: {
    refreshTokenEnc: string | null
  }): string | null {
    if (!connection.refreshTokenEnc) return null
    return this.crypto.decrypt(connection.refreshTokenEnc)
  }

  parseState(state: string): OAuthStatePayload {
    const decoded = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf8'),
    ) as OAuthStatePayload
    return decoded
  }

  buildCallbackRedirect(
    returnUrl: string,
    params: { success: boolean; provider?: OAuthProvider; error?: string },
    popup = false,
  ): string {
    const path = popup ? '/oauth/callback' : '/settings/integrations'
    const url = new URL(`${returnUrl}${path}`)
    url.searchParams.set('oauth', params.success ? 'success' : 'error')
    if (params.provider) url.searchParams.set('provider', params.provider)
    if (params.error) url.searchParams.set('message', params.error)
    return url.toString()
  }

  mapRouteProvider(route: string): OAuthProvider | null {
    const normalized = route.toLowerCase()
    const map: Record<string, OAuthProvider> = {
      vk: OAuthProvider.VK,
      facebook: OAuthProvider.FACEBOOK,
      instagram: OAuthProvider.FACEBOOK,
    }
    return map[normalized] ?? null
  }

  private toDto(connection: {
    id: string
    provider: OAuthProvider
    channelName: string | null
    externalAccountId: string
    status: OAuthConnectionStatus
    subscriberCount: number | null
    expiresAt: Date | null
  }): OAuthConnectionDto {
    return {
      id: connection.id,
      provider: connection.provider,
      channelName: connection.channelName,
      externalAccountId: connection.externalAccountId,
      status: connection.status,
      subscriberCount: connection.subscriberCount,
      expiresAt: connection.expiresAt?.toISOString() ?? null,
    }
  }
}
