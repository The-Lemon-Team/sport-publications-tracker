import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { AuthTokensDto, UserDto } from '@spt/shared'
import { AuthService } from './auth.service'
import { LoginDto, RefreshDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser, type RequestUser } from './decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: RequestUser): UserDto {
    return this.auth.toUserDto(user)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.auth.updateProfile(user.id, dto)
  }

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.auth.register(dto)
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.auth.login(dto.email, dto.password)
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto): Promise<AuthTokensDto> {
    return this.auth.refresh(dto.refreshToken)
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken)
  }
}
