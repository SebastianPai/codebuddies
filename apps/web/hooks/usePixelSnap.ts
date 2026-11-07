"use client";

import { useEffect, useState } from "react";

// Pixel art nítido: un ícono de 32 px dibujado a 22 px con image-rendering
// "pixelated" pierde filas y columnas enteras (se ve roto). Este hook elige un
// tamaño en pantalla donde cada píxel del dibujo cae en píxeles reales enteros
// (según el tamaño real de la imagen y la densidad de la pantalla): en un
// celular o una pantalla retina, 16 px CSS de un ícono de 32 px son 32 píxeles
// reales, exacto. Si no hay un tamaño exacto cerca del pedido, achica suave.
//   const { size, rendering } = usePixelSnap(url, 22);
const naturalHeights = new Map<string, number>();

export function usePixelSnap(url: string | null | undefined, requested: number) {
  const [natural, setNatural] = useState<number | null>(() => (url ? naturalHeights.get(url) ?? null : null));
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
  }, []);

  useEffect(() => {
    if (!url) return;
    const known = naturalHeights.get(url);
    if (known) {
      setNatural(known);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      naturalHeights.set(url, img.naturalHeight);
      setNatural(img.naturalHeight);
    };
    img.src = url;
  }, [url]);

  return snapPixelSize(natural, requested, dpr);
}

/** Tamaño CSS y modo de dibujo para que el pixel art quede nítido. */
export function snapPixelSize(natural: number | null, requested: number, dpr: number) {
  if (!natural || natural <= 0) return { size: requested, rendering: "pixelated" as const };
  const deviceRequested = requested * dpr;
  // Múltiplo entero más cercano del tamaño real, sin crecer más de 1.5x lo pedido.
  let k = Math.max(1, Math.round(deviceRequested / natural));
  while (k > 1 && (k * natural) / dpr > requested * 1.5) k--;
  const exact = (k * natural) / dpr;
  if (exact <= requested * 1.5) return { size: exact, rendering: "pixelated" as const };
  // Ni el tamaño real entra: la mitad exacta si queda cerca, achicada suave.
  const half = natural / 2 / dpr;
  if (half >= requested * 0.7 && half <= requested * 1.5) return { size: half, rendering: "auto" as const };
  return { size: requested, rendering: "auto" as const };
}
