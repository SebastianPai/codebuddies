"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/shared/api";

export type BoostPackage = { key: string; scope: "PERSONAL" | "COMMUNITY"; multiplier: number; durationMinutes: number; priceUsd: number };
export type BoostOverview = {
  available: boolean;
  maxMultiplier: number;
  packages: BoostPackage[];
  multiplier: number;
  community: { multiplier: number; endsAt: string; queueEndsAt: string; sponsor: { id: string; username: string; avatarUrl: string | null } } | null;
  personal: { multiplier: number; endsAt: string } | null;
};

const POLL_MS = 60_000;

// Estado de boosts compartido por la barra y la página de precios: un solo
// pedido cada minuto aunque haya varios componentes montados.
let cache: { at: number; data: BoostOverview } | null = null;
let inFlight: Promise<BoostOverview | null> | null = null;
const listeners = new Set<(data: BoostOverview) => void>();

async function load(force = false): Promise<BoostOverview | null> {
  if (!force && cache && Date.now() - cache.at < POLL_MS / 2) return cache.data;
  if (!inFlight) {
    inFlight = api
      .get<BoostOverview>("/boosts")
      .then((data) => {
        cache = { at: Date.now(), data };
        listeners.forEach((listener) => listener(data));
        return data;
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useBoosts() {
  const [data, setData] = useState<BoostOverview | null>(cache?.data ?? null);

  useEffect(() => {
    listeners.add(setData);
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => {
      listeners.delete(setData);
      window.clearInterval(timer);
    };
  }, []);

  const refresh = useCallback(() => load(true), []);
  return { data, refresh };
}

/** Cuenta regresiva "1:02:05" / "42:10" que se actualiza cada segundo. */
export function useCountdown(until: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  if (!until) return null;
  const left = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { seconds: left, label: h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}` };
}
