"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../../src/i18n/useTranslation";

type Item = {
  id: string;
  imageUrl?: string;
  layer: number;
  rarity: number;
  coinsPrice?: number;
  shopVisible?: boolean;
  avatarData?: { slot: string };
  worldData?: {
    kind: string;
    width?: number;
    height?: number;
    placementType?: string;
    isCollidable?: boolean;
  };
};

export default function ItemsPage() {
  const t = useTranslation();
  const RARITY_LABELS: Record<number, string> = {
    0: t("items.rarityCommon"),
    1: t("items.rarityRare"),
    2: t("items.rarityEpic"),
    3: t("items.rarityLegendary"),
  };
  const [items, setItems] = useState<Item[]>([]);

  async function loadItems() {
    try {
      const data = await api.get<Item[]>("/items");
      setItems(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm(t("items.confirmDeleteItem"))) return;

    try {
      await api.delete(`/items/${id}`);
      loadItems();
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="p-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-yellow-400">{t("items.itemsTitle")}</h1>
        <Link
          href="/admin/items/create"
          className="bg-yellow-400 text-black px-4 py-2 rounded hover:bg-yellow-300"
        >
          {t("items.createItemLink")}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {items.map((item) => {
          const slot = item.avatarData?.slot;
          const kind = item.worldData?.kind;
          const displayType = slot
            ? t("items.avatarPrefix", { value: slot })
            : kind
              ? t("items.worldPrefix", { value: kind })
              : t("items.baseItemShort");

          return (
            <div
              key={item.id}
              className="bg-[#111] border border-zinc-800 rounded-lg p-4 hover:border-yellow-400 transition"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={displayType}
                  className="w-full h-32 object-contain mb-3"
                />
              )}

              <p className="text-sm font-semibold">{displayType}</p>
              <p className="text-xs text-zinc-500">{t("items.layerLabel", { value: item.layer })}</p>
              <p className="text-xs text-zinc-500">
                {t("items.priceMonedasLabel", { price: item.coinsPrice ?? 0 })}
              </p>
              <p className="text-xs text-zinc-500">
                {t("items.shopStateLabel", { value: item.shopVisible ? t("items.visibleLowercase") : t("items.hiddenLowercase") })}
              </p>
              {item.worldData && (
                <p className="text-xs text-zinc-500">
                  {item.worldData.width ?? 1}x{item.worldData.height ?? 1} ·{" "}
                  {item.worldData.placementType ?? "FLOOR"}
                </p>
              )}
              <p className="text-xs text-zinc-400">
                {RARITY_LABELS[item.rarity] || t("items.unknownRarity")}
              </p>

              <div className="flex justify-between mt-4 text-sm">
                <Link
                  href={`/admin/items/${item.id}`}
                  className="text-blue-400 hover:underline"
                >
                  {t("common.edit")}
                </Link>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-red-400 hover:underline"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <p className="text-center text-zinc-500 py-10">{t("items.noItemsYet")}</p>
      )}
    </div>
  );
}
