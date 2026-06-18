import 'reflect-metadata'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { ValidationPipe } from '@nestjs/common'

loadEnv({ path: resolve(__dirname, '../.env') })

async function bootstrap(): Promise<void> {
  const { NestFactory } = await import('@nestjs/core')
  const { AppModule } = await import('./app.module')
  const app = await NestFactory.create(AppModule)
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

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
}

void bootstrap()
