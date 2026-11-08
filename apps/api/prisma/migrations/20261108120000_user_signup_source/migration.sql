-- De dónde llegó la cuenta (código de campaña del primer toque, p. ej.
-- "tiktok:c2:v1"). Opcional; sin datos personales.
ALTER TABLE "User" ADD COLUMN "signupSource" TEXT;
