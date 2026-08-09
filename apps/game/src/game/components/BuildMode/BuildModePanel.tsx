"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Armchair,
  DoorOpen,
  Gamepad2,
  Package,
  Paintbrush,
  Sofa,
  Sparkles,
  Table2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import ItemPreview from "../UI/ItemPreview";
import SharedItemGrid from "../shared/ItemGrid";
import ItemCard from "../shared/ItemCard";
import BackgroundSelector from "../RoomSystem/BackgroundSelector/BackgroundSelector";
import type { Background } from "../../types/room";
import styles from "./BuildModePanel.module.css";

type BuildTab = "objects" | "inventory" | "textures" | "background" | "shop" | "marketplace";

// Orden y etiqueta/ícono de cada categoría de mueble (kind del item WORLD),
// para no mezclar sillas, mesas, decoración, etc. en una sola lista larga.
const OBJECT_CATEGORIES: Array<{ kind: string; label: string; icon: LucideIcon }> = [
  { kind: "CHAIR", label: "Sillas", icon: Armchair },
  { kind: "TABLE", label: "Mesas", icon: Table2 },
  { kind: "FURNITURE", label: "Muebles", icon: Sofa },
  { kind: "DECORATION", label: "Decoración", icon: Sparkles },
  { kind: "DOOR", label: "Puertas", icon: DoorOpen },
  { kind: "NPC", label: "NPCs", icon: UserRound },
  { kind: "INTERACTIVE", label: "Interactivos", icon: Gamepad2 },
];
const OTHER_CATEGORY = { kind: "OTHER", label: "Otros", icon: Package };

interface Props {
  inventory: any[];
  paintAllProgress?: { done: number; total: number } | null;
  socket?: any;
  roomId?: string;
  currentBackgroundId?: string;
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

  const { objects, textures, objectGroups } = useMemo(() => {
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

    return {
      objects: objectItems,
      objectGroups: groups,
      textures: worldItems.filter((inv) => {
        const kind = inv.item?.worldData?.kind;
        return (kind === "FLOOR" || kind === "WALL") && matches(inv);
      }),
    };
  }, [inventory, search]);

  const tabs: Array<{ id: BuildTab; label: string; count?: number }> = [
    { id: "objects", label: "Objetos", count: objects.length },
    { id: "inventory", label: "Inventario", count: inventory.length },
    { id: "textures", label: "Texturas", count: textures.length },
    { id: "background", label: "Fondo" },
    { id: "shop", label: "Tienda" },
    { id: "marketplace", label: "Marketplace" },
  ];

  return (
    <aside className={styles.panel} aria-label="Modo construccion">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Editor de sala</span>
          <h2>Construccion</h2>
        </div>
        <button className={styles.exitButton} onClick={onExit}>
          Salir del modo construccion
        </button>
      </div>

      {activeTab !== "shop" && activeTab !== "marketplace" && activeTab !== "background" && (
        <div className={styles.searchBox}>
          <span>Buscar</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Muebles, texturas, categorias..."
            aria-label="Buscar elementos de construccion"
          />
        </div>
      )}

      <nav className={styles.tabs} aria-label="Categorias de construccion">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
            onClick={() => {
              if (tab.id === "shop") onOpenShop();
              if (tab.id === "marketplace") onOpenMarketplace();
              setActiveTab(tab.id);
            }}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && <b>{tab.count}</b>}
          </button>
        ))}
      </nav>

      {activeTab === "textures" && (
        <div className={styles.toolRow}>
          <label>
            Brocha
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
        {activeTab === "shop" ? (
          <div className={styles.empty}>
            <strong>Tienda abierta</strong>
            <span>Compra muebles o texturas y vuelven aqui al inventario.</span>
          </div>
        ) : activeTab === "marketplace" ? (
          <div className={styles.empty}>
            <strong>Marketplace abierto</strong>
            <span>Compra objetos de otros jugadores y vuelven aqui al inventario.</span>
          </div>
        ) : activeTab === "background" ? (
          <div className={styles.backgroundPanel}>
            <BackgroundSelector
              backgrounds={backgrounds}
              selectedId={currentBackgroundId}
              onSelect={(id) => {
                if (!roomId) return;
                socket?.emit("room:changeBackground", { roomId, backgroundId: id });
              }}
            />
          </div>
        ) : activeTab === "textures" ? (
          <BuildItemGrid
            items={textures}
            empty="No tienes texturas de suelo disponibles."
            actionLabel="Pintar"
            onAction={(item) => {
              setActivePlacementItem(null);
              setActivePaintItem(item);
              onPaintSurfaceTexture(item, textureWidth, textureHeight);
            }}
          />
        ) : objects.length === 0 ? (
          <div className={styles.empty}>
            <strong>No tienes muebles para colocar.</strong>
            <span>Prueba buscando otro nombre o visita la tienda.</span>
          </div>
        ) : (
          <div className={styles.categoryList}>
            {objectGroups.map((group) => (
              <section key={group.kind} className={styles.categorySection}>
                <h3 className={styles.categoryTitle}>
                  <group.icon size={14} /> {group.label}
                  <b>{group.items.length}</b>
                </h3>
                <BuildItemGrid
                  items={group.items}
                  empty=""
                  actionLabel="Colocar"
                  onAction={(item) => {
                    setActivePaintItem(null);
                    onCancelPainting();
                    setActivePlacementItem(item);
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
                <strong>Colocando</strong>
                <span>{activePlacementItem.name || activePlacementItem.id || "Objeto"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivePlacementItem(null);
                onCancelPlacement();
              }}
            >
              Cancelar seleccion
            </button>
          </div>
        )}

        {activePaintItem && (
          <div className={styles.paintState}>
            <div className={styles.activePreview}>
              <ItemPreview item={activePaintItem} alt={activePaintItem.name} />
              <div>
                <strong>Pintando suelo</strong>
                <span>
                  {activePaintItem.name || activePaintItem.id || "Textura"} · {textureWidth}x{textureHeight}
                </span>
                <span className={styles.escHint}>
                  Arrastra sobre el suelo para pintar · <kbd>ESC</kbd> para cancelar
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
                  <Paintbrush size={14} /> Pintar TODO el suelo
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActivePaintItem(null);
                  onCancelPainting();
                }}
              >
                Cancelar pintar
              </button>
            </div>
          </div>
        )}

        {isPaintingAll && (
          <div className={styles.progressState} role="status" aria-live="polite">
            <div className={styles.progressLabel}>
              <span className={styles.progressLabelText}>
                <Paintbrush size={14} /> Pintando todo el suelo...
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
          Limpiar casa
        </button>
        <p>Tip: selecciona una textura y arrastra sobre el suelo para pintar.</p>
      </div>
    </aside>
  );
}

function BuildItemGrid({
  items,
  empty,
  actionLabel,
  onAction,
}: {
  items: any[];
  empty: string;
  actionLabel: string;
  onAction: (item: any) => void;
}) {
  return (
    <SharedItemGrid
      isEmpty={items.length === 0}
      empty={
        <>
          <strong>{empty}</strong>
          <span>Prueba buscando otro nombre o visita la tienda.</span>
        </>
      }
    >
      {items.map((inv) => (
        <ItemCard
          key={inv.id}
          item={inv.item}
          title={inv.item?.name || inv.item?.worldData?.kind || "Item"}
          stackCount={inv.amount ?? inv.quantity ?? 1}
          onClick={() => onAction(inv.item)}
          actionHint={actionLabel}
        />
      ))}
    </SharedItemGrid>
  );
}
