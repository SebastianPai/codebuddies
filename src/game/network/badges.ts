// network/badges.ts — cliente REST de /badges (ver apps/api BadgesController)

import { apiGet, apiPatch, apiPost } from "./http";

export type BadgeStatus = { verified: boolean; isCreator: boolean };
export type BadgeTypeKey = "VERIFIED" | "CREATOR";

export type MyBadgeSettings = {
  /** Insignias que el jugador realmente tiene (verificado y/o creador). */
  qualifying: BadgeTypeKey[];
  /** Cuáles eligió mostrar, de las que califica. */
  selected: BadgeTypeKey[];
  /** Cuántas puede elegir a la vez: 1 gratis, 3 premium, más si es admin. */
  maxSelectable: number;
};

export type BadgeIconConfig = {
  iconUrl: string | null;
  mode: "STATIC" | "SPRITE";
  /** Alto en pixeles al que se renderiza (el ancho sigue el aspect ratio real). */
  size: number;
  /** Solo aplica si mode === "SPRITE": cuadros iguales en una tira horizontal. */
  frameCount: number;
  /** PINGPONG: 1..6..1 (yoyo). LOOP: 1..6,1..6 (corte directo). */
  direction: "PINGPONG" | "LOOP";
  frameRate: number;
};

export type BadgeConfig = {
  VERIFIED: BadgeIconConfig;
  CREATOR: BadgeIconConfig;
};

const DEFAULT_ICON_CONFIG: BadgeIconConfig = {
  iconUrl: null,
  mode: "STATIC",
  size: 16,
  frameCount: 6,
  direction: "PINGPONG",
  frameRate: 10,
};

export const DEFAULT_BADGE_CONFIG: BadgeConfig = {
  VERIFIED: DEFAULT_ICON_CONFIG,
  CREATOR: DEFAULT_ICON_CONFIG,
};

export function getBadgeConfig() {
  return apiGet<BadgeConfig>("/badges/config");
}

export function getUserBadges(username: string) {
  return apiGet<BadgeStatus>(`/badges/user/${encodeURIComponent(username)}`);
}

export function getUsersBadges(usernames: string[]) {
  return apiPost<Record<string, BadgeStatus>>("/badges/users", { usernames });
}

export function getMyBadgeSettings() {
  return apiGet<MyBadgeSettings>("/badges/me");
}

export function setSelectedBadges(types: BadgeTypeKey[]) {
  return apiPatch<MyBadgeSettings>("/badges/me/selection", { types });
}

// Caché a nivel de módulo: la config de insignias es global (no por
// usuario) y casi no cambia, así que un solo fetch alcanza para toda la
// sesión — la usan tanto el hook de React (useBadgeConfig) como PlayerHUD.ts
// (Phaser, fuera de React) para no repetir la lógica de caché en los dos.
let configCache: BadgeConfig | null = null;
let configRequest: Promise<BadgeConfig> | null = null;

export function getBadgeConfigCached(): Promise<BadgeConfig> {
  if (configCache) return Promise.resolve(configCache);

  configRequest ??= getBadgeConfig()
    .then((result) => {
      configCache = result;
      return result;
    })
    .catch(() => {
      configCache = DEFAULT_BADGE_CONFIG;
      return DEFAULT_BADGE_CONFIG;
    });

  return configRequest;
}

// Un frame de un sprite (mode: SPRITE) no siempre es cuadrado (frameWidth =
// anchoTotal/frameCount puede no ser igual al alto) — si se lo fuerza a un
// tamaño size x size se ve "aplastado". Medimos el ancho/alto real UNA vez
// por (url, frameCount) y lo cacheamos, para calcular el ancho correcto de
// cada insignia manteniendo el alto fijo (ver UserBadges.tsx).
const frameAspectCache = new Map<string, number>();
const frameAspectRequests = new Map<string, Promise<number>>();

export function getSpriteFrameAspect(url: string, frameCount: number): Promise<number> {
  const key = `${url}::${frameCount}`;

  const cached = frameAspectCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = frameAspectRequests.get(key);
  if (pending) return pending;

  const promise = new Promise<number>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const frameWidth = img.naturalWidth / Math.max(1, frameCount);
      const aspect = img.naturalHeight > 0 ? frameWidth / img.naturalHeight : 1;
      frameAspectCache.set(key, aspect);
      resolve(aspect);
    };
    img.onerror = () => resolve(1);
    img.src = url;
  }).finally(() => {
    frameAspectRequests.delete(key);
  });

  frameAspectRequests.set(key, promise);
  return promise;
}
