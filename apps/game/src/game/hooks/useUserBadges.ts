"use client";

import { useEffect, useState } from "react";
import {
  getBadgeConfigCached,
  getSpriteFrameAspect,
  getUserBadges,
  type BadgeConfig,
  type BadgeStatus,
} from "../network/badges";

// Cache a nivel de módulo: el mismo username suele aparecer en varios
// componentes montados a la vez (lista de amigos, chat, tarjeta de sala...),
// así que un solo fetch por username alcanza para toda la sesión en vez de
// repetirlo en cada lugar donde se muestra el nombre.
const badgeCache = new Map<string, BadgeStatus>();
const inFlight = new Map<string, Promise<BadgeStatus>>();
const BADGES_CHANGED_EVENT = "codebuddies:badges:changed";

function fetchBadges(username: string): Promise<BadgeStatus> {
  const cached = badgeCache.get(username);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(username);
  if (pending) return pending;

  const request = getUserBadges(username)
    .then((status) => {
      badgeCache.set(username, status);
      return status;
    })
    .catch(() => ({ verified: false, isCreator: false }) as BadgeStatus)
    .finally(() => {
      inFlight.delete(username);
    });

  inFlight.set(username, request);
  return request;
}

// Sin esto, cambiar tu selección de insignias en Ajustes no se veía en
// ningún otro lado (sidebar, perfil, chat...) hasta refrescar la página —
// esos componentes ya habían cacheado tu estado viejo. Se llama después de
// guardar en Ajustes: borra la caché (propia y ajena, por si un admin
// cambia el estado de otro usuario) y avisa a todo lo que esté montado.
export function notifyBadgesChanged(username?: string) {
  if (username) badgeCache.delete(username);
  else badgeCache.clear();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BADGES_CHANGED_EVENT, { detail: { username } }));
  }
}

export function useUserBadges(username: string | undefined | null): BadgeStatus {
  const [status, setStatus] = useState<BadgeStatus>(
    () => (username && badgeCache.get(username)) || { verified: false, isCreator: false },
  );

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    const load = () => {
      void fetchBadges(username).then((result) => {
        if (!cancelled) setStatus(result);
      });
    };

    load();

    const handleChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ username?: string }>).detail;
      if (!detail?.username || detail.username === username) load();
    };
    window.addEventListener(BADGES_CHANGED_EVENT, handleChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(BADGES_CHANGED_EVENT, handleChanged);
    };
  }, [username]);

  return status;
}

export function useBadgeConfig(): BadgeConfig | null {
  const [config, setConfig] = useState<BadgeConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBadgeConfigCached().then((result) => {
      if (!cancelled) setConfig(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}

// Un frame de sprite puede no ser cuadrado (frameWidth = anchoTotal /
// frameCount) — devuelve ancho/alto real (1 por defecto = cuadrado) para
// que el badge no se vea aplastado mientras se mide.
export function useSpriteFrameAspect(url: string | null, frameCount: number): number {
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    if (!url) {
      setAspect(1);
      return;
    }

    let cancelled = false;
    void getSpriteFrameAspect(url, frameCount).then((result) => {
      if (!cancelled) setAspect(result);
    });

    return () => {
      cancelled = true;
    };
  }, [url, frameCount]);

  return aspect;
}
