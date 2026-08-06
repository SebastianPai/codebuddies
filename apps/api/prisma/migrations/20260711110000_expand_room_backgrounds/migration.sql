-- CreateEnum
CREATE TYPE "BackgroundAccessType" AS ENUM ('FREE', 'PURCHASABLE', 'PREMIUM', 'EVENT');

-- AlterTable
ALTER TABLE "RoomBackground"
ADD COLUMN "description" TEXT,
ADD COLUMN "previewUrl" TEXT,
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "accessType" "BackgroundAccessType" NOT NULL DEFAULT 'FREE',
ADD COLUMN "shopVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "coinsPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "gemsPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "RoomBackground"
SET "accessType" = CASE
  WHEN "isPremium" = true THEN 'PREMIUM'::"BackgroundAccessType"
  ELSE 'FREE'::"BackgroundAccessType"
END;

-- CreateTable
CREATE TABLE "RoomBackgroundCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RoomBackgroundCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBackgroundTranslation" (
  "id" TEXT NOT NULL,
  "backgroundId" TEXT NOT NULL,
  "languageId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,

  CONSTRAINT "RoomBackgroundTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoomBackground" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "backgroundId" TEXT NOT NULL,
  "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT,

  CONSTRAINT "UserRoomBackground_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomBackgroundCategory_slug_key" ON "RoomBackgroundCategory"("slug");
CREATE INDEX "RoomBackground_active_accessType_idx" ON "RoomBackground"("active", "accessType");
CREATE INDEX "RoomBackground_categoryId_idx" ON "RoomBackground"("categoryId");
CREATE INDEX "RoomBackground_sortOrder_idx" ON "RoomBackground"("sortOrder");
CREATE UNIQUE INDEX "RoomBackgroundTranslation_backgroundId_languageId_key" ON "RoomBackgroundTranslation"("backgroundId", "languageId");
CREATE INDEX "RoomBackgroundTranslation_languageId_idx" ON "RoomBackgroundTranslation"("languageId");
CREATE UNIQUE INDEX "UserRoomBackground_userId_backgroundId_key" ON "UserRoomBackground"("userId", "backgroundId");
CREATE INDEX "UserRoomBackground_userId_idx" ON "UserRoomBackground"("userId");
CREATE INDEX "UserRoomBackground_backgroundId_idx" ON "UserRoomBackground"("backgroundId");

-- AddForeignKey
ALTER TABLE "RoomBackground"
ADD CONSTRAINT "RoomBackground_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "RoomBackgroundCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoomBackgroundTranslation"
ADD CONSTRAINT "RoomBackgroundTranslation_backgroundId_fkey"
FOREIGN KEY ("backgroundId") REFERENCES "RoomBackground"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomBackgroundTranslation"
ADD CONSTRAINT "RoomBackgroundTranslation_languageId_fkey"
FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRoomBackground"
ADD CONSTRAINT "UserRoomBackground_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRoomBackground"
ADD CONSTRAINT "UserRoomBackground_backgroundId_fkey"
FOREIGN KEY ("backgroundId") REFERENCES "RoomBackground"("id") ON DELETE CASCADE ON UPDATE CASCADE;
