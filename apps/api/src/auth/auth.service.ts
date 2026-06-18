import { createHash } from 'node:crypto'
import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import type { AuthTokensDto, UserDto } from '@spt/shared'
import { PrismaService } from '../prisma/prisma.service'
import type { RegisterDto } from './dto/auth.dto'

interface JwtPayload {
  sub: string
  email: string
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const email = dto.email.toLowerCase()
    const existing = await this.prisma.withFreshConnection((db) =>
      db.user.findUnique({ where: { email } }),
    )

    if (existing) {
      throw new ConflictException('Email already registered')
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.withFreshConnection((db) =>
      db.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name ?? null,
        },
      }),
    )

    return this.issueTokens(user.id, user.email, user.name)
  }

  async login(email: string, password: string): Promise<AuthTokensDto> {
    const user = await this.prisma.withFreshConnection((db) =>
      db.user.findUnique({
        where: { email: email.toLowerCase() },
      }),
    )

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return this.issueTokens(user.id, user.email, user.name)
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const tokenHash = this.hashToken(refreshToken)
    const stored = await this.prisma.withFreshConnection((db) =>
      db.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      }),
    )

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    await this.prisma.withFreshConnection((db) =>
      db.refreshToken.delete({ where: { id: stored.id } }),
    )
    return this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.name,
    )
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken)
    await this.prisma.withFreshConnection((db) =>
      db.refreshToken.deleteMany({ where: { tokenHash } }),
    )
  }

  toUserDto(user: { id: string; email: string; name: string | null }): UserDto {
    return { id: user.id, email: user.email, name: user.name }
  }

  private async issueTokens(
    userId: string,
    email: string,
    name: string | null,
  ): Promise<AuthTokensDto> {
    const payload: JwtPayload = { sub: userId, email }
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: 900,
    })

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: 60 * 60 * 24 * 7,
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await this.prisma.withFreshConnection((db) =>
      db.refreshToken.create({
        data: {
          userId,
          tokenHash: this.hashToken(refreshToken),
          expiresAt,
        },
      }),
    )

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, name },
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
