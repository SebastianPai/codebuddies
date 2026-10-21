"use client";

import { useEffect, useRef } from "react";
import { useThemeAsset, type ResolvedThemeAsset } from "../hooks/useThemeAsset";

// Fondo parallax del hero de la home: 5 capas administrables desde
// /admin/theme-assets (slots PARALLAX_1..5, 1 = la de más atrás). Cada capa
// se mueve según su "Distancia" (parallaxDepth, 0 = cerca .. 100 = lejos):
// mientras más lejos, menos se desplaza con el scroll y con el mouse, y eso
// es lo que da la sensación de profundidad.
//
// Capas sin imagen activa no se dibujan; si no hay ninguna, el componente no
// renderiza nada y la home queda exactamente como antes.

const LAYERS = [
  { slot: "PARALLAX_1", defaultDepth: 95 }, // cielo estrellado: casi quieto
  { slot: "PARALLAX_2", defaultDepth: 75 }, // montañas
  { slot: "PARALLAX_3", defaultDepth: 50 }, // pueblo
  { slot: "PARALLAX_4", defaultDepth: 25 }, // cipreses y árboles
  { slot: "PARALLAX_5", defaultDepth: 5 }, // primer plano: el que más se mueve
] as const;

// Cuánto puede llegar a moverse la capa más cercana.
const MAX_MOUSE_SHIFT_PX = 28;
const MAX_SCROLL_LAG = 0.6;

type Layer = { asset: ResolvedThemeAsset; depth: number };

export function HomeParallax() {
  const assets = [
    useThemeAsset(LAYERS[0].slot),
    useThemeAsset(LAYERS[1].slot),
    useThemeAsset(LAYERS[2].slot),
    useThemeAsset(LAYERS[3].slot),
    useThemeAsset(LAYERS[4].slot),
  ];

  const layers: Layer[] = [];
  assets.forEach((asset, index) => {
    if (asset) layers.push({ asset, depth: asset.parallaxDepth ?? LAYERS[index].defaultDepth });
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (layers.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let mouseX = 0;
    let mouseY = 0;
    let frame = 0;

    const render = () => {
      frame = 0;
      const scrollY = window.scrollY;
      layerRefs.current.forEach((el) => {
        if (!el) return;
        const depth = Number(el.dataset.depth) / 100; // 0 cerca .. 1 lejos
        const near = 1 - depth;
        // Scroll: las capas lejanas "se quedan atrás" (bajan junto con el
        // scroll), las cercanas acompañan a la página.
        const y = scrollY * depth * MAX_SCROLL_LAG + mouseY * near * (MAX_MOUSE_SHIFT_PX / 2);
        const x = mouseX * near * MAX_MOUSE_SHIFT_PX;
        el.style.transform = `translate3d(${-x}px, ${y}px, 0) scale(${el.dataset.scale})`;
      });
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      mouseX = event.clientX / window.innerWidth - 0.5;
      mouseY = event.clientY / window.innerHeight - 0.5;
      schedule();
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    render();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
    // Las capas solo cambian cuando llega el fetch de theme-assets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.length]);

  if (layers.length === 0) return null;

  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {layers.map(({ asset, depth }, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={asset.imageUrl}
          ref={(el) => {
            layerRefs.current[index] = el;
          }}
          src={asset.imageUrl}
          alt=""
          data-depth={depth}
          // 10% extra de ancho/alto para que al moverse nunca se vea el borde.
          data-scale={1.1 * (asset.scale || 1)}
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          style={{
            objectPosition: `${asset.offsetX ?? 50}% ${asset.offsetY ?? 100}%`,
            transform: `scale(${1.1 * (asset.scale || 1)})`,
          }}
        />
      ))}
      {/* Para que el texto del hero se lea encima y la última capa se funda
          con el resto de la página en vez de cortarse en seco. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[rgb(var(--background))]" />
    </div>
  );
}
