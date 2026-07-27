/*
  Warnings:

  - You are about to drop the column `layoutJson` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Room" DROP COLUMN "layoutJson",
ADD COLUMN     "layoutId" TEXT;

-- CreateTable
CREATE TABLE "RoomLayout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "previewImageUrl" TEXT,
    "layoutJson" JSONB NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "tileSize" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomLayout_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "RoomLayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
