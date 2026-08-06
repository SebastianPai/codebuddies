import { useEffect, useState } from "react";
import { api } from "../utils/api";

export type ThemeAssetIconMode = "STATIC" | "SPRITE";
export type ThemeAssetAnimationDirection = "PINGPONG" | "LOOP";

export type ResolvedThemeAsset = {
  imageUrl: string;
  mode: ThemeAssetIconMode;
  frameCount: number;
  direction: ThemeAssetAnimationDirection;
  frameRate: number;
};

type ResolvedThemeAssets = Record<string, ResolvedThemeAsset | null>;

// Cache + una sola promesa compartida a nivel de módulo: si el logo y otro
// componente piden un slot en el mismo render, solo se hace un fetch.
let cache: ResolvedThemeAssets | null = null;
let inFlight: Promise<ResolvedThemeAssets> | null = null;

async function fetchResolved(): Promise<ResolvedThemeAssets> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = api
      .get<ResolvedThemeAssets>("/theme-assets/resolved")
      .then((data) => {
        cache = data;
        return data;
      })
      .catch(() => {
        // Sin conexión o API caída: nunca bloquear el render por esto, se
        // resuelve como "sin overrides" y cada consumidor usa su fallback.
        cache = {};
        return cache;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

// undefined = todavía cargando, null = sin variante activa (usar fallback).
export function useThemeAsset(key: string): ResolvedThemeAsset | null | undefined {
  const [value, setValue] = useState<ResolvedThemeAsset | null | undefined>(cache ? cache[key] ?? null : undefined);

  useEffect(() => {
    let cancelled = false;
    void fetchResolved().then((resolved) => {
      if (!cancelled) setValue(resolved[key] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return value;
}
