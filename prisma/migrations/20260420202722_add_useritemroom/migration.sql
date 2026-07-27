/*
  Warnings:

  - Added the required column `userId` to the `RoomItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RoomItem" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "RoomItem_roomId_idx" ON "RoomItem"("roomId");

-- CreateIndex
CREATE INDEX "RoomItem_userId_idx" ON "RoomItem"("userId");

-- CreateIndex
CREATE INDEX "RoomItem_roomId_x_y_idx" ON "RoomItem"("roomId", "x", "y");

-- AddForeignKey
ALTER TABLE "RoomItem" ADD CONSTRAINT "RoomItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
