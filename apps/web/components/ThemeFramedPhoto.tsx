"use client";

import type { CSSProperties } from "react";
import type { ResolvedThemeAsset } from "../hooks/useThemeAsset";

// Foto administrable que debe encajar dentro de un marco de proporción fija
// (el polaroid de la home, la columna de login/registro) sin que el admin
// tenga que pre-recortar la imagen: el contenedor (className/style, pasado
// por quien llama) define el marco -- tamaño, borde, rotación del marco en
// sí -- y este componente solo pone la FOTO adentro, con object-fit: cover
// más el offset/zoom/rotación que el admin ajustó en /admin/theme-assets.
//
// Sin variante activa: si hay fallbackSrc se muestra esa imagen fija (ej. el
// robot-head.png de siempre); si no, no se renderiza nada -- así un slot que
// nunca tuvo imagen (login/registro) no deja un hueco vacío.
export function ThemeFramedPhoto({
  asset,
  fallbackSrc,
  alt,
  className,
}: {
  asset: ResolvedThemeAsset | null | undefined;
  fallbackSrc?: string;
  alt: string;
  className?: string;
}) {
  const src = asset?.imageUrl ?? fallbackSrc;
  if (!src) return null;

  // Sin variante del admin: se muestra el fallback tal cual el caller lo
  // estilaba antes (className decide object-fit/padding) -- cero cambio
  // visual hasta que alguien suba una foto real desde /admin/theme-assets.
  const style: CSSProperties | undefined = asset
    ? {
        objectFit: "cover",
        objectPosition: `${asset.offsetX}% ${asset.offsetY}%`,
        transform: `scale(${asset.scale}) rotate(${asset.rotation}deg)`,
      }
    : undefined;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} style={style} />;
}
