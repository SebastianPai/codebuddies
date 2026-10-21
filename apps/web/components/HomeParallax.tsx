"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useThemeAsset, type ResolvedThemeAsset } from "../hooks/useThemeAsset";

// Fondo parallax del hero de la home: 5 capas administrables desde
// /admin/theme-assets (slots PARALLAX_1..5, 1 = la de más atrás). Cada capa
// se mueve según su "Distancia" (parallaxDepth, 0 = cerca .. 100 = lejos):
// mientras más lejos, menos se desplaza con el scroll y con el mouse, y eso
// es lo que da la sensación de profundidad.
//
// Capas sin imagen activa no se dibujan; si no hay ninguna, el componente no
// renderiza nada y la home queda exactamente como antes.
//
// CAPAS ANIMADAS (lo más liviano primero):
//   - Sprite sheet (modo "Sprite" en el admin): una tira horizontal de N
//     cuadros animada con CSS (steps), sin JavaScript por cuadro. Es la
//     opción más liviana y la que mejor se ve en pixel art.
//   - GIF / WebP animado: se muestran tal cual con <img> (el backend ya no
//     les borra la animación al optimizarlos).
// Con "reducir movimiento" activado en el sistema, todo queda quieto.

const SPRITE_KEYFRAMES = `
@keyframes parallax-sprite-slide {
  from { background-position: 0% 0; }
  to { background-position: 100% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .parallax-sprite { animation: none !important; }
}
`;

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

  const anchorRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Alto en px desde el tope de la página hasta el final del hero.
  const [height, setHeight] = useState<number | null>(null);
  // Ancho real del fondo (100% del body), para cubrir con los sprite sheets.
  const [width, setWidth] = useState(0);

  // El fondo se dibuja en <body> (portal), no dentro del hero: el hero vive
  // en un <main max-w-7xl> y la página tiene overflow-x-hidden, así que
  // cualquier capa dentro quedaba recortada a la columna central. Este
  // efecto mide dónde termina el hero para darle al fondo ese mismo alto.
  const hasLayers = layers.length > 0;
  useEffect(() => {
    const section = anchorRef.current?.parentElement;
    if (!hasLayers || !section) return;

    const measure = () => {
      const rect = section.getBoundingClientRect();
      setHeight(Math.round(rect.bottom + window.scrollY));
      setWidth(document.body.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [hasLayers]);

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
  }, [layers.length, height]);

  if (layers.length === 0) return null;

  const background = height !== null && (
    // De borde a borde y desde el tope de la página (detrás del navbar) hasta
    // el final del hero. z-0: arriba del fondo de la página, debajo del
    // contenido del hero (que está en un contenedor z-10).
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-0 w-full overflow-hidden"
      style={{ height }}
    >
      <style>{SPRITE_KEYFRAMES}</style>
      {layers.map(({ asset, depth }, index) => (
        // El contenedor recibe el movimiento del parallax; adentro va la
        // imagen fija/animada o el sprite sheet.
        <div
          key={asset.imageUrl}
          ref={(el) => {
            layerRefs.current[index] = el;
          }}
          data-depth={depth}
          // 10% extra de ancho/alto para que al moverse nunca se vea el borde.
          data-scale={1.1 * (asset.scale || 1)}
          className="absolute inset-0 will-change-transform"
          style={{ transform: `scale(${1.1 * (asset.scale || 1)})` }}
        >
          {asset.mode === "SPRITE" ? (
            <SpriteCover asset={asset} boxWidth={width} boxHeight={height ?? 0} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.imageUrl}
              alt=""
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${asset.offsetX ?? 50}% ${asset.offsetY ?? 100}%` }}
            />
          )}
        </div>
      ))}
      {/* Para que el texto del hero se lea encima y la última capa se funda
          con el resto de la página en vez de cortarse en seco. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[rgb(var(--background))]" />
    </div>
  );

  return (
    <>
      {/* Marca invisible dentro del hero, solo para medirlo. */}
      <div ref={anchorRef} aria-hidden="true" className="hidden" />
      {background && createPortal(background, document.body)}
    </>
  );
}

/**
 * Sprite sheet horizontal (N cuadros iguales) que CUBRE el fondo como un
 * object-cover, animado solo con CSS. El tamaño del cuadro sale de la imagen
 * real, así que no hay que configurarlo a mano: basta con "Cuadros" y
 * "Velocidad" en el admin.
 */
function SpriteCover({
  asset,
  boxWidth,
  boxHeight,
}: {
  asset: ResolvedThemeAsset;
  boxWidth: number;
  boxHeight: number;
}) {
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const frames = Math.max(1, asset.frameCount);

  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setFrame({ w: img.naturalWidth / frames, h: img.naturalHeight });
    };
    img.src = asset.imageUrl;
    return () => {
      cancelled = true;
    };
  }, [asset.imageUrl, frames]);

  if (!frame || !boxWidth || !boxHeight || !frame.h) return null;

  // object-cover: el cuadro escala hasta tapar todo y se encuadra con el
  // foco X/Y del admin (offsetX/offsetY, 50/100 = centrado abajo).
  const scale = Math.max(boxWidth / frame.w, boxHeight / frame.h);
  const w = frame.w * scale;
  const h = frame.h * scale;
  const left = (boxWidth - w) * ((asset.offsetX ?? 50) / 100);
  const top = (boxHeight - h) * ((asset.offsetY ?? 100) / 100);

  return (
    <div
      className="parallax-sprite absolute"
      style={{
        left,
        top,
        width: w,
        height: h,
        backgroundImage: `url(${JSON.stringify(asset.imageUrl)})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${frames * 100}% 100%`,
        imageRendering: "pixelated",
        animationName: frames > 1 ? "parallax-sprite-slide" : undefined,
        animationDuration: `${frames / Math.max(1, asset.frameRate)}s`,
        animationTimingFunction: `steps(${Math.max(2, frames)}, jump-none)`,
        animationIterationCount: "infinite",
        animationDirection: asset.direction === "PINGPONG" ? "alternate" : "normal",
      }}
    />
  );
}
