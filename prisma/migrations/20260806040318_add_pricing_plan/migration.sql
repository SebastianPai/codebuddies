-- CreateEnum
CREATE TYPE "PricingBillingInterval" AS ENUM ('NONE', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "priceUsd" DECIMAL(10,2) NOT NULL,
    "billingInterval" "PricingBillingInterval" NOT NULL DEFAULT 'NONE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "ctaHref" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Sparkles',
    "name" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "ctaLabel" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlan_key_key" ON "PricingPlan"("key");

-- CreateIndex
CREATE INDEX "PricingPlan_active_sortOrder_idx" ON "PricingPlan"("active", "sortOrder");
