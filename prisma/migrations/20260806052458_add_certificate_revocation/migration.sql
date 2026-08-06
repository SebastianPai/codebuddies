-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "revoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedReason" TEXT;

-- CreateIndex
CREATE INDEX "Certificate_revoked_idx" ON "Certificate"("revoked");
