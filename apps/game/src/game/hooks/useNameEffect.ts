"use client";

// hooks/useNameEffect.ts — estado compartido de "qué efecto visual usa mi
// nombre" (ver @codebuddies/visual-effects), consumido desde Ajustes
// (SettingsWindow). Mismo criterio que useChatBubbleTheme.ts: localStorage
// es solo caché para pintar rápido, la cuenta manda apenas responde
// getCurrentUser(). A diferencia del chat bubble theme (2 tiers: free/
// premium), acá hay 3 tiers (free/premium/ownable — ver
// packages/visual-effects/index.ts) así que en vez de un booleano isPremium
// el server manda la lista completa de ids desbloqueados (unlockedEffectIds,
// ya resuelve ADMIN/premium/items comprados).
import { useEffect, useState } from "react";
import { getCurrentUser } from "../network/auth";
import { apiPatch } from "../network/http";

const STORAGE_KEY = "nameEffectId";
const DEFAULT_EFFECT = "common";

export function useNameEffect() {
  const [effectId, setEffectId] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_EFFECT;
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_EFFECT;
  });
  const [unlockedEffectIds, setUnlockedEffectIds] = useState<string[]>([DEFAULT_EFFECT]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<"NOT_UNLOCKED" | "SAVE_ERROR" | null>(null);

  useEffect(() => {
    void getCurrentUser().then((user) => {
      if (!user) return;
      setUnlockedEffectIds(user.unlockedEffectIds ?? [DEFAULT_EFFECT]);
      const remote = user.nameEffectId || DEFAULT_EFFECT;
      setEffectId(remote);
      window.localStorage.setItem(STORAGE_KEY, remote);
    });
  }, []);

  const selectEffect = async (id: string) => {
    setError(null);
    if (!unlockedEffectIds.includes(id)) {
      setError("NOT_UNLOCKED");
      return false;
    }

    const previous = effectId;
    setEffectId(id);
    window.localStorage.setItem(STORAGE_KEY, id);
    setSaving(true);
    try {
      await apiPatch("/identity/profile", { nameEffectId: id });
      return true;
    } catch {
      setEffectId(previous);
      window.localStorage.setItem(STORAGE_KEY, previous);
      setError("SAVE_ERROR");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { effectId, unlockedEffectIds, saving, error, selectEffect };
}
