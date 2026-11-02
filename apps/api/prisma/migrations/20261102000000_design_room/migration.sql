-- Sala de diseño: copia privada y gratuita de una sala del dueño.
ALTER TABLE "Room" ADD COLUMN "isDesign" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN "designSourceRoomId" TEXT;
