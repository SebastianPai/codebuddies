-- Mascotas: trucos comprados y accesorio puesto.
ALTER TABLE "Pet" ADD COLUMN "tricks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Pet" ADD COLUMN "accessoryItemId" TEXT;
