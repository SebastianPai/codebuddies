/*
  Warnings:

  - You are about to drop the `ItemPrice` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ItemPrice" DROP CONSTRAINT "ItemPrice_itemId_fkey";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "category" TEXT,
ADD COLUMN     "coinsPrice" INTEGER,
ADD COLUMN     "gemsPrice" INTEGER,
ADD COLUMN     "isSellable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isTradable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxStack" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "shopVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "UserItem" ADD COLUMN     "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" TEXT;

-- DropTable
DROP TABLE "ItemPrice";

-- CreateIndex
CREATE INDEX "UserItem_userId_idx" ON "UserItem"("userId");

-- CreateIndex
CREATE INDEX "UserItem_itemId_idx" ON "UserItem"("itemId");
