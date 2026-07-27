/*
  Warnings:

  - You are about to drop the column `animation` on the `ItemSprite` table. All the data in the column will be lost.
  - You are about to drop the column `frame` on the `ItemSprite` table. All the data in the column will be lost.
  - You are about to drop the column `variant` on the `ItemSprite` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[itemId,animationId,direction]` on the table `ItemSprite` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `animationId` to the `ItemSprite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frameHeight` to the `ItemSprite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frameWidth` to the `ItemSprite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `framesCount` to the `ItemSprite` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ItemSprite_itemId_animation_direction_variant_key";

-- AlterTable
ALTER TABLE "ItemSprite" DROP COLUMN "animation",
DROP COLUMN "frame",
DROP COLUMN "variant",
ADD COLUMN     "animationId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "frameHeight" INTEGER NOT NULL,
ADD COLUMN     "frameWidth" INTEGER NOT NULL,
ADD COLUMN     "framesCount" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ItemSprite_itemId_animationId_direction_key" ON "ItemSprite"("itemId", "animationId", "direction");

-- AddForeignKey
ALTER TABLE "ItemSprite" ADD CONSTRAINT "ItemSprite_animationId_fkey" FOREIGN KEY ("animationId") REFERENCES "Animation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
