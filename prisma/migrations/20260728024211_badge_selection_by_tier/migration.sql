-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN "selectedBadgeTypes" "BadgeType"[] NOT NULL DEFAULT ARRAY[]::"BadgeType"[];

-- AlterTable
ALTER TABLE "CreatorProfile" DROP COLUMN "badgesVisible";
