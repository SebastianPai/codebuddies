-- CodeStudio v2: camino por etapas, quiebra, inversión, precios, bugs de
-- diagnóstico y carrera del fundador.

-- Montos a DOUBLE PRECISION: una empresa exitosa supera el máximo de INTEGER.
ALTER TABLE "CodeStudioCompany" ALTER COLUMN "cash" SET DATA TYPE DOUBLE PRECISION;
ALTER TABLE "CodeStudioCompany" ALTER COLUMN "valuation" SET DATA TYPE DOUBLE PRECISION;
ALTER TABLE "CodeStudioCompany" ALTER COLUMN "revenue" SET DATA TYPE DOUBLE PRECISION;
ALTER TABLE "CodeStudioCompany" ALTER COLUMN "expenses" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CodeStudioCompany"
  ADD COLUMN "stage" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "founderEquity" DOUBLE PRECISION NOT NULL DEFAULT 100,
  ADD COLUMN "fundingRound" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "debtDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "gameDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "priceLevel" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN "nextEventDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
  ADD COLUMN "lastSnapshotAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "simVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "CodeStudioBug"
  ADD COLUMN "scenarioKey" TEXT,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "assignedEmployeeId" TEXT,
  ADD COLUMN "fixReadyAt" TIMESTAMP(3),
  ADD COLUMN "resolution" TEXT;

-- CreateTable
CREATE TABLE "CodeStudioProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "companiesFounded" INTEGER NOT NULL DEFAULT 0,
    "bankruptcies" INTEGER NOT NULL DEFAULT 0,
    "bugsDiagnosed" INTEGER NOT NULL DEFAULT 0,
    "bugsFirstTry" INTEGER NOT NULL DEFAULT 0,
    "bestValuation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeStudioMilestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeStudioMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioProfile_userId_key" ON "CodeStudioProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioMilestone_userId_key_key" ON "CodeStudioMilestone"("userId", "key");

-- AddForeignKey
ALTER TABLE "CodeStudioProfile" ADD CONSTRAINT "CodeStudioProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioMilestone" ADD CONSTRAINT "CodeStudioMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
