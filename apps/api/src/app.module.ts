import 'reflect-metadata'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { PrismaModule } from './prisma/prisma.module'
import { CryptoModule } from './common/crypto/crypto.module'
import { AuthModule } from './auth/auth.module'
import { OAuthModule } from './oauth/oauth.module'
import { TopicsModule } from './topics/topics.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CryptoModule,
    AuthModule,
    OAuthModule,
    TopicsModule,
  ],
})
export class AppModule {}
