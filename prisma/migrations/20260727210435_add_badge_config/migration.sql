-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('VERIFIED', 'CREATOR');

-- CreateTable
CREATE TABLE "BadgeConfig" (
    "id" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BadgeConfig_type_key" ON "BadgeConfig"("type");
