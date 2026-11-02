"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUp, Coins, Crown, Heart, Music, RefreshCcw, RotateCw, Sparkles } from "lucide-react";
import Button from "../shared/Button";
import ItemPreview from "../UI/ItemPreview";
import { audioManager } from "../../audio/AudioManager";
import { useTranslation } from "../../../i18n/useTranslation";
import {
  PET_ACCESSORY_CATEGORY,
  PET_TRICKS,
  buyPetTrick,
  setPetAccessory,
  type Pet,
  type PetTrick,
} from "../../network/pets";

// Trucos y accesorio de la mascota. Los trucos se compran una vez y se le
// piden cuando está sacada en la sala (lo ve todo el que esté ahí). El
// accesorio es un ítem de la tienda de categoría "petAccessory".
// Íconos SVG (lucide), nunca emojis.
const TRICK_ICON: Record<PetTrick, typeof Heart> = {
  jump: ArrowUp,
  spin: RotateCw,
  love: Heart,
  dance: Music,
  flip: RefreshCcw,
};
const TrickIcon = ({ trick }: { trick: PetTrick }) => {
  const Icon = TRICK_ICON[trick];
  return <Icon size={13} style={{ verticalAlign: -2 }} />;
};

interface Props {
  pet: Pet;
  outHere: boolean;
  busy: boolean;
  run: (fn: () => Promise<Pet>, sound?: string) => Promise<void>;
}

export default function PetExtras({ pet, outHere, busy, run }: Props) {
  const t = useTranslation();
  const socket = typeof window !== "undefined" ? (window as any).phaserSocket : null;
  const [inventory, setInventory] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const known = pet.tricks ?? [];

  useEffect(() => {
    if (!socket) return;
    const handleInventory = (data: any[]) => setInventory(Array.isArray(data) ? data : []);
    const handleShop = (items: any[]) => setShopItems(Array.isArray(items) ? items : []);
    const handleBought = () => setBuyingId(null);
    socket.on("inventory:data", handleInventory);
    socket.on("shop:items", handleShop);
    socket.on("shop:item:bought", handleBought);
    socket.on("shop:item:error", handleBought);
    socket.emit("inventory:get");
    socket.emit("shop:items:request");
    return () => {
      socket.off("inventory:data", handleInventory);
      socket.off("shop:items", handleShop);
      socket.off("shop:item:bought", handleBought);
      socket.off("shop:item:error", handleBought);
    };
  }, [socket]);

  // Accesorios: los que tengo y, después, los de la tienda.
  const accessories = useMemo(() => {
    const owned = inventory
      .map((entry) => entry.item ?? entry)
      .filter((item) => item?.category === PET_ACCESSORY_CATEGORY);
    const ownedIds = new Set(owned.map((item) => item.id));
    const forSale = shopItems.filter(
      (item) => item?.category === PET_ACCESSORY_CATEGORY && !ownedIds.has(item.id) && item.coinsPrice > 0,
    );
    return { owned, forSale };
  }, [inventory, shopItems]);

  const doTrick = (trick: PetTrick) => {
    socket?.emit("pet:trick", { trick });
    audioManager.play("click");
  };

  const sectionTitle = { fontSize: 13, fontWeight: 800, color: "#e4e4e7", margin: "0 0 8px" } as const;
  const hint = { fontSize: 11, color: "#71717a", margin: "6px 0 0" } as const;
  const tileBase = {
    position: "relative" as const,
    width: 56,
    height: 56,
    borderRadius: 10,
    border: "1px solid #27272a",
    background: "#0b0b0b",
    cursor: "pointer",
    padding: 4,
  };

  return (
    <>
      <div style={{ marginTop: 12, borderTop: "1px solid #27272a", paddingTop: 12 }}>
        <p style={sectionTitle}>
          <Sparkles size={13} style={{ verticalAlign: -2 }} /> {t("hud.pet.tricksTitle")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 6 }}>
          {(Object.keys(PET_TRICKS) as PetTrick[]).map((trick) =>
            known.includes(trick) ? (
              <Button key={trick} variant="primary" size="sm" disabled={!outHere} onClick={() => doTrick(trick)}>
                <TrickIcon trick={trick} /> {t(`hud.pet.trick_${trick}`)}
              </Button>
            ) : (
              <Button
                key={trick}
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => run(() => buyPetTrick(trick), "coin")}
                title={t("hud.pet.learnTrick")}
              >
                <TrickIcon trick={trick} /> {t(`hud.pet.trick_${trick}`)} · <Coins size={11} style={{ verticalAlign: -1 }} /> {PET_TRICKS[trick]}
              </Button>
            ),
          )}
        </div>
        <p style={hint}>{outHere ? t("hud.pet.tricksHint") : t("hud.pet.tricksBringOut")}</p>
      </div>

      <div style={{ marginTop: 12, borderTop: "1px solid #27272a", paddingTop: 12 }}>
        <p style={sectionTitle}>
          <Crown size={13} style={{ verticalAlign: -2 }} /> {t("hud.pet.accessoryTitle")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            type="button"
            style={{ ...tileBase, color: "#a1a1aa", fontSize: 11, outline: pet.accessory ? "none" : "2px solid #facc15" }}
            disabled={busy}
            onClick={() => pet.accessory && run(() => setPetAccessory(null))}
          >
            {t("hud.pet.noAccessory")}
          </button>
          {accessories.owned.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.name}
              style={{ ...tileBase, outline: pet.accessory?.id === item.id ? "2px solid #facc15" : "none" }}
              disabled={busy}
              onClick={() => run(() => setPetAccessory(item.id))}
            >
              <ItemPreview item={item} alt={item.name} />
            </button>
          ))}
          {accessories.forSale.map((item) => (
            <button
              key={item.id}
              type="button"
              title={`${item.name} · ${item.coinsPrice}`}
              style={{ ...tileBase, borderStyle: "dashed", opacity: buyingId === item.id ? 0.5 : 1 }}
              disabled={!!buyingId}
              onClick={() => {
                setBuyingId(item.id);
                socket?.emit("shop:item:buy", { itemId: item.id });
              }}
            >
              <ItemPreview item={item} alt={item.name} />
              <b
                style={{
                  position: "absolute",
                  right: 2,
                  bottom: 2,
                  fontSize: 10,
                  borderRadius: 5,
                  padding: "0 3px",
                  color: "#ffe9a8",
                  background: "rgba(0,0,0,.7)",
                }}
              >
                <Coins size={9} /> {item.coinsPrice}
              </b>
            </button>
          ))}
        </div>
        {accessories.owned.length + accessories.forSale.length === 0 && <p style={hint}>{t("hud.pet.accessoryNone")}</p>}
      </div>

      <div style={{ marginTop: 12, borderTop: "1px solid #27272a", paddingTop: 12 }}>
        <p style={sectionTitle}>
          <Heart size={13} style={{ verticalAlign: -2 }} /> {t("hud.pet.cornerTitle")}
        </p>
        <p style={{ ...hint, marginTop: 0, lineHeight: 1.5 }}>{t("hud.pet.cornerHint")}</p>
      </div>
    </>
  );
}
