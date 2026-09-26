-- Marketing pasa a opt-in (Ley 1581 / RGPD) para cuentas nuevas y se guarda
-- cuando y que version de los documentos legales acepto cada usuario.
ALTER TABLE "User" ALTER COLUMN "marketingEmailsEnabled" SET DEFAULT false;
ALTER TABLE "User" ADD COLUMN "legalAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "legalVersion" TEXT;
