"use client";

import { useEffect, useMemo, useState } from "react";

type Clip = {
  key?: string;
  trigger?: string;
  row?: number;
  startCol?: number;
  framesCount?: number;
  fps?: number;
  spriteSheetUrl?: string | null;
  frameWidth?: number | null;
  frameHeight?: number | null;
};

type PetSprite = {
  spriteSheetUrl?: string | null;
  frameWidth?: number;
  frameHeight?: number;
  directions?: number;
  animations?: Clip[];
};

/**
 * Muestra SOLO una celda del spritesheet de la mascota (fila 0 = South),
 * animando el clip de caminata (o idle). Nunca la hoja completa. Se usa en
 * la tienda del juego.
 */
export default function PetSpriteCell({
  petSprite,
  size = 64,
}: {
  petSprite?: PetSprite | null;
  size?: number;
}) {
  const clip = useMemo<Clip | null>(() => {
    const clips = petSprite?.animations ?? [];
    if (!clips.length) return null;
    return (
      clips.find((c) => c.trigger === "MOVING") ??
      clips.find((c) => c.trigger === "IDLE") ??
      clips[0]
    );
  }, [petSprite]);

  const sheet = clip?.spriteSheetUrl || petSprite?.spriteSheetUrl || null;
  const fw = Math.max(1, Number(clip?.frameWidth || petSprite?.frameWidth) || 32);
  const fh = Math.max(1, Number(clip?.frameHeight || petSprite?.frameHeight) || 32);
  const startCol = Math.max(0, Number(clip?.startCol) || 0);
  const cols = Math.max(1, Number(clip?.framesCount) || 1);
  const fps = Math.max(1, Math.min(30, Number(clip?.fps) || 6));

  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!sheet || cols <= 1) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % cols), 1000 / fps);
    return () => clearInterval(id);
  }, [sheet, cols, fps]);

  if (!sheet) {
    return (
      <div
        style={{ width: size, height: size }}
        className="grid place-items-center text-2xl"
        aria-hidden
      >
        🐾
      </div>
    );
  }

  const scale = Math.max(1, Math.min(4, size / Math.max(fw, fh)));

  return (
    <div
      style={{ width: fw * scale, height: fh * scale }}
      className="overflow-hidden"
      aria-hidden
    >
      <div
        style={{
          width: fw,
          height: fh,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          backgroundImage: `url(${sheet})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "auto",
          backgroundPosition: `-${(startCol + frame) * fw}px 0px`,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
