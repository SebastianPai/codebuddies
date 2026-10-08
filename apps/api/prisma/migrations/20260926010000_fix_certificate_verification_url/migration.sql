-- Los certificados se emitieron con https://codebuddies.app/certificates/verify/<codigo>:
-- dominio equivocado y una ruta que no existe. La pagina publica real es
-- https://codebuddies.tech/verify/<codigo>.
UPDATE "Certificate"
SET "verificationUrl" = 'https://codebuddies.tech/verify/' || "verificationCode"
WHERE "verificationUrl" LIKE 'https://codebuddies.app/%';
