import 'reflect-metadata'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { PrismaModule } from './prisma/prisma.module'
import { CryptoModule } from './common/crypto/crypto.module'
import { AuthModule } from './auth/auth.module'
import { OAuthModule } from './oauth/oauth.module'
import { TopicsModule } from './topics/topics.module'
import { YouTubeModule } from './youtube/youtube.module'
import { InstagramModule } from './instagram/instagram.module'
import { TelegramModule } from './telegram/telegram.module'
import { SubscribersModule } from './subscribers/subscribers.module'
import { PublicationsModule } from './publications/publications.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CryptoModule,
    AuthModule,
    OAuthModule,
    TopicsModule,
    YouTubeModule,
    InstagramModule,
    TelegramModule,
    SubscribersModule,
    PublicationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
