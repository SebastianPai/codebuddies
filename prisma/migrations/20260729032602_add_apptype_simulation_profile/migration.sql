-- AlterTable
ALTER TABLE "CodeStudioAppType" ADD COLUMN     "simulationProfile" JSONB;

-- AlterTable
ALTER TABLE "CodeStudioCompany" ADD COLUMN     "lastMarketEventAt" TIMESTAMP(3);
