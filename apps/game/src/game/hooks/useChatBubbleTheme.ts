"use client";

// hooks/useChatBubbleTheme.ts — estado compartido de "qué color de burbuja
// de chat uso", consumido tanto desde Ajustes (SettingsWindow) como desde
// el botón rápido de la barra de chat (BottomBar/ChatThemePopover) para no
// duplicar la lógica de carga/guardado en los dos lugares.
import { useEffect, useState } from "react";
import { getCurrentUser } from "../network/auth";
import { apiPatch } from "../network/http";

const STORAGE_KEY = "chatBubbleThemeId";

export function useChatBubbleTheme() {
  // Mismo criterio que pcTheme/uiLanguage: localStorage es solo caché para
  // pintar rápido, la cuenta manda apenas responde getCurrentUser().
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window === "undefined") return "classic";
    return window.localStorage.getItem(STORAGE_KEY) || "classic";
  });
  const [isPremium, setIsPremium] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<"PREMIUM_REQUIRED" | "SAVE_ERROR" | null>(null);

  useEffect(() => {
    void getCurrentUser().then((user) => {
      if (!user) return;
      setIsPremium(!!user.isPremium);
      const remote = user.chatBubbleThemeId || "classic";
      setThemeId(remote);
      window.localStorage.setItem(STORAGE_KEY, remote);
    });
  }, []);

  const selectTheme = async (id: string, tier: "free" | "premium") => {
    setError(null);
    if (tier === "premium" && !isPremium) {
      setError("PREMIUM_REQUIRED");
      return false;
    }

    const previous = themeId;
    setThemeId(id);
    window.localStorage.setItem(STORAGE_KEY, id);
    setSaving(true);
    try {
      await apiPatch("/identity/profile", { chatBubbleThemeId: id });
      return true;
    } catch {
      setThemeId(previous);
      window.localStorage.setItem(STORAGE_KEY, previous);
      setError("SAVE_ERROR");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { themeId, isPremium, saving, error, selectTheme };
}
