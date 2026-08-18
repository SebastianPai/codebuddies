-- CreateEnum
CREATE TYPE "CoinPurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "PremiumOrigin" AS ENUM ('PAYMENT', 'ADMIN');

-- AlterTable
ALTER TABLE "PremiumSubscription" ADD COLUMN     "grantedByAdminId" TEXT,
ADD COLUMN     "origin" "PremiumOrigin" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "reason" TEXT;

-- CreateTable
CREATE TABLE "CoinPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "package" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "CoinPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProviderType" NOT NULL DEFAULT 'MOCK',
    "providerTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CoinPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoinPurchase_providerTransactionId_key" ON "CoinPurchase"("providerTransactionId");

-- CreateIndex
CREATE INDEX "CoinPurchase_userId_status_idx" ON "CoinPurchase"("userId", "status");

-- CreateIndex
CREATE INDEX "CoinPurchase_status_createdAt_idx" ON "CoinPurchase"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_eventType_idx" ON "WebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- AddForeignKey
ALTER TABLE "CoinPurchase" ADD CONSTRAINT "CoinPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: backfill de PremiumSubscription.origin para filas
-- preexistentes. El default de la columna (ADMIN) ya es correcto para las
-- filas creadas por AdminUsersService.grantPremium (nunca setean
-- `provider`, así que quedan en el default MOCK) -- acá solo corregimos las
-- que sí vinieron de un pago real confirmado por webhook de Paddle.
UPDATE "PremiumSubscription"
SET "origin" = 'PAYMENT'
WHERE "provider" = 'PADDLE';

-- DataMigration: backfill de PremiumSubscription.grantedByAdminId desde el
-- AdminActionLog existente -- GRANT_PREMIUM ya quedaba registrado ahí con
-- targetId = PremiumSubscription.id, así que se puede reconstruir con
-- precisión quién otorgó cada suscripción manual ya existente, sin inventar
-- ni perder esa información.
UPDATE "PremiumSubscription" ps
SET "grantedByAdminId" = log."adminId"
FROM "AdminActionLog" log
WHERE log."action" = 'GRANT_PREMIUM'
  AND log."targetType" = 'PremiumSubscription'
  AND log."targetId" = ps."id"
  AND ps."grantedByAdminId" IS NULL;
