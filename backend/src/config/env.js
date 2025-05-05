// backend/src/config/env.js
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Verificar variables críticas
const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "SPACES_ACCESS_KEY",
  "SPACES_SECRET_KEY",
  "SPACES_ENDPOINT",
  "SPACES_NAME",
  "SPACES_REGION",
  "SPACES_CDN_ENDPOINT",
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(
      `❌ Error: La variable de entorno ${envVar} no está definida`
    );
    process.exit(1);
  }
}
