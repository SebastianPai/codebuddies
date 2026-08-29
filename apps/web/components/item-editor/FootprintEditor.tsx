"use client";

import { useState } from "react";
import { useTranslation } from "../../src/i18n/useTranslation";

type Direction = "NORTH" | "EAST" | "SOUTH" | "WEST";
type Mode = "footprint" | "surface" | "origin";
type Tile = { x: number; y: number };
type DirectionData = { occupied: Tile[]; origin: Tile };
export type FootprintMap = Record<Direction, DirectionData>;

const DIRECTIONS: Array<{ key: Direction; labelKey: string; frame: number }> = [
  { key: "NORTH", labelKey: "editor.northLabel", frame: 0 },
  { key: "EAST", labelKey: "editor.eastLabel", frame: 1 },
  { key: "SOUTH", labelKey: "editor.southLabel", frame: 2 },
  { key: "WEST", labelKey: "editor.westLabel", frame: 3 },
];

const MIRROR: Record<Direction, Direction> = {
  NORTH: "SOUTH",
  SOUTH: "NORTH",
  EAST: "WEST",
  WEST: "EAST",
};

export function createDefaultFootprint(size = 4): FootprintMap {
  return DIRECTIONS.reduce((acc, direction) => {
    acc[direction.key] = {
      occupied: [{ x: 0, y: 0 }],
      origin: { x: 0, y: 0 },
    };
    return acc;
  }, {} as FootprintMap);
}

export function createEmptySurface(): FootprintMap {
  return DIRECTIONS.reduce((acc, direction) => {
    acc[direction.key] = {
      occupied: [],
      origin: { x: 0, y: 0 },
    };
    return acc;
  }, {} as FootprintMap);
}

function tileKey(tile: Tile) {
  return `${tile.x}:${tile.y}`;
}

function hasTile(tiles: Tile[], tile: Tile) {
  return tiles.some((current) => current.x === tile.x && current.y === tile.y);
}

function toggleTile(tiles: Tile[], tile: Tile) {
  if (hasTile(tiles, tile)) {
    return tiles.filter((current) => current.x !== tile.x || current.y !== tile.y);
  }

  return [...tiles, tile];
}

function getBounds(tiles: Tile[]) {
  if (!tiles.length) return { width: 0, height: 0 };
  const xs = tiles.map((tile) => tile.x);
  const ys = tiles.map((tile) => tile.y);
  return {
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  };
}

function getEditorMetrics(
  frameWidth: number,
  frameHeight: number,
  footprint: DirectionData,
  surface: DirectionData,
) {
  const allTiles = [...footprint.occupied, ...surface.occupied, footprint.origin];
  const maxTileX = Math.max(
    5,
    Math.ceil(frameWidth / 64) + 3,
    ...allTiles.map((tile) => tile.x + 2),
  );
  const maxTileY = Math.max(
    5,
    Math.ceil(frameHeight / 32) + 3,
    ...allTiles.map((tile) => tile.y + 2),
  );
  const cols = maxTileX + 1;
  const rows = maxTileY + 1;
  const margin = 96;
  const originBaseX = Math.max(margin + rows * 32, frameWidth / 2 + margin);
  const originBaseY = frameHeight + margin;
  const gridWidth = (cols + rows) * 32 + margin * 2;
  const gridHeight = originBaseY + (cols + rows) * 16 + margin;
  const canvasWidth = Math.max(gridWidth, frameWidth + margin * 2);
  const canvasHeight = Math.max(gridHeight, frameHeight + margin * 2);
  const originCenterX =
    originBaseX + (footprint.origin.x - footprint.origin.y) * 32;
  const originTop = originBaseY + (footprint.origin.x + footprint.origin.y) * 16;

  return {
    cols,
    rows,
    canvasWidth,
    canvasHeight,
    originBaseX,
    originBaseY,
    sprite: {
      left: originCenterX - frameWidth / 2,
      top: originTop + 32 - frameHeight,
      width: frameWidth,
      height: frameHeight,
    },
  };
}

interface Props {
  imageUrl?: string | null;
  imageWidth: number;
  imageHeight: number;
  footprints: FootprintMap;
  surfaces: FootprintMap;
  syncDirections: boolean;
  onFootprintsChange: (value: FootprintMap) => void;
  onSurfacesChange: (value: FootprintMap) => void;
  onSyncDirectionsChange: (value: boolean) => void;
  // Cuántas caras tiene el spritesheet subido (1 = una sola imagen estática,
  // 4 = una columna por dirección NORTH/EAST/SOUTH/WEST). Antes esto asumía
  // siempre 4 acá adentro sin importar el toggle "una sola cara" del
  // formulario, así que el preview salía recortado igual.
  faceCount?: number;
  // Calibración visual del artwork (WorldItemData.spriteOffsetX/Y): corre
  // SOLO la imagen del preview en píxeles. El ancla (rombo amarillo) y las
  // tiles del footprint no se mueven — así el editor muestra lo mismo que
  // luego se ve en el juego (ver getSpriteOffset en apps/game).
  spriteOffsetX?: number;
  spriteOffsetY?: number;
}

export default function FootprintEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  footprints,
  surfaces,
  syncDirections,
  onFootprintsChange,
  onSurfacesChange,
  onSyncDirectionsChange,
  faceCount = 4,
  spriteOffsetX = 0,
  spriteOffsetY = 0,
}: Props) {
  const t = useTranslation();
  const [mode, setMode] = useState<Mode>("footprint");
  const frameWidth = Math.max(1, Math.floor((imageWidth || faceCount) / faceCount));
  const frameHeight = Math.max(1, imageHeight || 1);

  const updateDirection = (
    direction: Direction,
    updater: (current: DirectionData) => DirectionData,
    target: "footprint" | "surface",
  ) => {
    const source = target === "footprint" ? footprints : surfaces;
    const setter = target === "footprint" ? onFootprintsChange : onSurfacesChange;
    const next = { ...source, [direction]: updater(source[direction]) };

    if (syncDirections) {
      next[MIRROR[direction]] = next[direction];
    }

    setter(next);
  };

  const handleTile = (direction: Direction, tile: Tile) => {
    if (mode === "origin") {
      updateDirection(
        direction,
        (current) =>
          hasTile(current.occupied, tile)
            ? { ...current, origin: tile }
            : { occupied: [...current.occupied, tile], origin: tile },
        "footprint",
      );
      return;
    }

    updateDirection(
      direction,
      (current) => {
        const occupied = toggleTile(current.occupied, tile);
        const origin = hasTile(occupied, current.origin)
          ? current.origin
          : occupied[0] || { x: 0, y: 0 };
        return { occupied, origin };
      },
      mode === "footprint" ? "footprint" : "surface",
    );
  };

  return (
    <section className="rounded-2xl border border-yellow-400/20 bg-slate-950/80 p-5 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black text-white">{t("editor.footprint")}</h3>
          <p className="text-sm text-slate-400">
            {t("editor.autoFrameLabel", { width: frameWidth, height: frameHeight })}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={syncDirections}
            onChange={(event) => onSyncDirectionsChange(event.target.checked)}
          />
          {t("editor.syncDirectionsLabel")}
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["footprint", t("editor.modeFootprint")],
          ["surface", t("editor.modeSurface")],
          ["origin", t("editor.modeOrigin")],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value as Mode)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              mode === value
                ? "bg-yellow-400 text-slate-950"
                : "bg-slate-800 text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {DIRECTIONS.map((direction) => {
          const footprint = footprints[direction.key];
          const surface = surfaces[direction.key];
          const bounds = getBounds(footprint.occupied);
          const metrics = getEditorMetrics(frameWidth, frameHeight, footprint, surface);
          const grid = Array.from({ length: metrics.rows }, (_, y) =>
            Array.from({ length: metrics.cols }, (_, x) => ({ x, y })),
          );

          return (
            <div key={direction.key} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-black text-white">{t(direction.labelKey)}</h4>
                <div className="text-xs text-slate-400">
                  {t("editor.tilesInfoLabel", { count: footprint.occupied.length, width: bounds.width, height: bounds.height, x: footprint.origin.x, y: footprint.origin.y })}
                </div>
              </div>

              <div className="mx-auto max-w-full overflow-auto rounded-xl bg-slate-950">
                <div
                  className="relative"
                  style={{
                    width: metrics.canvasWidth,
                    height: metrics.canvasHeight,
                  }}
                >
                  {imageUrl && (
                    <div
                      aria-hidden="true"
                      // z-30 + opacity alta: el sprite va POR ENCIMA de la
                      // grilla de tiles (z-20) para poder juzgar a ojo cómo
                      // se asienta sobre el origen. El punto de ancla (z-40)
                      // sigue quedando por arriba como referencia fija.
                      className="pointer-events-none absolute z-30 opacity-80"
                      style={{
                        // spriteOffsetX/Y solo desplazan esta imagen; el
                        // ancla y las tiles de abajo quedan fijas.
                        left: metrics.sprite.left + spriteOffsetX,
                        top: metrics.sprite.top + spriteOffsetY,
                        width: metrics.sprite.width,
                        height: metrics.sprite.height,
                        backgroundImage: `url(${imageUrl})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: `${imageWidth}px ${frameHeight}px`,
                        // Con una sola cara, las 4 direcciones muestran la
                        // misma imagen completa (frame 0) en vez de
                        // multiplicar por un frameWidth que ya es el ancho
                        // total -- si no, direction.frame > 0 apuntaría
                        // fuera de los límites de la imagen.
                        backgroundPosition:
                          faceCount <= 1 ? "0 0" : `-${frameWidth * direction.frame}px 0`,
                        imageRendering: "pixelated",
                      }}
                    />
                  )}

                  {imageUrl && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute z-40 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 ring-2 ring-slate-950"
                      title={t("editor.anchorMarkerTitle")}
                      style={{
                        // Ancla FIJA (pie del sprite sobre la tile de origen).
                        // No usa spriteOffsetX/Y: es la referencia contra la
                        // que se calibra la imagen.
                        left: metrics.sprite.left + metrics.sprite.width / 2,
                        top: metrics.sprite.top + metrics.sprite.height,
                      }}
                    />
                  )}

                  {grid.flat().map((tile) => {
                    const left = metrics.originBaseX + (tile.x - tile.y) * 32;
                    const top = metrics.originBaseY + (tile.x + tile.y) * 16;
                    const isFootprint = hasTile(footprint.occupied, tile);
                    const isSurface = hasTile(surface.occupied, tile);
                    const isOrigin =
                      footprint.origin.x === tile.x && footprint.origin.y === tile.y;

                    return (
                      <button
                        type="button"
                        key={tileKey(tile)}
                        onClick={() => handleTile(direction.key, tile)}
                        title={`${tile.x},${tile.y}`}
                        className="absolute z-20 h-8 w-16 -translate-x-1/2 border border-slate-500/60 transition hover:brightness-125"
                        style={{
                          left,
                          top,
                          clipPath:
                            "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
                          background: isOrigin
                            ? "#facc15"
                            : isSurface
                              ? "rgba(59,130,246,.72)"
                              : isFootprint
                                ? "rgba(34,197,94,.72)"
                                : "rgba(239,68,68,.25)",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

