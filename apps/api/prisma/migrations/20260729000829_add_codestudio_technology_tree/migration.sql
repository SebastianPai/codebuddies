-- CreateTable
CREATE TABLE "CodeStudioCompanyTechnology" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeStudioCompanyTechnology_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioCompanyTechnology_companyId_technologyId_key" ON "CodeStudioCompanyTechnology"("companyId", "technologyId");

-- AddForeignKey
ALTER TABLE "CodeStudioCompanyTechnology" ADD CONSTRAINT "CodeStudioCompanyTechnology_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CodeStudioCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeStudioCompanyTechnology" ADD CONSTRAINT "CodeStudioCompanyTechnology_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "CodeStudioTechnology"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
