"use client";

import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";

// Fuente única de verdad de rareza, consumida desde el backend
// (GET /items/rarity-catalog -> apps/api/src/common/economy/rarity.constants.ts).
// Ningún componente debe volver a declarar su propia tabla de rareza --
// antes ItemsPage.tsx y ItemEditor.tsx tenían cada uno la suya, desalineada
// entre sí y con el Shop de apps/game (ver auditoría de economía de items).
export type RarityKey = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type RarityDefinition = {
  id: number;
  key: RarityKey;
  minCoins: number;
  maxCoins: number;
};

export function capitalizeRarityKey(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function useRarityCatalog(): RarityDefinition[] {
  const [rarities, setRarities] = useState<RarityDefinition[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<RarityDefinition[]>("/items/rarity-catalog")
      .then((data) => {
        if (!cancelled) setRarities(data);
      })
      .catch(() => {
        // Sin fallback hardcodeado a propósito: si el catálogo no carga, los
        // selectores de rareza quedan vacíos en vez de mentir con una copia
        // local que podría desincronizarse de nuevo del backend.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return rarities;
}
