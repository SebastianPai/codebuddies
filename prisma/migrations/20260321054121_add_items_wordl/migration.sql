/*
  Warnings:

  - You are about to drop the column `type` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Item" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "RoomItem" ADD COLUMN     "state" JSONB;

-- DropEnum
DROP TYPE "ItemType";

-- CreateTable
CREATE TABLE "AvatarItemData" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "slot" "AvatarSlotType" NOT NULL,

    CONSTRAINT "AvatarItemData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldItemData" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "isCollidable" BOOLEAN NOT NULL DEFAULT false,
    "isInteractable" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL,

    CONSTRAINT "WorldItemData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvatarItemData_itemId_key" ON "AvatarItemData"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldItemData_itemId_key" ON "WorldItemData"("itemId");

-- AddForeignKey
ALTER TABLE "AvatarItemData" ADD CONSTRAINT "AvatarItemData_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldItemData" ADD CONSTRAINT "WorldItemData_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
