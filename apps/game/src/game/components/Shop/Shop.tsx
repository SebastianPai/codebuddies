"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Globe, Shirt } from "lucide-react";

import styles from "./Shop.module.css";
import { requestGameConfirm, showGameAlert } from "../../utils/dialog";
import { audioManager } from "../../audio/AudioManager";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import ItemGrid from "../shared/ItemGrid";
import ItemCard from "../shared/ItemCard";
import CurrencyBadge from "../shared/CurrencyBadge";

interface Props {
  socket: Socket | null;
  inventory?: any[];
  onClose?: () => void;
}

type SortType = "new" | "old" | "cheap" | "expensive" | "popular";
type TabType = "avatar" | "world" | "textures" | "backgrounds";

const ITEMS_PER_PAGE = 12;

// item.rarity llega como un tier numérico (0,1,2,3...) desde la base de
// datos, no como texto — mostrarlo tal cual (con "?? COMMON", que nunca
// dispara porque 0 no es null/undefined) hacía que se viera un número suelto
// al lado del precio, dando la falsa impresión de dos precios ("10 10").
const RARITY_LABELS = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
function getRarityLabel(rarity: unknown): string {
  if (typeof rarity === "string" && rarity.trim()) return rarity;
  const tier = typeof rarity === "number" ? rarity : 0;
  return RARITY_LABELS[Math.max(0, Math.min(tier, RARITY_LABELS.length - 1))];
}

export default function Shop({ socket, inventory = [], onClose }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("new");
  const [activeTab, setActiveTab] = useState<TabType>("avatar");
  const [currentPage, setCurrentPage] = useState(1);
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const buyingSafetyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    inventory.forEach((inv) => {
      map.set(inv.itemId, inv.amount || 0);
    });
    return map;
  }, [inventory]);

  useEffect(() => {
    if (!socket) return;

    const requestItems = () => socket.emit("shop:items:request", { sort });
    requestItems();

    const handleItems = (data: any[]) => {
      setItems(data);
      setCurrentPage(1);
    };
    const handleBought = () => {
      if (buyingSafetyTimeout.current) {
        clearTimeout(buyingSafetyTimeout.current);
        buyingSafetyTimeout.current = null;
      }
      requestItems();
      setBuyingItemId(null);
      audioManager.play("coin");
    };

    socket.on("shop:items", handleItems);
    socket.on("shop:item:bought", handleBought);

    return () => {
      socket.off("shop:items", handleItems);
      socket.off("shop:item:bought", handleBought);
    };
  }, [socket, sort]);

  useEffect(() => {
    return () => {
      if (buyingSafetyTimeout.current) clearTimeout(buyingSafetyTimeout.current);
    };
  }, []);

  const buyItem = async (itemId: string) => {
    if (buyingItemId) return;
    const item = items.find((current) => current.id === itemId);
    const ownsItem = inventoryMap.has(itemId) || item?.owned || item?.canUse;

    if (item?.type === "BACKGROUND" && ownsItem) {
      await showGameAlert({
        title: "Ya lo tienes",
        message: "Este fondo ya esta en tu cuenta. Lo puedes usar al crear o editar una sala.",
        confirmLabel: "Entendido",
        tone: "success",
      });
      return;
    }

    const confirmed = await requestGameConfirm({
      title: ownsItem ? "Comprar otro" : "Confirmar compra",
      message: ownsItem
        ? "Ya tienes este objeto. Deseas comprar otra unidad?"
        : `Quieres comprar ${item?.name || "este objeto"}?`,
      confirmLabel: ownsItem ? "Comprar otro" : "Comprar",
      cancelLabel: "Cancelar",
    });

    if (!confirmed) return;

    setBuyingItemId(itemId);
    socket?.emit(
      item?.type === "BACKGROUND" ? "shop:background:buy" : "shop:item:buy",
      item?.type === "BACKGROUND" ? { backgroundId: itemId } : { itemId },
    );
    // Red de seguridad por si el servidor nunca responde "shop:item:bought"
    // (p. ej. error silencioso); en el camino normal, handleBought cancela
    // este timeout antes de que dispare para evitar reactivar el botón
    // mientras la compra original sigue en vuelo (doble compra).
    if (buyingSafetyTimeout.current) clearTimeout(buyingSafetyTimeout.current);
    buyingSafetyTimeout.current = setTimeout(() => {
      setBuyingItemId(null);
      buyingSafetyTimeout.current = null;
    }, 8000);
  };

  const getLabel = (item: any) => {
    if (item.slot || item.avatarData?.slot) {
      const map: any = {
        BODY: "Body",
        HEAD: "Head",
        HAIR: "Hair",
        EYES: "Eyes",
        SHIRT: "Shirt",
        LEGS: "Legs",
        SHOES: "Shoes",
        LEFT_ARM: "Left Arm",
        RIGHT_ARM: "Right Arm",
        ACCESSORY_HEAD: "Hat",
        ACCESSORY_FACE: "Face Acc",
        ACCESSORY_BACK: "Backpack",
      };

      return map[item.slot || item.avatarData?.slot] ?? item.slot;
    }

    if (item.kind || item.worldData?.kind) {
      const map: any = {
        FLOOR: "Floor",
        WALL: "Wall",
        FURNITURE: "Furniture",
        CHAIR: "Chair",
        TABLE: "Table",
        DOOR: "Door",
        DECORATION: "Decoration",
        NPC: "NPC",
        INTERACTIVE: "Interactive",
      };

      return map[item.kind || item.worldData?.kind] ?? item.kind;
    }

    return item.name || "Item";
  };

  const { currentItems, totalPages } = useMemo(() => {
    const filtered = items.filter((item) => {
      const term = search.toLowerCase();

      const isAvatar =
        item.type === "AVATAR" || !!item.slot || !!item.avatarData;

      const isWorld = item.type === "WORLD" || !!item.kind || !!item.worldData;
      const kind = item.kind || item.worldData?.kind;
      const isTexture = isWorld && (kind === "FLOOR" || kind === "WALL");

      if (activeTab === "avatar" && !isAvatar) return false;
      if (activeTab === "world" && (!isWorld || isTexture)) return false;
      if (activeTab === "textures" && !isTexture) return false;
      if (activeTab === "backgrounds" && item.type !== "BACKGROUND") return false;

      return (
        item.id?.toLowerCase().includes(term) ||
        item.name?.toLowerCase().includes(term) ||
        (item.slot || item.avatarData?.slot)?.toLowerCase().includes(term) ||
        (item.kind || item.worldData?.kind)?.toLowerCase().includes(term)
      );
    });

    const totalPagesCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);

    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return {
      currentItems: filtered.slice(start, start + ITEMS_PER_PAGE),
      totalPages: Math.max(1, totalPagesCount),
    };
  }, [items, search, activeTab, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search]);

  return (
    <Modal
      variant="floating"
      title="Item Shop"
      onClose={onClose ?? (() => {})}
      style={{ width: "min(960px, calc(100vw - 24px))", height: "min(760px, calc(100dvh - 24px))" }}
    >
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "avatar" ? styles.active : ""}`}
          onClick={() => setActiveTab("avatar")}
        >
          <Shirt size={14} /> Avatar (Ropa)
        </button>

        <button
          className={`${styles.tab} ${activeTab === "world" ? styles.active : ""}`}
          onClick={() => setActiveTab("world")}
        >
          <Globe size={14} /> World Objects
        </button>
        <button
          className={`${styles.tab} ${activeTab === "textures" ? styles.active : ""}`}
          onClick={() => setActiveTab("textures")}
        >
          Texturas
        </button>
        <button
          className={`${styles.tab} ${activeTab === "backgrounds" ? styles.active : ""}`}
          onClick={() => setActiveTab("backgrounds")}
        >
          Fondos
        </button>
      </div>

      <div className={styles.shopBanner}>
        <h2>
          {activeTab === "avatar"
            ? "AVATAR CUSTOMIZATION"
            : activeTab === "textures"
              ? "ROOM TEXTURES"
              : activeTab === "backgrounds"
                ? "ROOM BACKGROUNDS"
                : "WORLD BUILDER"}
        </h2>

        <p>{items.length} items disponibles</p>
      </div>

      <div className={styles.filters}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
        >
          <option value="new">Newest</option>
          <option value="old">Oldest</option>
          <option value="cheap">Cheapest</option>
          <option value="expensive">Expensive</option>
          <option value="popular">Popular</option>
        </select>
      </div>

      <ItemGrid isEmpty={currentItems.length === 0} empty="No se encontraron items">
        {currentItems.map((item) => {
          const owned = inventoryMap.has(item.id) || item.owned;
          const isBuying = buyingItemId === item.id;
          const alreadyHasBackground = item.type === "BACKGROUND" && item.canUse;

          return (
            <ItemCard
              key={item.id}
              item={item}
              title={owned && item.type === "BACKGROUND" ? `${getLabel(item)} ✓` : getLabel(item)}
              stackCount={item.type !== "BACKGROUND" ? inventoryMap.get(item.id) : undefined}
              footer={
                <div className={styles.cardFooter}>
                  <div className={styles.priceRow}>
                    {item.accessType === "PREMIUM" ? (
                      <CurrencyBadge currency="premium" size="sm" />
                    ) : item.accessType === "FREE" ? (
                      <CurrencyBadge currency="free" size="sm" />
                    ) : (
                      <CurrencyBadge currency="coins" amount={item.coinsPrice} size="sm" />
                    )}
                    <span className={styles.rarity}>{getRarityLabel(item.rarity)}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => void buyItem(item.id)}
                    disabled={isBuying || alreadyHasBackground}
                  >
                    {alreadyHasBackground
                      ? "Ya lo tienes"
                      : isBuying
                        ? "Comprando..."
                        : owned
                          ? "Comprar otro"
                          : "Comprar"}
                  </Button>
                </div>
              }
            />
          );
        })}
      </ItemGrid>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            ← Anterior
          </Button>

          <span>
            Página {currentPage} de {totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Siguiente →
          </Button>
        </div>
      )}
    </Modal>
  );
}
