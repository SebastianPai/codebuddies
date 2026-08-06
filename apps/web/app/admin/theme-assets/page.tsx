"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, Plus, Settings2, Trash2, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";

type IconMode = "STATIC" | "SPRITE";
type AnimationDirection = "PINGPONG" | "LOOP";

type ThemeAssetVariant = {
  id: string;
  slotId: string;
  name: string;
  imageUrl: string;
  mode: IconMode;
  frameCount: number;
  direction: AnimationDirection;
  frameRate: number;
  isActive: boolean;
  order: number;
};

type ThemeAssetSlot = {
  id: string;
  key: string;
  label: string;
  category: string;
  variants: ThemeAssetVariant[];
};

const MAX_VARIANTS = 5;
const PREVIEW_SIZE = 56;

// Mismo truco que usa apps/game (background-position en pasos discretos)
// para que el preview del admin se vea igual que en el juego.
const SPRITE_KEYFRAMES = `
@keyframes theme-asset-sprite-slide {
  from { background-position: 0% 0; }
  to { background-position: 100% 0; }
}
`;

const frameAspectCache = new Map<string, number>();

function useFrameAspect(url: string | null, frameCount: number): number {
  const cacheKey = url ? `${url}::${frameCount}` : "";
  const [aspect, setAspect] = useState(() => (cacheKey ? frameAspectCache.get(cacheKey) ?? 1 : 1));

  useEffect(() => {
    if (!url) {
      setAspect(1);
      return;
    }

    const cached = frameAspectCache.get(cacheKey);
    if (cached) {
      setAspect(cached);
      return;
    }

    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      const frameWidth = img.naturalWidth / Math.max(1, frameCount);
      const result = img.naturalHeight > 0 ? frameWidth / img.naturalHeight : 1;
      frameAspectCache.set(cacheKey, result);
      if (!cancelled) setAspect(result);
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url, frameCount, cacheKey]);

  return aspect;
}

function spriteStyle(variant: ThemeAssetVariant, size: number, aspect: number): CSSProperties {
  const steps = Math.max(1, variant.frameCount - 1);
  const duration = variant.frameCount / Math.max(1, variant.frameRate);

  return {
    width: size * aspect,
    height: size,
    backgroundImage: `url(${variant.imageUrl})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${variant.frameCount * 100}% 100%`,
    animationName: "theme-asset-sprite-slide",
    animationIterationCount: "infinite",
    animationDuration: `${duration}s`,
    animationTimingFunction: `steps(${steps})`,
    animationDirection: variant.direction === "PINGPONG" ? "alternate" : "normal",
  };
}

function VariantThumb({ variant, size }: { variant: ThemeAssetVariant; size: number }) {
  const aspect = useFrameAspect(variant.mode === "SPRITE" ? variant.imageUrl : null, variant.frameCount);

  if (variant.mode === "SPRITE") {
    return <div className="rounded" style={spriteStyle(variant, size, aspect)} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={variant.imageUrl} alt={variant.name} className="rounded object-contain" style={{ width: size, height: size }} />;
}

export default function AdminThemeAssetsPage() {
  const [slots, setSlots] = useState<ThemeAssetSlot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingSlotKey, setUploadingSlotKey] = useState<string | null>(null);

  const load = async () => {
    const data = await api.get<ThemeAssetSlot[]>("/admin/theme-assets");
    setSlots(data);
  };

  useEffect(() => {
    setLoading(true);
    void load()
      .catch(() => toast.error("No se pudieron cargar las imágenes"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    if (!slots) return [];
    const byCategory = new Map<string, ThemeAssetSlot[]>();
    for (const slot of slots) {
      const list = byCategory.get(slot.category) ?? [];
      list.push(slot);
      byCategory.set(slot.category, list);
    }
    return [...byCategory.entries()];
  }, [slots]);

  const uploadVariant = async (slot: ThemeAssetSlot, file: File) => {
    setUploadingSlotKey(slot.key);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "theme-assets");
      const { url } = await api.post<{ url: string }>("/uploads", form);
      const updated = await api.post<ThemeAssetSlot[]>(`/admin/theme-assets/${slot.key}/variants`, {
        imageUrl: url,
      });
      setSlots(updated);
      toast.success("Variante agregada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploadingSlotKey(null);
    }
  };

  const setActive = async (slot: ThemeAssetSlot, variantId: string | null) => {
    try {
      const updated = await api.patch<ThemeAssetSlot[]>(`/admin/theme-assets/${slot.key}/active`, { variantId });
      setSlots(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo activar la variante");
    }
  };

  const deleteVariant = async (variantId: string) => {
    try {
      const updated = await api.delete<ThemeAssetSlot[]>(`/admin/theme-assets/variants/${variantId}`);
      setSlots(updated);
      toast.success("Variante eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const patchVariant = async (variantId: string, patch: Partial<ThemeAssetVariant>) => {
    try {
      const updated = await api.patch<ThemeAssetSlot[]>(`/admin/theme-assets/variants/${variantId}`, patch);
      setSlots(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  };

  return (
    <div className="p-6 text-white">
      <style>{SPRITE_KEYFRAMES}</style>

      <div>
        <h1 className="text-3xl font-black text-yellow-400">Imágenes del juego</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Centraliza acá las imágenes que aparecen en todo el juego (logo, puerta de Salas, etc.). Cada una admite
          hasta {MAX_VARIANTS} variantes guardadas — subí una para Navidad, otra para Halloween, y elegí cuál está
          activa. Sin ninguna activa se usa la imagen por defecto del código.
        </p>
      </div>

      {loading || !slots ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-64 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      ) : (
        grouped.map(([category, categorySlots]) => (
          <div key={category} className="mt-8">
            <h2 className="text-lg font-black text-zinc-300">{category}</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {categorySlots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  uploading={uploadingSlotKey === slot.key}
                  onUpload={(file) => void uploadVariant(slot, file)}
                  onSetActive={(variantId) => void setActive(slot, variantId)}
                  onDelete={(variantId) => void deleteVariant(variantId)}
                  onPatch={(variantId, patch) => void patchVariant(variantId, patch)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SlotCard({
  slot,
  uploading,
  onUpload,
  onSetActive,
  onDelete,
  onPatch,
}: {
  slot: ThemeAssetSlot;
  uploading: boolean;
  onUpload: (file: File) => void;
  onSetActive: (variantId: string | null) => void;
  onDelete: (variantId: string) => void;
  onPatch: (variantId: string, patch: Partial<ThemeAssetVariant>) => void;
}) {
  const active = slot.variants.find((variant) => variant.isActive) ?? null;
  const canAddMore = slot.variants.length < MAX_VARIANTS;

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0c0c0c] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black">{slot.label}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {active ? `Activa: ${active.name}` : "Usando la imagen por defecto del código"}
          </p>
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onSetActive(null)}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
          >
            <X size={12} />
            Usar por defecto
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-5 gap-3">
        {slot.variants.map((variant) => (
          <VariantTile
            key={variant.id}
            variant={variant}
            onSetActive={() => onSetActive(variant.id)}
            onDelete={() => onDelete(variant.id)}
            onPatch={(patch) => onPatch(variant.id, patch)}
          />
        ))}

        {canAddMore && (
          <div className="flex flex-col gap-1.5">
            <label
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-zinc-500 ${
                uploading ? "border-zinc-700 opacity-60" : "cursor-pointer border-zinc-700 hover:border-yellow-400 hover:text-yellow-400"
              }`}
            >
              {uploading ? <Upload size={18} className="animate-pulse" /> : <Plus size={18} />}
              <span className="text-[10px]">{uploading ? "Subiendo..." : "Agregar"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploading}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                  event.target.value = "";
                }}
              />
            </label>
            {slot.variants.length === 0 && (
              <p className="text-center text-[9px] leading-tight text-zinc-600">Se activa sola</p>
            )}
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-zinc-600">{slot.variants.length}/{MAX_VARIANTS} variantes usadas</p>
    </div>
  );
}

function VariantTile({
  variant,
  onSetActive,
  onDelete,
  onPatch,
}: {
  variant: ThemeAssetVariant;
  onSetActive: () => void;
  onDelete: () => void;
  onPatch: (patch: Partial<ThemeAssetVariant>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [frameCount, setFrameCount] = useState(variant.frameCount);
  const [direction, setDirection] = useState<AnimationDirection>(variant.direction);
  const [frameRate, setFrameRate] = useState(variant.frameRate);

  const animationChanged =
    frameCount !== variant.frameCount || direction !== variant.direction || frameRate !== variant.frameRate;

  return (
    <div className="relative flex flex-col gap-1.5">
      <div
        className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border p-1 ${
          variant.isActive ? "border-yellow-400 bg-yellow-400/10" : "border-zinc-800 bg-[#111]"
        }`}
      >
        <VariantThumb variant={variant} size={PREVIEW_SIZE} />
        <span className="max-w-full truncate text-[10px] text-zinc-400" title={variant.name}>
          {variant.name}
        </span>
      </div>

      <button
        type="button"
        onClick={onSetActive}
        disabled={variant.isActive}
        className={`rounded-md px-1 py-1 text-[10px] font-bold ${
          variant.isActive
            ? "bg-yellow-400/20 text-yellow-400"
            : "bg-zinc-800 text-zinc-200 hover:bg-yellow-400 hover:text-black"
        }`}
      >
        {variant.isActive ? "✓ Activa" : "Usar esta"}
      </button>

      <div className="absolute -top-1.5 -right-1.5 flex gap-1">
        {variant.isActive && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-black">
            <Check size={10} />
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-zinc-200"
          title="Configurar"
        >
          <Settings2 size={10} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white"
          title="Eliminar"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {editing && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 w-56 rounded-lg border border-zinc-700 bg-[#0c0c0c] p-3 shadow-xl">
          <div className="flex gap-3 text-xs">
            <label className="flex flex-1 items-center gap-1">
              <input
                type="radio"
                checked={variant.mode === "STATIC"}
                onChange={() => onPatch({ mode: "STATIC" })}
                className="accent-yellow-400"
              />
              Fija
            </label>
            <label className="flex flex-1 items-center gap-1">
              <input
                type="radio"
                checked={variant.mode === "SPRITE"}
                onChange={() => onPatch({ mode: "SPRITE", frameCount, direction, frameRate })}
                className="accent-yellow-400"
              />
              Sprite
            </label>
          </div>

          {variant.mode === "SPRITE" && (
            <div className="mt-2 space-y-2 text-[11px] text-zinc-400">
              <label className="block">
                Cuadros
                <input
                  type="number"
                  min={2}
                  max={24}
                  value={frameCount}
                  onChange={(event) => setFrameCount(Math.max(2, Number(event.target.value) || 2))}
                  className="mt-1 w-full rounded border border-zinc-800 bg-[#111] px-2 py-1 text-white"
                />
              </label>
              <label className="block">
                Dirección
                <select
                  value={direction}
                  onChange={(event) => setDirection(event.target.value as AnimationDirection)}
                  className="mt-1 w-full rounded border border-zinc-800 bg-[#111] px-2 py-1 text-white"
                >
                  <option value="PINGPONG">Ida y vuelta</option>
                  <option value="LOOP">Solo ida</option>
                </select>
              </label>
              <label className="block">
                Velocidad (cps)
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={frameRate}
                  onChange={(event) => setFrameRate(Math.max(1, Number(event.target.value) || 1))}
                  className="mt-1 w-full rounded border border-zinc-800 bg-[#111] px-2 py-1 text-white"
                />
              </label>
              {animationChanged && (
                <button
                  type="button"
                  onClick={() => onPatch({ frameCount, direction, frameRate })}
                  className="w-full rounded-md bg-yellow-400 px-2 py-1 font-black text-black"
                >
                  Guardar
                </button>
              )}
            </div>
          )}

          <label className="mt-2 block text-[11px] text-zinc-400">
            Nombre
            <input
              type="text"
              defaultValue={variant.name}
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (value && value !== variant.name) onPatch({ name: value });
              }}
              className="mt-1 w-full rounded border border-zinc-800 bg-[#111] px-2 py-1 text-white"
            />
          </label>
        </div>
      )}
    </div>
  );
}
