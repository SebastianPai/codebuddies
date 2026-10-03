-- Un mayordomo por sala (antes: uno por usuario). El que ya existía queda
-- en la sala donde estaba sacado.
ALTER TABLE "UserButler" ADD COLUMN "roomId" TEXT;
UPDATE "UserButler" SET "roomId" = "activeRoomId";
DROP INDEX IF EXISTS "UserButler_userId_key";
CREATE UNIQUE INDEX "UserButler_userId_roomId_key" ON "UserButler"("userId", "roomId");
CREATE INDEX "UserButler_userId_idx" ON "UserButler"("userId");
