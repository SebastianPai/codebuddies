-- CreateEnum
CREATE TYPE "CodeStudioCompanyStatus" AS ENUM ('IDEA', 'BUILDING', 'LIVE', 'PAUSED', 'FAILED');

-- CreateEnum
CREATE TYPE "CodeStudioDevelopmentStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CodeStudioAppType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "imageUrl" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioAppType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioModule" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "cost" INTEGER NOT NULL DEFAULT 100,
    "developmentSeconds" INTEGER NOT NULL DEFAULT 60,
    "experience" INTEGER NOT NULL DEFAULT 10,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effects" JSONB,
    "requirements" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioTechnology" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 250,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "effects" JSONB,
    "requirements" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioTechnology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioResearch" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 300,
    "cost" INTEGER NOT NULL DEFAULT 500,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "requirements" JSONB,
    "rewards" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioCampaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" TEXT NOT NULL,
    "baseCost" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "effects" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioEventTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "triggers" JSONB,
    "effects" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioEventTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioEmployeeType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "salary" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "baseStats" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioEmployeeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioInfrastructureType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "baseCost" INTEGER NOT NULL DEFAULT 200,
    "scaling" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioInfrastructureType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioAchievement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB,
    "rewards" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioBlueprint" (
    "id" TEXT NOT NULL,
    "appTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "initialStats" JSONB,
    "requirements" JSONB,
    "technologies" JSONB,
    "suggestedCosts" JSONB,
    "suggestedTimes" JSONB,
    "compatibleEvents" JSONB,
    "recommendedEmployees" JSONB,
    "initialInfrastructure" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioBlueprintModule" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "parentIds" JSONB,
    "position" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,

    CONSTRAINT "CodeStudioBlueprintModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CodeStudioCompanyStatus" NOT NULL DEFAULT 'IDEA',
    "level" INTEGER NOT NULL DEFAULT 1,
    "cash" INTEGER NOT NULL DEFAULT 5000,
    "reputation" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "innovation" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "valuation" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "expenses" INTEGER NOT NULL DEFAULT 0,
    "satisfaction" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "bugs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latency" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 99,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "tickCount" INTEGER NOT NULL DEFAULT 0,
    "blueprintSnapshot" JSONB,
    "stats" JSONB,
    "metadata" JSONB,
    "lastSimulatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioCompanyModule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "quality" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "config" JSONB,

    CONSTRAINT "CodeStudioCompanyModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioDevelopmentTask" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "CodeStudioDevelopmentStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiredSeconds" INTEGER NOT NULL,
    "spentSeconds" INTEGER NOT NULL DEFAULT 0,
    "assignedEmployees" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioDevelopmentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioEmployee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "age" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 1,
    "productivity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "creativity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "motivation" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "stress" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "salary" INTEGER NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "quality" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "level" INTEGER NOT NULL DEFAULT 1,
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "CodeStudioEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioInfrastructure" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "infrastructureTypeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL DEFAULT 1000,
    "latency" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 99,
    "cost" INTEGER NOT NULL DEFAULT 100,
    "metadata" JSONB,

    CONSTRAINT "CodeStudioInfrastructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "newUsers" INTEGER NOT NULL,
    "lostUsers" INTEGER NOT NULL,
    "retention" DOUBLE PRECISION NOT NULL,
    "conversion" DOUBLE PRECISION NOT NULL,
    "errors" DOUBLE PRECISION NOT NULL,
    "latency" DOUBLE PRECISION NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "revenue" INTEGER NOT NULL,
    "expenses" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeStudioAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioEventLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "effects" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeStudioEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioAppType_slug_key" ON "CodeStudioAppType"("slug");

-- CreateIndex
CREATE INDEX "CodeStudioAppType_active_visible_order_idx" ON "CodeStudioAppType"("active", "visible", "order");

-- CreateIndex
CREATE INDEX "CodeStudioAppType_category_idx" ON "CodeStudioAppType"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioModule_slug_key" ON "CodeStudioModule"("slug");

-- CreateIndex
CREATE INDEX "CodeStudioModule_category_visible_order_idx" ON "CodeStudioModule"("category", "visible", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioTechnology_slug_key" ON "CodeStudioTechnology"("slug");

-- CreateIndex
CREATE INDEX "CodeStudioTechnology_category_active_order_idx" ON "CodeStudioTechnology"("category", "active", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioResearch_slug_key" ON "CodeStudioResearch"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioCampaign_slug_key" ON "CodeStudioCampaign"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioEventTemplate_slug_key" ON "CodeStudioEventTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioEmployeeType_slug_key" ON "CodeStudioEmployeeType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioInfrastructureType_slug_key" ON "CodeStudioInfrastructureType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioAchievement_slug_key" ON "CodeStudioAchievement"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioBlueprint_appTypeId_key" ON "CodeStudioBlueprint"("appTypeId");

-- CreateIndex
CREATE INDEX "CodeStudioBlueprintModule_blueprintId_order_idx" ON "CodeStudioBlueprintModule"("blueprintId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioBlueprintModule_blueprintId_moduleId_key" ON "CodeStudioBlueprintModule"("blueprintId", "moduleId");

-- CreateIndex
CREATE INDEX "CodeStudioCompany_userId_updatedAt_idx" ON "CodeStudioCompany"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "CodeStudioCompany_valuation_idx" ON "CodeStudioCompany"("valuation");

-- CreateIndex
CREATE INDEX "CodeStudioCompany_activeUsers_idx" ON "CodeStudioCompany"("activeUsers");

-- CreateIndex
CREATE INDEX "CodeStudioCompanyModule_companyId_idx" ON "CodeStudioCompanyModule"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioCompanyModule_companyId_moduleId_key" ON "CodeStudioCompanyModule"("companyId", "moduleId");

-- CreateIndex
CREATE INDEX "CodeStudioDevelopmentTask_companyId_status_idx" ON "CodeStudioDevelopmentTask"("companyId", "status");

-- CreateIndex
CREATE INDEX "CodeStudioEmployee_companyId_idx" ON "CodeStudioEmployee"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioInfrastructure_companyId_infrastructureTypeId_key" ON "CodeStudioInfrastructure"("companyId", "infrastructureTypeId");

-- CreateIndex
CREATE INDEX "CodeStudioAnalyticsSnapshot_companyId_createdAt_idx" ON "CodeStudioAnalyticsSnapshot"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "CodeStudioEventLog_companyId_createdAt_idx" ON "CodeStudioEventLog"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "CodeStudioBlueprint" ADD CONSTRAINT "CodeStudioBlueprint_appTypeId_fkey" FOREIGN KEY ("appTypeId") REFERENCES "CodeStudioAppType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioBlueprintModule" ADD CONSTRAINT "CodeStudioBlueprintModule_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "CodeStudioBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioBlueprintModule" ADD CONSTRAINT "CodeStudioBlueprintModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CodeStudioModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioCompany" ADD CONSTRAINT "CodeStudioCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioCompany" ADD CONSTRAINT "CodeStudioCompany_appTypeId_fkey" FOREIGN KEY ("appTypeId") REFERENCES "CodeStudioAppType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioCompanyModule" ADD CONSTRAINT "CodeStudioCompanyModule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CodeStudioCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioCompanyModule" ADD CONSTRAINT "CodeStudioCompanyModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CodeStudioModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioDevelopmentTask" ADD CONSTRAINT "CodeStudioDevelopmentTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CodeStudioCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioDevelopmentTask" ADD CONSTRAINT "CodeStudioDevelopmentTask_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CodeStudioModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioEmployee" ADD CONSTRAINT "CodeStudioEmployee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CodeStudioCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioEmployee" ADD CONSTRAINT "CodeStudioEmployee_employeeTypeId_fkey" FOREIGN KEY ("employeeTypeId") REFERENCES "CodeStudioEmployeeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioInfrastructure" ADD CONSTRAINT "CodeStudioInfrastructure_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CodeStudioCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioInfrastructure" ADD CONSTRAINT "CodeStudioInfrastructure_infrastructureTypeId_fkey" FOREIGN KEY ("infrastructureTypeId") REFERENCES "CodeStudioInfrastructureType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioAnalyticsSnapshot" ADD CONSTRAINT "CodeStudioAnalyticsSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CodeStudioCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioEventLog" ADD CONSTRAINT "CodeStudioEventLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CodeStudioCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioEventLog" ADD CONSTRAINT "CodeStudioEventLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CodeStudioEventTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
