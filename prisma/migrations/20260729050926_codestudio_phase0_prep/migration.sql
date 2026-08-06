-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CODESTUDIO_ACHIEVEMENT_UNLOCKED';
ALTER TYPE "NotificationType" ADD VALUE 'CODESTUDIO_INVESTOR_OFFER';

-- AlterEnum
ALTER TYPE "RewardSourceType" ADD VALUE 'CODESTUDIO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSystemAccount" BOOLEAN NOT NULL DEFAULT false;
