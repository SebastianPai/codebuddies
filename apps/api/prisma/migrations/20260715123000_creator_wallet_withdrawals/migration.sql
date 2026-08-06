-- Add explicit marketplace wallet withdrawal tracking.
ALTER TYPE "MarketplaceWalletMovementType" ADD VALUE IF NOT EXISTS 'WITHDRAWAL';

ALTER TABLE "CreatorWallet"
  ADD COLUMN IF NOT EXISTS "totalWithdrawn" INTEGER NOT NULL DEFAULT 0;
