"use client";

import type { ReactNode } from "react";
import { useThemeAsset } from "../hooks/useThemeAsset";
import { ThemeImage, THEME_IMAGE_SPRITE_KEYFRAMES } from "./ThemeImage";

// Keys compartidas con apps/game (ver SLOT_REGISTRY en
// apps/api/src/modules/theme-assets/theme-assets.service.ts): la misma key
// en las dos apps = un solo cambio en /admin/theme-assets las actualiza a
// ambas.
export type AppIconSlot =
  | "ICON_HOME"
  | "ICON_PROFILE"
  | "ICON_FRIENDS"
  | "ICON_MESSAGES"
  | "ICON_NOTIFICATIONS"
  | "ICON_SETTINGS"
  | "ICON_LOGOUT"
  | "ICON_COURSES"
  | "ICON_RANKINGS"
  | "ICON_PLAY"
  | "ICON_DAILY_QUEST"
  | "ICON_MISSIONS"
  | "ICON_REWARDS"
  | "ICON_REWARDS_HUB"
  | "ACHIEVEMENT_ICON"
  | "ICON_BADGES"
  | "ICON_BATTLE_PASS"
  | "ICON_XP"
  | "ICON_STREAK";

// Ícono administrable: si el admin activó una imagen para `slot` se muestra
// esa (fija o sprite animado); si no, el ícono de siempre (`fallback`,
// normalmente un ícono de lucide-react). Mientras carga también se ve el
// fallback, así no hay saltos ni huecos vacíos.
export function AppIcon({
  slot,
  size,
  fallback,
  alt = "",
  className,
}: {
  slot: AppIconSlot;
  size: number;
  fallback: ReactNode;
  alt?: string;
  className?: string;
}) {
  const asset = useThemeAsset(slot);

  if (!asset) return <>{fallback}</>;

  return (
    <>
      {asset.mode === "SPRITE" && <style>{THEME_IMAGE_SPRITE_KEYFRAMES}</style>}
      <ThemeImage
        asset={asset}
        fallbackSrc=""
        alt={alt}
        size={size}
        className={className}
        style={{
          width: asset.mode === "SPRITE" ? undefined : size,
          height: size,
          objectFit: "contain",
          flexShrink: 0,
          // Igual que CurrencyIcon/AchievementIcon: nítido para pixel art.
          imageRendering: "pixelated",
        }}
      />
    </>
  );
}
