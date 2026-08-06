-- CreateEnum
CREATE TYPE "AppType" AS ENUM ('DELIVERY', 'ECOMMERCE', 'SOCIAL');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('DRAFT', 'TESTING', 'PUBLISHED', 'DISABLED');

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "AppType" NOT NULL,
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "logic" JSONB NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppTranslation" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "AppTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppMetrics" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "successOrders" INTEGER NOT NULL DEFAULT 0,
    "failedOrders" INTEGER NOT NULL DEFAULT 0,
    "lastTickAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSimulationSnapshot" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "users" INTEGER NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSimulationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "App_ownerId_idx" ON "App"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AppTranslation_appId_languageId_key" ON "AppTranslation"("appId", "languageId");

-- CreateIndex
CREATE UNIQUE INDEX "AppMetrics_appId_key" ON "AppMetrics"("appId");

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppTranslation" ADD CONSTRAINT "AppTranslation_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppTranslation" ADD CONSTRAINT "AppTranslation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppMetrics" ADD CONSTRAINT "AppMetrics_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSimulationSnapshot" ADD CONSTRAINT "AppSimulationSnapshot_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
