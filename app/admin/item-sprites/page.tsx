"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Combobox } from "@headlessui/react";
import { useTranslation } from "../../../src/i18n/useTranslation";

const API_BASE = "http://localhost:3001";

// Tipo real que devuelve el backend ahora
type Item = {
  id: string;
  imageUrl?: string;
  layer: number;
  rarity: number;
  colorable: boolean;
  avatarData?: { slot: string };
  worldData?: { kind: string };
  // ... otros campos que quieras
};

type Animation = { id: string; type: string; variant: string };

type Direction =
  | "NORTH"
  | "SOUTH"
  | "EAST"
  | "WEST"
  | "NORTH_EAST"
  | "SOUTH_EAST"
  | "SOUTH_WEST"
  | "NORTH_WEST";

interface SpriteConfig {
  itemId: string;
  animationId: string;
  direction: Direction;
  frameWidth: number;
  frameHeight: number;
  framesCount: number;
  rowIndex: number;
}

export default function ItemSpriteEditor() {
  const t = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [animations, setAnimations] = useState<Animation[]>([]);

  const [config, setConfig] = useState<SpriteConfig>({
    itemId: "",
    animationId: "",
    direction: "SOUTH",
    frameWidth: 64,
    frameHeight: 64,
    framesCount: 8,
    rowIndex: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");

  const [fps, setFps] = useState(8);
  const [zoom, setZoom] = useState(2);

  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rows, setRows] = useState(1);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar items y animaciones
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/items`).then((r) => r.json()),
      fetch(`${API_BASE}/animations`).then((r) => r.json()),
    ])
      .then(([itemsData, animData]) => {
        setItems(itemsData);
        setAnimations(animData);
      })
      .catch(() => setError(t("items.loadItemsAnimationsError")));
  }, []);

  // Filtrado inteligente para el combobox
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;

    const q = searchQuery.toLowerCase();
    const slot = item.avatarData?.slot?.toLowerCase() || "";
    const kind = item.worldData?.kind?.toLowerCase() || "";
    const idPart = item.id.toLowerCase();

    return slot.includes(q) || kind.includes(q) || idPart.includes(q);
  });

  // Obtener display name para cada item en el combobox
  const getItemDisplayName = (item: Item) => {
    if (item.avatarData?.slot) return t("items.avatarPrefix", { value: item.avatarData.slot });
    if (item.worldData?.kind) return t("items.worldPrefix", { value: item.worldData.kind });
    return t("items.baseItemFallback", { id: item.id.slice(0, 8) });
  };

  // Cargar imagen
  useEffect(() => {
    if (!file) {
      setImage(null);
      setRows(1);
      return;
    }

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
  }, [file, config.frameWidth, config.frameHeight]);

  // Dibujar frame
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { frameWidth, frameHeight, rowIndex, framesCount } = config;
    const scaledW = frameWidth * zoom;
    const scaledH = frameHeight * zoom;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sx = currentFrame * frameWidth;
    const sy = rowIndex * frameHeight;

    ctx.drawImage(
      image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      (canvas.width - scaledW) / 2,
      (canvas.height - scaledH) / 2,
      scaledW,
      scaledH,
    );

    // Grid visual (opcional)
    ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      (canvas.width - scaledW) / 2,
      (canvas.height - scaledH) / 2,
      scaledW,
      scaledH,
    );
  }, [image, currentFrame, zoom, config]);

  // Animación loop
  useEffect(() => {
    if (!isPlaying || !image) return;

    const intervalMs = 1000 / Math.max(1, fps);
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (time - lastTime >= intervalMs) {
        setCurrentFrame((prev) => (prev + 1) % config.framesCount);
        lastTime = time;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameRef.current!);
  }, [isPlaying, fps, image, config.framesCount]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  // Guardar sprite
  const handleSave = async () => {
    if (!file || !image || !config.itemId || !config.animationId) {
      alert(t("items.missingSpriteDataError"));
      return;
    }

    try {
      const anim = animations.find((a) => a.id === config.animationId);
      if (!anim) throw new Error(t("items.animationNotFoundError"));

      const folder = `items/${config.itemId}/${anim.type}/${anim.variant}/${config.direction.toLowerCase()}`;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const uploadRes = await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error(t("items.imageUploadError"));

      const { url: imageUrl } = await uploadRes.json();

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

      const saveRes = await fetch(`${API_BASE}/item-sprites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spriteData),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.message || t("items.saveSpriteErrorFallback"));
      }

      alert(t("items.spriteSavedSuccess"));
      setFile(null);
      setImage(null);
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t("items.spriteEditorTitle")} <span className="text-yellow-400">{t("items.byItemLabel")}</span>
        </h1>
        <div className="text-sm opacity-70">
          {image ? `${image.width}×${image.height}` : t("items.noImage")}
        </div>
      </header>

      {error && (
        <div className="bg-red-900/60 border border-red-600 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Controles principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Combobox Items */}
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

        <select
          value={config.direction}
          onChange={(e) =>
            setConfig((c) => ({ ...c, direction: e.target.value as Direction }))
          }
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
        >
          {[
            "NORTH",
            "SOUTH",
            "EAST",
            "WEST",
            "NORTH_EAST",
            "SOUTH_EAST",
            "SOUTH_WEST",
            "NORTH_WEST",
          ].map((d) => (
            <option key={d} value={d}>
              {d}
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
            : "border-gray-600 hover:border-gray-400 hover:bg-gray-800/30"
        }`}
      >
        {file ? (
          <p className="text-green-400 font-medium">
            {file.name} • {(file.size / 1024).toFixed(1)} KB
          </p>
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

      {/* Controles finos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
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
          { label: "FPS", value: fps, key: "fps" },
          { label: "Zoom", value: zoom, key: "zoom" },
        ].map(({ label, value, key, disabled }) => (
          <div key={label} className="space-y-1">
            <label className="text-xs opacity-70 block">{label}</label>
            <input
              type="number"
              min={1}
              value={value}
              disabled={disabled}
              onChange={(e) => {
                const num = Math.max(1, Number(e.target.value) || 1);
                if (key === "fps") setFps(num);
                else if (key === "zoom") setZoom(num);
                else setConfig((c) => ({ ...c, [key]: num }));
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="space-y-3">
        <canvas
          ref={canvasRef}
          width={Math.max(320, config.frameWidth * zoom * 6)}
          height={Math.max(
            240,
            config.frameHeight * zoom * Math.min(5, rows + 1),
          )}
          className="border border-gray-700 bg-black/50 rounded-lg mx-auto block shadow-2xl"
        />
        <div className="text-center text-sm opacity-70">
          {t("items.frameRowLabel", { frame: currentFrame + 1, total: config.framesCount, row: config.rowIndex + 1 })}
          {itemDisplay && ` • ${itemDisplay}`}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleSave}
          disabled={!file || !config.itemId || !config.animationId || !image}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-12 py-4 rounded-xl shadow-xl transform active:scale-95 transition-all"
        >
          {t("items.saveSpriteButton")}
        </button>
      </div>
    </div>
  );
}
