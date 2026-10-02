"use client";

import type { CSSProperties } from "react";
import { Coins, Trophy } from "lucide-react";
import { useThemeAsset } from "../../network/themeAssets";
import { ThemeImage } from "../ThemeImage/ThemeImage";

// Íconos de la economía administrables desde /admin/theme-assets (slots
// COIN_ICON y ACHIEVEMENT_ICON): si hay una imagen activa se usa en TODO el
// juego; si no, el ícono de siempre. Pixelados para que el pixel art se vea
// nítido a cualquier tamaño.

const PIXEL: CSSProperties = { imageRendering: "pixelated", objectFit: "contain", display: "inline-block", verticalAlign: "middle", flexShrink: 0 };

function useIcon(slot: string, size: number, alt: string, className?: string) {
  const asset = useThemeAsset(slot);
  if (!asset) return null;
  return (
    <ThemeImage
      asset={asset}
      fallbackSrc=""
      alt={alt}
      size={size}
      className={className}
      style={{ ...PIXEL, width: asset.mode === "SPRITE" ? undefined : size, height: size }}
    />
  );
}

export function CoinIcon({ size = 14, className }: { size?: number; className?: string }) {
  return useIcon("COIN_ICON", size, "coins", className) ?? <Coins size={size} className={className} />;
}

export function AchievementIcon({ size = 14, className }: { size?: number; className?: string }) {
  return useIcon("ACHIEVEMENT_ICON", size, "achievement", className) ?? <Trophy size={size} className={className} />;
}
