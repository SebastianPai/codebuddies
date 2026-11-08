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

// Rutas cortas para TikTok: se dicen en voz alta en el video y llevan a la
// lección 1 (se hace sin cuenta) con el código de campaña, que
// utils/campaign.ts guarda y el registro manda como signupSource.
const LESSON1 = {
  buddy: "/courses/f910a8ba-4526-47a8-8506-4bc4ffc24175/lessons/10d6fca4-f55f-4718-b5cf-fe83c7dc3898",
  python: "/courses/d59ba5a1-468c-46f7-88c4-92378f7cd5fd/lessons/618d0614-427e-4fb9-aa2c-ce429b4f3aee",
  web: "/courses/726eaf43-259c-48bc-840a-05946466fe60/lessons/c6bbfe3e-1b44-4d68-80e3-22c01e3b8bf0",
  js: "/courses/d290f5d6-b9e2-4d40-834e-20400698ce53/lessons/37a17b5b-f5b6-40e7-8a86-06192e7b625d",
};
const SHORT_LINKS: [string, string, string][] = [
  ["/robot", LESSON1.buddy, "v1"],
  ["/errores", LESSON1.python, "v2"],
  ["/web", LESSON1.web, "v3"],
  ["/monedas", LESSON1.buddy, "v4"],
  ["/empezar", LESSON1.python, "v5"],
  ["/js", LESSON1.js, "v6"],
  ["/historia", "/courses", "v7"],
  ["/tiktok", LESSON1.buddy, "bio"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return SHORT_LINKS.map(([source, to, content]) => ({
      source,
      destination: `${to}?utm_source=tiktok&utm_campaign=c2&utm_content=${content}`,
      permanent: false,
    }));
  },
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
