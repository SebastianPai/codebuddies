type PublicEnvironment = {
  apiUrl: string;
  webUrl: string;
  assetsUrl: string;
};

function normalizeUrl(value: string | undefined): string {
  return value?.replace(/\/$/, "") ?? "";
}

const DEV_API_URL = "http://localhost:3001";
const DEV_WEB_URL = "http://localhost:3000";

export const env: PublicEnvironment = {
  apiUrl: normalizeUrl(process.env.NEXT_PUBLIC_API_URL),
  webUrl: normalizeUrl(process.env.NEXT_PUBLIC_WEB_URL),
  assetsUrl: normalizeUrl(process.env.NEXT_PUBLIC_ASSETS_URL),
};

// Punto único de acceso a NEXT_PUBLIC_API_URL para todo apps/game (antes
// repetido en ~8 archivos, algunos con `!` sin guardia y otros con fallback
// silencioso a localhost:3001 — en producción eso podía terminar hablando
// con la propia máquina del usuario sin ningún aviso).
//
// En producción la variable es obligatoria: si falta, se detecta el
// problema explícitamente en vez de degradar en silencio. En desarrollo
// cae al puerto local estándar del monorepo (3001), igual que antes.
export function getApiUrl(): string {
  if (env.apiUrl) return env.apiUrl;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL must be configured.");
  }
  return DEV_API_URL;
}

// A dónde volver cuando no hay sesión (redirectToWebLogin). Menos crítica
// que NEXT_PUBLIC_API_URL: sin ella en producción, se prefiere no romper
// esa redirección por completo, así que conserva un fallback (equivalente
// al comportamiento previo).
export function getWebUrl(): string {
  return env.webUrl || DEV_WEB_URL;
}

// Base pública de los assets estáticos del juego (tiles, sprites, etc.) en
// Cloudflare R2 — equivalente en el cliente de R2_PUBLIC_URL en apps/api.
// Sin throw a propósito: se usa también a nivel de módulo (p. ej. como
// fallback de imagen), donde tirar rompería el render entero en vez de
// solo la carga de ese asset puntual.
export function getAssetsUrl(): string {
  return env.assetsUrl;
}
