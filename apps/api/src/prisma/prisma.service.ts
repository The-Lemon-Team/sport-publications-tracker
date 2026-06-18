import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

@Injectable()
export class PrismaService extends PrismaClient {
  async withFreshConnection<T>(
    run: (db: PrismaService) => Promise<T>,
  ): Promise<T> {
    try {
      return await run(this)
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P1017'
      ) {
        await this.$connect()
        return run(this)
      }
      throw error
    }
  }
}
