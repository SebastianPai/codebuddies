"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Coins, Gem, Moon, Palette, Sun } from "lucide-react";

// Vista en vivo del item mientras se edita: cómo se ve en la sala (sobre el
// piso isométrico, con las casillas que ocupa), cómo se ve en la tienda y qué
// falta antes de guardar. Todo sale del estado del formulario: no hace
// pedidos ni cambia nada.

const RARITY_COLOR: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

const TILE_W = 64;
const TILE_H = 32;

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  category: string;
  name: string;
  description: string;
  imageUrl: string | null;
  coinsPrice: number;
  gemsPrice: number;
  rarityKey?: string;
  rarityLabel?: string;
  priceRange?: { min: number; max: number };
  footprintWidth: number;
  footprintHeight: number;
  colorable: boolean;
  shopVisible: boolean;
  /** Tamaño de un cuadro del sprite (si el formulario lo tiene). */
  frameWidth?: number;
  frameHeight?: number;
  readOnly: boolean;
  isSaving: boolean;
  submitLabel: string;
};

// Piso isométrico: 6x6 casillas, con las que ocupa el item resaltadas en el centro.
// Tamaño real de la imagen (para mostrar solo la primera vista si la imagen
// trae varias direcciones una al lado de la otra).
function useNaturalSize(url: string | null) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setSize(null);
    if (!url) return;
    const img = new window.Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }, [url]);
  return size;
}

function Room({ imageUrl, fw, fh, night, isTexture, frameW, frameH }: { imageUrl: string | null; fw: number; fh: number; night: boolean; isTexture: boolean; frameW?: number; frameH?: number }) {
  const natural = useNaturalSize(isTexture ? null : imageUrl);
  const N = 6;
  const w = N * TILE_W;
  const h = N * TILE_H + 120;
  const ox = w / 2;
  const oy = 110;
  const at = (x: number, y: number) => [ox + (x - y) * (TILE_W / 2), oy + (x + y) * (TILE_H / 2)] as const;
  const x0 = Math.floor((N - fw) / 2);
  const y0 = Math.floor((N - fh) / 2);
  const tiles = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const [cx, cy] = at(x, y);
      const busy = !isTexture && x >= x0 && x < x0 + fw && y >= y0 && y < y0 + fh;
      tiles.push(
        <polygon
          key={`${x}-${y}`}
          points={`${cx},${cy} ${cx + TILE_W / 2},${cy + TILE_H / 2} ${cx},${cy + TILE_H} ${cx - TILE_W / 2},${cy + TILE_H / 2}`}
          fill={busy ? "rgba(250,204,21,0.28)" : (x + y) % 2 ? (night ? "#1e2433" : "#d9c7a5") : night ? "#232a3b" : "#e6d6b6"}
          stroke={busy ? "#facc15" : night ? "#2f3850" : "#c9b48f"}
          strokeWidth={busy ? 1.5 : 1}
        />,
      );
      // Las texturas ya vienen dibujadas como una baldosa isométrica: una por casilla.
      if (isTexture && imageUrl) tiles.push(<image key={`t${x}-${y}`} href={imageUrl} x={cx - TILE_W / 2} y={cy} width={TILE_W} height={TILE_H} preserveAspectRatio="none" />);
    }
  }
  // Base del item: la esquina de abajo de su huella.
  const [, by] = at(x0 + fw, y0 + fh);
  const [lx] = at(x0, y0 + fh);
  const [rx] = at(x0 + fw, y0);
  const footW = Math.max(TILE_W, rx - lx);
  // Un cuadro: el que dice el formulario, o (si la imagen es una tira) un alto x alto.
  const fwPx = natural ? (frameW && frameW > 8 && frameW < natural.w ? frameW : natural.w > natural.h * 1.5 ? natural.h : natural.w) : 1;
  const fhPx = natural ? (frameH && frameH > 8 && frameH <= natural.h ? frameH : natural.h) : 1;
  const drawW = footW * 1.02;
  const drawH = drawW * (fhPx / fwPx);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img">
      <rect width={w} height={h} fill={night ? "#0b1020" : "#bfe3ff"} />
      {tiles}
      {!isTexture && imageUrl && natural && (
        <svg x={(lx + rx) / 2 - drawW / 2} y={by - drawH} width={drawW} height={drawH} viewBox={`0 0 ${fwPx} ${fhPx}`} preserveAspectRatio="xMidYMax meet" style={{ overflow: "hidden" }}>
          <image
            href={imageUrl}
            width={natural.w}
            height={natural.h}
            style={{ imageRendering: "pixelated", filter: night ? "brightness(0.8)" : undefined }}
          />
        </svg>
      )}
      {!imageUrl && <text x={ox} y={by - 30} textAnchor="middle" fill={night ? "#94a3b8" : "#475569"} fontSize="14" fontWeight="700">?</text>}
    </svg>
  );
}

export default function LivePreview(props: Props) {
  const { t } = props;
  const [night, setNight] = useState(false);
  const color = RARITY_COLOR[props.rarityKey ?? "common"] ?? RARITY_COLOR.common;
  const isTexture = props.category === "texture";
  const showRoom = props.category === "world" || isTexture;
  const priceOk = !props.priceRange || (props.coinsPrice >= props.priceRange.min && props.coinsPrice <= props.priceRange.max);
  const checks: Array<[boolean, string]> = [
    [props.name.trim().length > 1, t("items.liveCheckName")],
    [Boolean(props.imageUrl), t("items.liveCheckImage")],
    [props.description.trim().length > 5, t("items.liveCheckDescription")],
    [priceOk, props.priceRange ? t("items.liveCheckPrice", { min: props.priceRange.min, max: props.priceRange.max }) : t("items.liveCheckPriceSimple")],
  ];
  const ready = checks.filter(([ok]) => ok).length;

  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-yellow-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          {t("items.liveTitle")}
        </h2>
        {showRoom && (
          <button
            type="button"
            onClick={() => setNight((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:border-yellow-400"
            aria-pressed={night}
          >
            {night ? <Moon className="h-3.5 w-3.5" aria-hidden /> : <Sun className="h-3.5 w-3.5" aria-hidden />}
            {night ? t("items.liveNight") : t("items.liveDay")}
          </button>
        )}
      </div>

      {showRoom && (
        <figure className="overflow-hidden rounded-2xl border border-zinc-800">
          <Room imageUrl={props.imageUrl} fw={Math.max(1, Math.min(4, props.footprintWidth || 1))} fh={Math.max(1, Math.min(4, props.footprintHeight || 1))} night={night} isTexture={isTexture} frameW={props.frameWidth} frameH={props.frameHeight} />
          <figcaption className="border-t border-zinc-800 bg-black/60 px-3 py-2 text-xs text-zinc-400">
            {isTexture ? t("items.liveRoomTexture") : t("items.liveRoomCaption", { w: props.footprintWidth || 1, h: props.footprintHeight || 1 })}
          </figcaption>
        </figure>
      )}

      {/* Tarjeta de la tienda */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">{t("items.liveShopTitle")}</p>
        <div className="mx-auto w-48 overflow-hidden rounded-2xl border-2 bg-[#141826]" style={{ borderColor: color, boxShadow: `0 0 22px ${color}33` }}>
          <div className="relative grid h-36 place-items-center bg-gradient-to-b from-white/5 to-transparent">
            {props.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.imageUrl} alt="" className="max-h-28 max-w-[85%] object-contain [image-rendering:pixelated]" />
            ) : (
              <span className="text-xs text-zinc-500">{t("items.liveNoImage")}</span>
            )}
            {props.colorable && (
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                <Palette className="h-3 w-3" aria-hidden />
              </span>
            )}
          </div>
          <div className="space-y-1.5 p-3">
            <p className="truncate text-sm font-black text-white">{props.name.trim() || t("items.liveNoName")}</p>
            {props.rarityLabel && (
              <p className="text-[11px] font-black uppercase tracking-wider" style={{ color }}>
                {props.rarityLabel}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-400/15 px-2 py-1 text-xs font-black text-yellow-300">
                <Coins className="h-3.5 w-3.5" aria-hidden />
                {props.coinsPrice || 0}
              </span>
              {props.gemsPrice > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-fuchsia-400/15 px-2 py-1 text-xs font-black text-fuchsia-300">
                  <Gem className="h-3.5 w-3.5" aria-hidden />
                  {props.gemsPrice}
                </span>
              )}
            </div>
          </div>
        </div>
        {!props.shopVisible && <p className="mt-2 text-center text-xs text-amber-400">{t("items.liveHiddenInShop")}</p>}
      </div>

      {/* Qué falta antes de guardar */}
      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
        <p className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
          {t("items.liveChecklist")}
          <span className={ready === checks.length ? "text-emerald-400" : "text-zinc-400"}>
            {ready}/{checks.length}
          </span>
        </p>
        <ul className="space-y-1.5 text-sm">
          {checks.map(([ok, label]) => (
            <li key={label} className={`flex items-start gap-2 ${ok ? "text-zinc-300" : "text-zinc-500"}`}>
              {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : <Circle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
              {label}
            </li>
          ))}
        </ul>
      </div>

      {!props.readOnly && (
        <button
          type="submit"
          disabled={props.isSaving}
          className="w-full rounded-2xl bg-yellow-400 px-5 py-3.5 font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.submitLabel}
        </button>
      )}
    </aside>
  );
}
