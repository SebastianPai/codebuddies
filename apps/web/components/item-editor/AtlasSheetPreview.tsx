"use client";

import { useEffect, useState } from "react";

import { SpriteSheetPreview } from "../../src/features/admin/companions/companion-ui";
import { sheetPreviewGeometry } from "./behavior-guidance";

/**
 * La hoja de UNA animación, dibujada con las proporciones reales del PNG.
 *
 * `SpriteSheetPreview` (companions) necesita el tamaño de celda y el editor no
 * lo guarda —no hace falta: se deriva de las medidas del atlas—, así que acá
 * se mide la imagen y se calcula con `sheetPreviewGeometry()`.
 *
 * Mientras no hay medidas, o si el atlas no casa con su metadata, NO se dibuja
 * una hoja inventada: se dice qué pasa. Dibujar con un tamaño supuesto fue el
 * bug que esto corrige.
 */

type Measured =
  | { url: string; state: "ready"; width: number; height: number }
  | { url: string; state: "error" };

type Props = {
  url: string | null;
  framesCount: number;
  directional: boolean;
  /** Caras del objeto (1 / 2 / 4). */
  directions: number;
  fps: number;
  labels: { empty: string; loading: string; error: string };
};

export default function AtlasSheetPreview({
  url,
  framesCount,
  directional,
  directions,
  fps,
  labels,
}: Props) {
  // Se guarda junto a la URL que se midió: si la URL cambia, la medida vieja
  // deja de valer sin necesidad de resetear estado dentro de un efecto.
  const [measured, setMeasured] = useState<Measured | null>(null);

  useEffect(() => {
    if (!url) return undefined;

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setMeasured({
        url,
        state: "ready",
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      if (cancelled) return;
      setMeasured({ url, state: "error" });
    };
    image.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) {
    return (
      <div className="grid h-40 place-items-center rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-600">
        {labels.empty}
      </div>
    );
  }

  const current = measured && measured.url === url ? measured : null;

  if (!current) {
    return (
      <div className="grid h-40 place-items-center rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-500">
        {labels.loading}
      </div>
    );
  }

  const geometry =
    current.state === "ready"
      ? sheetPreviewGeometry(
          { framesCount, directional },
          { width: current.width, height: current.height },
          directions,
        )
      : null;

  if (!geometry) {
    return (
      <div
        role="alert"
        className="grid h-40 place-items-center rounded-xl border border-dashed border-red-900 px-3 text-center text-xs text-red-300"
      >
        {labels.error}
      </div>
    );
  }

  return (
    <SpriteSheetPreview
      url={url}
      frameWidth={geometry.frameWidth}
      frameHeight={geometry.frameHeight}
      framesCount={geometry.cols}
      directions={geometry.rows}
      fps={fps}
      emptyLabel={labels.empty}
    />
  );
}
