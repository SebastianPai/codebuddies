"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Armchair,
  Backpack,
  Boxes,
  Clock,
  DoorOpen,
  Gamepad2,
  Image as ImageIcon,
  Package,
  Paintbrush,
  Redo2,
  ShoppingBag,
  Sofa,
  Sparkles,
  Star,
  Store,
  Table2,
  Undo2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { BUILD_COMMAND_STACK_CHANGED_EVENT } from "../../systems/BuildCommandStack";
import ItemPreview from "../UI/ItemPreview";
import SharedItemGrid from "../shared/ItemGrid";
import ItemCard from "../shared/ItemCard";
import BackgroundSelector from "../RoomSystem/BackgroundSelector/BackgroundSelector";
import type { Background } from "../../types/room";
import { EffectivePermissions, NO_PERMISSIONS } from "../../types/permissions";
import styles from "./BuildModePanel.module.css";
import { useTranslation } from "../../../i18n/useTranslation";
import tabsOverflow from "../shared/tabsOverflow.module.css";

// Antes "Tienda" y "Marketplace" eran dos pestañas más en esta misma grilla:
// clickearlas abría la ventana externa (Shop/MarketplaceWindow) Y ADEMÁS
// cambiaba activeTab acá dentro para mostrar una tarjeta "la tienda está
// abierta" — dos cosas abiertas a la vez por lo mismo, y dos casillas menos
// para las pestañas que sí tienen contenido real dentro del panel. Ahora
// son botones de acceso rápido en el header (ver .headerActions), no
// pestañas de contenido.
type BuildTab =
  | "objects"
  | "favorites"
  | "recent"
  | "inventory"
  | "textures"
  | "background";

// "Recientes" es puramente local (últimos objetos colocados en ESTE
// navegador) — a diferencia de favoritos, no tiene sentido sincronizarlo
// entre dispositivos ni persistirlo server-side.
const RECENTS_STORAGE_KEY = "codebuddies:build:recentItemIds";
const MAX_RECENTS = 24;

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

// Orden y etiqueta/ícono de cada categoría de mueble (kind del item WORLD).
// El label se resuelve con t() dentro del componente (labelKey), para no
// mezclar sillas, mesas, decoración, etc. en una sola lista larga.
const OBJECT_CATEGORIES: Array<{ kind: string; labelKey: string; icon: LucideIcon }> = [
  { kind: "CHAIR", labelKey: "buildmode.categoryChairs", icon: Armchair },
  { kind: "TABLE", labelKey: "buildmode.categoryTables", icon: Table2 },
  { kind: "FURNITURE", labelKey: "buildmode.categoryFurniture", icon: Sofa },
  { kind: "DECORATION", labelKey: "buildmode.categoryDecoration", icon: Sparkles },
  { kind: "DOOR", labelKey: "buildmode.categoryDoors", icon: DoorOpen },
  { kind: "NPC", labelKey: "buildmode.categoryNpcs", icon: UserRound },
  { kind: "INTERACTIVE", labelKey: "buildmode.categoryInteractive", icon: Gamepad2 },
];
const OTHER_CATEGORY = { kind: "OTHER", labelKey: "buildmode.categoryOther", icon: Package };

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
}: Props) {
  const t = useTranslation();
  const socket =
    socketProp ||
    (typeof window !== "undefined" ? (window as any).phaserSocket : null);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("getBackgrounds");
    socket.on("backgrounds:list", setBackgrounds);

    return () => {
      socket.off("backgrounds:list", setBackgrounds);
    };
  }, [socket]);

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
      ? Math.min(
          100,
          Math.round((paintAllProgress.done / paintAllProgress.total) * 100),
        )
      : null;
  const [activeTab, setActiveTab] = useState<BuildTab>("objects");
  const [search, setSearch] = useState("");
  const [textureSize, setTextureSize] = useState("1x1");
  const [activePaintItem, setActivePaintItem] = useState<any | null>(null);
  const [activePlacementItem, setActivePlacementItem] = useState<any | null>(null);

  const [textureWidth, textureHeight] = textureSize
    .split("x")
    .map((value) => Number(value) || 1);

  const { objects, textures, objectGroups, favoriteItems, recentItems } = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = (inv: any) =>
      !term ||
      inv.item?.name?.toLowerCase().includes(term) ||
      inv.item?.id?.toLowerCase().includes(term) ||
      inv.item?.worldData?.kind?.toLowerCase().includes(term);

    const worldItems = inventory.filter((inv) => inv.item?.type === "WORLD");

    const objectItems = worldItems.filter((inv) => {
      const kind = inv.item?.worldData?.kind;
      return kind !== "FLOOR" && kind !== "WALL" && matches(inv);
    });

    const groups = [...OBJECT_CATEGORIES, OTHER_CATEGORY]
      .map((category) => ({
        ...category,
        items:
          category.kind === "OTHER"
            ? objectItems.filter(
                (inv) => !OBJECT_CATEGORIES.some((c) => c.kind === inv.item?.worldData?.kind),
              )
            : objectItems.filter((inv) => inv.item?.worldData?.kind === category.kind),
      }))
      .filter((group) => group.items.length > 0);

    // "Recientes" respeta el orden de colocación (más nuevo primero), no el
    // orden del inventario — por eso se arma buscando cada id en orden en
    // vez de filtrar objectItems directamente.
    const recent = recentIds
      .map((itemId) => objectItems.find((inv) => inv.item?.id === itemId))
      .filter((inv): inv is (typeof objectItems)[number] => Boolean(inv));

    return {
      objects: objectItems,
      objectGroups: groups,
      favoriteItems: objectItems.filter((inv) => favoriteIds.includes(inv.item?.id)),
      recentItems: recent,
      textures: worldItems.filter((inv) => {
        const kind = inv.item?.worldData?.kind;
        return (kind === "FLOOR" || kind === "WALL") && matches(inv);
      }),
    };
  }, [inventory, search, favoriteIds, recentIds]);

  // El fondo y la iluminación son herramientas de EDICIÓN de la sala (se
  // usan mientras decorás, con vista previa inmediata en el mundo) — antes
  // vivían en "Editar Mundo" junto a Permisos, lo que las hacía sentir como
  // configuración administrativa y las escondía del lugar donde en realidad
  // se decora. Ahora esta pestaña ("Ambiente") es la única que las muestra,
  // igual que Objetos/Texturas, cada sección gateada por su propio permiso
  // granular (alguien puede tener canChangeBackground sin canModifyLighting).
  const showEnvironmentTab = permissions.canChangeBackground || permissions.canModifyLighting;

  const tabs: Array<{ id: BuildTab; label: string; icon: LucideIcon; count?: number }> = [
    { id: "objects", label: t("buildmode.tabObjects"), icon: Boxes, count: objects.length },
    { id: "favorites", label: t("buildmode.tabFavorites"), icon: Star, count: favoriteItems.length },
    { id: "recent", label: t("buildmode.tabRecent"), icon: Clock, count: recentItems.length },
    { id: "inventory", label: t("buildmode.tabInventory"), icon: Backpack, count: inventory.length },
    { id: "textures", label: t("buildmode.tabTextures"), icon: Paintbrush, count: textures.length },
    ...(showEnvironmentTab
      ? [{ id: "background" as const, label: t("buildmode.tabEnvironment"), icon: ImageIcon }]
      : []),
  ];

  return (
    <aside className={styles.panel} aria-label={t("buildmode.ariaBuildMode")}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t("buildmode.eyebrowRoomEditor")}</span>
          <h2>{t("buildmode.title")}</h2>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            onClick={onOpenShop}
            title={t("buildmode.tabShop")}
            aria-label={t("buildmode.tabShop")}
          >
            <ShoppingBag size={16} />
          </button>
          <button
            className={styles.iconButton}
            onClick={onOpenMarketplace}
            title={t("buildmode.tabMarketplace")}
            aria-label={t("buildmode.tabMarketplace")}
          >
            <Store size={16} />
          </button>
          <button className={styles.exitButton} onClick={onExit}>
            {t("buildmode.exitButton")}
          </button>
        </div>
      </div>

      <div className={styles.toolbar} role="toolbar" aria-label={t("buildmode.editorToolbarLabel")}>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!canUndo}
          onClick={() => window.dispatchEvent(new CustomEvent("build:command:undo"))}
          title={t("buildmode.undoAction")}
          aria-label={t("buildmode.undoAction")}
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!canRedo}
          onClick={() => window.dispatchEvent(new CustomEvent("build:command:redo"))}
          title={t("buildmode.redoAction")}
          aria-label={t("buildmode.redoAction")}
        >
          <Redo2 size={16} />
        </button>
        <span className={styles.toolbarHint}>{t("buildmode.undoRedoHint")}</span>
      </div>

      {(activeTab === "objects" || activeTab === "inventory" || activeTab === "textures") && (
        <div className={styles.searchBox}>
          <span>{t("common.search")}</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("buildmode.searchPlaceholder")}
            aria-label={t("buildmode.searchAriaLabel")}
          />
        </div>
      )}

      <nav className={`${styles.tabs} ${tabsOverflow.scrollRow}`} aria-label="Categorias de construccion">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={15} className={styles.tabIcon} />
            <span>{tab.label}</span>
            {typeof tab.count === "number" && <b>{tab.count}</b>}
          </button>
        ))}
      </nav>

      {activeTab === "textures" && (
        <div className={styles.toolRow}>
          <label>
            {t("buildmode.brushLabel")}
            <select
              value={textureSize}
              onChange={(event) => setTextureSize(event.target.value)}
            >
              <option value="1x1">1 x 1</option>
              <option value="2x2">2 x 2</option>
              <option value="3x3">3 x 3</option>
              <option value="2x3">2 x 3</option>
              <option value="3x2">3 x 2</option>
            </select>
          </label>
        </div>
      )}

      <div className={styles.content}>
        {activeTab === "background" ? (
          <div className={styles.backgroundPanel}>
            {permissions.canChangeBackground && (
              <section className={styles.environmentSection}>
                <h3 className={styles.categoryTitle}>{t("buildmode.environmentBackgroundTitle")}</h3>
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
              <section className={styles.environmentSection}>
                <h3 className={styles.categoryTitle}>{t("buildmode.environmentLightingTitle")}</h3>
                <LightingControls roomId={roomId} socket={socket} />
              </section>
            )}
          </div>
        ) : activeTab === "textures" ? (
          <BuildItemGrid
            items={textures}
            empty={t("buildmode.texturesEmpty")}
            actionLabel={t("buildmode.paintAction")}
            onAction={(item) => {
              setActivePlacementItem(null);
              setActivePaintItem(item);
              onPaintSurfaceTexture(item, textureWidth, textureHeight);
            }}
          />
        ) : activeTab === "favorites" ? (
          <BuildItemGrid
            items={favoriteItems}
            empty={t("buildmode.favoritesEmptyTitle")}
            actionLabel={t("buildmode.placeAction")}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
            onAction={(item) => {
              setActivePaintItem(null);
              onCancelPainting();
              setActivePlacementItem(item);
              registerRecent(item?.id);
              onPlaceWorldItem(item);
            }}
          />
        ) : activeTab === "recent" ? (
          <BuildItemGrid
            items={recentItems}
            empty={t("buildmode.recentEmptyTitle")}
            actionLabel={t("buildmode.placeAction")}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
            onAction={(item) => {
              setActivePaintItem(null);
              onCancelPainting();
              setActivePlacementItem(item);
              registerRecent(item?.id);
              onPlaceWorldItem(item);
            }}
          />
        ) : objects.length === 0 ? (
          <div className={styles.empty}>
            <strong>{t("buildmode.objectsEmptyTitle")}</strong>
            <span>{t("buildmode.tryAnotherNameHint")}</span>
          </div>
        ) : (
          <div className={styles.categoryList}>
            {objectGroups.map((group) => (
              <section key={group.kind} className={styles.categorySection}>
                <h3 className={styles.categoryTitle}>
                  <group.icon size={14} /> {t(group.labelKey)}
                  <b>{group.items.length}</b>
                </h3>
                <BuildItemGrid
                  items={group.items}
                  empty=""
                  actionLabel={t("buildmode.placeAction")}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={toggleFavorite}
                  onAction={(item) => {
                    setActivePaintItem(null);
                    onCancelPainting();
                    setActivePlacementItem(item);
                    registerRecent(item?.id);
                    onPlaceWorldItem(item);
                  }}
                />
              </section>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {activePlacementItem && (
          <div className={styles.paintState}>
            <div className={styles.activePreview}>
              <ItemPreview item={activePlacementItem} alt={activePlacementItem.name} />
              <div>
                <strong>{t("buildmode.placingLabel")}</strong>
                <span>{activePlacementItem.name || activePlacementItem.id || t("buildmode.itemFallbackName")}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivePlacementItem(null);
                onCancelPlacement();
              }}
            >
              {t("buildmode.cancelSelectionButton")}
            </button>
          </div>
        )}

        {activePaintItem && (
          <div className={styles.paintState}>
            <div className={styles.activePreview}>
              <ItemPreview item={activePaintItem} alt={activePaintItem.name} />
              <div>
                <strong>{t("buildmode.paintingFloorLabel")}</strong>
                <span>
                  {activePaintItem.name || activePaintItem.id || t("buildmode.textureFallbackName")} · {textureWidth}x{textureHeight}
                </span>
                <span className={styles.escHint}>
                  {t("buildmode.dragToPaintHintPrefix")} <kbd>ESC</kbd> {t("buildmode.dragToPaintHintSuffix")}
                </span>
              </div>
            </div>
            <div className={styles.paintActions}>
              {activePaintItem.worldData?.kind !== "WALL" && (
                <button
                  type="button"
                  className={styles.paintAllButton}
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
                onClick={() => {
                  setActivePaintItem(null);
                  onCancelPainting();
                }}
              >
                {t("buildmode.cancelPaintButton")}
              </button>
            </div>
          </div>
        )}

        {isPaintingAll && (
          <div className={styles.progressState} role="status" aria-live="polite">
            <div className={styles.progressLabel}>
              <span className={styles.progressLabelText}>
                <Paintbrush size={14} /> {t("buildmode.paintingAllProgressLabel")}
              </span>
              <b>{paintAllPercent === null ? "..." : `${paintAllPercent}%`}</b>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressFill} ${paintAllPercent === null ? styles.progressIndeterminate : ""}`}
                style={
                  paintAllPercent === null
                    ? undefined
                    : { width: `${paintAllPercent}%` }
                }
              />
            </div>
          </div>
        )}
        <button className={styles.dangerButton} onClick={onClearRoom}>
          {t("buildmode.clearRoomButton")}
        </button>
        <p>{t("buildmode.tipText")}</p>
      </div>
    </aside>
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

function BuildItemGrid({
  items,
  empty,
  actionLabel,
  onAction,
  favoriteIds,
  onToggleFavorite,
}: {
  items: any[];
  empty: string;
  actionLabel: string;
  onAction: (item: any) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (itemId?: string) => void;
}) {
  const t = useTranslation();
  return (
    <SharedItemGrid
      isEmpty={items.length === 0}
      empty={
        <>
          <strong>{empty}</strong>
          <span>{t("buildmode.tryAnotherNameHint")}</span>
        </>
      }
    >
      {items.map((inv) => (
        <ItemCard
          key={inv.id}
          item={inv.item}
          rarity={inv.item?.rarity}
          title={inv.item?.name || inv.item?.worldData?.kind || t("buildmode.itemFallbackName")}
          stackCount={inv.amount ?? inv.quantity ?? 1}
          onClick={() => onAction(inv.item)}
          actionHint={actionLabel}
          isFavorite={favoriteIds?.includes(inv.item?.id)}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(inv.item?.id) : undefined}
        />
      ))}
    </SharedItemGrid>
  );
}
