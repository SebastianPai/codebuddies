-- CreateEnum
CREATE TYPE "ThemeAssetIconMode" AS ENUM ('STATIC', 'SPRITE');

-- CreateEnum
CREATE TYPE "ThemeAssetAnimationDirection" AS ENUM ('PINGPONG', 'LOOP');

-- CreateTable
CREATE TABLE "ThemeAssetSlot" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeAssetSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeAssetVariant" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "mode" "ThemeAssetIconMode" NOT NULL DEFAULT 'STATIC',
    "frameCount" INTEGER NOT NULL DEFAULT 6,
    "direction" "ThemeAssetAnimationDirection" NOT NULL DEFAULT 'PINGPONG',
    "frameRate" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeAssetVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThemeAssetSlot_key_key" ON "ThemeAssetSlot"("key");

-- CreateIndex
CREATE INDEX "ThemeAssetVariant_slotId_idx" ON "ThemeAssetVariant"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeAssetVariant_slotId_name_key" ON "ThemeAssetVariant"("slotId", "name");

-- AddForeignKey
ALTER TABLE "ThemeAssetVariant" ADD CONSTRAINT "ThemeAssetVariant_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ThemeAssetSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
