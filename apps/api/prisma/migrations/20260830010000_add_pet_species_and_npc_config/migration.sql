-- CreateTable
CREATE TABLE "PetSpeciesConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spriteSheetUrl" TEXT,
    "previewUrl" TEXT,
    "frameWidth" INTEGER NOT NULL DEFAULT 64,
    "frameHeight" INTEGER NOT NULL DEFAULT 64,
    "framesCount" INTEGER NOT NULL DEFAULT 1,
    "directions" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetSpeciesConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpcConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'BUTLER',
    "name" TEXT NOT NULL,
    "spriteSheetUrl" TEXT,
    "previewUrl" TEXT,
    "avatarConfig" JSONB,
    "frameWidth" INTEGER NOT NULL DEFAULT 64,
    "frameHeight" INTEGER NOT NULL DEFAULT 96,
    "framesCount" INTEGER NOT NULL DEFAULT 1,
    "directions" INTEGER NOT NULL DEFAULT 4,
    "greetingLines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "idleLines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpcConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PetSpeciesConfig_key_key" ON "PetSpeciesConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "NpcConfig_key_key" ON "NpcConfig"("key");
