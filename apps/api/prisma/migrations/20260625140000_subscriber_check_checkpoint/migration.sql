-- AlterEnum
ALTER TYPE "SubscriberCaptureSource" ADD VALUE 'CHECK';

-- AlterTable
ALTER TABLE "subscriber_sources" ADD COLUMN "unchangedSyncStreak" INTEGER NOT NULL DEFAULT 0;
