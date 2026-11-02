"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/shared/api/client";
import {
  createDefaultFootprint,
  createEmptySurface,
  createSpriteOffsetMap,
} from "../../../../components/item-editor/FootprintEditor";
import { useTranslation } from "../../../../src/i18n/useTranslation";

// Subir varios objetos del mundo de una vez: un ítem por PNG, con lo que se
// puede deducir de la imagen (las caras van una al lado de la otra: 128x64 =
// 2 caras; una cara de 64x64 es un bloque que se apila) y los mismos valores
// por defecto que el formulario de un ítem. Después se ajusta cada uno en su
// página si hace falta.
const CATEGORY_OPTIONS = ["furniture", "decoration", "blocks", "roof", "castle", "spooky", "plants", "vehicles"];

type Row = {
  file: File;
  preview: string;
  name: string;
  width: number;
  height: number;
  faces: number;
  block: boolean;
  status: "ready" | "uploading" | "done" | "error";
  itemId?: string;
  error?: string;
};

function nameFromFile(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function readImage(file: File): Promise<{ width: number; height: number; preview: string }> {
  return new Promise((resolve, reject) => {
    const preview = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, preview });
    img.onerror = reject;
    img.src = preview;
  });
}

export default function BulkWorldUpload() {
  const t = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [prefix, setPrefix] = useState("");
  const [category, setCategory] = useState("decoration");
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);

  const addFiles = async (files: FileList | null) => {
    const images = [...(files ?? [])].filter((file) => file.type.startsWith("image/"));
    const next: Row[] = [];
    for (const file of images) {
      try {
        const { width, height, preview } = await readImage(file);
        const ratio = width / height;
        const faces = Math.abs(ratio - 4) < 0.2 ? 4 : Math.abs(ratio - 2) < 0.2 ? 2 : 1;
        next.push({ file, preview, name: nameFromFile(file.name), width, height, faces, block: width / faces === 64 && height === 64, status: "ready" });
      } catch {
        // Imagen que no se pudo leer: se ignora.
      }
    }
    setRows((current) => [...current, ...next]);
  };

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const createAll = async () => {
    setRunning(true);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.status === "done") continue;
      update(i, { status: "uploading", error: undefined });
      try {
        const form = new FormData();
        form.append("file", row.file);
        form.append("folder", "items");
        const { url } = await api.post<{ url: string }>("/uploads", form);
        const name = `${prefix.trim() ? `${prefix.trim()} · ` : ""}${row.name.trim()}`;
        const item = await api.post<{ id: string }>("/items", {
          name,
          description: name,
          languageCode: "es",
          rarity: 0,
          coinsPrice: row.block ? 1 : 5,
          gemsPrice: 0,
          shopVisible: true,
          maxStack: 999,
          category,
          imageUrl: url,
          tags: [],
          colorable: false,
          kind: "FURNITURE",
          width: row.width,
          height: row.height,
          isCollidable: true,
          walkable: false,
          isInteractable: false,
          rotatable: row.faces > 1,
          directions: row.faces,
          placementType: "FLOOR",
          furnitureCategory: "DECORATION",
          allowsStacking: row.block,
          canBeStacked: row.block,
          stackHeight: 2,
          maxStackHeight: 20,
          footprintWidth: 1,
          footprintHeight: 1,
          syncDirections: true,
          footprints: createDefaultFootprint(),
          surfaces: createEmptySurface(),
          spriteOffsets: createSpriteOffsetMap(),
          spriteOffsetSync: "mirror",
        });
        update(i, { status: "done", itemId: item.id });
      } catch (err: any) {
        update(i, { status: "error", error: err?.message || t("items.unknownError") });
      }
    }
    setRunning(false);
  };

  const pending = rows.filter((row) => row.status !== "done").length;

  return (
    <section className="space-y-4 rounded-[28px] border border-zinc-800 bg-[#0c0c0c] p-6">
      <div>
        <h2 className="text-xl font-bold text-yellow-400">{t("items.bulkTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">{t("items.bulkDescription")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-zinc-400">
          {t("items.bulkPrefixLabel")}
          <input
            value={prefix}
            onChange={(event) => setPrefix(event.target.value)}
            placeholder={t("items.bulkPrefixPlaceholder")}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-400">
          {t("items.category")}
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-white"
          >
            {CATEGORY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(`items.categoryOption.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-5 text-center text-sm transition ${
          dragging ? "border-yellow-400 bg-yellow-400/10" : "border-zinc-700 bg-black/60 hover:border-yellow-400"
        }`}
      >
        <span className="text-zinc-300">{t("items.bulkDrop")}</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => void addFiles(event.target.files)} />
      </label>

      {rows.length > 0 && (
        <>
          <div className="grid gap-2">
            {rows.map((row, index) => (
              <div key={`${row.file.name}-${index}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-black/40 p-2">
                <img src={row.preview} alt="" className="h-12 w-16 object-contain [image-rendering:pixelated]" />
                <input
                  value={row.name}
                  disabled={row.status === "done" || running}
                  onChange={(event) => update(index, { name: event.target.value })}
                  className="min-w-40 flex-1 rounded-lg border border-zinc-800 bg-black px-2 py-1 text-sm text-white"
                />
                <span className="text-xs text-zinc-400">
                  {row.width}x{row.height} · {t("items.bulkFaces", { count: row.faces })}
                  {row.block ? ` · ${t("items.bulkBlock")}` : ""} · {row.block ? 1 : 5} coins
                </span>
                {row.status === "done" && row.itemId ? (
                  <Link href={`/admin/world-items/${row.itemId}`} className="text-xs font-bold text-emerald-400">
                    {t("items.bulkDoneEdit")}
                  </Link>
                ) : row.status === "uploading" ? (
                  <span className="text-xs text-yellow-300">{t("items.bulkUploading")}</span>
                ) : row.status === "error" ? (
                  <span className="text-xs text-red-400">{row.error}</span>
                ) : (
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                    className="text-xs text-zinc-500 hover:text-red-400"
                  >
                    {t("items.bulkRemove")}
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={running || pending === 0}
            onClick={() => void createAll()}
            className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black disabled:opacity-50"
          >
            {running ? t("items.bulkUploading") : t("items.bulkCreate", { count: pending })}
          </button>
        </>
      )}
    </section>
  );
}
