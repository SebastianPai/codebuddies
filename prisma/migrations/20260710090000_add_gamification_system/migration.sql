-- Expand notification events used by gamification.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MISSION_AVAILABLE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MISSION_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MISSION_REWARD_CLAIMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REWARD_GRANTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LEVEL_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SEASON_STARTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SEASON_ENDED';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

CREATE TYPE "MissionCadence" AS ENUM ('PERMANENT', 'DAILY', 'WEEKLY', 'MONTHLY', 'SPECIAL', 'EVENT');
CREATE TYPE "MissionVisibility" AS ENUM ('VISIBLE', 'HIDDEN');
CREATE TYPE "MissionProgressStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CLAIMED');
CREATE TYPE "GamificationRewardType" AS ENUM ('COINS', 'XP', 'ITEM', 'AVATAR_ITEM', 'FURNITURE', 'PET', 'BADGE', 'TITLE', 'ROLE', 'CUSTOM');
CREATE TYPE "RewardSourceType" AS ENUM ('MISSION', 'ACHIEVEMENT', 'REFERRAL', 'RANKING', 'EVENT', 'ADMIN', 'SPECIAL');

CREATE TABLE "MissionCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "color" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Mission" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT,
  "imageUrl" TEXT,
  "cadence" "MissionCadence" NOT NULL DEFAULT 'PERMANENT',
  "condition" TEXT NOT NULL,
  "requiredValue" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "visibility" "MissionVisibility" NOT NULL DEFAULT 'VISIBLE',
  "repeatable" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "rewards" JSONB,
  "dependencies" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserMissionProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "currentValue" INTEGER NOT NULL DEFAULT 0,
  "targetValue" INTEGER NOT NULL DEFAULT 1,
  "status" "MissionProgressStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  "periodKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserMissionProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GamificationAchievement" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT,
  "imageUrl" TEXT,
  "condition" TEXT NOT NULL,
  "requiredValue" INTEGER NOT NULL DEFAULT 1,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "rewards" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GamificationAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserGamificationAchievement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" TIMESTAMP(3),
  CONSTRAINT "UserGamificationAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RewardLedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceType" "RewardSourceType" NOT NULL,
  "sourceId" TEXT,
  "rewardType" "GamificationRewardType" NOT NULL,
  "amount" INTEGER,
  "itemId" TEXT,
  "label" TEXT NOT NULL,
  "message" TEXT,
  "payload" JSONB,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RewardBundle" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "rewards" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardBundle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GamificationBadge" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "rarity" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GamificationBadge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GamificationPet" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "rarity" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GamificationPet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GamificationTitle" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "rarity" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GamificationTitle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GamificationEvent" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GamificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissionCategory_active_sortOrder_idx" ON "MissionCategory"("active", "sortOrder");
CREATE INDEX "Mission_active_visibility_cadence_sortOrder_idx" ON "Mission"("active", "visibility", "cadence", "sortOrder");
CREATE INDEX "Mission_startsAt_endsAt_idx" ON "Mission"("startsAt", "endsAt");
CREATE UNIQUE INDEX "UserMissionProgress_userId_missionId_periodKey_key" ON "UserMissionProgress"("userId", "missionId", "periodKey");
CREATE INDEX "UserMissionProgress_userId_status_updatedAt_idx" ON "UserMissionProgress"("userId", "status", "updatedAt");
CREATE INDEX "UserMissionProgress_missionId_status_idx" ON "UserMissionProgress"("missionId", "status");
CREATE INDEX "GamificationAchievement_visible_sortOrder_idx" ON "GamificationAchievement"("visible", "sortOrder");
CREATE INDEX "GamificationAchievement_condition_idx" ON "GamificationAchievement"("condition");
CREATE UNIQUE INDEX "UserGamificationAchievement_userId_achievementId_key" ON "UserGamificationAchievement"("userId", "achievementId");
CREATE INDEX "UserGamificationAchievement_userId_unlockedAt_idx" ON "UserGamificationAchievement"("userId", "unlockedAt");
CREATE INDEX "RewardLedgerEntry_userId_sourceType_grantedAt_idx" ON "RewardLedgerEntry"("userId", "sourceType", "grantedAt");
CREATE INDEX "RewardLedgerEntry_rewardType_grantedAt_idx" ON "RewardLedgerEntry"("rewardType", "grantedAt");
CREATE INDEX "RewardBundle_active_createdAt_idx" ON "RewardBundle"("active", "createdAt");
CREATE INDEX "GamificationEvent_active_startsAt_endsAt_idx" ON "GamificationEvent"("active", "startsAt", "endsAt");

ALTER TABLE "Mission" ADD CONSTRAINT "Mission_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MissionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserMissionProgress" ADD CONSTRAINT "UserMissionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMissionProgress" ADD CONSTRAINT "UserMissionProgress_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGamificationAchievement" ADD CONSTRAINT "UserGamificationAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGamificationAchievement" ADD CONSTRAINT "UserGamificationAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "GamificationAchievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardLedgerEntry" ADD CONSTRAINT "RewardLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardLedgerEntry" ADD CONSTRAINT "RewardLedgerEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardBundle" ADD CONSTRAINT "RewardBundle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
