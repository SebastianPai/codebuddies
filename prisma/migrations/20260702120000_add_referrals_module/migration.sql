ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_VALIDATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_REWARD_UNLOCKED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_RANKING_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_FRAUD_FLAGGED';

CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'FRAUD', 'REVOKED');
CREATE TYPE "ReferralRewardType" AS ENUM ('COINS', 'XP', 'ITEM', 'TITLE', 'BADGE', 'PET', 'CUSTOM');
CREATE TYPE "ReferralGrantStatus" AS ENUM ('GRANTED', 'REVOKED');
CREATE TYPE "ReferralSeasonStatus" AS ENUM ('ACTIVE', 'FINALIZED', 'ARCHIVED');
CREATE TYPE "ReferralRewardScope" AS ENUM ('MILESTONE', 'RANKING');

CREATE TABLE "ReferralProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "referralLink" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralProgramConfig" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "baseUrl" TEXT NOT NULL DEFAULT 'http://localhost:3000/register',
  "shareMessage" TEXT,
  "codePrefix" TEXT,
  "codeLength" INTEGER NOT NULL DEFAULT 8,
  "requiredLevel" INTEGER NOT NULL DEFAULT 5,
  "minAccountAgeDays" INTEGER NOT NULL DEFAULT 3,
  "requireVerifiedEmail" BOOLEAN NOT NULL DEFAULT false,
  "requireCompletedCourse" BOOLEAN NOT NULL DEFAULT true,
  "requiredCourseId" TEXT,
  "maxReferralsPerDay" INTEGER NOT NULL DEFAULT 10,
  "rankingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "fraudAutoRevoke" BOOLEAN NOT NULL DEFAULT true,
  "allowManualSeasonManagement" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralProgramConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralSeason" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "ReferralSeasonStatus" NOT NULL DEFAULT 'ACTIVE',
  "finalizedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralSeason_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Referral" (
  "id" TEXT NOT NULL,
  "referrerUserId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "seasonId" TEXT,
  "referralCodeUsed" TEXT NOT NULL,
  "source" TEXT,
  "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "validationSnapshot" JSONB,
  "fraudSignals" JSONB,
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "evaluatedAt" TIMESTAMP(3),
  "validatedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "fraudAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralReward" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "scope" "ReferralRewardScope" NOT NULL DEFAULT 'MILESTONE',
  "rewardType" "ReferralRewardType" NOT NULL,
  "threshold" INTEGER,
  "rankFrom" INTEGER,
  "rankTo" INTEGER,
  "amount" INTEGER,
  "itemId" TEXT,
  "payload" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralRewardGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "referralId" TEXT,
  "rewardId" TEXT,
  "itemId" TEXT,
  "rewardType" "ReferralRewardType" NOT NULL,
  "scope" "ReferralRewardScope" NOT NULL,
  "status" "ReferralGrantStatus" NOT NULL DEFAULT 'GRANTED',
  "amount" INTEGER,
  "payloadSnapshot" JSONB,
  "reason" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralRewardGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralSeasonStat" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "validatedReferrals" INTEGER NOT NULL DEFAULT 0,
  "pendingReferrals" INTEGER NOT NULL DEFAULT 0,
  "fraudReferrals" INTEGER NOT NULL DEFAULT 0,
  "totalRewards" INTEGER NOT NULL DEFAULT 0,
  "currentRank" INTEGER,
  "finalRank" INTEGER,
  "rewardGrantedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralSeasonStat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralFraudLog" (
  "id" TEXT NOT NULL,
  "referralId" TEXT NOT NULL,
  "userId" TEXT,
  "reasonCode" TEXT NOT NULL,
  "notes" TEXT,
  "evidence" JSONB,
  "riskScore" INTEGER,
  "actionTaken" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralFraudLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralProfile_userId_key" ON "ReferralProfile"("userId");
CREATE UNIQUE INDEX "ReferralProfile_referralCode_key" ON "ReferralProfile"("referralCode");
CREATE INDEX "ReferralProfile_referralCode_idx" ON "ReferralProfile"("referralCode");

CREATE UNIQUE INDEX "ReferralSeason_periodKey_key" ON "ReferralSeason"("periodKey");
CREATE INDEX "ReferralSeason_status_startsAt_endsAt_idx" ON "ReferralSeason"("status", "startsAt", "endsAt");

CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");
CREATE INDEX "Referral_referrerUserId_status_createdAt_idx" ON "Referral"("referrerUserId", "status", "createdAt");
CREATE INDEX "Referral_referredUserId_status_idx" ON "Referral"("referredUserId", "status");
CREATE INDEX "Referral_seasonId_status_idx" ON "Referral"("seasonId", "status");

CREATE INDEX "ReferralReward_scope_active_sortOrder_idx" ON "ReferralReward"("scope", "active", "sortOrder");
CREATE INDEX "ReferralReward_seasonId_active_idx" ON "ReferralReward"("seasonId", "active");

CREATE INDEX "ReferralRewardGrant_userId_status_grantedAt_idx" ON "ReferralRewardGrant"("userId", "status", "grantedAt");
CREATE INDEX "ReferralRewardGrant_rewardId_userId_status_idx" ON "ReferralRewardGrant"("rewardId", "userId", "status");
CREATE INDEX "ReferralRewardGrant_referralId_status_idx" ON "ReferralRewardGrant"("referralId", "status");
CREATE UNIQUE INDEX "ReferralRewardGrant_userId_rewardId_referralId_key" ON "ReferralRewardGrant"("userId", "rewardId", "referralId");

CREATE UNIQUE INDEX "ReferralSeasonStat_seasonId_userId_key" ON "ReferralSeasonStat"("seasonId", "userId");
CREATE INDEX "ReferralSeasonStat_seasonId_currentRank_idx" ON "ReferralSeasonStat"("seasonId", "currentRank");
CREATE INDEX "ReferralSeasonStat_seasonId_validatedReferrals_idx" ON "ReferralSeasonStat"("seasonId", "validatedReferrals");

CREATE INDEX "ReferralFraudLog_referralId_createdAt_idx" ON "ReferralFraudLog"("referralId", "createdAt");
CREATE INDEX "ReferralFraudLog_userId_createdAt_idx" ON "ReferralFraudLog"("userId", "createdAt");
CREATE INDEX "ReferralFraudLog_reasonCode_createdAt_idx" ON "ReferralFraudLog"("reasonCode", "createdAt");

ALTER TABLE "ReferralProfile" ADD CONSTRAINT "ReferralProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralProgramConfig" ADD CONSTRAINT "ReferralProgramConfig_requiredCourseId_fkey" FOREIGN KEY ("requiredCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ReferralSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ReferralSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralRewardGrant" ADD CONSTRAINT "ReferralRewardGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralRewardGrant" ADD CONSTRAINT "ReferralRewardGrant_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralRewardGrant" ADD CONSTRAINT "ReferralRewardGrant_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "ReferralReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralRewardGrant" ADD CONSTRAINT "ReferralRewardGrant_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralSeasonStat" ADD CONSTRAINT "ReferralSeasonStat_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ReferralSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralSeasonStat" ADD CONSTRAINT "ReferralSeasonStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralFraudLog" ADD CONSTRAINT "ReferralFraudLog_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralFraudLog" ADD CONSTRAINT "ReferralFraudLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
