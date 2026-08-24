"use client";

import { useEffect, useState } from "react";

export type WindowLayout = "desktop" | "tablet" | "compact";

export interface ViewportMode {
  /** Nivel estructural: qué tan grande es el lado más chico del viewport.
   *  Se usa min(width, height) en vez de solo width para que una tablet o un
   *  teléfono en landscape (ancho grande, alto chico) no se clasifiquen como
   *  desktop solo por rotar la pantalla. */
  layout: WindowLayout;
  /** input primario grueso (touch/lápiz sin hover fino) vía `pointer: coarse`,
   *  independiente de `layout`: una laptop táctil con ventana grande sigue
   *  necesitando áreas de toque más grandes aunque su layout sea "desktop". */
  isCoarsePointer: boolean;
  isTouchCapable: boolean;
  orientation: "portrait" | "landscape";
  /** false hasta la primera medición en cliente. Los valores por defecto ya
   *  son "desktop", así que el árbol de desktop nunca depende de este flag. */
  ready: boolean;
}

const COMPACT_MAX = 700;
const TABLET_MAX = 1024;

const DESKTOP_DEFAULT: ViewportMode = {
  layout: "desktop",
  isCoarsePointer: false,
  isTouchCapable: false,
  orientation: "landscape",
  ready: false,
};

function measure(): ViewportMode {
  if (typeof window === "undefined") return DESKTOP_DEFAULT;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const smallestSide = Math.min(width, height);

  const layout: WindowLayout =
    smallestSide <= COMPACT_MAX ? "compact" : smallestSide <= TABLET_MAX ? "tablet" : "desktop";

  return {
    layout,
    isCoarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    isTouchCapable: "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0,
    orientation: width >= height ? "landscape" : "portrait",
    ready: true,
  };
}

// Único punto de detección de viewport/input para todo el juego: gatea el
// modo "sheet" de las ventanas flotantes, el colapso del HUD y el tamaño de
// áreas táctiles. Devuelve valores "desktop" tanto en SSR como en el primer
// render de cliente (evita mismatches de hidratación) y recién se actualiza
// en un efecto — así el árbol de desktop nunca cambia hasta que de verdad
// se mide un viewport chico.
export function useViewportMode(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>(DESKTOP_DEFAULT);

  useEffect(() => {
    setMode(measure());

    const update = () => setMode(measure());

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    const coarseQuery = window.matchMedia?.("(pointer: coarse)");
    coarseQuery?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      coarseQuery?.removeEventListener?.("change", update);
    };
  }, []);

  return mode;
}
