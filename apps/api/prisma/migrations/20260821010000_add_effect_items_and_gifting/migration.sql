-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE 'EFFECT';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "effectKey" TEXT;

-- CreateTable
CREATE TABLE "ItemGift" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "giftedById" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "coinsSpent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemGift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemGift_giftedById_idx" ON "ItemGift"("giftedById");

-- CreateIndex
CREATE INDEX "ItemGift_recipientId_idx" ON "ItemGift"("recipientId");

-- AddForeignKey
ALTER TABLE "ItemGift" ADD CONSTRAINT "ItemGift_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemGift" ADD CONSTRAINT "ItemGift_giftedById_fkey" FOREIGN KEY ("giftedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemGift" ADD CONSTRAINT "ItemGift_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
