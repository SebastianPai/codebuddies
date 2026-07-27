/*
  Warnings:

  - You are about to drop the column `canEdit` on the `RoomPermission` table. All the data in the column will be lost.
  - You are about to drop the column `canInvite` on the `RoomPermission` table. All the data in the column will be lost.
  - Added the required column `role` to the `RoomPermission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `WorldItemData` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('SIT', 'LIE', 'DRINK', 'OPEN', 'TOGGLE', 'TELEPORT');

-- CreateEnum
CREATE TYPE "WallSide" AS ENUM ('NORTH', 'EAST', 'SOUTH', 'WEST');

-- CreateEnum
CREATE TYPE "PlacementType" AS ENUM ('FLOOR', 'WALL', 'BOTH');

-- CreateEnum
CREATE TYPE "FurnitureCategory" AS ENUM ('CHAIR', 'TABLE', 'BED', 'DECORATION', 'ELECTRONICS', 'PLANT', 'STORAGE', 'WALL_ITEM');

-- AlterTable
ALTER TABLE "RoomItem" ADD COLUMN     "elevation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentRoomItemId" TEXT,
ADD COLUMN     "wallOffset" INTEGER,
ADD COLUMN     "wallSide" "WallSide";

-- AlterTable
ALTER TABLE "RoomPermission" DROP COLUMN "canEdit",
DROP COLUMN "canInvite",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "role" "RoomRole" NOT NULL;

-- AlterTable
ALTER TABLE "WorldItemData" ADD COLUMN     "canBeStacked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "category" "FurnitureCategory" NOT NULL,
ADD COLUMN     "directions" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "frameHeight" INTEGER,
ADD COLUMN     "frameWidth" INTEGER,
ADD COLUMN     "interactionTypes" "InteractionType"[],
ADD COLUMN     "maxStackHeight" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "placementType" "PlacementType" NOT NULL DEFAULT 'FLOOR',
ADD COLUMN     "previewImageUrl" TEXT,
ADD COLUMN     "rotatable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sitElevation" INTEGER,
ADD COLUMN     "sitX" INTEGER,
ADD COLUMN     "sitY" INTEGER,
ADD COLUMN     "spriteSheetUrl" TEXT,
ADD COLUMN     "stackHeight" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "teleportTargetRoomId" TEXT,
ADD COLUMN     "teleportTargetX" INTEGER,
ADD COLUMN     "teleportTargetY" INTEGER,
ADD COLUMN     "walkable" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "RoomItem_itemId_idx" ON "RoomItem"("itemId");

-- CreateIndex
CREATE INDEX "RoomItem_parentRoomItemId_idx" ON "RoomItem"("parentRoomItemId");

-- AddForeignKey
ALTER TABLE "RoomItem" ADD CONSTRAINT "RoomItem_parentRoomItemId_fkey" FOREIGN KEY ("parentRoomItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
