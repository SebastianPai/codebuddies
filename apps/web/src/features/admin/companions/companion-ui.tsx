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
