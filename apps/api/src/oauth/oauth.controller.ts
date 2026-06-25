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
  forwardRef,
} from '@nestjs/common'
import type { Response } from 'express'
import { OAuthProvider } from '@prisma/client'
import type { OAuthConnectionDto } from '@spt/shared'
// import { AuthService } from '../auth/auth.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator'
import { InstagramService } from '../instagram/instagram.service'
import { OAuthProviderGuard } from './guards/oauth-provider.guard'
import { OAuthService } from './oauth.service'
// import { VkOAuthService } from './vk-oauth.service'
import type { OAuthProfile } from './oauth.types'

const FacebookAuthGuard = OAuthProviderGuard('facebook')

interface OAuthRequest {
  query: { state?: string }
  user?: OAuthProfile
}

@Controller('oauth')
export class OAuthController {
  constructor(
    @Inject(OAuthService) private readonly oauth: OAuthService,
    // @Inject(VkOAuthService) private readonly vkOAuth: VkOAuthService,
    // @Inject(AuthService) private readonly auth: AuthService,
    @Inject(forwardRef(() => InstagramService))
    private readonly instagram: InstagramService,
  ) {}

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

  // ─── VK (site login + integration) — disabled ───────────────────────────────
  //
  // @Get('vk')
  // vkAuthorize(@Query('state') state: string | undefined, @Res() res: Response): void {
  //   if (!state) {
  //     res.status(400).json({ message: 'missing_state' })
  //     return
  //   }
  //   if (!process.env.VK_APP_ID || !process.env.VK_APP_SECRET) {
  //     res.status(503).json({ message: 'VK OAuth is not configured' })
  //     return
  //   }
  //   res.redirect(this.vkOAuth.buildAuthorizeUrl(state))
  // }
  //
  // @Get('vk/callback')
  // async vkCallback(
  //   @Query('code') code: string | undefined,
  //   @Query('state') stateRaw: string | undefined,
  //   @Query('error') error: string | undefined,
  //   @Query('error_description') errorDescription: string | undefined,
  //   @Res() res: Response,
  // ): Promise<void> {
  //   ...
  // }
  //
  // private async handleVkProfile(
  //   stateRaw: string,
  //   profile: OAuthProfile,
  //   res: Response,
  // ): Promise<void> {
  //   ...
  // }

  private async handleCallback(
    req: OAuthRequest,
    res: Response,
  ): Promise<void> {
    const stateRaw = req.query.state
    const profileRaw = req.user

    if (!stateRaw || !profileRaw) {
      const fallback = this.oauth.buildCallbackRedirect(
        process.env.WEB_URL ?? 'http://localhost:5173',
        { success: false, error: 'missing_state_or_profile' },
      )
      res.redirect(fallback)
      return
    }

    try {
      const { userId, returnUrl, popup, mode } = this.oauth.parseState(stateRaw)
      const profile = await this.enrichProfile(profileRaw)

      if (mode === 'login') {
        res.redirect(
          this.oauth.buildCallbackRedirect(
            returnUrl,
            { success: false, error: 'vk_login_disabled' },
            popup,
            mode,
          ),
        )
        return
      }

      if (!userId) {
        throw new Error('missing_user_id')
      }

      await this.oauth.upsertConnection(userId, profile)
      res.redirect(
        this.oauth.buildCallbackRedirect(
          returnUrl,
          {
            success: true,
            provider: profile.provider as OAuthProvider,
          },
          popup,
          mode,
        ),
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'oauth_callback_failed'
      let popup = false
      let returnUrl = process.env.WEB_URL ?? 'http://localhost:5173'
      let mode: 'login' | 'connect' = 'connect'
      try {
        const parsed = this.oauth.parseState(stateRaw)
        popup = parsed.popup ?? false
        returnUrl = parsed.returnUrl
        mode = parsed.mode
      } catch {
        // ignore malformed state
      }

      if (mode === 'login') {
        const url = new URL(`${returnUrl}/auth/vk/callback`)
        url.searchParams.set('oauth', 'error')
        url.searchParams.set('message', message)
        res.redirect(url.toString())
        return
      }

      res.redirect(
        this.oauth.buildCallbackRedirect(
          returnUrl,
          { success: false, error: message },
          popup,
          mode,
        ),
      )
    }
  }

  private async enrichProfile(profile: OAuthProfile): Promise<OAuthProfile> {
    if (profile.provider === OAuthProvider.VK) {
      return profile
    }

    if (profile.provider !== OAuthProvider.FACEBOOK) {
      return profile
    }

    try {
      const account = await this.instagram.resolveBusinessAccount(
        profile.accessToken,
      )
      const handle = account.username ? `@${account.username}` : profile.channelName

      return {
        ...profile,
        externalAccountId: account.igUserId,
        channelName: handle,
        subscriberCount: account.followersCount,
        metadata: {
          ...profile.metadata,
          facebookUserId: profile.externalAccountId,
          igUserId: account.igUserId,
          username: account.username,
          pageId: account.pageId,
          pageName: account.pageName,
          profilePictureUrl: account.profilePictureUrl,
        },
      }
    } catch {
      return profile
    }
  }
}
