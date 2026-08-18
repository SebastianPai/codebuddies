-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paddleCustomerId" TEXT;

-- AlterTable
ALTER TABLE "PremiumSubscription" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paddleCustomerId" TEXT,
ADD COLUMN     "paddleProductId" TEXT,
ADD COLUMN     "paddlePriceId" TEXT,
ADD COLUMN     "paddleStatus" TEXT,
ADD COLUMN     "scheduledChangeAction" TEXT,
ADD COLUMN     "scheduledChangeEffectiveAt" TIMESTAMP(3),
ADD COLUMN     "nextBilledAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_paddleCustomerId_key" ON "User"("paddleCustomerId");
