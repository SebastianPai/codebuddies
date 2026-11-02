"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Coins,
  Image as ImageIcon,
  MoreHorizontal,
  Paintbrush,
  Redo2,
  Rows3,
  RotateCw,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Boxes,
  Undo2,
  X,
} from "lucide-react";
import { BUILD_COMMAND_STACK_CHANGED_EVENT } from "../../systems/BuildCommandStack";
import {
  BUILD_PLACEMENT_PROGRESS_EVENT,
  setPlacementColor,
  type BuildPlacementProgress,
} from "../../systems/buildPlacementEvents";
import ItemPreview from "../UI/ItemPreview";
import { PET_ACCESSORY_CATEGORY } from "../../network/pets";
import ColorSwatchPicker from "../shared/ColorSwatchPicker";
import { COLOR_FREE_COLORS, COLOR_PREMIUM_COLORS } from "@codebuddies/world-objects";
import { useIsPremium } from "../../hooks/useIsPremium";
import BackgroundSelector from "../RoomSystem/BackgroundSelector/BackgroundSelector";
import type { Background } from "../../types/room";
import { EffectivePermissions, NO_PERMISSIONS } from "../../types/permissions";
import styles from "./BuildModePanel.module.css";
import { useTranslation } from "../../../i18n/useTranslation";

// Modo construcción: arriba una barra (modo, buscador, deshacer, tienda),
// un aviso chico mientras se coloca o pinta (con botones para tablet), la
// barra rápida 1-9 y abajo el catálogo en fichas chicas. El centro de la
// pantalla queda libre para construir. Antes era una columna lateral con
// tarjetas grandes donde cabían 4 objetos y había que bajar mucho.
type BuildMode = "objects" | "textures" | "environment";

// "Recientes" es puramente local (últimos objetos colocados en ESTE
// navegador) — a diferencia de favoritos, no tiene sentido sincronizarlo
// entre dispositivos ni persistirlo server-side.
const RECENTS_STORAGE_KEY = "codebuddies:build:recentItemIds";
const MAX_RECENTS = 24;
const HOTBAR_SIZE = 9;
const BUY_QUANTITIES = [1, 10, 50];

function loadRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function pushRecentId(itemId: string) {
  if (typeof window === "undefined" || !itemId) return;
  const current = loadRecentIds().filter((id) => id !== itemId);
  const next = [itemId, ...current].slice(0, MAX_RECENTS);
  window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

// Los nombres de los objetos del mundo traen la categoría como prefijo
// ("Techo · Aguja", "Terror · Calabaza"): de ahí salen las categorías del
// catálogo, sin depender de un campo aparte.
function splitName(name: string | undefined): { group: string | null; short: string } {
  const text = (name ?? "").trim();
  const at = text.indexOf(" · ");
  if (at <= 0) return { group: null, short: text };
  return { group: text.slice(0, at), short: text.slice(at + 3) };
}

const isTypingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

// Una ficha del catálogo: lo que tengo (con cantidad) o lo de la tienda (con precio).
type Entry = { item: any; amount: number; price: number | null; maxStack: number };

interface Props {
  inventory: any[];
  paintAllProgress?: { done: number; total: number } | null;
  socket?: any;
  roomId?: string;
  currentBackgroundId?: string;
  permissions?: EffectivePermissions;
  onExit: () => void;
  onOpenShop: () => void;
  onOpenMarketplace: () => void;
  onClearRoom: () => void;
  onPlaceWorldItem: (item: any) => void;
  onPaintSurfaceTexture: (item: any, width: number, height: number) => void;
  onPaintAllFloor: () => void;
  onCancelPainting: () => void;
  onCancelPlacement: () => void;
  // Sala de diseño: todo se coloca gratis y arriba se ve cuánto costaría
  // hacerlo real. canDesign = es una sala propia que se puede diseñar.
  isDesign?: boolean;
  canDesign?: boolean;
  onOpenDesign?: (reset?: boolean) => void;
  onLeaveDesign?: () => void;
  onApplyDesign?: () => void;
}

export default function BuildModePanel({
  inventory,
  paintAllProgress,
  socket: socketProp,
  roomId,
  currentBackgroundId,
  permissions = NO_PERMISSIONS,
  onExit,
  onOpenShop,
  onOpenMarketplace,
  onClearRoom,
  onPlaceWorldItem,
  onPaintSurfaceTexture,
  onPaintAllFloor,
  onCancelPainting,
  onCancelPlacement,
  isDesign = false,
  canDesign = false,
  onOpenDesign,
  onLeaveDesign,
  onApplyDesign,
}: Props) {
  const t = useTranslation();
  const socket =
    socketProp ||
    (typeof window !== "undefined" ? (window as any).phaserSocket : null);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("getBackgrounds");
    socket.on("backgrounds:list", setBackgrounds);
    // Lo de la tienda aparece en el mismo catálogo: se puede comprar sin
    // salir del modo construcción.
    const handleShop = (items: any[]) => setShopItems(Array.isArray(items) ? items : []);
    socket.on("shop:items", handleShop);
    socket.emit("shop:items:request");

    return () => {
      socket.off("backgrounds:list", setBackgrounds);
      socket.off("shop:items", handleShop);
    };
  }, [socket]);

  // Cuánto costaría hacer real el diseño; se recalcula cuando cambia la sala.
  const [designTotal, setDesignTotal] = useState<number | null>(null);
  useEffect(() => {
    if (!socket || !isDesign) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const request = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => socket.emit("design:quote"), 400);
    };
    const handleQuote = (data: { total?: number }) => setDesignTotal(data?.total ?? 0);
    const roomEvents = ["room:item:placed", "room:item:removed", "room:items:cleared", "room:surface:painted", "room:surfaces:painted-all"];
    socket.on("design:quote", handleQuote);
    roomEvents.forEach((name) => socket.on(name, request));
    socket.emit("design:quote");
    return () => {
      if (timer) clearTimeout(timer);
      socket.off("design:quote", handleQuote);
      roomEvents.forEach((name) => socket.off(name, request));
    };
  }, [socket, isDesign]);

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecentIds());

  useEffect(() => {
    if (!socket) return;

    const handleFavorites = (data: { itemIds: string[] }) =>
      setFavoriteIds(data?.itemIds ?? []);

    socket.emit("build:favorites:list");
    socket.on("build:favorites:list", handleFavorites);

    return () => socket.off("build:favorites:list", handleFavorites);
  }, [socket]);

  // El estado real de deshacer/rehacer vive en BuildCommandStack (Phaser,
  // fuera de React) — se refleja acá vía el evento que la propia pila
  // dispara en cada push/undo/redo, en vez de que este panel lo adivine.
  const [canUndo, setCanUndo] = useState(
    () => !!(typeof window !== "undefined" && (window as any).buildCommandStack?.canUndo()),
  );
  const [canRedo, setCanRedo] = useState(
    () => !!(typeof window !== "undefined" && (window as any).buildCommandStack?.canRedo()),
  );

  useEffect(() => {
    const handleStackChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ canUndo: boolean; canRedo: boolean }>).detail;
      if (!detail) return;
      setCanUndo(detail.canUndo);
      setCanRedo(detail.canRedo);
    };

    window.addEventListener(BUILD_COMMAND_STACK_CHANGED_EVENT, handleStackChanged);
    return () => window.removeEventListener(BUILD_COMMAND_STACK_CHANGED_EVENT, handleStackChanged);
  }, []);

  const toggleFavorite = (itemId?: string) => {
    if (!socket || !itemId) return;
    if (favoriteIds.includes(itemId)) {
      socket.emit("build:favorite:remove", { itemId });
    } else {
      socket.emit("build:favorite:add", { itemId });
    }
  };

  const registerRecent = (itemId?: string) => {
    if (!itemId) return;
    const next = pushRecentId(itemId);
    if (next) setRecentIds(next);
  };
  const isPaintingAll = !!paintAllProgress;
  const paintAllPercent =
    paintAllProgress && paintAllProgress.total > 0
      ? Math.min(100, Math.round((paintAllProgress.done / paintAllProgress.total) * 100))
      : null;
  const [mode, setMode] = useState<BuildMode>("objects");
  const [group, setGroup] = useState<string>("all");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [showMore, setShowMore] = useState(false);
  const [textureSize, setTextureSize] = useState("1x1");
  const [activePaintItem, setActivePaintItem] = useState<any | null>(null);
  const [activePlacementItem, setActivePlacementItem] = useState<any | null>(null);
  const [placementRemaining, setPlacementRemaining] = useState(0);
  const [rowMode, setRowMode] = useState(false);
  // Compra desde el catálogo: la ficha abierta y el id que se coloca apenas
  // llega al inventario.
  const [buyEntry, setBuyEntry] = useState<Entry | null>(null);
  const [buying, setBuying] = useState(false);
  const pendingPlaceId = useRef<string | null>(null);
  // Probar antes de comprar: el objeto de la tienda se mueve por el mapa como
  // si fuera mío; al intentar colocarlo aparecen las casillas elegidas y la
  // compra. `positions` vuelve a Phaser cuando la compra llega al inventario.
  const [previewEntry, setPreviewEntry] = useState<Entry | null>(null);
  const [previewPositions, setPreviewPositions] = useState<Array<{ x: number; y: number; elevation?: number }> | null>(null);
  const pendingPositions = useRef<Array<{ x: number; y: number; elevation?: number }> | null>(null);
  // Color para los muebles coloreables, elegido antes de colocarlos (lo lee
  // FurniturePlacementSystem en cada click). null = color original.
  const [placementColor, setPlacementColorState] = useState<number | null>(null);
  const isPremium = useIsPremium();
  const choosePlacementColor = (color: number | null) => {
    setPlacementColorState(color);
    setPlacementColor(color);
  };

  const toggleRowMode = (active: boolean) => {
    setRowMode(active);
    window.dispatchEvent(new CustomEvent("build:row-mode", { detail: { active } }));
  };

  // El ghost vive en Phaser (BuildSystem); acá solo se refleja cuántas
  // unidades quedan y se cierra el estado cuando la colocación termina.
  useEffect(() => {
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<BuildPlacementProgress>).detail;
      if (!detail) return;
      if (!detail.itemId || detail.remaining <= 0) {
        setActivePlacementItem(null);
        setPlacementRemaining(0);
        setPreviewEntry(null);
        setPreviewPositions(null);
        return;
      }
      setPlacementRemaining(detail.remaining);
    };

    window.addEventListener(BUILD_PLACEMENT_PROGRESS_EVENT, handleProgress);
    return () => window.removeEventListener(BUILD_PLACEMENT_PROGRESS_EVENT, handleProgress);
  }, []);

  // Al salir del modo construcción el modo fila no debe quedar prendido.
  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent("build:row-mode", { detail: { active: false } }));
  }, []);

  const startPreview = (entry: Entry) => {
    setActivePaintItem(null);
    onCancelPainting();
    setBuyEntry(null);
    setPreviewPositions(null);
    setPreviewEntry(entry);
    const item = { ...entry.item, previewOnly: true, availableAmount: 999 };
    setActivePlacementItem(item);
    choosePlacementColor(null);
    onPlaceWorldItem(item);
  };

  useEffect(() => {
    const handlePreviewPlace = (event: Event) => {
      const detail = (event as CustomEvent<{ itemId: string; positions: Array<{ x: number; y: number; elevation?: number }> }>).detail;
      if (!detail?.positions?.length) return;
      setPreviewPositions(detail.positions);
    };
    window.addEventListener("build:preview:place", handlePreviewPlace);
    return () => window.removeEventListener("build:preview:place", handlePreviewPlace);
  }, []);

  const startPlacement = (entry: Entry) => {
    setActivePaintItem(null);
    onCancelPainting();
    setPreviewEntry(null);
    setPreviewPositions(null);
    const item = { ...entry.item, availableAmount: entry.amount };
    setActivePlacementItem(item);
    choosePlacementColor(null);
    setPlacementRemaining(entry.amount);
    registerRecent(item.id);
    onPlaceWorldItem(item);
  };

  const [textureWidth, textureHeight] = textureSize.split("x").map((value) => Number(value) || 1);

  // Catálogo: lo que tengo y lo de la tienda que todavía no tengo, juntos.
  const { objects, textures, groups } = useMemo(() => {
    const owned = new Map<string, Entry>();
    for (const inv of inventory) {
      const item = inv.item;
      if (item?.type !== "WORLD" || !item.id || item.category === PET_ACCESSORY_CATEGORY) continue;
      owned.set(item.id, { item, amount: inv.amount ?? inv.quantity ?? 1, price: item.coinsPrice ?? null, maxStack: item.maxStack ?? 1 });
    }
    const all: Entry[] = [...owned.values()];
    for (const item of shopItems) {
      if (item?.type !== "WORLD" || !item.id || owned.has(item.id) || !(item.coinsPrice > 0) || item.category === PET_ACCESSORY_CATEGORY) continue;
      all.push({ item, amount: 0, price: item.coinsPrice, maxStack: item.maxStack ?? 1 });
    }
    const term = search.trim().toLowerCase();
    const matches = (entry: Entry) =>
      !term ||
      entry.item.name?.toLowerCase().includes(term) ||
      entry.item.description?.toLowerCase().includes(term) ||
      entry.item.worldData?.kind?.toLowerCase().includes(term);
    const isTexture = (entry: Entry) => {
      const kind = entry.item.worldData?.kind;
      return kind === "FLOOR" || kind === "WALL";
    };
    const byOwnedThenName = (a: Entry, b: Entry) =>
      Number(b.amount > 0) - Number(a.amount > 0) || String(a.item.name).localeCompare(String(b.item.name));
    const objectEntries = all.filter((entry) => !isTexture(entry) && matches(entry)).sort(byOwnedThenName);
    const counts = new Map<string, number>();
    for (const entry of objectEntries) {
      const key = splitName(entry.item.name).group ?? "__other";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return {
      objects: objectEntries,
      textures: all.filter((entry) => isTexture(entry) && matches(entry)).sort(byOwnedThenName),
      groups: [...counts.entries()].sort((a, b) => (a[0] === "__other" ? 1 : b[0] === "__other" ? -1 : a[0].localeCompare(b[0]))),
    };
  }, [inventory, shopItems, search]);

  const ownedObjects = objects.filter((entry) => entry.amount > 0);
  const favorites = ownedObjects.filter((entry) => favoriteIds.includes(entry.item.id));
  const recents = recentIds
    .map((id) => ownedObjects.find((entry) => entry.item.id === id))
    .filter((entry): entry is Entry => Boolean(entry));
  const hotbar = recents.slice(0, HOTBAR_SIZE);

  const visible =
    mode === "textures"
      ? textures
      : group === "all"
        ? objects
        : group === "favorites"
          ? favorites
          : group === "recent"
            ? recents
            : objects.filter((entry) => (splitName(entry.item.name).group ?? "__other") === group);

  const pickEntry = (entry: Entry) => {
    // En la sala de diseño no se gasta nada: todo se coloca como si sobrara.
    if (isDesign) {
      if (mode === "textures") {
        setActivePlacementItem(null);
        setActivePaintItem(entry.item);
        onPaintSurfaceTexture(entry.item, textureWidth, textureHeight);
      } else {
        startPlacement({ ...entry, amount: 999 });
      }
      return;
    }
    if (entry.amount <= 0) {
      // Objetos: se prueban en el mapa y se compran al colocarlos. Texturas:
      // compra directa (pintar en modo prueba no tiene ghost que mover).
      if (mode === "textures") setBuyEntry(entry);
      else startPreview(entry);
      return;
    }
    if (mode === "textures") {
      setActivePlacementItem(null);
      setActivePaintItem(entry.item);
      onPaintSurfaceTexture(entry.item, textureWidth, textureHeight);
      return;
    }
    startPlacement(entry);
  };

  // Compra: al confirmar llega el inventario nuevo y se arranca a colocar.
  useEffect(() => {
    if (!socket) return;
    const done = () => setBuying(false);
    const fail = () => {
      setBuying(false);
      pendingPlaceId.current = null;
      pendingPositions.current = null;
    };
    socket.on("shop:item:bought", done);
    socket.on("shop:item:error", fail);
    return () => {
      socket.off("shop:item:bought", done);
      socket.off("shop:item:error", fail);
    };
  }, [socket]);

  useEffect(() => {
    const id = pendingPlaceId.current;
    if (!id) return;
    const inv = inventory.find((entry) => entry.item?.id === id);
    if (!inv) return;
    pendingPlaceId.current = null;
    const positions = pendingPositions.current;
    pendingPositions.current = null;
    pickEntry({ item: inv.item, amount: inv.amount ?? inv.quantity ?? 1, price: inv.item?.coinsPrice ?? null, maxStack: inv.item?.maxStack ?? 1 });
    // Venía de probarlo en el mapa: se coloca donde el jugador lo dejó.
    if (positions?.length) {
      window.dispatchEvent(new CustomEvent("build:preview:commit", { detail: { positions } }));
    }
    // Solo reacciona a inventario nuevo; pickEntry depende del modo actual a propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory]);

  const buy = (entry: Entry, quantity: number, positions?: Array<{ x: number; y: number; elevation?: number }>) => {
    if (!socket || buying) return;
    setBuying(true);
    pendingPlaceId.current = entry.item.id;
    pendingPositions.current = positions?.slice(0, quantity) ?? null;
    setPreviewPositions(null);
    socket.emit("shop:item:buy", entry.maxStack > 1 ? { itemId: entry.item.id, quantity } : { itemId: entry.item.id });
    setBuyEntry(null);
    setTimeout(() => setBuying(false), 8000);
  };

  // Atajos: "/" busca, 1-9 eligen de la barra rápida.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      const slot = Number(event.key);
      if (Number.isInteger(slot) && slot >= 1 && slot <= HOTBAR_SIZE && hotbar[slot - 1]) {
        setMode("objects");
        startPlacement(hotbar[slot - 1]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const showEnvironment = permissions.canChangeBackground || permissions.canModifyLighting;
  const modes: Array<{ id: BuildMode; label: string; icon: typeof Boxes }> = [
    { id: "objects", label: t("buildmode.tabObjects"), icon: Boxes },
    { id: "textures", label: t("buildmode.tabTextures"), icon: Paintbrush },
    ...(showEnvironment ? [{ id: "environment" as const, label: t("buildmode.tabEnvironment"), icon: ImageIcon }] : []),
  ];
  const groupLabel = (key: string) => (key === "__other" ? t("buildmode.groupOther") : key);
  const entryTitle = (entry: Entry) => entry.item.name || entry.item.worldData?.kind || t("buildmode.itemFallbackName");

  const tile = (entry: Entry, key?: number) => {
    const owned = entry.amount > 0;
    const selected = activePlacementItem?.id === entry.item.id || activePaintItem?.id === entry.item.id;
    return (
      <button
        key={entry.item.id}
        type="button"
        className={`${styles.tile} ${owned ? "" : styles.tileShop} ${selected ? styles.tileSelected : ""}`}
        title={`${entryTitle(entry)}${entry.item.description ? ` — ${entry.item.description}` : ""}`}
        aria-label={entryTitle(entry)}
        onClick={() => pickEntry(entry)}
        onContextMenu={(event) => {
          event.preventDefault();
          if (owned) toggleFavorite(entry.item.id);
        }}
      >
        <ItemPreview item={entry.item} alt={entryTitle(entry)} className={styles.tileImage} />
        {key !== undefined && <span className={styles.tileKey}>{key}</span>}
        {owned ? (
          <b className={styles.tileCount}>{entry.amount}</b>
        ) : (
          <b className={styles.tilePrice}>
            <Coins size={9} /> {entry.price}
          </b>
        )}
        {owned && favoriteIds.includes(entry.item.id) && <Star size={10} className={styles.tileStar} />}
      </button>
    );
  };

  return (
    <div className={styles.root} aria-label={t("buildmode.ariaBuildMode")}>
      {/* ============ Barra de arriba ============ */}
      <div className={`${styles.glass} ${styles.topBar}`} role="toolbar" aria-label={t("buildmode.editorToolbarLabel")}>
        <button type="button" className={styles.exitButton} onClick={onExit} title={t("buildmode.exitButton")}>
          <X size={15} /> <span>{t("buildmode.exitShort")}</span>
        </button>
        <div className={styles.modes} role="tablist">
          {modes.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={mode === entry.id}
              className={`${styles.modeButton} ${mode === entry.id ? styles.modeActive : ""}`}
              onClick={() => {
                setMode(entry.id);
                setBuyEntry(null);
              }}
            >
              <entry.icon size={15} /> <span>{entry.label}</span>
            </button>
          ))}
        </div>
        {mode !== "environment" && (
          <label className={styles.search}>
            <Search size={14} />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearch("");
                  (event.target as HTMLInputElement).blur();
                }
              }}
              placeholder={t("buildmode.searchPlaceholder")}
              aria-label={t("buildmode.searchAriaLabel")}
            />
            <kbd>/</kbd>
          </label>
        )}
        <span className={styles.separator} />
        <button
          type="button"
          className={styles.iconButton}
          disabled={!canUndo}
          onClick={() => window.dispatchEvent(new CustomEvent("build:command:undo"))}
          title={`${t("buildmode.undoAction")} (Ctrl+Z)`}
          aria-label={t("buildmode.undoAction")}
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!canRedo}
          onClick={() => window.dispatchEvent(new CustomEvent("build:command:redo"))}
          title={`${t("buildmode.redoAction")} (Ctrl+Y)`}
          aria-label={t("buildmode.redoAction")}
        >
          <Redo2 size={16} />
        </button>
        <span className={styles.separator} />
        {isDesign && (
          <button type="button" className={styles.designPill} onClick={onApplyDesign} title={t("buildmode.designPillHint")}>
            <Sparkles size={14} />
            <span className={styles.designPillLabel}>{t("buildmode.designPillLabel")}</span>
            <b>
              <Coins size={12} /> {designTotal ?? "…"}
            </b>
            <span className={styles.designPillAction}>{t("buildmode.designMakeReal")}</span>
          </button>
        )}
        <button type="button" className={styles.iconButton} onClick={onOpenShop} title={t("buildmode.tabShop")} aria-label={t("buildmode.tabShop")}>
          <ShoppingBag size={16} />
        </button>
        <div className={styles.moreWrap}>
          <button
            type="button"
            className={styles.iconButton}
            aria-expanded={showMore}
            onClick={() => setShowMore((value) => !value)}
            title={t("buildmode.moreActions")}
            aria-label={t("buildmode.moreActions")}
          >
            <MoreHorizontal size={16} />
          </button>
          {showMore && (
            <div className={`${styles.glass} ${styles.moreMenu}`}>
              {canDesign && !isDesign && (
                <button type="button" onClick={() => { setShowMore(false); onOpenDesign?.(); }}>
                  <Sparkles size={15} /> {t("buildmode.designOpen")}
                </button>
              )}
              {isDesign && (
                <>
                  <button type="button" onClick={() => { setShowMore(false); onOpenDesign?.(true); }}>
                    {t("buildmode.designReset")}
                  </button>
                  <button type="button" onClick={() => { setShowMore(false); onLeaveDesign?.(); }}>
                    {t("buildmode.designLeave")}
                  </button>
                </>
              )}
              <button type="button" onClick={() => { setShowMore(false); onOpenMarketplace(); }}>
                <Store size={15} /> {t("buildmode.tabMarketplace")}
              </button>
              <button type="button" className={styles.dangerItem} onClick={() => { setShowMore(false); onClearRoom(); }}>
                {t("buildmode.clearRoomButton")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============ Aviso de lo que se está haciendo (con botones para tablet) ============ */}
      {activePlacementItem && (
        <div className={`${styles.glass} ${styles.status}`} role="status">
          <ItemPreview item={activePlacementItem} alt={activePlacementItem.name} className={styles.statusImage} />
          {previewEntry ? (
            <span className={styles.statusText}>
              {t("buildmode.tryingLabel")} <b>{splitName(activePlacementItem.name).short || t("buildmode.itemFallbackName")}</b>
              <span className={styles.statusPrice}>
                <Coins size={11} /> {previewEntry.price}
              </span>
              <span className={styles.statusSub}>{t("buildmode.tryingHint")}</span>
            </span>
          ) : (
            <span className={styles.statusText}>
              {t("buildmode.placingLabel")} <b>{splitName(activePlacementItem.name).short || t("buildmode.itemFallbackName")}</b>
              {!isDesign && <> ×{placementRemaining}</>}
            </span>
          )}
          <button type="button" className={styles.statusButton} onClick={() => window.dispatchEvent(new CustomEvent("build:item:rotate"))}>
            <RotateCw size={14} /> {t("buildmode.rotateButton")} <kbd>R</kbd>
          </button>
          <button
            type="button"
            aria-pressed={rowMode}
            className={`${styles.statusButton} ${rowMode ? styles.statusButtonOn : ""}`}
            onClick={() => toggleRowMode(!rowMode)}
            title={t("buildmode.rowModeHint")}
          >
            <Rows3 size={14} /> {t("buildmode.rowModeButton")} <kbd>Shift</kbd>
          </button>
          <button
            type="button"
            className={styles.statusButton}
            onClick={() => {
              setActivePlacementItem(null);
              setPreviewEntry(null);
              setPreviewPositions(null);
              toggleRowMode(false);
              onCancelPlacement();
            }}
          >
            {t("buildmode.finishButton")} <kbd>ESC</kbd>
          </button>
          {activePlacementItem.colorable && (
            <div className={styles.statusColors}>
              <ColorSwatchPicker
                colors={COLOR_FREE_COLORS}
                premiumColors={COLOR_PREMIUM_COLORS}
                isPremium={isPremium}
                value={placementColor}
                onSelect={choosePlacementColor}
                onClear={() => choosePlacementColor(null)}
              />
            </div>
          )}
        </div>
      )}

      {previewEntry && previewPositions && (() => {
        const count = previewEntry.maxStack > 1 ? previewPositions.length : 1;
        const price = previewEntry.price ?? 0;
        const extra = BUY_QUANTITIES.filter((quantity) => quantity > count && quantity <= previewEntry.maxStack);
        return (
          <div className={`${styles.glass} ${styles.previewBuy}`} role="dialog" aria-label={entryTitle(previewEntry)}>
            <span className={styles.previewBuyText}>
              {t("buildmode.previewBuyQuestion", { count })}
            </span>
            <button type="button" className={styles.previewBuyMain} disabled={buying} onClick={() => buy(previewEntry, count, previewPositions)}>
              <ShoppingBag size={14} /> {t("buildmode.previewBuyButton")} · <Coins size={12} /> {price * count}
            </button>
            {extra.map((quantity) => (
              <button key={quantity} type="button" className={styles.statusButton} disabled={buying} onClick={() => buy(previewEntry, quantity, previewPositions)}>
                ×{quantity} · <Coins size={11} /> {price * quantity}
              </button>
            ))}
            <button type="button" className={styles.statusButton} onClick={() => setPreviewPositions(null)}>
              {t("buildmode.previewKeepTrying")}
            </button>
          </div>
        );
      })()}

      {activePaintItem && (
        <div className={`${styles.glass} ${styles.status}`} role="status">
          <ItemPreview item={activePaintItem} alt={activePaintItem.name} className={styles.statusImage} />
          <span className={styles.statusText}>
            {t("buildmode.paintingFloorLabel")} <b>{splitName(activePaintItem.name).short || t("buildmode.textureFallbackName")}</b>
          </span>
          <label className={styles.statusSelect}>
            {t("buildmode.brushLabel")}
            <select
              value={textureSize}
              onChange={(event) => {
                setTextureSize(event.target.value);
                const [w, h] = event.target.value.split("x").map((value) => Number(value) || 1);
                onPaintSurfaceTexture(activePaintItem, w, h);
              }}
            >
              {["1x1", "2x2", "3x3", "2x3", "3x2"].map((size) => (
                <option key={size} value={size}>{size.replace("x", " x ")}</option>
              ))}
            </select>
          </label>
          {activePaintItem.worldData?.kind !== "WALL" && (
            <button
              type="button"
              className={styles.statusButton}
              disabled={isPaintingAll}
              onClick={() => {
                onPaintAllFloor();
                setActivePaintItem(null);
              }}
            >
              <Paintbrush size={14} /> {t("buildmode.paintAllFloorButton")}
            </button>
          )}
          <button
            type="button"
            className={styles.statusButton}
            onClick={() => {
              setActivePaintItem(null);
              onCancelPainting();
            }}
          >
            {t("buildmode.finishButton")} <kbd>ESC</kbd>
          </button>
          <span className={styles.statusHint}>{t("buildmode.tipText")}</span>
        </div>
      )}

      {isPaintingAll && (
        <div className={`${styles.glass} ${styles.status}`} role="status" aria-live="polite">
          <span className={styles.statusText}>
            <Paintbrush size={14} /> {t("buildmode.paintingAllProgressLabel")} <b>{paintAllPercent === null ? "..." : `${paintAllPercent}%`}</b>
          </span>
          <span className={styles.progressTrack}>
            <span
              className={`${styles.progressFill} ${paintAllPercent === null ? styles.progressIndeterminate : ""}`}
              style={paintAllPercent === null ? undefined : { width: `${paintAllPercent}%` }}
            />
          </span>
        </div>
      )}

      {/* ============ Abajo: barra rápida + catálogo ============ */}
      <div className={styles.bottom}>
        {mode === "objects" && hotbar.length > 0 && (
          <div className={`${styles.glass} ${styles.hotbar}`} aria-label={t("buildmode.hotbarLabel")}>
            {hotbar.map((entry, index) => tile(entry, index + 1))}
          </div>
        )}

        <div className={`${styles.glass} ${styles.dock}`}>
          {mode === "environment" ? (
            <div className={styles.environment}>
              {permissions.canChangeBackground && (
                <section>
                  <h3 className={styles.sectionTitle}>{t("buildmode.environmentBackgroundTitle")}</h3>
                  <BackgroundSelector
                    backgrounds={backgrounds}
                    selectedId={currentBackgroundId}
                    onSelect={(id) => {
                      if (!roomId) return;
                      socket?.emit("room:changeBackground", { roomId, backgroundId: id });
                    }}
                  />
                </section>
              )}
              {permissions.canModifyLighting && roomId && (
                <section>
                  <h3 className={styles.sectionTitle}>{t("buildmode.environmentLightingTitle")}</h3>
                  <LightingControls roomId={roomId} socket={socket} />
                </section>
              )}
            </div>
          ) : (
            <>
              {mode === "objects" && (
                <div className={styles.chips} role="group" aria-label={t("buildmode.categoriesLabel")}>
                  {[
                    { key: "all", label: t("buildmode.groupAll"), count: objects.length },
                    { key: "favorites", label: `★ ${t("buildmode.tabFavorites")}`, count: favorites.length },
                    { key: "recent", label: t("buildmode.tabRecent"), count: recents.length },
                    ...groups.map(([key, count]) => ({ key, label: groupLabel(key), count })),
                  ].map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      aria-pressed={group === chip.key}
                      className={`${styles.chip} ${group === chip.key ? styles.chipActive : ""}`}
                      onClick={() => setGroup(chip.key)}
                    >
                      {chip.label} <i>{chip.count}</i>
                    </button>
                  ))}
                  <span className={styles.chipsHint}>{t(isDesign ? "buildmode.designCatalogHint" : "buildmode.catalogHint")}</span>
                </div>
              )}
              {visible.length === 0 ? (
                <div className={styles.empty}>
                  <strong>{mode === "textures" ? t("buildmode.texturesEmpty") : group === "favorites" ? t("buildmode.favoritesEmptyTitle") : group === "recent" ? t("buildmode.recentEmptyTitle") : t("buildmode.objectsEmptyTitle")}</strong>
                  <span>{t("buildmode.tryAnotherNameHint")}</span>
                </div>
              ) : (
                <div className={styles.grid}>
                  {visible.filter((entry) => entry.amount > 0).map((entry) => tile(entry))}
                  {visible.some((entry) => entry.amount <= 0) && (
                    <div className={styles.shopDivider}>
                      <span>
                        <ShoppingBag size={11} /> {t("buildmode.shopDivider")}
                      </span>
                    </div>
                  )}
                  {visible.filter((entry) => entry.amount <= 0).map((entry) => tile(entry))}
                </div>
              )}
            </>
          )}

          {buyEntry && (
            <div className={`${styles.glass} ${styles.buyPopover}`} role="dialog" aria-label={entryTitle(buyEntry)}>
              <ItemPreview item={buyEntry.item} alt={entryTitle(buyEntry)} className={styles.statusImage} />
              <div className={styles.buyText}>
                <strong>{entryTitle(buyEntry)}</strong>
                {buyEntry.item.description && <span>{buyEntry.item.description}</span>}
                <span className={styles.buyHint}>{t("buildmode.notOwnedHint")}</span>
              </div>
              <div className={styles.buyActions}>
                {BUY_QUANTITIES.filter((quantity) => quantity === 1 || quantity <= buyEntry.maxStack).map((quantity) => (
                  <button key={quantity} type="button" disabled={buying} onClick={() => buy(buyEntry, quantity)}>
                    ×{quantity} · <Coins size={11} /> {(buyEntry.price ?? 0) * quantity}
                  </button>
                ))}
                <button type="button" className={styles.buyCancel} onClick={() => setBuyEntry(null)}>
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Antes vivía en EditWorldPanel (pestaña "Apariencia", al lado de
// Permisos) — reubicada acá tal cual (mismo contrato de sockets
// room:lighting:get/status/set) porque ajustar la luz es una herramienta de
// edición de la sala, no una configuración administrativa.
function LightingControls({ roomId, socket }: { roomId: string; socket: any }) {
  const t = useTranslation();
  const [status, setStatus] = useState<{
    ambientLightIntensity: number | null;
    canModify: boolean;
    canUse: boolean;
    lockedReason: string | null;
  } | null>(null);
  const [intensity, setIntensity] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleStatus = (data: any) => {
      if (data.roomId !== roomId) return;
      setStatus(data);
      setIntensity(data.ambientLightIntensity ?? 0);
    };

    socket.emit("room:lighting:get", { roomId });
    socket.on("room:lighting:status", handleStatus);
    return () => socket.off("room:lighting:status", handleStatus);
  }, [socket, roomId]);

  const locked = status ? !status.canUse : false;

  return (
    <div className={styles.lightingControls}>
      {locked && (
        <div className={styles.premiumBanner}>{t("editworld.lightingPremiumRequired")}</div>
      )}

      <label className={styles.lightingField}>
        <span>{t("editworld.lightingIntensityLabel", { value: intensity })}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={intensity}
          disabled={locked || !status}
          onChange={(event) => setIntensity(Number(event.target.value))}
        />
      </label>

      <button
        type="button"
        className={styles.lightingSaveButton}
        disabled={locked || !status}
        onClick={() => socket?.emit("room:lighting:set", { roomId, intensity })}
      >
        {t("common.saveChanges")}
      </button>
    </div>
  );
}
