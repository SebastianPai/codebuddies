/*
  Warnings:

  - Added the required column `skinColor` to the `Avatar` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Avatar" ADD COLUMN     "skinColor" INTEGER NOT NULL;
