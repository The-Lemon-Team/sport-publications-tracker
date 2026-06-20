import 'reflect-metadata'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import type { INestApplication } from '@nestjs/common'
import { Logger, ValidationPipe } from '@nestjs/common'

loadEnv({ path: resolve(__dirname, '../.env') })

const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGUSR2']

async function shutdown(
  app: INestApplication,
  logger: Logger,
  signal: string,
): Promise<void> {
  logger.log(`Received ${signal}, shutting down gracefully`)
  await app.close()
  process.exit(0)
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap')
  const { NestFactory } = await import('@nestjs/core')
  const { AppModule } = await import('./app.module')
  const app = await NestFactory.create(AppModule)
  app.enableShutdownHooks()
  app.setGlobalPrefix('api')
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:5173',
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  let shuttingDown = false
  for (const signal of shutdownSignals) {
    process.once(signal, () => {
      if (shuttingDown) return
      shuttingDown = true
      void shutdown(app, logger, signal).catch((error: unknown) => {
        logger.error('Shutdown failed', error)
        process.exit(1)
      })
    })
  }

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
  logger.log(`API listening on http://localhost:${port}`)
}

void bootstrap()
