/*
  Warnings:

  - You are about to drop the `Achievement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AchievementTranslation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserAchievement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Achievement" DROP CONSTRAINT "Achievement_courseId_fkey";

-- DropForeignKey
ALTER TABLE "AchievementTranslation" DROP CONSTRAINT "AchievementTranslation_achievementId_fkey";

-- DropForeignKey
ALTER TABLE "AchievementTranslation" DROP CONSTRAINT "AchievementTranslation_languageId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserAchievement" DROP CONSTRAINT "UserAchievement_achievementId_fkey";

-- DropForeignKey
ALTER TABLE "UserAchievement" DROP CONSTRAINT "UserAchievement_userId_fkey";

-- DropTable
DROP TABLE "Achievement";

-- DropTable
DROP TABLE "AchievementTranslation";

-- DropTable
DROP TABLE "Subscription";

-- DropTable
DROP TABLE "UserAchievement";

-- DropEnum
DROP TYPE "SubscriptionType";
