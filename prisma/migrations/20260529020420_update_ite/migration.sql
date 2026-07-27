/*
  Warnings:

  - Changed the type of `kind` on the `WorldItemData` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WorldItemKind" AS ENUM ('FLOOR', 'WALL', 'FURNITURE', 'NPC', 'DECORATION', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('AVATAR', 'WORLD');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "type" "ItemType";

-- AlterTable
ALTER TABLE "WorldItemData" DROP COLUMN "kind",
ADD COLUMN     "kind" "WorldItemKind" NOT NULL;
