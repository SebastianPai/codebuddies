-- AlterTable
ALTER TABLE "AvatarItemData" ALTER COLUMN "slot" SET DEFAULT 'BODY';

-- AlterTable
ALTER TABLE "WorldItemData" ADD COLUMN     "allowsStacking" BOOLEAN NOT NULL DEFAULT false;
