-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED';
