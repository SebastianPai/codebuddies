"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/shared/api/client";

/** Campo con etiqueta + ayuda corta debajo. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-zinc-300">{label}</span>
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const fieldClass =
  "w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white outline-none transition focus:border-yellow-400";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      {...props}
      className={`${fieldClass} ${props.className ?? ""}`}
    />
  );
}

/** Dropzone para subir un spritesheet. Click o arrastrar. Muestra thumb. */
export function SpriteUpload({
  url,
  folder,
  onChange,
  labels,
}: {
  url: string | null;
  folder: string;
  onChange: (url: string | null) => void;
  labels: {
    drop: string;
    replace: string;
    remove: string;
    uploading: string;
  };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFile(file?: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const res = await api.post<{ url: string }>("/uploads", form);
      onChange(res.url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center text-sm transition ${
          dragging
            ? "border-yellow-400 bg-yellow-400/10"
            : "border-zinc-700 bg-black/50 hover:border-yellow-400"
        }`}
      >
        {url ? (
          <img
            src={url}
            alt=""
            className="max-h-24 max-w-full [image-rendering:pixelated]"
          />
        ) : (
          <span className="text-zinc-400">
            {busy ? labels.uploading : labels.drop}
          </span>
        )}
      </div>

      {url && (
        <div className="flex gap-3 text-xs">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded border border-zinc-700 px-3 py-1 font-bold text-zinc-300 hover:border-yellow-400"
          >
            {labels.replace}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded border border-zinc-700 px-3 py-1 font-bold text-red-400 hover:border-red-400"
          >
            {labels.remove}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

/**
 * Preview del spritesheet: la hoja completa con una grilla superpuesta según
 * frameWidth/Height/framesCount/directions, más una celda animada que
 * recorre los frames de la primera fila.
 */
export function SpriteSheetPreview({
  url,
  frameWidth,
  frameHeight,
  framesCount,
  directions,
  emptyLabel,
}: {
  url: string | null;
  frameWidth: number;
  frameHeight: number;
  framesCount: number;
  directions: number;
  emptyLabel: string;
}) {
  const cols = Math.max(1, Math.floor(framesCount) || 1);
  const rows = Math.max(1, Math.floor(directions) || 1);
  const fw = Math.max(1, Math.floor(frameWidth) || 1);
  const fh = Math.max(1, Math.floor(frameHeight) || 1);
  const sheetW = fw * cols;
  const sheetH = fh * rows;

  const scale = useMemo(
    () => Math.max(1, Math.min(4, Math.floor(160 / Math.max(fw, fh)))),
    [fw, fh],
  );

  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!url || cols <= 1) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % cols), 180);
    return () => clearInterval(id);
  }, [url, cols]);

  if (!url) {
    return (
      <div className="grid h-40 place-items-center rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-600">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-6 rounded-xl border border-zinc-800 bg-black/40 p-4">
      {/* Celda animada */}
      <div
        aria-hidden
        style={{
          width: fw * scale,
          height: fh * scale,
          backgroundImage: `url(${url})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${sheetW * scale}px ${sheetH * scale}px`,
          backgroundPosition: `-${frame * fw * scale}px 0px`,
          imageRendering: "pixelated",
        }}
        className="shrink-0 rounded border border-zinc-700"
      />

      {/* Hoja completa con grilla */}
      <div className="relative max-w-full overflow-auto">
        <div
          className="relative"
          style={{ width: sheetW, height: sheetH, minWidth: sheetW }}
        >
          <img
            src={url}
            alt=""
            className="block [image-rendering:pixelated]"
            style={{ width: sheetW, height: sheetH }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(250,204,21,.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(250,204,21,.5) 1px, transparent 1px)",
              backgroundSize: `${fw}px ${fh}px`,
            }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          {cols}×{rows} · {fw}×{fh}px
        </p>
      </div>
    </div>
  );
}

export type AnimClip = {
  key: string;
  trigger: string;
  row: number;
  startCol: number;
  framesCount: number;
  fps: number;
  loop: boolean;
};

export const CLIP_TRIGGERS = [
  "MOVING",
  "IDLE",
  "SIT",
  "SLEEP",
  "EAT",
  "RANDOM",
] as const;

// Direcciones estándar por fila (fila 0 = South, ...). Debe coincidir con
// COMPANION_DIRECTION_ORDER del backend.
export const COMPANION_DIRECTION_ORDER = [
  "S",
  "N",
  "SE",
  "NW",
  "E",
  "W",
  "NE",
  "SW",
];

// Presets de "Agregar rápido". Pensados para el layout típico: fila continua
// [idle, walk1..walkN], idle en la columna 0 y la caminata a partir de la 1.
const CLIP_PRESETS: Array<{
  key: string;
  trigger: string;
  startCol: number;
  framesCount: number;
  fps: number;
  loop: boolean;
}> = [
  { key: "walk", trigger: "MOVING", startCol: 1, framesCount: 8, fps: 10, loop: true },
  { key: "idle", trigger: "IDLE", startCol: 0, framesCount: 1, fps: 1, loop: false },
  { key: "sit", trigger: "SIT", startCol: 0, framesCount: 1, fps: 2, loop: false },
  { key: "sleep", trigger: "SLEEP", startCol: 0, framesCount: 2, fps: 2, loop: true },
  { key: "eat", trigger: "EAT", startCol: 0, framesCount: 4, fps: 8, loop: false },
];

/**
 * Editor de clips de animación + preview animado por clip. Cada clip ocupa
 * `directions` filas del sheet a partir de `row`.
 */
export function AnimClipList({
  value,
  onChange,
  sheetUrl,
  frameWidth,
  frameHeight,
  directions,
  t,
}: {
  value: AnimClip[];
  onChange: (next: AnimClip[]) => void;
  sheetUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  directions: number;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const patch = (i: number, p: Partial<AnimClip>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...p } : c)));
  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const addPreset = (preset: (typeof CLIP_PRESETS)[number]) =>
    onChange([
      ...value,
      {
        key: preset.key,
        trigger: preset.trigger,
        row: 0,
        startCol: preset.startCol,
        framesCount: preset.framesCount,
        fps: preset.fps,
        loop: preset.loop,
      },
    ]);

  const fieldSm =
    "w-full rounded border border-zinc-700 bg-black px-2 py-1.5 text-sm text-white outline-none focus:border-yellow-400";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CLIP_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => addPreset(p)}
            className="rounded border border-zinc-700 px-3 py-1 text-xs font-bold text-zinc-300 hover:border-yellow-400 hover:text-yellow-300"
          >
            + {t(`admin.clip_${p.key}`)}
          </button>
        ))}
      </div>

      {value.length === 0 && (
        <p className="text-xs text-zinc-600">{t("admin.clipsEmpty")}</p>
      )}

      {value.map((clip, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-800 bg-black/40 p-3"
        >
          <div className="flex flex-wrap items-start gap-4">
            <ClipCellPreview
              sheetUrl={sheetUrl}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              row={clip.row}
              startCol={clip.startCol ?? 0}
              framesCount={clip.framesCount}
              fps={clip.fps}
            />

            <div className="min-w-[220px] flex-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                  {t("admin.clipName")}
                  <input
                    className={fieldSm}
                    value={clip.key}
                    onChange={(e) => patch(i, { key: e.target.value })}
                    placeholder="walk"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                  {t("admin.clipTrigger")}
                  <select
                    className={fieldSm}
                    value={clip.trigger}
                    onChange={(e) => patch(i, { trigger: e.target.value })}
                  >
                    {CLIP_TRIGGERS.map((tr) => (
                      <option key={tr} value={tr}>
                        {t(`admin.trigger_${tr}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                  {t("admin.clipRow")}
                  <input
                    type="number"
                    className={fieldSm}
                    value={clip.row}
                    onChange={(e) => patch(i, { row: Number(e.target.value) })}
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                  {t("admin.clipStartCol")}
                  <input
                    type="number"
                    className={fieldSm}
                    value={clip.startCol ?? 0}
                    onChange={(e) =>
                      patch(i, { startCol: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                  {t("admin.clipFrames")}
                  <input
                    type="number"
                    className={fieldSm}
                    value={clip.framesCount}
                    onChange={(e) =>
                      patch(i, { framesCount: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                  {t("admin.clipFps")}
                  <input
                    type="number"
                    className={fieldSm}
                    value={clip.fps}
                    onChange={(e) => patch(i, { fps: Number(e.target.value) })}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={clip.loop}
                    onChange={(e) => patch(i, { loop: e.target.checked })}
                  />
                  {t("admin.clipLoop")}
                </label>
                <span className="text-xs text-zinc-600">
                  {t("admin.clipRowsUsed", {
                    from: clip.row,
                    to: clip.row + directions - 1,
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClipCellPreview({
  sheetUrl,
  frameWidth,
  frameHeight,
  row,
  startCol,
  framesCount,
  fps,
}: {
  sheetUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  row: number;
  startCol: number;
  framesCount: number;
  fps: number;
}) {
  const fw = Math.max(1, Math.floor(frameWidth) || 1);
  const fh = Math.max(1, Math.floor(frameHeight) || 1);
  const cols = Math.max(1, Math.floor(framesCount) || 1);
  const scale = Math.max(1, Math.min(3, Math.floor(96 / Math.max(fw, fh))));
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!sheetUrl || cols <= 1) return;
    const ms = 1000 / Math.max(1, Math.min(60, fps || 6));
    const id = setInterval(() => setFrame((f) => (f + 1) % cols), ms);
    return () => clearInterval(id);
  }, [sheetUrl, cols, fps]);

  if (!sheetUrl) {
    return (
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded border border-dashed border-zinc-800 text-[10px] text-zinc-700">
        —
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="shrink-0 overflow-hidden rounded border border-zinc-700 bg-black/60"
      style={{ width: fw * scale, height: fh * scale }}
    >
      <div
        style={{
          width: fw,
          height: fh,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          backgroundImage: `url(${sheetUrl})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "auto",
          backgroundPosition: `-${(startCol + frame) * fw}px -${row * fh}px`,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

/** Editor de lista de frases: input + botón agregar, cada frase con ✕. */
export function PhraseList({
  value,
  onChange,
  addLabel,
  placeholder,
  emptyLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  placeholder: string;
  emptyLabel: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-zinc-600">{emptyLabel}</p>
      )}
      {value.map((phrase, i) => (
        <div
          key={`${i}-${phrase}`}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-black/40 px-3 py-2"
        >
          <span className="flex-1 text-sm text-zinc-200">{phrase}</span>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="text-zinc-500 hover:text-red-400"
            aria-label="Quitar"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={fieldClass}
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-300"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
