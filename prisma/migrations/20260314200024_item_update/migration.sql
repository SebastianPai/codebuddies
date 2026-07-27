/*
  Warnings:

  - You are about to drop the column `eyes` on the `Avatar` table. All the data in the column will be lost.
  - You are about to drop the column `hair` on the `Avatar` table. All the data in the column will be lost.
  - You are about to drop the column `head` on the `Avatar` table. All the data in the column will be lost.
  - You are about to drop the column `legs` on the `Avatar` table. All the data in the column will be lost.
  - You are about to drop the column `shirt` on the `Avatar` table. All the data in the column will be lost.
  - You are about to drop the column `shoes` on the `Avatar` table. All the data in the column will be lost.
  - Changed the type of `type` on the `Item` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('BODY', 'HEAD', 'HAIR', 'EYES', 'SHIRT', 'LEGS', 'SHOES', 'LEFT_ARM', 'RIGHT_ARM', 'ACCESSORY_HEAD', 'ACCESSORY_FACE', 'ACCESSORY_BACK', 'ACCESSORY_LEFT', 'ACCESSORY_RIGHT', 'ROOM_ITEM');

-- CreateEnum
CREATE TYPE "AvatarSlotType" AS ENUM ('BODY', 'HEAD', 'HAIR', 'EYES', 'SHIRT', 'LEGS', 'SHOES', 'LEFT_ARM', 'RIGHT_ARM', 'ACCESSORY_HEAD', 'ACCESSORY_FACE', 'ACCESSORY_BACK', 'ACCESSORY_LEFT', 'ACCESSORY_RIGHT');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('NORTH', 'NORTH_EAST', 'EAST', 'SOUTH_EAST', 'SOUTH', 'SOUTH_WEST', 'WEST', 'NORTH_WEST');

-- CreateEnum
CREATE TYPE "AnimationType" AS ENUM ('IDLE', 'WALK', 'RUN', 'SIT', 'WAVE', 'DANCE', 'ATTACK');

-- AlterTable
ALTER TABLE "Avatar" DROP COLUMN "eyes",
DROP COLUMN "hair",
DROP COLUMN "head",
DROP COLUMN "legs",
DROP COLUMN "shirt",
DROP COLUMN "shoes",
ADD COLUMN     "eyeColor" INTEGER,
ADD COLUMN     "hairColor" INTEGER;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "layer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rarity" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "type",
ADD COLUMN     "type" "ItemType" NOT NULL;

-- AlterTable
ALTER TABLE "RoomItem" ADD COLUMN     "zIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserItem" ADD COLUMN     "equipped" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AvatarSlot" (
    "id" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "slot" "AvatarSlotType" NOT NULL,
    "itemId" TEXT,

    CONSTRAINT "AvatarSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSprite" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "animation" "AnimationType" NOT NULL,
    "direction" "Direction" NOT NULL,
    "frame" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "ItemSprite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColorPalette" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ColorPalette_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvatarSlot_avatarId_slot_key" ON "AvatarSlot"("avatarId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSprite_itemId_animation_direction_key" ON "ItemSprite"("itemId", "animation", "direction");

-- AddForeignKey
ALTER TABLE "AvatarSlot" ADD CONSTRAINT "AvatarSlot_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvatarSlot" ADD CONSTRAINT "AvatarSlot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSprite" ADD CONSTRAINT "ItemSprite_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
