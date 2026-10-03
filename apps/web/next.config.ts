import type { NextConfig } from "next";

// Hostname derivado de NEXT_PUBLIC_ASSETS_URL (base pública de Cloudflare
// R2) en vez de hardcodear el dominio del proveedor — ver apps/web/src/config/env.ts.
function assetsHostname(): string | null {
  if (!process.env.NEXT_PUBLIC_ASSETS_URL) return null;
  try {
    return new URL(process.env.NEXT_PUBLIC_ASSETS_URL).hostname;
  } catch {
    return null;
  }
}

// Sin la variable (producción hoy) igual se optimizan las fotos del bucket
// público: si no, el optimizador de imágenes rechaza las URLs del admin.
const hostname = assetsHostname() ?? "assets.codebuddies.tech";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@codebuddies/visual-effects"],
  // OJO: no usar `deploymentId` con Turbopack (Next 16.1): carga cada chunk
  // dos veces (con y sin ?dpl=) y la página nunca hidrata. Las pestañas
  // viejas tras un deploy se recuperan con src/shared/utils/stale-build.ts.
  images: {
    remotePatterns: hostname
      ? [
          {
            protocol: "https",
            hostname,
          },
        ]
      : [],
  },
};

export default nextConfig;
