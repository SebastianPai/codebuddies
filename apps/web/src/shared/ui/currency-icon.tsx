"use client";

import { Coins, Gem, Trophy } from "lucide-react";
import { classNames } from "@/shared/utils/class-names";
import { useThemeAsset } from "../../../hooks/useThemeAsset";
import { ThemeImage } from "../../../components/ThemeImage";

interface CurrencyIconProps {
  currency: "coins" | "gems";
  size?: number;
  className?: string;
}

const ICONS = { coins: Coins, gems: Gem } as const;
const CLASS_NAMES = {
  coins: "cb-fx-currency-coins",
  gems: "cb-fx-currency-gems",
} as const;

// Imagen administrable (/admin/theme-assets): si hay una variante activa
// se usa en TODA la web; si no, el ícono de siempre. Pixelada a propósito
// para que los íconos pixel art no se vean borrosos al escalarse.
const PIXEL_STYLE = { imageRendering: "pixelated" as const, objectFit: "contain" as const };

/** Coin/gem icon with the shared premium currency identity color. */
export function CurrencyIcon({ currency, size = 14, className }: CurrencyIconProps) {
  const coinAsset = useThemeAsset("COIN_ICON");
  if (currency === "coins" && coinAsset) {
    return (
      <ThemeImage
        asset={coinAsset}
        fallbackSrc=""
        alt="coins"
        size={size}
        className={classNames("inline-block shrink-0 align-middle", className)}
        style={{ ...PIXEL_STYLE, width: coinAsset.mode === "SPRITE" ? undefined : size, height: size }}
      />
    );
  }
  const Icon = ICONS[currency];
  return <Icon size={size} className={classNames(CLASS_NAMES[currency], className)} />;
}

/** Ícono de logro, administrable igual que la moneda (slot ACHIEVEMENT_ICON). */
export function AchievementIcon({ size = 16, className }: { size?: number; className?: string }) {
  const asset = useThemeAsset("ACHIEVEMENT_ICON");
  if (asset) {
    return (
      <ThemeImage
        asset={asset}
        fallbackSrc=""
        alt="achievement"
        size={size}
        className={classNames("inline-block shrink-0 align-middle", className)}
        style={{ ...PIXEL_STYLE, width: asset.mode === "SPRITE" ? undefined : size, height: size }}
      />
    );
  }
  return <Trophy size={size} className={className} />;
}
