CREATE TYPE "CreatorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_REQUESTED');
CREATE TYPE "CreatorStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED');
CREATE TYPE "CreatorLevelKey" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND');
CREATE TYPE "MarketplaceContentType" AS ENUM ('WORLD_ITEM', 'AVATAR_ITEM', 'BACKGROUND', 'TEXTURE', 'PET', 'ANIMATION', 'EMOTE', 'PARTICLE', 'EFFECT');
CREATE TYPE "MarketplaceContentStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'RETIRED');
CREATE TYPE "MarketplaceReportReason" AS ENUM ('COPY', 'BUG', 'OFFENSIVE', 'SPAM', 'OTHER');
CREATE TYPE "MarketplaceReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');
CREATE TYPE "MarketplaceWalletMovementType" AS ENUM ('PUBLICATION_FEE', 'SALE_EARNING', 'COMMISSION', 'ADJUSTMENT', 'REFUND');

ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "MarketplaceSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "requireMinLevel" BOOLEAN NOT NULL DEFAULT true,
  "minLevel" INTEGER NOT NULL DEFAULT 10,
  "requireAccountAge" BOOLEAN NOT NULL DEFAULT true,
  "minAccountAgeDays" INTEGER NOT NULL DEFAULT 15,
  "requireEmailVerified" BOOLEAN NOT NULL DEFAULT true,
  "publicationFeeCoins" INTEGER NOT NULL DEFAULT 50,
  "minPriceCoins" INTEGER NOT NULL DEFAULT 100,
  "maxPriceCoins" INTEGER NOT NULL DEFAULT 10000,
  "commissionRate" INTEGER NOT NULL DEFAULT 20,
  "maxPendingItems" INTEGER NOT NULL DEFAULT 5,
  "maxPublishedItems" INTEGER NOT NULL DEFAULT 100,
  "maxSubmissionsPerDay" INTEGER NOT NULL DEFAULT 3,
  "maxSubmissionsPerWeek" INTEGER NOT NULL DEFAULT 10,
  "rejectionStrikeLimit" INTEGER NOT NULL DEFAULT 3,
  "suspensionDaysOnStrike" INTEGER NOT NULL DEFAULT 7,
  "metadata" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "status" "CreatorStatus" NOT NULL DEFAULT 'ACTIVE',
  "level" "CreatorLevelKey" NOT NULL DEFAULT 'BRONZE',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "suspendedUntil" TIMESTAMP(3),
  "totalSales" INTEGER NOT NULL DEFAULT 0,
  "totalCoinsGross" INTEGER NOT NULL DEFAULT 0,
  "followersCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorWallet" (
  "id" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "availableBalance" INTEGER NOT NULL DEFAULT 0,
  "historicalTotal" INTEGER NOT NULL DEFAULT 0,
  "totalSales" INTEGER NOT NULL DEFAULT 0,
  "totalCommissions" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "creatorId" TEXT,
  "status" "CreatorApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "adminMessage" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "requestedInfo" JSONB,
  "eligibilitySnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceContent" (
  "id" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "type" "MarketplaceContentType" NOT NULL DEFAULT 'WORLD_ITEM',
  "status" "MarketplaceContentStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "spriteUrl" TEXT,
  "previewUrl" TEXT,
  "priceCoins" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "validationSnapshot" JSONB,
  "metadata" JSONB,
  "publishedItemId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "views" INTEGER NOT NULL DEFAULT 0,
  "favoritesCount" INTEGER NOT NULL DEFAULT 0,
  "downloadsCount" INTEGER NOT NULL DEFAULT 0,
  "salesCount" INTEGER NOT NULL DEFAULT 0,
  "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceContentVersion" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priceCoins" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "changeNote" TEXT,
  "statusAtCreation" "MarketplaceContentStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceContentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceReviewComment" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "creatorId" TEXT,
  "adminId" TEXT,
  "message" TEXT NOT NULL,
  "status" "MarketplaceContentStatus",
  "visibleToCreator" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceReviewComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplacePurchase" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "itemId" TEXT,
  "priceCoins" INTEGER NOT NULL,
  "creatorEarnings" INTEGER NOT NULL,
  "platformFee" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplacePurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorWalletMovement" (
  "id" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "walletId" TEXT,
  "userId" TEXT,
  "type" "MarketplaceWalletMovementType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER,
  "description" TEXT,
  "contentId" TEXT,
  "purchaseId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorWalletMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceFavorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceFavorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceRating" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "reason" "MarketplaceReportReason" NOT NULL,
  "status" "MarketplaceReportStatus" NOT NULL DEFAULT 'OPEN',
  "message" TEXT,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");
CREATE INDEX "CreatorProfile_status_idx" ON "CreatorProfile"("status");
CREATE INDEX "CreatorProfile_featured_idx" ON "CreatorProfile"("featured");

CREATE UNIQUE INDEX "CreatorWallet_creatorId_key" ON "CreatorWallet"("creatorId");

CREATE INDEX "CreatorApplication_status_createdAt_idx" ON "CreatorApplication"("status", "createdAt");
CREATE INDEX "CreatorApplication_userId_idx" ON "CreatorApplication"("userId");

CREATE INDEX "CreatorWalletMovement_creatorId_createdAt_idx" ON "CreatorWalletMovement"("creatorId", "createdAt");
CREATE INDEX "CreatorWalletMovement_type_idx" ON "CreatorWalletMovement"("type");

CREATE INDEX "MarketplaceContent_status_createdAt_idx" ON "MarketplaceContent"("status", "createdAt");
CREATE INDEX "MarketplaceContent_type_status_idx" ON "MarketplaceContent"("type", "status");
CREATE INDEX "MarketplaceContent_creatorId_status_idx" ON "MarketplaceContent"("creatorId", "status");
CREATE INDEX "MarketplaceContent_featured_idx" ON "MarketplaceContent"("featured");

CREATE UNIQUE INDEX "MarketplaceContentVersion_contentId_version_key" ON "MarketplaceContentVersion"("contentId", "version");
CREATE INDEX "MarketplaceContentVersion_contentId_createdAt_idx" ON "MarketplaceContentVersion"("contentId", "createdAt");

CREATE INDEX "MarketplaceReviewComment_contentId_createdAt_idx" ON "MarketplaceReviewComment"("contentId", "createdAt");

CREATE UNIQUE INDEX "MarketplacePurchase_buyerId_contentId_key" ON "MarketplacePurchase"("buyerId", "contentId");
CREATE INDEX "MarketplacePurchase_creatorId_createdAt_idx" ON "MarketplacePurchase"("creatorId", "createdAt");
CREATE INDEX "MarketplacePurchase_contentId_idx" ON "MarketplacePurchase"("contentId");

CREATE UNIQUE INDEX "MarketplaceFavorite_userId_contentId_key" ON "MarketplaceFavorite"("userId", "contentId");
CREATE INDEX "MarketplaceFavorite_contentId_idx" ON "MarketplaceFavorite"("contentId");

CREATE UNIQUE INDEX "MarketplaceRating_userId_contentId_key" ON "MarketplaceRating"("userId", "contentId");
CREATE INDEX "MarketplaceRating_contentId_idx" ON "MarketplaceRating"("contentId");

CREATE INDEX "MarketplaceReport_status_createdAt_idx" ON "MarketplaceReport"("status", "createdAt");
CREATE INDEX "MarketplaceReport_contentId_idx" ON "MarketplaceReport"("contentId");

ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorWallet" ADD CONSTRAINT "CreatorWallet_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorApplication" ADD CONSTRAINT "CreatorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorApplication" ADD CONSTRAINT "CreatorApplication_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceContent" ADD CONSTRAINT "MarketplaceContent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceContent" ADD CONSTRAINT "MarketplaceContent_publishedItemId_fkey" FOREIGN KEY ("publishedItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceContentVersion" ADD CONSTRAINT "MarketplaceContentVersion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketplaceContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReviewComment" ADD CONSTRAINT "MarketplaceReviewComment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketplaceContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReviewComment" ADD CONSTRAINT "MarketplaceReviewComment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReviewComment" ADD CONSTRAINT "MarketplaceReviewComment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplacePurchase" ADD CONSTRAINT "MarketplacePurchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplacePurchase" ADD CONSTRAINT "MarketplacePurchase_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplacePurchase" ADD CONSTRAINT "MarketplacePurchase_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketplaceContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorWalletMovement" ADD CONSTRAINT "CreatorWalletMovement_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorWalletMovement" ADD CONSTRAINT "CreatorWalletMovement_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CreatorWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreatorWalletMovement" ADD CONSTRAINT "CreatorWalletMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreatorWalletMovement" ADD CONSTRAINT "CreatorWalletMovement_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketplaceContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreatorWalletMovement" ADD CONSTRAINT "CreatorWalletMovement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "MarketplacePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceFavorite" ADD CONSTRAINT "MarketplaceFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceFavorite" ADD CONSTRAINT "MarketplaceFavorite_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketplaceContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceRating" ADD CONSTRAINT "MarketplaceRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceRating" ADD CONSTRAINT "MarketplaceRating_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketplaceContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketplaceContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "MarketplaceSettings" ("id") VALUES ('default') ON CONFLICT ("id") DO NOTHING;
