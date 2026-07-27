-- AlterTable
ALTER TABLE "EmailCampaign" ADD COLUMN     "countryFilter" TEXT,
ADD COLUMN     "languageFilter" TEXT,
ADD COLUMN     "roleFilter" "Role";

-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN     "templateType" "EmailTemplateType";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "country" TEXT;
