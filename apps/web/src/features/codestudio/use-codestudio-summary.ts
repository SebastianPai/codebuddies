"use client";

import { useEffect, useState } from "react";
import { api } from "@/shared/api";
import { useApiLang } from "@/shared/hooks/use-api-lang";
import { getGameUrl } from "@/config/env";
import { useAuth } from "../../../hooks/useAuth";

export type CodeStudioSummary = {
  company: { id: string; name: string; status: string; stage: number; stageName: string; stageCount: number; cash: number; activeUsers: number; valuation: number } | null;
  companiesCount: number;
  level: number;
  xp: number;
  levelXp: number;
  nextLevelXp: number;
  gameXpToday: number;
  gameXpCap: number;
  daily: {
    missions: Array<{ key: string; label: string; target: number; progress: number; done: boolean; xp: number; coins: number }>;
    bonus: { xp: number; coins: number; done: boolean };
    resetsInMinutes: number;
  };
  milestones: number;
  totalMilestones: number;
};

export type CodeStudioView = "panel" | "guide" | "tree" | "bugs" | "team" | "career";

/** Enlace que abre el juego directo en CodeStudio (ver apps/game deepLink.ts). */
export function codeStudioLink(view: CodeStudioView = "panel") {
  const url = new URL(getGameUrl());
  url.searchParams.set("open", "codestudio");
  url.searchParams.set("view", view);
  return url.toString();
}

// Un solo pedido compartido por página aunque varios componentes lo usen.
let cache: { key: string; at: number; data: CodeStudioSummary } | null = null;
let inFlight: { key: string; promise: Promise<CodeStudioSummary | null> } | null = null;

function load(lang: string): Promise<CodeStudioSummary | null> {
  if (cache && cache.key === lang && Date.now() - cache.at < 30_000) return Promise.resolve(cache.data);
  if (inFlight?.key === lang) return inFlight.promise;
  const promise = api
    .get<CodeStudioSummary>(`/codestudio/summary?lang=${lang}`)
    .then((data) => {
      cache = { key: lang, at: Date.now(), data };
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  inFlight = { key: lang, promise };
  return promise;
}

/** Resumen de CodeStudio del usuario (null sin sesión o si falla). */
export function useCodeStudioSummary() {
  const { isAuthenticated, loading } = useAuth();
  const lang = useApiLang();
  const [data, setData] = useState<CodeStudioSummary | null>(cache?.key === lang ? cache.data : null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void load(lang).then((next) => {
      if (cancelled) return;
      setData(next);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, lang]);

  return { data, ready, isAuthenticated };
}
