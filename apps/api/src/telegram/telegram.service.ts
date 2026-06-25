import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  TelegramBotConnectionStatus,
  type TelegramBotConnectionDto,
  type VerifyTelegramChannelResult,
} from '@spt/shared'
import { TokenCryptoService } from '../common/crypto/token-crypto.service'
import { PrismaService } from '../prisma/prisma.service'
import { parseTelegramChannelInput } from '../subscribers/telegram-channel.util'
import {
  TELEGRAM_BOT_TOKEN_PATTERN,
  TelegramApiError,
  TelegramNetworkError,
  callTelegramBotApi,
  isTelegramBotAdmin,
  type TelegramApiCallOptions,
  type TelegramChat,
  type TelegramChatMember,
  type TelegramUser,
} from './telegram.api'

@Injectable()
export class TelegramService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private apiOptions(): TelegramApiCallOptions {
    return {
      apiBase: this.config.get<string>('TELEGRAM_API_BASE'),
      proxyUrl: this.config.get<string>('TELEGRAM_API_PROXY'),
    }
  }

  private callApi<T>(
    token: string,
    method: string,
    params?: Record<string, string | number>,
  ): Promise<T> {
    return callTelegramBotApi<T>(token, method, params, this.apiOptions())
  }

  async getBotProfile(token: string): Promise<TelegramUser> {
    const me = await this.callWithTokenHandling(token, () =>
      this.callApi<TelegramUser>(token, 'getMe'),
    )
    if (!me.is_bot) {
      throw new BadRequestException('Token does not belong to a Telegram bot')
    }
    return me
  }

  async verifyChannelAccess(
    token: string,
    input: string,
  ): Promise<VerifyTelegramChannelResult & { pollInput: string }> {
    const parsed = parseTelegramChannelInput(input)
    if (!parsed) {
      throw new BadRequestException('Invalid Telegram channel or group URL')
    }

    const bot = await this.getBotProfile(token)
    const chatId = this.toChatId(parsed.handle)
    const chat = await this.callWithTokenHandling(token, () =>
      this.callApi<TelegramChat>(token, 'getChat', { chat_id: chatId }),
    )

    const membership = await this.callWithTokenHandling(token, () =>
      this.callApi<TelegramChatMember>(token, 'getChatMember', {
        chat_id: String(chat.id),
        user_id: String(bot.id),
      }),
    )

    if (!isTelegramBotAdmin(membership)) {
      throw new BadRequestException(
        'Bot must be an administrator of this channel. Add the bot as admin and try again.',
      )
    }

    const subscriberCount = await this.callWithTokenHandling(token, () =>
      this.callApi<number>(token, 'getChatMembersCount', {
        chat_id: String(chat.id),
      }),
    )

    const handle = chat.username ? `@${chat.username}` : parsed.handle
    const profileUrl = chat.username
      ? `https://t.me/${chat.username}`
      : parsed.profileUrl

    return {
      chatId: String(chat.id),
      externalId: parsed.externalId,
      handle,
      title: chat.title ?? null,
      profileUrl,
      subscriberCount,
      pollInput: String(chat.id),
    }
  }

  async getChannelMemberCount(token: string, pollInput: string): Promise<number> {
    return this.callWithTokenHandling(token, () =>
      this.callApi<number>(token, 'getChatMembersCount', {
        chat_id: pollInput,
      }),
    )
  }

  private toChatId(handle: string): string {
    return handle.startsWith('@') ? handle : `@${handle.replace(/^@/, '')}`
  }

  private async callWithTokenHandling<T>(
    _token: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (error instanceof TelegramNetworkError) {
        throw new ServiceUnavailableException(this.networkErrorMessage())
      }
      if (
        error instanceof TypeError &&
        error.message === 'fetch failed'
      ) {
        throw new ServiceUnavailableException(this.networkErrorMessage())
      }
      if (error instanceof TelegramApiError) {
        if (error.unauthorized) {
          throw new UnauthorizedException('Telegram bot token is invalid or revoked')
        }
        if (error.errorCode === 400) {
          throw new BadRequestException(this.mapBadRequestMessage(error.message))
        }
        throw new BadRequestException(error.message)
      }
      throw error
    }
  }

  private mapBadRequestMessage(message: string): string {
    const lower = message.toLowerCase()
    if (lower.includes('chat not found')) {
      return 'Channel not found. Check the link and make sure the bot is added to the channel.'
    }
    if (lower.includes('user not found') || lower.includes('participant')) {
      return 'Bot is not a member of this channel. Add the bot as administrator and try again.'
    }
    if (lower.includes('not enough rights')) {
      return 'Bot lacks permissions in this channel. Grant administrator rights and try again.'
    }
    return message
  }

  private networkErrorMessage(): string {
    return 'Не удалось связаться с Telegram API — сервер недоступен.'
  }
}

@Injectable()
export class TelegramBotService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenCryptoService) private readonly crypto: TokenCryptoService,
    @Inject(TelegramService) private readonly telegram: TelegramService,
  ) {}

  async getConnection(userId: string): Promise<TelegramBotConnectionDto | null> {
    const row = await this.prisma.telegramBotConnection.findUnique({
      where: { userId },
    })
    return row ? this.toDto(row) : null
  }

  async connectBot(
    userId: string,
    token: string,
  ): Promise<TelegramBotConnectionDto> {
    const trimmed = token.trim()
    if (!TELEGRAM_BOT_TOKEN_PATTERN.test(trimmed)) {
      throw new BadRequestException('Invalid Telegram bot token format')
    }

    const profile = await this.telegram.getBotProfile(trimmed)

    const row = await this.prisma.telegramBotConnection.upsert({
      where: { userId },
      create: {
        userId,
        botTokenEnc: this.crypto.encrypt(trimmed),
        botId: String(profile.id),
        botUsername: profile.username ?? null,
        status: TelegramBotConnectionStatus.ACTIVE,
      },
      update: {
        botTokenEnc: this.crypto.encrypt(trimmed),
        botId: String(profile.id),
        botUsername: profile.username ?? null,
        status: TelegramBotConnectionStatus.ACTIVE,
      },
    })

    return this.toDto(row)
  }

  async revokeBot(userId: string): Promise<void> {
    const existing = await this.prisma.telegramBotConnection.findUnique({
      where: { userId },
    })
    if (!existing) {
      throw new NotFoundException('Telegram bot is not connected')
    }
    await this.prisma.telegramBotConnection.delete({
      where: { userId },
    })
  }

  async verifyChannel(
    userId: string,
    input: string,
  ): Promise<VerifyTelegramChannelResult> {
    const { token } = await this.requireActiveBot(userId)
    const result = await this.telegram.verifyChannelAccess(token, input)
    const { pollInput: _pollInput, ...dto } = result
    return dto
  }

  async requireActiveBot(userId: string): Promise<{
    connection: { id: string; botId: string; botUsername: string | null }
    token: string
  }> {
    const connection = await this.prisma.telegramBotConnection.findUnique({
      where: { userId },
    })

    if (!connection || connection.status !== TelegramBotConnectionStatus.ACTIVE) {
      throw new BadRequestException('Connect a Telegram bot before using Live mode')
    }

    const token = this.crypto.decrypt(connection.botTokenEnc)

    try {
      await this.telegram.getBotProfile(token)
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.prisma.telegramBotConnection.update({
          where: { id: connection.id },
          data: { status: TelegramBotConnectionStatus.INVALID },
        })
      }
      throw error
    }

    return {
      connection: {
        id: connection.id,
        botId: connection.botId,
        botUsername: connection.botUsername,
      },
      token,
    }
  }

  async getDecryptedTokenForSource(
    telegramBotConnectionId: string | null,
  ): Promise<string | null> {
    if (!telegramBotConnectionId) return null

    const connection = await this.prisma.telegramBotConnection.findUnique({
      where: { id: telegramBotConnectionId },
    })
    if (!connection || connection.status !== TelegramBotConnectionStatus.ACTIVE) {
      return null
    }

    return this.crypto.decrypt(connection.botTokenEnc)
  }

  async markInvalid(connectionId: string): Promise<void> {
    await this.prisma.telegramBotConnection.update({
      where: { id: connectionId },
      data: { status: TelegramBotConnectionStatus.INVALID },
    })
  }

  private toDto(connection: {
    id: string
    botId: string
    botUsername: string | null
    status: TelegramBotConnectionStatus
  }): TelegramBotConnectionDto {
    return {
      id: connection.id,
      botId: connection.botId,
      botUsername: connection.botUsername,
      status: connection.status,
    }
  }
}
