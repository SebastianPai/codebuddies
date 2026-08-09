type PublicEnvironment = {
  apiUrl: string;
  realtimeUrl: string;
  gameUrl: string;
  assetsUrl: string;
};

function normalizeUrl(value: string | undefined): string {
  return value?.replace(/\/$/, "") ?? "";
}

export const env: PublicEnvironment = {
  apiUrl: normalizeUrl(process.env.NEXT_PUBLIC_API_URL),
  realtimeUrl: normalizeUrl(process.env.NEXT_PUBLIC_REALTIME_URL),
  gameUrl: normalizeUrl(process.env.NEXT_PUBLIC_GAME_URL),
  assetsUrl: normalizeUrl(process.env.NEXT_PUBLIC_ASSETS_URL),
};

export function getApiUrl(): string {
  if (!env.apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL must be configured.");
  }

  return env.apiUrl;
}

export function getRealtimeUrl(): string {
  return env.realtimeUrl || getApiUrl();
}

// Origen público de apps/game (p. ej. https://game.codebuddies.tech). Sin
// NEXT_PUBLIC_GAME_URL configurada cae al puerto de desarrollo local, igual
// que el resto de las apps del monorepo cuando falta su URL pública.
export function getGameUrl(): string {
  return env.gameUrl || "http://localhost:3002";
}

// Base pública de los assets estáticos en Cloudflare R2 — equivalente en el
// cliente de R2_PUBLIC_URL en apps/api.
export function getAssetsUrl(): string {
  return env.assetsUrl;
}
