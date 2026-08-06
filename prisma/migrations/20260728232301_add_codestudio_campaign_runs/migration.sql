-- CreateTable
CREATE TABLE "CodeStudioCampaignRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "gainedUsers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeStudioCampaignRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeStudioCampaignRun_companyId_channel_idx" ON "CodeStudioCampaignRun"("companyId", "channel");

-- AddForeignKey
ALTER TABLE "CodeStudioCampaignRun" ADD CONSTRAINT "CodeStudioCampaignRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CodeStudioCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioCampaignRun" ADD CONSTRAINT "CodeStudioCampaignRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CodeStudioCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
