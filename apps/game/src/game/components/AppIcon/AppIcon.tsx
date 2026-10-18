import type { ReactNode } from "react";
import { useThemeAsset } from "../../network/themeAssets";
import { ThemeImage, THEME_IMAGE_SPRITE_KEYFRAMES } from "../ThemeImage/ThemeImage";

// Contraparte de apps/web/components/AppIcon.tsx — mismas keys (ver
// SLOT_REGISTRY en apps/api/src/modules/theme-assets/theme-assets.service.ts),
// así un ícono compartido como ICON_PROFILE o ICON_MESSAGES se cambia una
// sola vez en /admin/theme-assets y se actualiza en la web y en el juego.
export type AppIconSlot =
  | "ICON_HOME"
  | "ICON_PROFILE"
  | "ICON_FRIENDS"
  | "ICON_MESSAGES"
  | "ICON_NOTIFICATIONS"
  | "ICON_SETTINGS"
  | "ICON_LOGOUT"
  | "ICON_PC"
  | "ICON_WARDROBE"
  | "ICON_TOURNAMENTS"
  | "ICON_SHOP"
  | "ICON_PET"
  | "ICON_BUTLER"
  | "ICON_BUILD"
  | "ICON_MARKETPLACE"
  | "ICON_CHAT_THEME"
  | "ICON_SEND"
  | "REACTION_WAVE"
  | "REACTION_LAUGH"
  | "REACTION_FIRE"
  | "REACTION_BYE";

// Imagen del admin si hay una variante activa para `slot`; si no (o
// mientras carga), el ícono/emoji de siempre (`fallback`).
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
          // Igual que shared/ThemeIcons: nítido para pixel art.
          imageRendering: "pixelated",
        }}
      />
    </>
  );
}
