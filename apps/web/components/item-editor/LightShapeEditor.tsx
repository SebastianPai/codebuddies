"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

// Editor visual de la forma de la luz de un objeto (WorldItemData.lightConfig).
// Muestra la cara frontal del sprite con la luz dibujada encima: un punto que
// se arrastra para decir DE DÓNDE sale la luz, y un círculo o un cono
// ("porción de pizza") con su dirección y apertura. Mismo sistema de
// coordenadas que el juego (ver RoomItemsManager.lightOf): el origen es
// relativo al centro-abajo del sprite, en píxeles del sprite.

export type LightConfig = {
  shape: "CIRCLE" | "CONE";
  originX: number;
  originY: number;
  direction: number;
  spread: number;
};

const PREVIEW_MAX = 260;

type Labels = {
  title: string;
  hint: string;
  circle: string;
  cone: string;
  direction: string;
  spread: string;
  reset: string;
};

export default function LightShapeEditor({
  imageUrl,
  faces,
  radius,
  color,
  value,
  onChange,
  labels,
}: {
  imageUrl?: string | null;
  /** Caras del spritesheet (1/2/4): se muestra solo la primera. */
  faces: number;
  radius: number;
  color: string;
  value: LightConfig | null;
  onChange: (next: LightConfig | null) => void;
  labels: Labels;
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const frameW = natural ? natural.w / Math.max(1, faces) : 128;
  const frameH = natural ? natural.h : 128;
  // La vista deja aire alrededor del sprite para ver la luz completa.
  const pad = Math.max(radius, 40);
  const viewW = frameW + pad * 2;
  const viewH = frameH + pad * 2;
  const scale = Math.min(PREVIEW_MAX / viewW, PREVIEW_MAX / viewH, 2);

  // Sin config = círculo en el centro del sprite (el comportamiento de siempre).
  const config: LightConfig = value ?? {
    shape: "CIRCLE",
    originX: 0,
    originY: -Math.round(frameH / 2),
    direction: 90,
    spread: 70,
  };
  const update = (patch: Partial<LightConfig>) => onChange({ ...config, ...patch });

  // Ancla del sprite (centro-abajo) dentro de la vista, en px del sprite.
  const anchorX = pad + frameW / 2;
  const anchorY = pad + frameH;
  const lx = anchorX + config.originX;
  const ly = anchorY + config.originY;

  const toSprite = (event: ReactPointerEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = (event.clientX - box.left) / scale - anchorX;
    const y = (event.clientY - box.top) / scale - anchorY;
    update({ originX: Math.round(x), originY: Math.round(y) });
  };

  const half = (config.spread / 2) * (Math.PI / 180);
  const dir = config.direction * (Math.PI / 180);
  const conePath = () => {
    const a1 = dir - half;
    const a2 = dir + half;
    const x1 = lx + Math.cos(a1) * radius;
    const y1 = ly + Math.sin(a1) * radius;
    const x2 = lx + Math.cos(a2) * radius;
    const y2 = ly + Math.sin(a2) * radius;
    const large = config.spread > 180 ? 1 : 0;
    return `M ${lx} ${ly} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="space-y-2 rounded-xl border border-zinc-800 bg-black/40 p-3 text-sm">
      <p className="font-bold">{labels.title}</p>
      <p className="text-xs text-zinc-500">{labels.hint}</p>

      <div className="flex gap-1">
        {(["CIRCLE", "CONE"] as const).map((shape) => (
          <button
            key={shape}
            type="button"
            onClick={() => update({ shape })}
            aria-pressed={config.shape === shape}
            className={`rounded-md px-2 py-1 text-xs font-bold ${
              config.shape === shape ? "bg-yellow-400 text-black" : "bg-zinc-900 text-zinc-400"
            }`}
          >
            {shape === "CIRCLE" ? labels.circle : labels.cone}
          </button>
        ))}
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400"
          >
            {labels.reset}
          </button>
        )}
      </div>

      <div
        ref={boxRef}
        className="relative mx-auto touch-none select-none overflow-hidden rounded-lg bg-[repeating-conic-gradient(#27272a_0%_25%,#131316_0%_50%)] bg-[length:12px_12px]"
        style={{ width: viewW * scale, height: viewH * scale, cursor: "crosshair" }}
        onPointerDown={(event) => {
          dragging.current = true;
          (event.target as Element).setPointerCapture?.(event.pointerId);
          toSprite(event);
        }}
        onPointerMove={(event) => dragging.current && toSprite(event)}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        {imageUrl && (
          <div
            className="absolute"
            style={{
              left: pad * scale,
              top: pad * scale,
              width: frameW * scale,
              height: frameH * scale,
              backgroundImage: `url(${JSON.stringify(imageUrl)})`,
              backgroundSize: `${Math.max(1, faces) * 100}% 100%`,
              backgroundPosition: "0 0",
              imageRendering: "pixelated",
            }}
          />
        )}
        <svg className="pointer-events-none absolute inset-0" width={viewW * scale} height={viewH * scale} viewBox={`0 0 ${viewW} ${viewH}`}>
          <defs>
            <radialGradient id="light-shape-glow" cx={lx} cy={ly} r={radius} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color} stopOpacity="0.85" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>
          {config.shape === "CONE" ? (
            <path d={conePath()} fill="url(#light-shape-glow)" stroke={color} strokeOpacity="0.6" strokeDasharray="4 3" />
          ) : (
            <circle cx={lx} cy={ly} r={radius} fill="url(#light-shape-glow)" stroke={color} strokeOpacity="0.6" strokeDasharray="4 3" />
          )}
          <circle cx={lx} cy={ly} r={5 / scale + 2} fill="#facc15" stroke="#000" strokeWidth={1.5 / scale} />
        </svg>
      </div>

      {config.shape === "CONE" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-zinc-400">
            {labels.direction} ({config.direction}°)
            <input
              type="range"
              min={0}
              max={359}
              value={config.direction}
              onChange={(e) => update({ direction: Number(e.target.value) })}
              className="mt-1 w-full accent-yellow-400"
            />
          </label>
          <label className="text-xs text-zinc-400">
            {labels.spread} ({config.spread}°)
            <input
              type="range"
              min={10}
              max={180}
              step={5}
              value={config.spread}
              onChange={(e) => update({ spread: Number(e.target.value) })}
              className="mt-1 w-full accent-yellow-400"
            />
          </label>
        </div>
      )}
    </div>
  );
}
