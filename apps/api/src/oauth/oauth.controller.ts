import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Response } from 'express'
import { OAuthProvider } from '@prisma/client'
import type { OAuthConnectionDto } from '@spt/shared'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator'
import { OAuthService } from './oauth.service'
import type { OAuthProfile } from './oauth.types'

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
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        returnUrl: process.env.WEB_URL ?? 'http://localhost:5173',
      }),
    ).toString('base64url')
    const routes: Record<OAuthProvider, string> = {
      [OAuthProvider.VK]: '/api/oauth/vk',
      [OAuthProvider.GOOGLE]: '/api/oauth/google',
      [OAuthProvider.FACEBOOK]: '/api/oauth/facebook',
    }
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000'
    res.redirect(`${apiUrl}${routes[mapped]}?state=${state}`)
  }

  // ─── VK ───────────────────────────────────────────────────────────────────

  @Get('vk')
  @UseGuards(AuthGuard('vkontakte'))
  vkAuthorize(): void {
    // Passport redirects to VK
  }

  @Get('vk/callback')
  @UseGuards(AuthGuard('vkontakte'))
  async vkCallback(
    @Req() req: OAuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleCallback(req, res)
  }

  // ─── Google / YouTube ─────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuthorize(): void {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: OAuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.handleCallback(req, res)
  }

  // ─── Facebook / Instagram ─────────────────────────────────────────────────

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuthorize(): void {
    // Passport redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
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
      const { userId, returnUrl } = this.oauth.parseState(stateRaw)
      await this.oauth.upsertConnection(userId, profile)
      res.redirect(
        this.oauth.buildCallbackRedirect(returnUrl, {
          success: true,
          provider: profile.provider as OAuthProvider,
        }),
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'oauth_callback_failed'
      res.redirect(
        this.oauth.buildCallbackRedirect(
          process.env.WEB_URL ?? 'http://localhost:5173',
          { success: false, error: message },
        ),
      )
    }
  }
}
