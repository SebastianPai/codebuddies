"use client";

// hooks/useNameEffect.ts — estado compartido de "qué efecto visual usa mi
// nombre" (ver @codebuddies/visual-effects), consumido desde Ajustes
// (SettingsWindow). Mismo criterio que useChatBubbleTheme.ts: localStorage
// es solo caché para pintar rápido, la cuenta manda apenas responde
// getCurrentUser().
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
  const [isPremium, setIsPremium] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<"PREMIUM_REQUIRED" | "SAVE_ERROR" | null>(null);

  useEffect(() => {
    void getCurrentUser().then((user) => {
      if (!user) return;
      setIsPremium(!!user.isPremium);
      const remote = user.nameEffectId || DEFAULT_EFFECT;
      setEffectId(remote);
      window.localStorage.setItem(STORAGE_KEY, remote);
    });
  }, []);

  const selectEffect = async (id: string, tier: "free" | "premium") => {
    setError(null);
    if (tier === "premium" && !isPremium) {
      setError("PREMIUM_REQUIRED");
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

  return { effectId, isPremium, saving, error, selectEffect };
}
