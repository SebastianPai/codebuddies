"use client";

import { useEffect, useState } from "react";
import { getBadgeConfig, getUserBadges, type BadgeConfig, type BadgeStatus } from "../network/badges";

// Cache a nivel de módulo: el mismo username suele aparecer en varios
// componentes montados a la vez (lista de amigos, chat, tarjeta de sala...),
// así que un solo fetch por username alcanza para toda la sesión en vez de
// repetirlo en cada lugar donde se muestra el nombre.
const badgeCache = new Map<string, BadgeStatus>();
const inFlight = new Map<string, Promise<BadgeStatus>>();

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

export function useUserBadges(username: string | undefined | null): BadgeStatus {
  const [status, setStatus] = useState<BadgeStatus>(
    () => (username && badgeCache.get(username)) || { verified: false, isCreator: false },
  );

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    void fetchBadges(username).then((result) => {
      if (!cancelled) setStatus(result);
    });

    return () => {
      cancelled = true;
    };
  }, [username]);

  return status;
}

let configCache: BadgeConfig | null = null;
let configRequest: Promise<BadgeConfig> | null = null;

export function useBadgeConfig(): BadgeConfig | null {
  const [config, setConfig] = useState<BadgeConfig | null>(configCache);

  useEffect(() => {
    if (configCache) return;

    configRequest ??= getBadgeConfig().catch(
      () => ({ VERIFIED: { iconUrl: null }, CREATOR: { iconUrl: null } }) as BadgeConfig,
    );

    let cancelled = false;
    void configRequest.then((result) => {
      configCache = result;
      if (!cancelled) setConfig(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
