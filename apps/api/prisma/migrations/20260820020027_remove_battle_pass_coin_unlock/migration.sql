-- DropForeignKey
ALTER TABLE "UserBattlePassPremiumUnlock" DROP CONSTRAINT "UserBattlePassPremiumUnlock_seasonId_fkey";

-- DropForeignKey
ALTER TABLE "UserBattlePassPremiumUnlock" DROP CONSTRAINT "UserBattlePassPremiumUnlock_userId_fkey";

-- AlterTable
ALTER TABLE "BattlePassSeason" DROP COLUMN "premiumUnlockPriceCoins";

-- DropTable
DROP TABLE "UserBattlePassPremiumUnlock";

-- DropEnum
DROP TYPE "BattlePassUnlockSource";

