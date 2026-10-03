-- AlterTable
ALTER TABLE "CodeStudioCompany" ADD COLUMN "officeRoomId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioCompany_officeRoomId_key" ON "CodeStudioCompany"("officeRoomId");
