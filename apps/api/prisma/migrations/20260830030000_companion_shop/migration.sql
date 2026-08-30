-- AlterTable
ALTER TABLE "PetSpeciesConfig" ADD COLUMN     "coinsPrice" INTEGER,
ADD COLUMN     "gemsPrice" INTEGER,
ADD COLUMN     "shopVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "NpcConfig" ADD COLUMN     "coinsPrice" INTEGER,
ADD COLUMN     "gemsPrice" INTEGER,
ADD COLUMN     "shopVisible" BOOLEAN NOT NULL DEFAULT false;
