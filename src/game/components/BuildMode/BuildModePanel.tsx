"use client";

import { useMemo, useState } from "react";
import ItemPreview from "../UI/ItemPreview";
import SharedItemGrid from "../shared/ItemGrid";
import ItemCard from "../shared/ItemCard";
import styles from "./BuildModePanel.module.css";

type BuildTab = "objects" | "inventory" | "textures" | "shop";

interface Props {
  inventory: any[];
  paintAllProgress?: { done: number; total: number } | null;
  onExit: () => void;
  onOpenShop: () => void;
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
  onExit,
  onOpenShop,
  onClearRoom,
  onPlaceWorldItem,
  onPaintSurfaceTexture,
  onPaintAllFloor,
  onCancelPainting,
  onCancelPlacement,
}: Props) {
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

  const { objects, textures } = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = (inv: any) =>
      !term ||
      inv.item?.name?.toLowerCase().includes(term) ||
      inv.item?.id?.toLowerCase().includes(term) ||
      inv.item?.worldData?.kind?.toLowerCase().includes(term);

    const worldItems = inventory.filter((inv) => inv.item?.type === "WORLD");

    return {
      objects: worldItems.filter((inv) => {
        const kind = inv.item?.worldData?.kind;
        return kind !== "FLOOR" && kind !== "WALL" && matches(inv);
      }),
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
    { id: "shop", label: "Tienda" },
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

      <div className={styles.searchBox}>
        <span>Buscar</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Muebles, texturas, categorias..."
          aria-label="Buscar elementos de construccion"
        />
      </div>

      <nav className={styles.tabs} aria-label="Categorias de construccion">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
            onClick={() => {
              if (tab.id === "shop") onOpenShop();
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
        ) : (
          <BuildItemGrid
            items={objects}
            empty="No tienes muebles para colocar."
            actionLabel="Colocar"
            onAction={(item) => {
              setActivePaintItem(null);
              onCancelPainting();
              setActivePlacementItem(item);
              onPlaceWorldItem(item);
            }}
          />
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
                  🎨 Pintar TODO el suelo
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
              <span>🎨 Pintando todo el suelo...</span>
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
          footer={<span className={styles.cardActionLabel}>{actionLabel}</span>}
        />
      ))}
    </SharedItemGrid>
  );
}
