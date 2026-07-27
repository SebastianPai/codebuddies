/*
  Warnings:

  - Added the required column `retention` to the `AppSimulationSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `revenue` to the `AppSimulationSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "App" ADD COLUMN     "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "churnRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "retention" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "AppSimulationSnapshot" ADD COLUMN     "retention" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "revenue" DOUBLE PRECISION NOT NULL;
