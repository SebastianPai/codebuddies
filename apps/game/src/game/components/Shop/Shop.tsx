"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { ConciergeBell, Globe, Minus, PawPrint, Plus, Shirt, Sparkles } from "lucide-react";

import styles from "./Shop.module.css";
import { requestGameConfirm, showGameAlert } from "../../utils/dialog";
import { audioManager } from "../../audio/AudioManager";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import ItemGrid from "../shared/ItemGrid";
import ItemCard from "../shared/ItemCard";
import PetSpriteCell from "../shared/PetSpriteCell";
import CurrencyBadge from "../shared/CurrencyBadge";
import RarityText from "../shared/RarityText";
import { useTranslation } from "../../../i18n/useTranslation";
import tabsOverflow from "../shared/tabsOverflow.module.css";
import {
  AVATAR_GROUPS,
  FURNITURE_TYPES,
  ITEM_ROOMS,
  getAvatarGroup,
  getFurnitureType,
  getItemRooms,
} from "../../utils/itemTaxonomy";

interface Props {
  socket: Socket | null;
  inventory?: any[];
  onClose?: () => void;
}

type SortType = "new" | "old" | "cheap" | "expensive" | "popular";
type TabType =
  | "avatar"
  | "world"
  | "textures"
  | "backgrounds"
  | "effects"
  | "pets"
  | "butler";

const ITEMS_PER_PAGE = 30;

// item.rarity es un tier numérico, pero la key canónica (common/uncommon/
// rare/epic/legendary) ya viene calculada desde el backend como
// item.rarityKey (ver ShopHandler + apps/api/src/common/economy) -- acá
// solo se traduce esa key, nunca se vuelve a declarar la tabla de rareza.
const RARITY_TRANSLATION_KEYS: Record<string, string> = {
  common: "commerce.rarityCommon",
  uncommon: "commerce.rarityUncommon",
  rare: "commerce.rarityRare",
  epic: "commerce.rarityEpic",
  legendary: "commerce.rarityLegendary",
};
function getRarityLabel(rarityKey: unknown, t: (key: string) => string): string {
  const key = typeof rarityKey === "string" ? rarityKey : "common";
  return t(RARITY_TRANSLATION_KEYS[key] ?? RARITY_TRANSLATION_KEYS.common);
}

export default function Shop({ socket, inventory = [], onClose }: Props) {
  const t = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("new");
  const [activeTab, setActiveTab] = useState<TabType>("avatar");
  // Subfiltro de la pestaña actual: grupo de ropa (avatar) o ambiente
  // (objetos del mundo). "all" = sin filtrar.
  const [subFilter, setSubFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const buyingSafetyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cantidad elegida por item (solo aplica a items con Item.maxStack > 1,
  // ver getMaxBuyable) -- clave = item.id, valor por defecto 1 si no hay
  // entrada todavía.
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // "Última versión" de buyingItemId/items para los handlers del socket:
  // ese useEffect no puede depender de ninguno de los dos (buyingItemId
  // cambia en cada click de compra, items en cada respuesta del shop) sin
  // volver a suscribirse y re-emitir shop:items:request en bucle.
  const buyingItemIdRef = useRef<string | null>(null);
  const itemsRef = useRef<any[]>([]);
  useEffect(() => {
    buyingItemIdRef.current = buyingItemId;
  }, [buyingItemId]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [giftTargetId, setGiftTargetId] = useState<string | null>(null);
  const [giftUsername, setGiftUsername] = useState("");
  // Adopción de mascota: pide el nombre en el propio card antes de comprar.
  const [petAdoptKey, setPetAdoptKey] = useState<string | null>(null);
  const [petName, setPetName] = useState("");
  const [sendingGift, setSendingGift] = useState(false);
  const [giftError, setGiftError] = useState("");

  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    inventory.forEach((inv) => {
      map.set(inv.itemId, inv.amount || 0);
    });
    return map;
  }, [inventory]);

  // Cuántas unidades más puede comprar de este item en UNA operación, según
  // Item.maxStack (el mismo límite que ya usa el backend para el tope de
  // inventario, ver ItemsService.buyItem) y lo que ya tiene en su cuenta.
  // maxStack ausente/1 -- o ya sin espacio -- devuelve 1/0 y el selector de
  // cantidad no se muestra (compra individual de siempre).
  const getMaxBuyable = (item: any) => {
    const maxStack = Number(item?.maxStack) || 1;
    const owned = inventoryMap.get(item?.id) || 0;
    return Math.max(0, maxStack - owned);
  };

  const isBulkPurchasable = (item: any) =>
    item?.type !== "BACKGROUND" && item?.type !== "PET" && item?.type !== "BUTLER" && Number(item?.maxStack) > 1;

  const getQuantity = (item: any) => {
    const max = getMaxBuyable(item);
    const stored = quantities[item.id] ?? 1;
    return Math.min(Math.max(1, stored), Math.max(1, max));
  };

  const setQuantity = (item: any, next: number) => {
    const max = Math.max(1, getMaxBuyable(item));
    setQuantities((prev) => ({ ...prev, [item.id]: Math.min(Math.max(1, next), max) }));
  };

  useEffect(() => {
    if (!socket) return;

    const requestItems = () => socket.emit("shop:items:request", { sort });
    requestItems();

    const handleItems = (data: any[]) => {
      setItems(data);
      setCurrentPage(1);
    };
    const handleBought = (data?: { itemId?: string; quantity?: number; totalPrice?: number }) => {
      if (buyingSafetyTimeout.current) {
        clearTimeout(buyingSafetyTimeout.current);
        buyingSafetyTimeout.current = null;
      }
      // El mayordomo recién contratado ya puede aparecer si la escena lo
      // resincroniza (mismo patrón que "pet:changed").
      if (typeof data?.itemId === "string" && data.itemId.startsWith("butler:")) {
        window.dispatchEvent(new CustomEvent("butler:changed"));
      }
      const quantity = data?.quantity ?? 1;
      if (typeof data?.itemId === "string" && quantity > 1) {
        setQuantities((prev) => {
          const next = { ...prev };
          delete next[data.itemId!];
          return next;
        });
        const boughtItem = itemsRef.current.find((current) => current.id === data.itemId);
        void showGameAlert({
          title: t("commerce.shopPurchaseSuccessTitle"),
          message: t("commerce.shopPurchaseSuccessMessage", {
            quantity,
            name: boughtItem?.name || t("commerce.shopDefaultItemName"),
            total: data?.totalPrice ?? 0,
          }),
          confirmLabel: t("common.understood"),
          tone: "success",
        });
      }
      requestItems();
      setBuyingItemId(null);
      setPetAdoptKey(null);
      setPetName("");
      audioManager.play("coin");
      window.dispatchEvent(new CustomEvent("fx:sparkle"));
    };

    const handleGifted = () => {
      requestItems();
      setSendingGift(false);
      setGiftTargetId(null);
      setGiftUsername("");
      audioManager.play("coin");
      window.dispatchEvent(new CustomEvent("fx:sparkle"));
    };
    const handleShopError = (data: { message?: string }) => {
      // Comparte el evento "shop:item:error" entre compra, regalo, mascota
      // y mayordomo -- se distingue por cuál flujo estaba en curso.
      if (giftTargetId) {
        setSendingGift(false);
        setGiftError(data?.message || t("commerce.giftGenericError"));
        return;
      }
      if (buyingItemIdRef.current) {
        if (buyingSafetyTimeout.current) {
          clearTimeout(buyingSafetyTimeout.current);
          buyingSafetyTimeout.current = null;
        }
        setBuyingItemId(null);
        void showGameAlert({
          title: t("commerce.shopErrorTitle"),
          message: data?.message || t("commerce.shopGenericError"),
          confirmLabel: t("common.understood"),
          tone: "danger",
        });
      }
    };

    socket.on("shop:items", handleItems);
    socket.on("shop:item:bought", handleBought);
    socket.on("shop:item:gifted", handleGifted);
    socket.on("shop:item:error", handleShopError);

    return () => {
      socket.off("shop:items", handleItems);
      socket.off("shop:item:bought", handleBought);
      socket.off("shop:item:gifted", handleGifted);
      socket.off("shop:item:error", handleShopError);
    };
  }, [socket, sort, giftTargetId, t]);

  useEffect(() => {
    return () => {
      if (buyingSafetyTimeout.current) clearTimeout(buyingSafetyTimeout.current);
    };
  }, []);

  const buyItem = async (itemId: string) => {
    if (buyingItemId) return;
    const item = items.find((current) => current.id === itemId);
    const ownsItem = inventoryMap.has(itemId) || item?.owned || item?.canUse;
    const bulk = isBulkPurchasable(item);
    const quantity = bulk ? getQuantity(item) : 1;

    if (item?.type === "BACKGROUND" && ownsItem) {
      await showGameAlert({
        title: t("commerce.shopBackgroundAlreadyOwnedTitle"),
        message: t("commerce.shopBackgroundAlreadyOwnedMessage"),
        confirmLabel: t("common.understood"),
        tone: "success",
      });
      return;
    }

    const itemName = item?.name || t("commerce.shopDefaultItemName");
    const confirmed = await requestGameConfirm({
      title: quantity > 1
        ? t("commerce.shopConfirmPurchaseTitle")
        : ownsItem
          ? t("commerce.shopConfirmBuyAnotherTitle")
          : t("commerce.shopConfirmPurchaseTitle"),
      message: quantity > 1
        ? t("commerce.shopConfirmBuyQuantityMessage", {
            quantity,
            name: itemName,
            total: (item?.coinsPrice || 0) * quantity,
          })
        : ownsItem
          ? t("commerce.shopConfirmBuyAnotherMessage")
          : t("commerce.shopConfirmBuyMessage", { name: itemName }),
      confirmLabel: quantity > 1
        ? t("commerce.shopConfirmBuyQuantityButton")
        : ownsItem
          ? t("commerce.shopConfirmBuyAnotherTitle")
          : t("commerce.shopBuy"),
      cancelLabel: t("common.cancel"),
    });

    if (!confirmed) return;

    setBuyingItemId(itemId);
    if (item?.type === "BUTLER") {
      socket?.emit("shop:butler:buy", { npcKey: item.speciesKey });
    } else if (item?.type === "PET") {
      socket?.emit("shop:pet:buy", { speciesKey: item.speciesKey });
    } else if (item?.type === "BACKGROUND") {
      socket?.emit("shop:background:buy", { backgroundId: itemId });
    } else {
      socket?.emit("shop:item:buy", bulk ? { itemId, quantity } : { itemId });
    }
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

  const adoptPet = (item: any) => {
    if (buyingItemId) return;
    setBuyingItemId(item.id);
    if (item?.type === "BUTLER") {
      socket?.emit("shop:butler:buy", {
        npcKey: item.speciesKey,
        name: petName.trim(),
      });
    } else {
      socket?.emit("shop:pet:buy", {
        speciesKey: item.speciesKey,
        name: petName.trim(),
      });
    }
    if (buyingSafetyTimeout.current) clearTimeout(buyingSafetyTimeout.current);
    buyingSafetyTimeout.current = setTimeout(() => {
      setBuyingItemId(null);
      buyingSafetyTimeout.current = null;
    }, 8000);
  };

  const openGiftForm = (itemId: string) => {
    setGiftError("");
    setGiftUsername("");
    setGiftTargetId(itemId);
  };

  const cancelGift = () => {
    setGiftTargetId(null);
    setGiftUsername("");
    setGiftError("");
  };

  const sendGift = async (itemId: string) => {
    const trimmed = giftUsername.trim();
    if (!trimmed) {
      setGiftError(t("commerce.giftUsernameRequired"));
      return;
    }
    const item = items.find((current) => current.id === itemId);

    const confirmed = await requestGameConfirm({
      title: t("commerce.giftConfirmTitle"),
      message: t("commerce.giftConfirmMessage", {
        name: item?.name || t("commerce.shopDefaultItemName"),
        username: trimmed,
      }),
      confirmLabel: t("commerce.giftConfirmButton"),
      cancelLabel: t("common.cancel"),
    });
    if (!confirmed) return;

    setGiftError("");
    setSendingGift(true);
    socket?.emit("shop:item:gift", { itemId, recipientUsername: trimmed });
  };

  const getLabel = (item: any) => {
    if (item.slot || item.avatarData?.slot) {
      const map: any = {
        BODY: t("commerce.slotBody"),
        HEAD: t("commerce.slotHead"),
        HAIR: t("commerce.slotHair"),
        EYES: t("commerce.slotEyes"),
        SHIRT: t("commerce.slotShirt"),
        LEGS: t("commerce.slotLegs"),
        SHOES: t("commerce.slotShoes"),
        LEFT_ARM: t("commerce.slotLeftArm"),
        RIGHT_ARM: t("commerce.slotRightArm"),
        ACCESSORY_HEAD: t("commerce.slotHat"),
        ACCESSORY_FACE: t("commerce.slotFaceAcc"),
        ACCESSORY_BACK: t("commerce.slotBackpack"),
      };

      return map[item.slot || item.avatarData?.slot] ?? item.slot;
    }

    if (item.kind || item.worldData?.kind) {
      const map: any = {
        FLOOR: t("commerce.kindFloor"),
        WALL: t("commerce.kindWall"),
        FURNITURE: t("commerce.kindFurniture"),
        CHAIR: t("commerce.kindChair"),
        TABLE: t("commerce.kindTable"),
        DOOR: t("commerce.kindDoor"),
        DECORATION: t("commerce.kindDecoration"),
        NPC: t("commerce.kindNpc"),
        INTERACTIVE: t("commerce.kindInteractive"),
      };

      return map[item.kind || item.worldData?.kind] ?? item.kind;
    }

    return item.name || t("commerce.itemFallbackName");
  };

  const { currentItems, totalPages, filteredCount, subFilterCounts, typeCounts } = useMemo(() => {
    const term = search.toLowerCase();

    const inTab = items.filter((item) => {
      const isAvatar =
        item.type === "AVATAR" || !!item.slot || !!item.avatarData;

      const isWorld = item.type === "WORLD" || !!item.kind || !!item.worldData;
      const kind = item.kind || item.worldData?.kind;
      const isTexture = isWorld && (kind === "FLOOR" || kind === "WALL");
      const isEffect = item.type === "EFFECT";

      if (activeTab === "avatar" && !isAvatar) return false;
      if (activeTab === "world" && (!isWorld || isTexture)) return false;
      if (activeTab === "textures" && !isTexture) return false;
      if (activeTab === "backgrounds" && item.type !== "BACKGROUND") return false;
      if (activeTab === "effects" && !isEffect) return false;
      if (activeTab === "pets" && item.type !== "PET") return false;
      if (activeTab === "butler" && item.type !== "BUTLER") return false;

      return (
        !term ||
        item.id?.toLowerCase().includes(term) ||
        item.name?.toLowerCase().includes(term) ||
        (item.slot || item.avatarData?.slot)?.toLowerCase().includes(term) ||
        (item.kind || item.worldData?.kind)?.toLowerCase().includes(term)
      );
    });

    const matchesSub = (item: any) => {
      if (subFilter === "all") return true;
      if (activeTab === "avatar") return getAvatarGroup(item) === subFilter;
      if (activeTab === "world") return getItemRooms(item).includes(subFilter);
      return true;
    };
    const matchesType = (item: any) =>
      activeTab !== "world" || typeFilter === "all" || getFurnitureType(item) === typeFilter;

    // Conteos por chip calculados sobre lo que dejan pasar los OTROS filtros,
    // para que el número de cada chip sea lo que se verá al elegirlo.
    const subCounts: Record<string, number> = {};
    inTab.filter(matchesType).forEach((item) => {
      if (activeTab === "avatar") {
        const group = getAvatarGroup(item);
        if (group) subCounts[group] = (subCounts[group] ?? 0) + 1;
      } else if (activeTab === "world") {
        getItemRooms(item).forEach((room) => {
          subCounts[room] = (subCounts[room] ?? 0) + 1;
        });
      }
    });

    const types: Record<string, number> = {};
    if (activeTab === "world") {
      inTab.filter(matchesSub).forEach((item) => {
        const type = getFurnitureType(item);
        types[type] = (types[type] ?? 0) + 1;
      });
    }

    const filtered = inTab.filter((item) => matchesSub(item) && matchesType(item));
    const totalPagesCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return {
      currentItems: filtered.slice(start, start + ITEMS_PER_PAGE),
      totalPages: Math.max(1, totalPagesCount),
      filteredCount: filtered.length,
      subFilterCounts: subCounts,
      typeCounts: types,
    };
  }, [items, search, activeTab, currentPage, subFilter, typeFilter]);

  // Cualquier cambio de filtro vuelve a la página 1 desde el propio handler
  // (antes era un useEffect que re-renderizaba en cascada).
  const changeTab = (tab: TabType) => {
    setActiveTab(tab);
    setSubFilter("all");
    setTypeFilter("all");
    setCurrentPage(1);
  };
  const changeSubFilter = (value: string) => {
    setSubFilter(value);
    setCurrentPage(1);
  };
  const changeTypeFilter = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };
  const changeSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const subFilterOptions: Array<{ key: string; label: string; icon?: typeof Shirt }> =
    activeTab === "avatar"
      ? AVATAR_GROUPS.map((group) => ({ key: group.key, label: t(group.labelKey) }))
      : activeTab === "world"
        ? ITEM_ROOMS.map((room) => ({ key: room.key, label: t(room.labelKey), icon: room.icon }))
        : [];

  return (
    <Modal
      variant="floating"
      title={t("commerce.shopTitle")}
      onClose={onClose ?? (() => {})}
      style={{ width: "min(1320px, calc(100vw - 24px))", height: "min(880px, calc(100dvh - 24px))" }}
    >
      <div className={`${styles.tabs} ${tabsOverflow.scrollRow}`}>
        <button
          className={`${styles.tab} ${activeTab === "avatar" ? styles.active : ""}`}
          onClick={() => changeTab("avatar")}
        >
          <Shirt size={14} /> {t("commerce.shopTabAvatar")}
        </button>

        <button
          className={`${styles.tab} ${activeTab === "world" ? styles.active : ""}`}
          onClick={() => changeTab("world")}
        >
          <Globe size={14} /> {t("commerce.shopTabWorld")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "textures" ? styles.active : ""}`}
          onClick={() => changeTab("textures")}
        >
          {t("commerce.shopTabTextures")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "backgrounds" ? styles.active : ""}`}
          onClick={() => changeTab("backgrounds")}
        >
          {t("commerce.shopTabBackgrounds")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "effects" ? styles.active : ""}`}
          onClick={() => changeTab("effects")}
        >
          <Sparkles size={14} /> {t("commerce.shopTabEffects")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "pets" ? styles.active : ""}`}
          onClick={() => changeTab("pets")}
        >
          <PawPrint size={14} /> {t("commerce.shopTabPets")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "butler" ? styles.active : ""}`}
          onClick={() => changeTab("butler")}
        >
          <ConciergeBell size={14} /> {t("commerce.shopTabButler")}
        </button>
      </div>

      <div className={styles.shopBanner}>
        <h2>
          {activeTab === "avatar"
            ? t("commerce.shopBannerAvatar")
            : activeTab === "textures"
              ? t("commerce.shopBannerTextures")
              : activeTab === "backgrounds"
                ? t("commerce.shopBannerBackgrounds")
                : activeTab === "effects"
                  ? t("commerce.shopBannerEffects")
                  : activeTab === "pets"
                    ? t("commerce.shopBannerPets")
                    : activeTab === "butler"
                      ? t("commerce.shopBannerButler")
                      : t("commerce.shopBannerWorld")}
        </h2>

        <p>{t("commerce.shopItemsAvailable", { count: filteredCount })}</p>
      </div>

      {subFilterOptions.length > 0 && (
        <div
          className={`${styles.chips} ${tabsOverflow.scrollRow}`}
          role="group"
          aria-label={t(activeTab === "world" ? "commerce.taxRoomFilterLabel" : "commerce.taxAvatarFilterLabel")}
        >
          <button
            type="button"
            className={`${styles.chip} ${subFilter === "all" ? styles.chipActive : ""}`}
            aria-pressed={subFilter === "all"}
            onClick={() => changeSubFilter("all")}
          >
            {t("commerce.taxAll")}
          </button>
          {subFilterOptions.map((option) => {
            const count = subFilterCounts[option.key] ?? 0;
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                className={`${styles.chip} ${subFilter === option.key ? styles.chipActive : ""}`}
                aria-pressed={subFilter === option.key}
                disabled={count === 0 && subFilter !== option.key}
                onClick={() => changeSubFilter(option.key)}
              >
                {Icon && <Icon size={13} aria-hidden="true" />}
                {option.label}
                <span className={styles.chipCount}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.filters}>
        <input
          placeholder={t("commerce.shopSearchPlaceholder")}
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
        />

        {activeTab === "world" && (
          <select
            value={typeFilter}
            onChange={(e) => changeTypeFilter(e.target.value)}
            aria-label={t("commerce.taxTypeFilterLabel")}
          >
            <option value="all">{t("commerce.taxAllTypes")}</option>
            {FURNITURE_TYPES.map((type) => (
              <option key={type.key} value={type.key} disabled={!typeCounts[type.key]}>
                {t(type.labelKey)} ({typeCounts[type.key] ?? 0})
              </option>
            ))}
          </select>
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
          aria-label={t("commerce.shopSortLabel")}
        >
          <option value="new">{t("commerce.shopSortNewest")}</option>
          <option value="old">{t("commerce.shopSortOldest")}</option>
          <option value="cheap">{t("commerce.shopSortCheapest")}</option>
          <option value="expensive">{t("commerce.shopSortExpensive")}</option>
          <option value="popular">{t("commerce.shopSortPopular")}</option>
        </select>
      </div>

      <ItemGrid isEmpty={currentItems.length === 0} empty={t("commerce.shopEmptyItems")}>
        {currentItems.map((item) => {
          const owned = inventoryMap.has(item.id) || item.owned;
          const isBuying = buyingItemId === item.id;
          const alreadyHasBackground = item.type === "BACKGROUND" && item.canUse;
          // Mascota y mayordomo comparten toda la UI de "adoptar/contratar":
          // se compran con un nombre opcional y se sacan a la sala.
          const isCompanion = item.type === "PET" || item.type === "BUTLER";
          const isButler = item.type === "BUTLER";
          // Nombre real del item; si no tiene traducción, cae a la etiqueta
          // de categoría (slot/kind) como antes.
          const displayName = item.name || getLabel(item);

          return (
            <ItemCard
              key={item.id}
              item={item}
              rarity={item.rarity}
              effectPreview={item.type === "EFFECT" ? item.effectKey : undefined}
              preview={
                item.type === "PET" || item.type === "BUTLER" ? (
                  <PetSpriteCell petSprite={item.petSprite} />
                ) : undefined
              }
              title={
                owned &&
                (item.type === "BACKGROUND" ||
                  item.type === "PET" ||
                  item.type === "BUTLER")
                  ? `${displayName} ✓`
                  : displayName
              }
              description={item.description}
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
                    {item.type !== "EFFECT" && (
                      <RarityText effect={item.rarityKey} className={styles.rarity}>
                        {getRarityLabel(item.rarityKey, t)}
                      </RarityText>
                    )}
                  </div>
                  {isCompanion ? (
                    owned ? (
                      <div className={styles.footerActions}>
                        <Button variant="primary" size="sm" fullWidth disabled>
                          {t(
                            isButler
                              ? "commerce.butlerOwned"
                              : "commerce.petOwned",
                          )}
                        </Button>
                      </div>
                    ) : petAdoptKey === item.speciesKey ? (
                      <div className={styles.giftForm}>
                        <input
                          className={styles.giftInput}
                          placeholder={t(
                            isButler
                              ? "commerce.butlerNamePlaceholder"
                              : "commerce.petNamePlaceholder",
                          )}
                          value={petName}
                          maxLength={24}
                          onChange={(e) => setPetName(e.target.value)}
                          disabled={isBuying}
                        />
                        <div className={styles.giftActions}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setPetAdoptKey(null);
                              setPetName("");
                            }}
                            disabled={isBuying}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => adoptPet(item)}
                            disabled={isBuying || (!isButler && !petName.trim())}
                          >
                            {isBuying
                              ? t("commerce.shopBuying")
                              : t(
                                  isButler
                                    ? "commerce.butlerHire"
                                    : "commerce.petAdopt",
                                )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.footerActions}>
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            setPetAdoptKey(item.speciesKey);
                            setPetName("");
                          }}
                        >
                          {t(
                            isButler
                              ? "commerce.butlerHire"
                              : "commerce.petAdopt",
                          )}
                        </Button>
                      </div>
                    )
                  ) : giftTargetId === item.id ? (
                    <div className={styles.giftForm}>
                      <input
                        className={styles.giftInput}
                        placeholder={t("commerce.giftUsernamePlaceholder")}
                        value={giftUsername}
                        onChange={(e) => setGiftUsername(e.target.value)}
                        disabled={sendingGift}
                      />
                      <div className={styles.giftActions}>
                        <Button variant="secondary" size="sm" onClick={cancelGift} disabled={sendingGift}>
                          {t("common.cancel")}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => void sendGift(item.id)}
                          disabled={sendingGift}
                        >
                          {sendingGift ? t("commerce.giftSending") : t("commerce.giftSend")}
                        </Button>
                      </div>
                      {giftError && <p className={styles.giftError}>{giftError}</p>}
                    </div>
                  ) : (
                    (() => {
                      const bulk = isBulkPurchasable(item);
                      const maxBuyable = bulk ? getMaxBuyable(item) : 1;
                      const quantity = bulk ? getQuantity(item) : 1;
                      const stackFull = bulk && maxBuyable === 0;
                      return (
                        <>
                          {bulk && maxBuyable > 1 && (
                            <div className={styles.quantityRow}>
                              <div className={styles.stepper} role="group" aria-label={t("commerce.shopQuantityLabel")}>
                                <button
                                  type="button"
                                  className={styles.stepperBtn}
                                  onClick={() => setQuantity(item, quantity - 1)}
                                  disabled={isBuying || quantity <= 1}
                                  aria-label={t("commerce.shopQuantityDecrease")}
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  className={styles.stepperInput}
                                  min={1}
                                  max={maxBuyable}
                                  value={quantity}
                                  disabled={isBuying}
                                  aria-label={t("commerce.shopQuantityLabel")}
                                  onChange={(e) => setQuantity(item, Number(e.target.value) || 1)}
                                />
                                <button
                                  type="button"
                                  className={styles.stepperBtn}
                                  onClick={() => setQuantity(item, quantity + 1)}
                                  disabled={isBuying || quantity >= maxBuyable}
                                  aria-label={t("commerce.shopQuantityIncrease")}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <div className={styles.quantityMeta}>
                                <span>{t("commerce.shopQuantityMax", { max: maxBuyable })}</span>
                                <span className={styles.quantityTotal}>
                                  {t("commerce.shopTotalLabel")}
                                  <CurrencyBadge currency="coins" amount={(item.coinsPrice || 0) * quantity} size="sm" />
                                </span>
                              </div>
                            </div>
                          )}
                          <div className={styles.footerActions}>
                            <Button
                              variant="primary"
                              size="sm"
                              fullWidth
                              onClick={() => void buyItem(item.id)}
                              disabled={isBuying || alreadyHasBackground || stackFull}
                            >
                              {alreadyHasBackground
                                ? t("commerce.shopAlreadyOwned")
                                : stackFull
                                  ? t("commerce.shopLimitReached")
                                  : isBuying
                                    ? t("commerce.shopBuying")
                                    : quantity > 1
                                      ? t("commerce.shopBuyQuantity", { count: quantity })
                                      : owned
                                        ? t("commerce.shopBuyAnother")
                                        : t("commerce.shopBuy")}
                            </Button>
                            {item.type === "EFFECT" && (
                              <Button variant="secondary" size="sm" onClick={() => openGiftForm(item.id)}>
                                {t("commerce.giftButton")}
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()
                  )}
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
            {t("commerce.shopPrevPage")}
          </Button>

          <span>
            {t("commerce.shopPageLabel", { current: currentPage, total: totalPages })}
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            {t("commerce.shopNextPage")}
          </Button>
        </div>
      )}
    </Modal>
  );
}
