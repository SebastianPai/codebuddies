"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Globe, Shirt, Sparkles } from "lucide-react";

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
  | "pets";

const ITEMS_PER_PAGE = 12;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const buyingSafetyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      // Comparte el evento con errores de compra (que hoy no muestran nada
      // en UI) -- acá solo reacciona si había un regalo en curso, para no
      // interferir con el flujo de compra.
      if (!giftTargetId) return;
      setSendingGift(false);
      setGiftError(data?.message || t("commerce.giftGenericError"));
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

    if (item?.type === "BACKGROUND" && ownsItem) {
      await showGameAlert({
        title: t("commerce.shopBackgroundAlreadyOwnedTitle"),
        message: t("commerce.shopBackgroundAlreadyOwnedMessage"),
        confirmLabel: t("common.understood"),
        tone: "success",
      });
      return;
    }

    const confirmed = await requestGameConfirm({
      title: ownsItem ? t("commerce.shopConfirmBuyAnotherTitle") : t("commerce.shopConfirmPurchaseTitle"),
      message: ownsItem
        ? t("commerce.shopConfirmBuyAnotherMessage")
        : t("commerce.shopConfirmBuyMessage", { name: item?.name || t("commerce.shopDefaultItemName") }),
      confirmLabel: ownsItem ? t("commerce.shopConfirmBuyAnotherTitle") : t("commerce.shopBuy"),
      cancelLabel: t("common.cancel"),
    });

    if (!confirmed) return;

    setBuyingItemId(itemId);
    if (item?.type === "PET") {
      socket?.emit("shop:pet:buy", { speciesKey: item.speciesKey });
    } else {
      socket?.emit(
        item?.type === "BACKGROUND" ? "shop:background:buy" : "shop:item:buy",
        item?.type === "BACKGROUND" ? { backgroundId: itemId } : { itemId },
      );
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
    socket?.emit("shop:pet:buy", {
      speciesKey: item.speciesKey,
      name: petName.trim(),
    });
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

  const { currentItems, totalPages } = useMemo(() => {
    const filtered = items.filter((item) => {
      const term = search.toLowerCase();

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
      title={t("commerce.shopTitle")}
      onClose={onClose ?? (() => {})}
      style={{ width: "min(960px, calc(100vw - 24px))", height: "min(760px, calc(100dvh - 24px))" }}
    >
      <div className={`${styles.tabs} ${tabsOverflow.scrollRow}`}>
        <button
          className={`${styles.tab} ${activeTab === "avatar" ? styles.active : ""}`}
          onClick={() => setActiveTab("avatar")}
        >
          <Shirt size={14} /> {t("commerce.shopTabAvatar")}
        </button>

        <button
          className={`${styles.tab} ${activeTab === "world" ? styles.active : ""}`}
          onClick={() => setActiveTab("world")}
        >
          <Globe size={14} /> {t("commerce.shopTabWorld")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "textures" ? styles.active : ""}`}
          onClick={() => setActiveTab("textures")}
        >
          {t("commerce.shopTabTextures")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "backgrounds" ? styles.active : ""}`}
          onClick={() => setActiveTab("backgrounds")}
        >
          {t("commerce.shopTabBackgrounds")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "effects" ? styles.active : ""}`}
          onClick={() => setActiveTab("effects")}
        >
          <Sparkles size={14} /> {t("commerce.shopTabEffects")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "pets" ? styles.active : ""}`}
          onClick={() => setActiveTab("pets")}
        >
          🐾 {t("commerce.shopTabPets")}
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
                    : t("commerce.shopBannerWorld")}
        </h2>

        <p>{t("commerce.shopItemsAvailable", { count: items.length })}</p>
      </div>

      <div className={styles.filters}>
        <input
          placeholder={t("commerce.shopSearchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
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
                item.type === "PET" ? (
                  <PetSpriteCell petSprite={item.petSprite} />
                ) : undefined
              }
              title={
                owned && (item.type === "BACKGROUND" || item.type === "PET")
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
                  {item.type === "PET" ? (
                    owned ? (
                      <div className={styles.footerActions}>
                        <Button variant="primary" size="sm" fullWidth disabled>
                          {t("commerce.petOwned")}
                        </Button>
                      </div>
                    ) : petAdoptKey === item.speciesKey ? (
                      <div className={styles.giftForm}>
                        <input
                          className={styles.giftInput}
                          placeholder={t("commerce.petNamePlaceholder")}
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
                            disabled={isBuying || !petName.trim()}
                          >
                            {isBuying
                              ? t("commerce.shopBuying")
                              : t("commerce.petAdopt")}
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
                          {t("commerce.petAdopt")}
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
                    <div className={styles.footerActions}>
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        onClick={() => void buyItem(item.id)}
                        disabled={isBuying || alreadyHasBackground}
                      >
                        {alreadyHasBackground
                          ? t("commerce.shopAlreadyOwned")
                          : isBuying
                            ? t("commerce.shopBuying")
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
