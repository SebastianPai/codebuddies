-- CreateEnum
CREATE TYPE "BadgeIconMode" AS ENUM ('STATIC', 'SPRITE');

-- CreateEnum
CREATE TYPE "BadgeAnimationDirection" AS ENUM ('PINGPONG', 'LOOP');

-- AlterTable
ALTER TABLE "BadgeConfig" ADD COLUMN     "direction" "BadgeAnimationDirection" NOT NULL DEFAULT 'PINGPONG',
ADD COLUMN     "frameCount" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "frameRate" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "mode" "BadgeIconMode" NOT NULL DEFAULT 'STATIC';
