// network/themeAssets.ts
//
// Contraparte de apps/web/hooks/useThemeAsset.ts para el cliente del juego:
// mismo endpoint público (/theme-assets/resolved), mismo shape, mismo cache
// a nivel de módulo para no duplicar el fetch entre componentes.

import { useEffect, useState } from "react";
import { apiGet } from "./http";

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

let cache: ResolvedThemeAssets | null = null;
let inFlight: Promise<ResolvedThemeAssets> | null = null;

async function fetchResolved(): Promise<ResolvedThemeAssets> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = apiGet<ResolvedThemeAssets>("/theme-assets/resolved")
      .then((data) => {
        cache = data;
        return data;
      })
      .catch(() => {
        // No cachear el fallo acá: si se guardara en `cache`, la variable
        // queda "truthy" para siempre y fetchResolved() nunca vuelve a
        // intentar la petición en el resto de la sesión (el chequeo `if
        // (cache) return cache;` de arriba la corta), aunque el backend se
        // recupere al toque después de un error transitorio. Se devuelve un
        // objeto vacío solo para esta llamada puntual, sin persistirlo.
        return {} as ResolvedThemeAssets;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

// undefined = cargando, null = sin variante activa (usar el asset por defecto).
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
