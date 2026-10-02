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

const hostname = assetsHostname();

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@codebuddies/visual-effects"],
  // Versión del build (Heroku expone el commit como SOURCE_VERSION al
  // compilar). Con esto Next detecta que una pestaña abierta antes de un
  // deploy pide JS que ya no existe y recarga la página en vez de mostrar
  // "Algo salió mal" al navegar o al comprobar un ejercicio.
  deploymentId: process.env.SOURCE_VERSION || process.env.HEROKU_SLUG_COMMIT || undefined,
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
