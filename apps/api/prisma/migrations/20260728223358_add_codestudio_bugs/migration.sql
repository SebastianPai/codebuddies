-- CreateEnum
CREATE TYPE "CodeStudioBugSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CodeStudioBugStatus" AS ENUM ('OPEN', 'FIXED');

-- CreateTable
CREATE TABLE "CodeStudioBug" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "CodeStudioBugSeverity" NOT NULL,
    "status" "CodeStudioBugStatus" NOT NULL DEFAULT 'OPEN',
    "fixCost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fixedAt" TIMESTAMP(3),

    CONSTRAINT "CodeStudioBug_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeStudioBug_companyId_status_idx" ON "CodeStudioBug"("companyId", "status");

-- AddForeignKey
ALTER TABLE "CodeStudioBug" ADD CONSTRAINT "CodeStudioBug_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CodeStudioCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
