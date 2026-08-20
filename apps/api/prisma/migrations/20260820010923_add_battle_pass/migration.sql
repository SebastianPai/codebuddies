-- CreateEnum
CREATE TYPE "BattlePassSeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "BattlePassTrack" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BattlePassUnlockSource" AS ENUM ('COINS', 'ADMIN');

-- AlterEnum
ALTER TYPE "RewardSourceType" ADD VALUE 'BATTLE_PASS';

-- CreateTable
CREATE TABLE "BattlePassSeason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "seasonNumber" INTEGER NOT NULL,
    "status" "BattlePassSeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "totalLevels" INTEGER NOT NULL DEFAULT 30,
    "xpPerLevel" INTEGER NOT NULL DEFAULT 1000,
    "premiumUnlockPriceCoins" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattlePassSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePassTier" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "track" "BattlePassTrack" NOT NULL,
    "rewardType" "GamificationRewardType" NOT NULL,
    "amount" INTEGER,
    "itemId" TEXT,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattlePassTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBattlePassProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBattlePassProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBattlePassPremiumUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "source" "BattlePassUnlockSource" NOT NULL,
    "coinsSpent" INTEGER,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBattlePassPremiumUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePassClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattlePassClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BattlePassSeason_seasonNumber_key" ON "BattlePassSeason"("seasonNumber");

-- CreateIndex
CREATE INDEX "BattlePassSeason_status_startsAt_endsAt_idx" ON "BattlePassSeason"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "BattlePassTier_seasonId_track_level_idx" ON "BattlePassTier"("seasonId", "track", "level");

-- CreateIndex
CREATE UNIQUE INDEX "BattlePassTier_seasonId_level_track_sortOrder_key" ON "BattlePassTier"("seasonId", "level", "track", "sortOrder");

-- CreateIndex
CREATE INDEX "UserBattlePassProgress_seasonId_level_idx" ON "UserBattlePassProgress"("seasonId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "UserBattlePassProgress_userId_seasonId_key" ON "UserBattlePassProgress"("userId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBattlePassPremiumUnlock_userId_seasonId_key" ON "UserBattlePassPremiumUnlock"("userId", "seasonId");

-- CreateIndex
CREATE INDEX "BattlePassClaim_userId_seasonId_idx" ON "BattlePassClaim"("userId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "BattlePassClaim_userId_tierId_key" ON "BattlePassClaim"("userId", "tierId");

-- AddForeignKey
ALTER TABLE "BattlePassTier" ADD CONSTRAINT "BattlePassTier_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "BattlePassSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePassTier" ADD CONSTRAINT "BattlePassTier_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePassProgress" ADD CONSTRAINT "UserBattlePassProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePassProgress" ADD CONSTRAINT "UserBattlePassProgress_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "BattlePassSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePassPremiumUnlock" ADD CONSTRAINT "UserBattlePassPremiumUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePassPremiumUnlock" ADD CONSTRAINT "UserBattlePassPremiumUnlock_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "BattlePassSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePassClaim" ADD CONSTRAINT "BattlePassClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePassClaim" ADD CONSTRAINT "BattlePassClaim_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "BattlePassTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

