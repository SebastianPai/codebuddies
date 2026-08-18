"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Combobox } from "@headlessui/react";
import { HelpCircle, ImageIcon, Ruler, Gauge, Compass } from "lucide-react";
import { api } from "@/shared/api/client";
import { Tooltip } from "@/shared/ui";
import { useTranslation } from "../../../src/i18n/useTranslation";

// Tipo real que devuelve el backend ahora
type Item = {
  id: string;
  imageUrl?: string;
  layer: number;
  rarity: number;
  colorable: boolean;
  avatarData?: { slot: string };
  worldData?: { kind: string };
  sprites?: Array<{ id: string }>;
  // ... otros campos que quieras
};

type SpriteFilter = "all" | "with" | "without";

type Animation = { id: string; type: string; variant: string };

type ItemSpriteRecord = {
  id: string;
  imageUrl: string;
  frameWidth: number;
  frameHeight: number;
  framesCount: number;
  row: number;
  direction: Direction;
};

type Direction =
  | "NORTH"
  | "SOUTH"
  | "EAST"
  | "WEST"
  | "NORTH_EAST"
  | "SOUTH_EAST"
  | "SOUTH_WEST"
  | "NORTH_WEST";

// D-pad de direcciones: fila/columna dentro de una grilla 3x3 (el centro
// queda vacío) y flecha correspondiente.
const DIRECTION_PAD: Array<{ value: Direction; arrow: string }> = [
  { value: "NORTH_WEST", arrow: "↖" },
  { value: "NORTH", arrow: "↑" },
  { value: "NORTH_EAST", arrow: "↗" },
  { value: "WEST", arrow: "←" },
  { value: "EAST", arrow: "→" },
  { value: "SOUTH_WEST", arrow: "↙" },
  { value: "SOUTH", arrow: "↓" },
  { value: "SOUTH_EAST", arrow: "↘" },
];

interface SpriteConfig {
  itemId: string;
  animationId: string;
  direction: Direction;
  frameWidth: number;
  frameHeight: number;
  framesCount: number;
  rowIndex: number;
}

function SectionCard({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-400">
          {icon}
          {title}
        </h2>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function DirectionButton({
  value,
  arrow,
  config,
  setConfig,
}: {
  value: Direction;
  arrow: string;
  config: SpriteConfig;
  setConfig: (updater: (c: SpriteConfig) => SpriteConfig) => void;
}) {
  const active = config.direction === value;
  return (
    <button
      type="button"
      title={value}
      onClick={() => setConfig((c) => ({ ...c, direction: value }))}
      className={`h-9 rounded flex items-center justify-center text-sm font-bold transition-colors ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
      }`}
    >
      {arrow}
    </button>
  );
}

export default function ItemSpriteEditorPage() {
  return (
    <Suspense fallback={null}>
      <ItemSpriteEditor />
    </Suspense>
  );
}

function ItemSpriteEditor() {
  const t = useTranslation();
  const searchParams = useSearchParams();
  const initialItemId = searchParams.get("itemId") ?? "";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [animations, setAnimations] = useState<Animation[]>([]);

  const [config, setConfig] = useState<SpriteConfig>({
    itemId: initialItemId,
    animationId: "",
    direction: "SOUTH",
    frameWidth: 128,
    frameHeight: 224,
    framesCount: 8,
    rowIndex: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [spriteFilter, setSpriteFilter] = useState<SpriteFilter>("all");

  const [fps, setFps] = useState(8);
  const [zoom, setZoom] = useState(2);

  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rows, setRows] = useState(1);

  // Sprite ya guardado en la base para el item+animación+dirección
  // actualmente elegidos (si existe). Antes el editor nunca revisaba esto:
  // siempre intentaba CREAR uno nuevo al guardar, y el backend rechazaba
  // con 400 ("ya existe") si ya había uno -- así que "editar" un sprite
  // existente no funcionaba en absoluto, ni se veía lo que ya estaba
  // guardado al abrir el editor.
  const [existingSpriteId, setExistingSpriteId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const [showBody, setShowBody] = useState(true);
  const [bodyId, setBodyId] = useState("");
  const [bodyImage, setBodyImage] = useState<HTMLImageElement | null>(null);
  const [bodySprite, setBodySprite] = useState<ItemSpriteRecord | null>(null);
  const [bodySpriteImage, setBodySpriteImage] = useState<HTMLImageElement | null>(null);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar items y animaciones
  useEffect(() => {
    Promise.all([
      api.get<Item[]>("/items"),
      api.get<Animation[]>("/animations"),
    ])
      .then(([itemsData, animData]) => {
        setItems(itemsData);
        setAnimations(animData);
      })
      .catch(() => setError(t("items.loadItemsAnimationsError")));
  }, []);

  // Filtrado inteligente para el combobox
  const filteredItems = items.filter((item) => {
    const hasSprite = (item.sprites?.length ?? 0) > 0;
    if (spriteFilter === "with" && !hasSprite) return false;
    if (spriteFilter === "without" && hasSprite) return false;

    if (!searchQuery) return true;

    const q = searchQuery.toLowerCase();
    const slot = item.avatarData?.slot?.toLowerCase() || "";
    const kind = item.worldData?.kind?.toLowerCase() || "";
    const idPart = item.id.toLowerCase();

    return slot.includes(q) || kind.includes(q) || idPart.includes(q);
  });

  // Items de cuerpo (BODY) disponibles como referencia visual para el preview
  const bodies = useMemo(
    () => items.filter((item) => item.avatarData?.slot === "BODY" && item.imageUrl),
    [items],
  );

  useEffect(() => {
    if (!bodyId && bodies.length > 0) {
      setBodyId(bodies[0].id);
    }
  }, [bodies, bodyId]);

  // Cargar imagen del cuerpo de referencia seleccionado
  useEffect(() => {
    const body = bodies.find((b) => b.id === bodyId);
    if (!body?.imageUrl) {
      setBodyImage(null);
      return;
    }

    const img = new Image();
    img.onload = () => setBodyImage(img);
    img.onerror = () => setBodyImage(null);
    img.src = body.imageUrl;
  }, [bodyId, bodies]);

  // Buscar si el cuerpo ya tiene su propio sprite animado (caminar, etc.)
  // para la animación + dirección elegidas, y animarlo junto con el item
  // en vez de mostrarlo como imagen fija.
  useEffect(() => {
    if (!bodyId || !config.animationId) {
      setBodySprite(null);
      return;
    }

    let cancelled = false;
    api
      .get<ItemSpriteRecord[]>(
        `/item-sprites?itemId=${bodyId}&animationId=${config.animationId}`,
      )
      .then((sprites) => {
        if (cancelled) return;
        const match = sprites.find((s) => s.direction === config.direction);
        setBodySprite(match ?? null);
      })
      .catch(() => {
        if (!cancelled) setBodySprite(null);
      });

    return () => {
      cancelled = true;
    };
  }, [bodyId, config.animationId, config.direction]);

  // Cargar la imagen del spritesheet animado del cuerpo (si existe)
  useEffect(() => {
    if (!bodySprite?.imageUrl) {
      setBodySpriteImage(null);
      return;
    }

    const img = new Image();
    img.onload = () => setBodySpriteImage(img);
    img.onerror = () => setBodySpriteImage(null);
    img.src = bodySprite.imageUrl;
  }, [bodySprite]);

  // Obtener display name para cada item en el combobox
  const getItemDisplayName = (item: Item) => {
    if (item.avatarData?.slot) return t("items.avatarPrefix", { value: item.avatarData.slot });
    if (item.worldData?.kind) return t("items.worldPrefix", { value: item.worldData.kind });
    return t("items.baseItemFallback", { id: item.id.slice(0, 8) });
  };

  // Buscar si YA existe un sprite guardado para el item + animación +
  // dirección elegidos. Si existe, precarga su config e imagen (modo
  // edición); si no, deja el editor listo para crear uno nuevo.
  useEffect(() => {
    setExistingSpriteId(null);
    setExistingImageUrl(null);

    if (!config.itemId || !config.animationId) return;

    let cancelled = false;
    setLoadingExisting(true);
    api
      .get<ItemSpriteRecord[]>(
        `/item-sprites?itemId=${config.itemId}&animationId=${config.animationId}`,
      )
      .then((sprites) => {
        if (cancelled) return;
        const match = sprites.find((s) => s.direction === config.direction);
        if (match) {
          setExistingSpriteId(match.id);
          setExistingImageUrl(match.imageUrl);
          setConfig((c) => ({
            ...c,
            frameWidth: match.frameWidth,
            frameHeight: match.frameHeight,
            framesCount: match.framesCount,
            rowIndex: match.row,
          }));
          setFile(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExistingSpriteId(null);
          setExistingImageUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.itemId, config.animationId, config.direction]);

  // Cargar imagen a previsualizar: un archivo nuevo tiene prioridad (el
  // usuario está reemplazando), si no hay archivo nuevo pero hay un sprite
  // ya guardado, se carga esa imagen desde su URL.
  useEffect(() => {
    if (file) {
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        setImage(img);
        const detectedFrames = Math.floor(img.width / config.frameWidth);
        const detectedRows = Math.floor(img.height / config.frameHeight);
        setConfig((prev) => ({
          ...prev,
          framesCount: Math.max(1, detectedFrames || 8),
        }));
        setRows(Math.max(1, detectedRows || 1));
        setCurrentFrame(0);
        setError(null);
      };

      img.onerror = () => {
        setError(t("items.imageLoadError"));
        setImage(null);
      };

      return () => URL.revokeObjectURL(img.src);
    }

    if (existingImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImage(img);
        setRows(Math.max(1, Math.floor(img.height / config.frameHeight) || 1));
        setCurrentFrame(0);
        setError(null);
      };
      img.onerror = () => setError(t("items.imageLoadError"));
      img.src = existingImageUrl;
      return;
    }

    setImage(null);
    setRows(1);
  }, [file, existingImageUrl, config.frameWidth, config.frameHeight]);

  // Dibujar frame
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { frameWidth, frameHeight, rowIndex } = config;
    const scaledW = frameWidth * zoom;
    const scaledH = frameHeight * zoom;
    const destX = (canvas.width - scaledW) / 2;
    const destY = (canvas.height - scaledH) / 2;

    if (showBody) {
      if (bodySprite && bodySpriteImage) {
        // Cuerpo animado con su propio spritesheet (ej: caminar). Usa su
        // tamaño nativo (frameWidth/frameHeight propios) * zoom, igual que
        // el item: el zoom escala todas las capas por igual, ninguna queda
        // fija ni desproporcionada respecto a las demás.
        const bodyFrame = currentFrame % Math.max(1, bodySprite.framesCount);
        const bW = bodySprite.frameWidth * zoom;
        const bH = bodySprite.frameHeight * zoom;
        ctx.drawImage(
          bodySpriteImage,
          bodyFrame * bodySprite.frameWidth,
          bodySprite.row * bodySprite.frameHeight,
          bodySprite.frameWidth,
          bodySprite.frameHeight,
          (canvas.width - bW) / 2,
          (canvas.height - bH) / 2,
          bW,
          bH,
        );
      } else if (bodyImage) {
        // Sin sprite animado para esta animación/dirección: mostrar el
        // ícono estático del cuerpo en su tamaño original (natural) * zoom,
        // igual criterio que las demás capas.
        const bW = bodyImage.width * zoom;
        const bH = bodyImage.height * zoom;

        ctx.drawImage(
          bodyImage,
          (canvas.width - bW) / 2,
          (canvas.height - bH) / 2,
          bW,
          bH,
        );
      }
    }

    if (!image) return;

    const itemFrame = currentFrame % Math.max(1, config.framesCount);
    const sx = itemFrame * frameWidth;
    const sy = rowIndex * frameHeight;

    ctx.drawImage(image, sx, sy, frameWidth, frameHeight, destX, destY, scaledW, scaledH);

    // Grid visual (opcional)
    ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(destX, destY, scaledW, scaledH);
  }, [image, currentFrame, zoom, config, showBody, bodyImage, bodySprite, bodySpriteImage]);

  // Animación loop
  useEffect(() => {
    const showBodyAnimation = showBody && !!bodySprite;
    if (!isPlaying || (!image && !showBodyAnimation)) return;

    const maxFrames = Math.max(
      image ? config.framesCount : 1,
      showBodyAnimation ? bodySprite!.framesCount : 1,
      1,
    );

    const intervalMs = 1000 / Math.max(1, fps);
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (time - lastTime >= intervalMs) {
        setCurrentFrame((prev) => (prev + 1) % maxFrames);
        lastTime = time;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameRef.current!);
  }, [isPlaying, fps, image, config.framesCount, showBody, bodySprite]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  // Guardar sprite: actualiza el existente (PATCH) si ya había uno para
  // este item+animación+dirección, o crea uno nuevo (POST) si no.
  const handleSave = async () => {
    if (!config.itemId || !config.animationId || (!file && !existingImageUrl)) {
      alert(t("items.missingSpriteDataError"));
      return;
    }

    try {
      const anim = animations.find((a) => a.id === config.animationId);
      if (!anim) throw new Error(t("items.animationNotFoundError"));

      let imageUrl = existingImageUrl;

      if (file) {
        const folder = `items/${config.itemId}/${anim.type}/${anim.variant}/${config.direction.toLowerCase()}`;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        const uploaded = await api.post<{ url: string }>("/uploads", formData);
        imageUrl = uploaded.url;
      }

      const spriteData = {
        itemId: config.itemId,
        animationId: config.animationId,
        direction: config.direction,
        imageUrl,
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
        framesCount: config.framesCount,
        row: config.rowIndex,
      };

      if (existingSpriteId) {
        await api.patch(`/item-sprites/${existingSpriteId}`, spriteData);
      } else {
        const created = await api.post<{ id: string }>("/item-sprites", spriteData);
        setExistingSpriteId(created.id);
      }

      alert(t("items.spriteSavedSuccess"));
      setFile(null);
      setExistingImageUrl(imageUrl);
      setItems((prev) =>
        prev.map((it) =>
          it.id === config.itemId
            ? { ...it, sprites: [...(it.sprites ?? []), { id: existingSpriteId ?? "new" }] }
            : it,
        ),
      );
    } catch (err: any) {
      alert(t("common.errorWithMessage", { message: err.message || t("items.unknownError") }));
      console.error(err);
    }
  };

  const selectedItem = items.find((i) => i.id === config.itemId);
  const itemDisplay = selectedItem
    ? selectedItem.avatarData?.slot
      ? t("items.avatarPrefix", { value: selectedItem.avatarData.slot })
      : selectedItem.worldData?.kind
        ? t("items.worldPrefix", { value: selectedItem.worldData.kind })
        : t("items.baseItemShort")
    : "";

  const selectedAnimation = animations.find((a) => a.id === config.animationId);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10 space-y-6">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t("items.spriteEditorTitle")} <span className="text-yellow-400">{t("items.byItemLabel")}</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("items.configureSpriteElsewhereHint")}
        </p>
      </header>

      {error && (
        <div className="bg-red-900/60 border border-red-600 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {config.itemId && config.animationId && !loadingExisting && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            existingSpriteId
              ? "border-indigo-700 bg-indigo-950/40 text-indigo-200"
              : "border-emerald-700 bg-emerald-950/30 text-emerald-200"
          }`}
        >
          {existingSpriteId
            ? t("items.spriteEditModeNotice", {
                item: itemDisplay,
                animation: selectedAnimation?.variant ?? selectedAnimation?.type ?? "",
                direction: config.direction,
              })
            : t("items.spriteCreateModeNotice")}
        </div>
      )}
      {loadingExisting && (
        <div className="text-xs text-gray-500">{t("items.loadingExistingSprite")}</div>
      )}

      <SectionCard title={t("items.byItemLabel")} icon={<Compass size={16} />}>
        {/* Filtro por estado de sprite */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide opacity-60">
            {t("items.spriteFilterLabel")}
          </span>
          {(["all", "with", "without"] as SpriteFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSpriteFilter(option)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                spriteFilter === option
                  ? "border-indigo-500 bg-indigo-600/40 text-white"
                  : "border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-500"
              }`}
            >
              {option === "all"
                ? t("items.spriteFilterAllLabel")
                : option === "with"
                  ? t("items.spriteFilterWithLabel")
                  : t("items.spriteFilterWithoutLabel")}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Combobox
            value={config.itemId}
            onChange={(value) =>
              setConfig((c) => ({ ...c, itemId: value ?? "" }))
            }
          >
            <div className="relative">
              <Combobox.Input
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                displayValue={(itemId: string) => {
                  const item = items.find((i) => i.id === itemId);
                  return item ? getItemDisplayName(item) : "";
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("items.searchItemPlaceholder")}
              />
              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-gray-800 border border-gray-700 rounded-md shadow-2xl">
                {filteredItems.length === 0 && searchQuery ? (
                  <div className="px-4 py-2 text-gray-400">{t("items.noResults")}</div>
                ) : (
                  filteredItems.map((item) => (
                    <Combobox.Option
                      key={item.id}
                      value={item.id}
                      className={({ active }) =>
                        `cursor-pointer px-4 py-2 flex items-center gap-3 ${
                          active ? "bg-indigo-600/40" : ""
                        }`
                      }
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={getItemDisplayName(item)}
                          className="w-8 h-8 object-contain rounded bg-gray-900/40"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-xs">
                          ?
                        </div>
                      )}
                      <span className="truncate">{getItemDisplayName(item)}</span>
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </div>
          </Combobox>

          <select
            value={config.animationId}
            onChange={(e) =>
              setConfig((c) => ({ ...c, animationId: e.target.value }))
            }
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
          >
            <option value="">{t("items.selectAnimationOption")}</option>
            {animations.map((anim) => (
              <option key={anim.id} value={anim.id}>
                {anim.type} — {anim.variant}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsPlaying((p) => !p)}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isPlaying
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-600 hover:bg-gray-500"
            }`}
          >
            {isPlaying ? t("items.pauseButton") : t("items.playButton")}
          </button>
        </div>
      </SectionCard>

      <SectionCard title={t("items.itemSprite")} icon={<ImageIcon size={16} />}>
        {/* Dropzone */}
        <div
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f?.type.startsWith("image/")) setFile(f);
          }}
          onDragOver={(e) => e.preventDefault()}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
            file
              ? "border-green-600 bg-green-950/20"
              : existingImageUrl
                ? "border-indigo-700 bg-indigo-950/10"
                : "border-gray-600 hover:border-gray-400 hover:bg-gray-800/30"
          }`}
        >
          {file ? (
            <p className="text-green-400 font-medium">
              {file.name} • {(file.size / 1024).toFixed(1)} KB
            </p>
          ) : existingImageUrl ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={existingImageUrl}
                alt={t("items.itemSprite")}
                className="max-h-24 object-contain [image-rendering:pixelated]"
              />
              <p className="text-indigo-300 text-sm">{t("items.dropzoneText")}</p>
            </div>
          ) : (
            <p>{t("items.dropzoneText")}</p>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>
        <div className="text-right">
          {image ? `${image.width}×${image.height}px` : t("items.noImage")}
        </div>
      </SectionCard>

      <SectionCard
        title={t("items.frameGeometryTitle")}
        hint={t("items.frameGeometryHint")}
        icon={<Ruler size={16} />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          {[
            { label: t("items.frameWidthLabel"), value: config.frameWidth, key: "frameWidth" },
            {
              label: t("items.frameHeightLabel"),
              value: config.frameHeight,
              key: "frameHeight",
            },
            {
              label: t("items.frameCountLabel"),
              value: config.framesCount,
              key: "framesCount",
            },
            { label: t("items.activeRowLabel"), value: config.rowIndex, key: "rowIndex" },
            {
              label: t("items.detectedRowsLabel"),
              value: rows,
              key: "rows",
              disabled: true,
            },
          ].map(({ label, value, key, disabled }) => (
            <div key={label} className="space-y-1">
              <label className="text-xs opacity-70 flex items-center gap-1">{label}</label>
              <input
                type="number"
                min={1}
                value={value}
                disabled={disabled}
                onChange={(e) => {
                  const num = Math.max(1, Number(e.target.value) || 1);
                  setConfig((c) => ({ ...c, [key]: num }));
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t("items.playbackPreviewTitle")}
        hint={t("items.playbackPreviewHint")}
        icon={<Gauge size={16} />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm max-w-md">
          {[
            { label: "FPS", value: fps, key: "fps", hint: t("items.fpsHint") },
            { label: "Zoom", value: zoom, key: "zoom" },
          ].map(({ label, value, key, hint }) => (
            <div key={label} className="space-y-1">
              <label className="text-xs opacity-70 flex items-center gap-1">
                {label}
                {hint && (
                  <Tooltip content={hint}>
                    <HelpCircle size={12} className="text-gray-500" />
                  </Tooltip>
                )}
              </label>
              <input
                type="number"
                min={1}
                value={value}
                onChange={(e) => {
                  const num = Math.max(1, Number(e.target.value) || 1);
                  if (key === "fps") setFps(num);
                  else setZoom(num);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("items.directionLabel")} icon={<Compass size={16} />}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-full border border-gray-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowBody(true)}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                showBody ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {t("items.withBodyLabel")}
            </button>
            <button
              type="button"
              onClick={() => setShowBody(false)}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                !showBody ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {t("items.withoutBodyLabel")}
            </button>
          </div>

          {showBody && bodies.length > 0 && (
            <select
              value={bodyId}
              onChange={(e) => setBodyId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
            >
              {bodies.map((body) => (
                <option key={body.id} value={body.id}>
                  {t("items.baseItemFallback", { id: body.id.slice(0, 8) })}
                </option>
              ))}
            </select>
          )}

          {showBody && bodies.length === 0 && (
            <span className="text-xs opacity-60">{t("items.noBodyItemFound")}</span>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide opacity-60">
              {t("items.directionLabel")}
            </span>
            <div className="grid grid-cols-3 grid-rows-3 gap-1 w-28">
              {DIRECTION_PAD.slice(0, 3).map(({ value, arrow }) => (
                <DirectionButton key={value} value={value} arrow={arrow} config={config} setConfig={setConfig} />
              ))}
              <DirectionButton value={DIRECTION_PAD[3].value} arrow={DIRECTION_PAD[3].arrow} config={config} setConfig={setConfig} />
              <div className="rounded bg-gray-800/40 flex items-center justify-center text-[10px] text-gray-500">
                {config.direction}
              </div>
              <DirectionButton value={DIRECTION_PAD[4].value} arrow={DIRECTION_PAD[4].arrow} config={config} setConfig={setConfig} />
              {DIRECTION_PAD.slice(5, 8).map(({ value, arrow }) => (
                <DirectionButton key={value} value={value} arrow={arrow} config={config} setConfig={setConfig} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <canvas
            ref={canvasRef}
            width={Math.min(900, Math.max(320, config.frameWidth * zoom * 3))}
            height={Math.min(
              650,
              Math.max(240, config.frameHeight * zoom * Math.min(3, rows + 1)),
            )}
            className="border border-gray-700 bg-black/50 rounded-lg mx-auto block shadow-2xl"
          />
          <div className="text-center text-sm opacity-70">
            {t("items.frameRowLabel", { frame: currentFrame + 1, total: config.framesCount, row: config.rowIndex + 1 })}
            {itemDisplay && ` • ${itemDisplay}`}
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-center pb-6">
        <button
          onClick={handleSave}
          disabled={(!file && !existingImageUrl) || !config.itemId || !config.animationId || !image}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-12 py-4 rounded-xl shadow-xl transform active:scale-95 transition-all"
        >
          {t("items.saveSpriteButton")}
        </button>
      </div>
    </div>
  );
}
