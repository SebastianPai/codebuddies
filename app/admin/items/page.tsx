"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Item = {
  id: string;
  type: string;
  imageUrl?: string;
  layer: number;
  rarity: number;
  coinsPrice?: number;
  shopVisible?: boolean;
  avatarData?: {
    slot: string;
  };
  worldData?: {
    kind: string;
    width: number;
    height: number;
    placementType?: string;
    isCollidable?: boolean;
    walkable?: boolean;
  };
};

export default function ItemsPage() {
  const t = useTranslation();
  const [items, setItems] = useState<Item[]>([]);

  async function loadItems() {
    const res = await fetch("http://localhost:3001/items");
    const data = await res.json();
    setItems(data);
  }

  async function deleteItem(id: string) {
    await fetch(`http://localhost:3001/items/${id}`, {
      method: "DELETE",
    });

    loadItems();
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
          className="bg-yellow-400 text-black px-4 py-2 rounded"
        >
          {t("items.createItemLink")}
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-[#111] border border-zinc-800 p-4 rounded"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                className="w-full h-32 object-contain mb-3"
              />
            )}

            <p className="text-sm text-zinc-400">
              {item.avatarData?.slot
                ? t("items.avatarPrefix", { value: item.avatarData.slot })
                : item.worldData?.kind
                  ? t("items.worldPrefix", { value: item.worldData.kind })
                  : item.type}
            </p>

            <p className="text-xs text-zinc-500">{t("items.layerLabel", { value: item.layer })}</p>

            <p className="text-xs text-zinc-500">{t("items.rarityRawLabel", { value: item.rarity })}</p>

            <p className="text-xs text-zinc-500">
              {t("items.priceMonedasLabel", { price: item.coinsPrice ?? 0 })}
            </p>

            <p className="text-xs text-zinc-500">
              {t("items.shopStateLabel", { value: item.shopVisible ? t("items.visibleLowercase") : t("items.hiddenLowercase") })}
            </p>

            {item.worldData && (
              <p className="text-xs text-zinc-500">
                {item.worldData.width}x{item.worldData.height} ·{" "}
                {item.worldData.placementType || "FLOOR"} ·{" "}
                {item.worldData.isCollidable ? t("items.collidesText") : t("items.doesNotCollideText")}
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <Link
                href={`/admin/items/${item.id}`}
                className="text-blue-400 text-sm"
              >
                {t("common.edit")}
              </Link>

              <button
                onClick={() => deleteItem(item.id)}
                className="text-red-400 text-sm"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
