-- CreateEnum
CREATE TYPE "TelegramBotConnectionStatus" AS ENUM ('ACTIVE', 'INVALID');

-- CreateTable
CREATE TABLE "telegram_bot_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botTokenEnc" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "botUsername" TEXT,
    "status" "TelegramBotConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_bot_connections_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "subscriber_sources" ADD COLUMN "telegramBotConnectionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "telegram_bot_connections_userId_key" ON "telegram_bot_connections"("userId");

-- AddForeignKey
ALTER TABLE "telegram_bot_connections" ADD CONSTRAINT "telegram_bot_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriber_sources" ADD CONSTRAINT "subscriber_sources_telegramBotConnectionId_fkey" FOREIGN KEY ("telegramBotConnectionId") REFERENCES "telegram_bot_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
