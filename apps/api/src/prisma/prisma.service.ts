import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from '@prisma/client/runtime/library'

const RETRYABLE_CODES = new Set(['P1017', 'P2024'])
const MAX_RETRIES = 4

function isPoolExhausted(error: unknown): boolean {
  return (
    error instanceof PrismaClientInitializationError &&
    error.message.includes('max clients reached')
  )
}

function isRetryable(error: unknown): boolean {
  if (isPoolExhausted(error)) return false
  if (
    error instanceof PrismaClientKnownRequestError &&
    RETRYABLE_CODES.has(error.code)
  ) {
    return true
  }
  return (
    error instanceof Error &&
    error.message.includes('Server has closed the connection')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name)
  private shuttingDown = false

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    await this.shutdown(signal ?? 'applicationShutdown')
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown('moduleDestroy')
  }

  async withFreshConnection<T>(
    run: (db: PrismaService) => Promise<T>,
  ): Promise<T> {
    return this.runWithRetry(() => run(this))
  }

  private async runWithRetry<T>(
    fn: () => Promise<T>,
    attempt = 0,
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (isPoolExhausted(error)) {
        this.logger.error(
          'Database connection pool is full. Stop extra API instances (Ctrl+C), wait, retry.',
        )
        throw error
      }

      if (!this.shuttingDown && isRetryable(error) && attempt < MAX_RETRIES) {
        const code =
          error instanceof PrismaClientKnownRequestError
            ? error.code
            : 'connection_closed'
        this.logger.warn(
          `DB ${code} — retrying (attempt ${attempt + 1}/${MAX_RETRIES})`,
        )
        await this.resetConnection()
        await sleep(250 * 2 ** attempt)
        return this.runWithRetry(fn, attempt + 1)
      }
      throw error
    }
  }

  /** Drop stale PgBouncer slot and open a fresh connection. */
  private async resetConnection(): Promise<void> {
    if (this.shuttingDown) return
    try {
      await this.$disconnect()
    } catch {
      // Already disconnected.
    }
    try {
      await this.$connect()
    } catch (error) {
      this.logger.warn('Reconnect after pool error failed', error)
    }
  }

  private async shutdown(reason: string): Promise<void> {
    if (this.shuttingDown) return
    this.shuttingDown = true
    this.logger.log(`Closing database connections (${reason})`)
    await this.$disconnect()
  }
}
