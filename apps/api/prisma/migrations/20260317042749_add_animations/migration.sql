/*
  Warnings:

  - A unique constraint covering the columns `[itemId,animation,direction,variant]` on the table `ItemSprite` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ItemSprite_itemId_animation_direction_key";

-- AlterTable
ALTER TABLE "ItemSprite" ADD COLUMN     "variant" TEXT;

-- CreateTable
CREATE TABLE "Animation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AnimationType" NOT NULL,
    "variant" TEXT NOT NULL,
    "loop" BOOLEAN NOT NULL DEFAULT true,
    "speed" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Animation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Animation_type_variant_key" ON "Animation"("type", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSprite_itemId_animation_direction_variant_key" ON "ItemSprite"("itemId", "animation", "direction", "variant");
