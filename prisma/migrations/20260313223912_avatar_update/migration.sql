/*
  Warnings:

  - You are about to drop the column `body` on the `Avatar` table. All the data in the column will be lost.
  - You are about to drop the column `outfit` on the `Avatar` table. All the data in the column will be lost.
  - The `hair` column on the `Avatar` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `eyes` column on the `Avatar` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Avatar" DROP COLUMN "body",
DROP COLUMN "outfit",
ADD COLUMN     "head" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "legs" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "shirt" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "shoes" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "hair",
ADD COLUMN     "hair" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "eyes",
ADD COLUMN     "eyes" INTEGER NOT NULL DEFAULT 1;
