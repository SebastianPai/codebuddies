/*
  Warnings:

  - You are about to drop the column `completed` on the `FriendChallenge` table. All the data in the column will be lost.
  - Made the column `courseId` on table `FriendChallenge` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RankingSeasonStatus" AS ENUM ('ACTIVE', 'FINALIZED');

-- CreateEnum
CREATE TYPE "FriendChallengeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "FriendChallenge" DROP CONSTRAINT "FriendChallenge_courseId_fkey";

-- AlterTable
ALTER TABLE "FriendChallenge" DROP COLUMN "completed",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "status" "FriendChallengeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "winnerId" TEXT,
ALTER COLUMN "courseId" SET NOT NULL;

-- CreateTable
CREATE TABLE "RankingSeason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "status" "RankingSeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingSeasonEntry" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "coinsEarned" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "RankingSeasonEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankingSeason_status_idx" ON "RankingSeason"("status");

-- CreateIndex
CREATE INDEX "RankingSeasonEntry_seasonId_rank_idx" ON "RankingSeasonEntry"("seasonId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "RankingSeasonEntry_seasonId_userId_key" ON "RankingSeasonEntry"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "FriendChallenge_challengerId_idx" ON "FriendChallenge"("challengerId");

-- CreateIndex
CREATE INDEX "FriendChallenge_opponentId_idx" ON "FriendChallenge"("opponentId");

-- CreateIndex
CREATE INDEX "FriendChallenge_courseId_idx" ON "FriendChallenge"("courseId");

-- AddForeignKey
ALTER TABLE "RankingSeasonEntry" ADD CONSTRAINT "RankingSeasonEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankingSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingSeasonEntry" ADD CONSTRAINT "RankingSeasonEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendChallenge" ADD CONSTRAINT "FriendChallenge_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendChallenge" ADD CONSTRAINT "FriendChallenge_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
