import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { OAuthProvider } from '@prisma/client'
import type { OAuthConnectionDto } from '@spt/shared'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator'
import { OAuthProviderGuard } from './guards/oauth-provider.guard'
import { OAuthService } from './oauth.service'
import type { OAuthProfile } from './oauth.types'

const VkAuthGuard = OAuthProviderGuard('vkontakte')
const FacebookAuthGuard = OAuthProviderGuard('facebook')

interface OAuthRequest {
  query: { state?: string }
  user?: OAuthProfile
}

@Controller('oauth')
export class OAuthController {
  constructor(@Inject(OAuthService) private readonly oauth: OAuthService) {}

  @Get('connections')
  @UseGuards(JwtAuthGuard)
  listConnections(
    @CurrentUser() user: RequestUser,
  ): Promise<OAuthConnectionDto[]> {
    return this.oauth.listConnections(user.id)
  }

  @Delete('connections/:id')
  @UseGuards(JwtAuthGuard)
  async revokeConnection(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.oauth.revokeConnection(user.id, id)
  }

  @Get('authorize/:provider')
  @UseGuards(JwtAuthGuard)
  getAuthorizeUrl(
    @CurrentUser() user: RequestUser,
    @Param('provider') provider: string,
    @Query('popup') popup?: string,
  ): { url: string } {
    const mapped = this.oauth.mapRouteProvider(provider)
    if (!mapped) {
      throw new BadRequestException('Unknown provider')
    }
    const usePopup = popup === '1' || popup === 'true'
    return { url: this.oauth.buildAuthorizeUrl(mapped, user.id, usePopup) }
  }

  @Get('start/:provider')
  @UseGuards(JwtAuthGuard)
  startOAuth(
    @CurrentUser() user: RequestUser,
    @Param('provider') provider: string,
    @Res() res: Response,
  ): void {
    const mapped = this.oauth.mapRouteProvider(provider)
    if (!mapped) {
      res.status(400).json({ message: 'Unknown provider' })
      return
    }
    res.redirect(this.oauth.buildAuthorizeUrl(mapped, user.id))
  }

  // ─── VK ───────────────────────────────────────────────────────────────────

  @Get('vk')
  @UseGuards(VkAuthGuard)
  vkAuthorize(): void {
    // Passport redirects to VK
  }

  @Get('vk/callback')
  @UseGuards(VkAuthGuard)
  async vkCallback(
    @Req() req: OAuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleCallback(req, res)
  }

  // ─── Facebook / Instagram ─────────────────────────────────────────────────

  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  facebookAuthorize(): void {
    // Passport redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(
    @Req() req: OAuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleCallback(req, res)
  }

  private async handleCallback(
    req: OAuthRequest,
    res: Response,
  ): Promise<void> {
    const stateRaw = req.query.state
    const profile = req.user

    if (!stateRaw || !profile) {
      const fallback = this.oauth.buildCallbackRedirect(
        process.env.WEB_URL ?? 'http://localhost:5173',
        { success: false, error: 'missing_state_or_profile' },
      )
      res.redirect(fallback)
      return
    }

    try {
      const { userId, returnUrl, popup } = this.oauth.parseState(stateRaw)
      await this.oauth.upsertConnection(userId, profile)
      res.redirect(
        this.oauth.buildCallbackRedirect(
          returnUrl,
          {
            success: true,
            provider: profile.provider as OAuthProvider,
          },
          popup,
        ),
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'oauth_callback_failed'
      let popup = false
      try {
        popup = this.oauth.parseState(stateRaw).popup ?? false
      } catch {
        // ignore malformed state
      }
      res.redirect(
        this.oauth.buildCallbackRedirect(
          process.env.WEB_URL ?? 'http://localhost:5173',
          { success: false, error: message },
          popup,
        ),
      )
    }
  }
}
