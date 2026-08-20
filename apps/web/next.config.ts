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
