-- AlterTable
ALTER TABLE "WorldItemData" ADD COLUMN     "spriteOffsetSync" TEXT NOT NULL DEFAULT 'mirror',
ADD COLUMN     "spriteOffsets" JSONB;
