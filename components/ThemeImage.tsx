"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { ResolvedThemeAsset } from "../hooks/useThemeAsset";

const frameAspectCache = new Map<string, number>();

function useFrameAspect(url: string | null, frameCount: number): number {
  const cacheKey = url ? `${url}::${frameCount}` : "";
  const [aspect, setAspect] = useState(() => (cacheKey ? frameAspectCache.get(cacheKey) ?? 1 : 1));

  useEffect(() => {
    if (!url) return;
    const cached = frameAspectCache.get(cacheKey);
    if (cached) {
      setAspect(cached);
      return;
    }

    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      const frameWidth = img.naturalWidth / Math.max(1, frameCount);
      const result = img.naturalHeight > 0 ? frameWidth / img.naturalHeight : 1;
      frameAspectCache.set(cacheKey, result);
      if (!cancelled) setAspect(result);
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url, frameCount, cacheKey]);

  return aspect;
}

// Imagen del juego que puede venir del sistema de theme-assets (admin) o,
// si no hay ninguna variante activa para `slotKey`, caer en el archivo
// estático de siempre (`fallbackSrc`) — así nada se rompe para quien nunca
// tocó /admin/theme-assets. `size` (px) es obligatorio solo para animar el
// modo SPRITE (el sprite-sheet necesita un alto concreto para calcular el
// ancho de cada cuadro).
export function ThemeImage({
  asset,
  fallbackSrc,
  alt,
  size,
  className,
  style,
}: {
  asset: ResolvedThemeAsset | null | undefined;
  fallbackSrc: string;
  alt: string;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const aspect = useFrameAspect(asset?.mode === "SPRITE" ? asset.imageUrl : null, asset?.frameCount ?? 1);

  if (!asset) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fallbackSrc} alt={alt} className={className} style={style} />;
  }

  if (asset.mode === "SPRITE") {
    const steps = Math.max(1, asset.frameCount - 1);
    const duration = asset.frameCount / Math.max(1, asset.frameRate);

    return (
      <div
        role="img"
        aria-label={alt}
        className={className}
        style={{
          ...style,
          width: size * aspect,
          height: size,
          backgroundImage: `url(${asset.imageUrl})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${asset.frameCount * 100}% 100%`,
          animationName: "theme-image-sprite-slide",
          animationIterationCount: "infinite",
          animationDuration: `${duration}s`,
          animationTimingFunction: `steps(${steps})`,
          animationDirection: asset.direction === "PINGPONG" ? "alternate" : "normal",
        }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.imageUrl} alt={alt} className={className} style={style} />;
}

export const THEME_IMAGE_SPRITE_KEYFRAMES = `
@keyframes theme-image-sprite-slide {
  from { background-position: 0% 0; }
  to { background-position: 100% 0; }
}
`;
