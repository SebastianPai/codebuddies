-- CreateEnum
CREATE TYPE "CoinBoostScope" AS ENUM ('PERSONAL', 'COMMUNITY');

-- CreateTable
CREATE TABLE "CoinBoost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "CoinBoostScope" NOT NULL,
    "package" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "CoinPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProviderType" NOT NULL DEFAULT 'MOCK',
    "providerTransactionId" TEXT,
    "gifted" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CoinBoost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoinBoost_providerTransactionId_key" ON "CoinBoost"("providerTransactionId");

-- CreateIndex
CREATE INDEX "CoinBoost_scope_status_endsAt_idx" ON "CoinBoost"("scope", "status", "endsAt");

-- CreateIndex
CREATE INDEX "CoinBoost_userId_status_endsAt_idx" ON "CoinBoost"("userId", "status", "endsAt");

-- AddForeignKey
ALTER TABLE "CoinBoost" ADD CONSTRAINT "CoinBoost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
