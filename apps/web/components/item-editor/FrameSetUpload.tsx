"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ImageIcon, Upload } from "lucide-react";
import { api } from "../../utils/api";

import { describeFrameSelection, sortByFrameName } from "./behavior-guidance";

/**
 * Sube los frames sueltos de UNA animación y devuelve la metadata del atlas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO ES SpriteUpload
 *
 * `SpriteUpload` (companions) sube UN archivo a `POST /uploads` y devuelve
 * `{ url }`. Acá hacen falta otras tres cosas que ese componente no puede dar:
 * varios archivos EN ORDEN, el endpoint `POST /uploads/frames` que los compone
 * en un atlas, y la metadata que sale de esa composición
 * (`framesCount`, `directional`, `row`, `startCol`). Reutilizarlo obligaría a
 * meterle un segundo modo y dejaría dos responsabilidades en un componente que
 * hoy hace una sola.
 *
 * Lo que sí se reutiliza es el lenguaje visual (zona de arrastre con el mismo
 * aspecto) y, sobre todo, el endpoint y todas sus validaciones de Fase 2:
 * formato real, dimensiones idénticas, límites, píxeles clickeables.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL ORDEN DE LOS ARCHIVOS ES EL ORDEN DE LOS FRAMES
 *
 * Se ordenan por nombre con collation numérica, así que `frame_2.png` va antes
 * que `frame_10.png` (un `sort()` normal los pondría al revés). El selector de
 * archivos del sistema no garantiza ningún orden, así que ordenar acá es lo
 * que hace el resultado predecible — y se muestran las miniaturas NUMERADAS
 * para que el creador vea el orden real antes de subir, que es un fallo caro
 * de diagnosticar después: el atlas se sube bien, el objeto se guarda bien y
 * el movimiento sale al revés.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL DIAGNÓSTICO NO ESTÁ ACÁ
 *
 * Cuántos frames son, si la cuenta cuadra con las caras y si se pasa del
 * límite lo decide `describeFrameSelection()` en `behavior-guidance.ts`, que
 * tiene tests. Este archivo sólo dibuja el resultado. El límite lo aplica
 * igualmente el backend; adelantarlo acá evita subir 30 PNG para recibir un
 * 400.
 */

export type FrameAtlasMetadata = {
  url: string;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  framesCount: number;
  directions: number;
  directional: boolean;
  bytes: number;
};

type Props = {
  /** Prefijo de almacenamiento. Ver `assetFolderId` en ItemEditor. */
  itemId: string;
  animationKey: string;
  /** Filas del atlas: 1 = la animación no gira con el objeto. */
  directions: number;
  /** La animación ya tiene un atlas: subir otro lo reemplaza. */
  hasSheet?: boolean;
  disabled?: boolean;
  onUploaded: (metadata: FrameAtlasMetadata) => void;
  labels: {
    drop: string;
    hint: string;
    uploading: string;
    framesSelected: string;
    upload: string;
    clear: string;
    expected: string;
    missing: string;
    tooMany: string;
    done: string;
    replace: string;
    order: string;
  };
};

/**
 * Mensaje legible de un fallo de subida.
 *
 * El backend puede responder con una lista (`errors`) cuando varios frames
 * están mal, o con un único `message`. Las dos formas se aplanan en algo que
 * el creador pueda leer y accionar.
 */
function describeUploadError(err: unknown): string {
  const fallback = "No se pudieron subir los frames";
  if (!err || typeof err !== "object") return fallback;

  const detail = err as { errors?: unknown; message?: unknown };
  if (Array.isArray(detail.errors) && detail.errors.length > 0) {
    return detail.errors.map(String).join(" · ");
  }
  return typeof detail.message === "string" && detail.message ? detail.message : fallback;
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

export default function FrameSetUpload({
  itemId,
  animationKey,
  directions,
  hasSheet,
  disabled,
  onUploaded,
  labels,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Resultado de la última subida, para confirmar que salió bien. */
  const [done, setDone] = useState<{ frames: number; rows: number } | null>(null);

  const selection = describeFrameSelection(
    files.map((file) => file.name),
    directions,
  );

  /**
   * Miniaturas de los archivos elegidos.
   *
   * Los `blob:` se revocan al cambiar la selección y al desmontar: si no, cada
   * tanda de PNG queda retenida en memoria mientras dure la sesión de edición.
   */
  const [thumbs, setThumbs] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setThumbs(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function pick(list: FileList | null) {
    if (!list) return;
    const images = Array.from(list).filter((file) => file.type.startsWith("image/"));
    setError(null);
    setDone(null);
    // Mismo orden que anuncia `describeFrameSelection`: una sola función decide
    // cómo se ordena, así lo que se ve numerado es lo que se sube.
    setFiles(sortByFrameName(images, (file) => file.name));
  }

  async function upload() {
    if (!selection.ok || busy) return;

    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("itemId", itemId);
      form.append("animationKey", animationKey);
      form.append("framesCount", String(selection.framesCount));
      form.append("directions", String(selection.rows));
      // El orden en que se añaden es el orden en que multer los entrega, y es
      // el orden de los frames en el atlas.
      files.forEach((file) => form.append("files", file));

      const metadata = await api.post<FrameAtlasMetadata>("/uploads/frames", form);
      onUploaded(metadata);
      setFiles([]);
      setDone({ frames: metadata.framesCount, rows: metadata.rows });
    } catch (err) {
      // El backend devuelve mensajes concretos ("frame 3: 32×48 px no coincide
      // con…"), que es justo lo que el creador necesita leer.
      setError(describeUploadError(err));
    } finally {
      setBusy(false);
    }
  }

  /** El aviso de la selección actual, si algo no cuadra. */
  const problem =
    selection.problem === "NOT_MULTIPLE"
      ? fill(labels.missing, {
          count: selection.missingForNextRow,
          rows: selection.rows,
        })
      : selection.problem === "TOO_MANY"
        ? labels.tooMany
        : null;

  return (
    <div className="space-y-2">
      {/* Es un <button>: la zona de arrastre también se abre con teclado, que
          con un <div onClick> no pasaba. */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled) pick(event.dataTransfer.files);
        }}
        className={`flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center text-sm transition ${
          disabled
            ? "cursor-not-allowed border-zinc-800 bg-black/30 text-zinc-600"
            : "cursor-pointer border-zinc-700 bg-black/50 text-zinc-400 hover:border-yellow-400"
        }`}
      >
        <span className="flex items-center gap-2 font-bold">
          <Upload size={14} />
          {busy ? labels.uploading : labels.drop}
        </span>
        <span className="text-xs text-zinc-600">{labels.hint}</span>
        {selection.rows > 1 && (
          <span className="text-xs text-zinc-600">
            {fill(labels.expected, { rows: selection.rows })}
          </span>
        )}
        {hasSheet && <span className="text-xs text-zinc-600">{labels.replace}</span>}
      </button>

      {files.length > 0 && (
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-black/40 p-3">
          <p className="text-xs text-zinc-400">
            {fill(labels.framesSelected, {
              count: files.length,
              frames: selection.framesCount,
              rows: selection.rows,
            })}
          </p>
          <p className="text-[11px] text-zinc-600">{labels.order}</p>

          {/* Miniaturas numeradas: el orden se VE, no se deduce del nombre. */}
          <ol className="flex max-h-40 flex-wrap gap-2 overflow-auto">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="w-14 shrink-0 text-center"
                title={file.name}
              >
                <span
                  role="img"
                  aria-label={file.name}
                  className="flex h-14 w-14 items-center justify-center overflow-hidden rounded border border-zinc-800 bg-[repeating-conic-gradient(#27272a_0%_25%,#131316_0%_50%)] bg-[length:8px_8px]"
                  style={
                    thumbs[index]
                      ? {
                          backgroundImage: `url(${thumbs[index]})`,
                          backgroundSize: "contain",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          imageRendering: "pixelated",
                        }
                      : undefined
                  }
                >
                  {!thumbs[index] && <ImageIcon size={14} className="text-zinc-700" />}
                </span>
                <span className="mt-0.5 block text-[10px] text-zinc-500">
                  {index + 1}
                </span>
              </li>
            ))}
          </ol>

          {problem && (
            <p className="rounded-lg border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
              {problem}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!selection.ok || busy || disabled}
              onClick={() => void upload()}
              className="rounded border border-yellow-400/40 px-3 py-1 text-xs font-bold text-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? labels.uploading : labels.upload}
            </button>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="rounded border border-zinc-700 px-3 py-1 text-xs font-bold text-zinc-400"
            >
              {labels.clear}
            </button>
          </div>
        </div>
      )}

      {/* Antes la subida terminaba en silencio: los archivos desaparecían y no
          había ninguna confirmación de que hubiera funcionado. */}
      {done && (
        <p
          role="status"
          className="flex items-center gap-1 rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300"
        >
          <Check size={12} />
          {fill(labels.done, { frames: done.frames, rows: done.rows })}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-200"
        >
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        multiple
        className="hidden"
        onChange={(event) => pick(event.target.files)}
      />
    </div>
  );
}
