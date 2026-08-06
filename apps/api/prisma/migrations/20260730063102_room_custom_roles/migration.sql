-- AlterTable
ALTER TABLE "RoomPermission" ADD COLUMN     "customRoleId" TEXT;

-- CreateTable
CREATE TABLE "RoomCustomRole" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT,
    "canPlaceObjects" BOOLEAN NOT NULL DEFAULT false,
    "canMoveObjects" BOOLEAN NOT NULL DEFAULT false,
    "canRotateObjects" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteObjects" BOOLEAN NOT NULL DEFAULT false,
    "canEditConfig" BOOLEAN NOT NULL DEFAULT false,
    "canChangeFloor" BOOLEAN NOT NULL DEFAULT false,
    "canChangeWalls" BOOLEAN NOT NULL DEFAULT false,
    "canChangeBackground" BOOLEAN NOT NULL DEFAULT false,
    "canManageGuests" BOOLEAN NOT NULL DEFAULT false,
    "canManagePermissions" BOOLEAN NOT NULL DEFAULT false,
    "canModifyLighting" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomCustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomCustomRole_roomId_name_key" ON "RoomCustomRole"("roomId", "name");

-- CreateIndex
CREATE INDEX "RoomPermission_customRoleId_idx" ON "RoomPermission"("customRoleId");

-- AddForeignKey
ALTER TABLE "RoomPermission" ADD CONSTRAINT "RoomPermission_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "RoomCustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCustomRole" ADD CONSTRAINT "RoomCustomRole_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
