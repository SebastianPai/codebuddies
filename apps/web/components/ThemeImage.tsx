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
    // jump-none: un paso por cuadro (N posiciones de 0% a 100%); mínimo 2.
  const steps = Math.max(2, asset.frameCount);
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
          animationTimingFunction: `steps(${steps}, jump-none)`,
          animationDirection: asset.direction === "PINGPONG" ? "alternate" : "normal",
        }}
      />
    );
  }

  // Las imágenes del admin suben tal cual (el LOGO pesaba 1,3 MB y se ve a
  // 40 px en todas las páginas): pasan por el optimizador de Next, que las
  // achica al tamaño real (x2 para pantallas retina) y las sirve en WebP/AVIF.
  // Si el optimizador falla, se cae a la original.
  return <OptimizedImg src={asset.imageUrl} size={size} alt={alt} className={className} style={style} />;
}

// Anchos que acepta /_next/image por defecto (imageSizes + deviceSizes).
const NEXT_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920];
function optimizedUrl(src: string, px: number): string {
  const w = NEXT_WIDTHS.find((n) => n >= px) ?? 1920;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
}

function OptimizedImg({ src, size, alt, className, style }: { src: string; size: number; alt: string; className?: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false);
  const usable = !failed && /^https:\/\//.test(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={usable ? optimizedUrl(src, size * 2) : src}
      srcSet={usable ? `${optimizedUrl(src, size)} 1x, ${optimizedUrl(src, size * 2)} 2x, ${optimizedUrl(src, size * 3)} 3x` : undefined}
      onError={() => setFailed(true)}
      alt={alt}
      className={className}
      style={style}
    />
  );
}

export const THEME_IMAGE_SPRITE_KEYFRAMES = `
@keyframes theme-image-sprite-slide {
  from { background-position: 0% 0; }
  to { background-position: 100% 0; }
}
`;
