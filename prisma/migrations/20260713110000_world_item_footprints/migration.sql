ALTER TABLE "WorldItemData" ADD COLUMN "syncDirections" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WorldItemData" ADD COLUMN "footprints" JSONB;
ALTER TABLE "WorldItemData" ADD COLUMN "surfaces" JSONB;
ALTER TABLE "WorldItemData" ADD COLUMN "engineData" JSONB;
