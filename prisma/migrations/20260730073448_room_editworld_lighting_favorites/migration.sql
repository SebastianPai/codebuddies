-- CreateEnum
CREATE TYPE "RoomAccessMode" AS ENUM ('PUBLIC', 'PRIVATE_INVITE_ONLY', 'PRIVATE_REQUEST');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "accessMode" "RoomAccessMode" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "ambientLightIntensity" INTEGER,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DataMigration: preservar el comportamiento actual de las salas privadas
-- existentes. El DEFAULT 'PUBLIC' de arriba backfillea TODAS las filas
-- (incluidas las privadas) porque Postgres aplica el default a las filas
-- existentes al agregar una columna NOT NULL — sin este UPDATE, cada sala
-- privada pasaría a ser públicamente unible de un día para el otro. Hoy
-- TODAS las salas con isPublic=false ya aceptan solicitudes de acceso (no
-- existe el modo "solo invitados" todavía), así que PRIVATE_REQUEST es el
-- equivalente exacto de su comportamiento actual.
UPDATE "Room" SET "accessMode" = 'PRIVATE_REQUEST' WHERE "isPublic" = false;

-- AlterTable
ALTER TABLE "WorldItemData" ADD COLUMN     "emitsLight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lightColor" TEXT,
ADD COLUMN     "lightRadius" INTEGER;

-- CreateTable
CREATE TABLE "RoomBuildFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomBuildFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomBuildFavorite_itemId_idx" ON "RoomBuildFavorite"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomBuildFavorite_userId_itemId_key" ON "RoomBuildFavorite"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "RoomBuildFavorite" ADD CONSTRAINT "RoomBuildFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBuildFavorite" ADD CONSTRAINT "RoomBuildFavorite_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
