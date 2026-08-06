"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";

type WorldItem = {
  itemId: string;

  width: number;
  height: number;

  kind: string;
  category: string | null;

  previewImageUrl?: string | null;

  item: {
    imageUrl?: string | null;

    translations?: {
      language: {
        code: string;
      };
      name: string;
    }[];
  };
};

export default function WorldItemsPage() {
  const t = useTranslation();
  const [items, setItems] = useState<WorldItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    try {
      const data = await api.get<WorldItem[]>("/world-item-data");

      console.log("WORLD ITEMS RESPONSE:", data);

      if (Array.isArray(data)) {
        setItems(data);
      } else {
        console.error("La API no devolvió un array:", data);
        setItems([]);
      }
    } catch (error) {
      console.error(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function remove(itemId: string) {
    const ok = confirm(t("items.confirmDeleteWorldConfig"));

    if (!ok) return;

    try {
      await api.delete(`/world-item-data/${itemId}`);

      loadItems();
    } catch (error) {
      console.error(error);
    }
  }

  if (loading) {
    return <div className="p-10 text-zinc-400">{t("items.loadingWorldItems")}</div>;
  }

  return (
    <div className="p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-yellow-400">
          {t("items.worldItems")}
        </h1>

        <p className="text-zinc-500 mt-2">
          {t("items.worldItemsDescription")}
        </p>
      </div>

      {items.length === 0 && (
        <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500">{t("items.noWorldItems")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((worldItem) => {
          const name = worldItem.item?.translations?.[0]?.name ?? t("items.unnamed");

          const image = worldItem.previewImageUrl || worldItem.item?.imageUrl;

          return (
            <div
              key={worldItem.itemId}
              className="
                bg-[#111]
                border
                border-zinc-800
                rounded-xl
                overflow-hidden
                hover:border-yellow-400
                transition
              "
            >
              <div className="h-48 flex items-center justify-center bg-[#0b0b0b]">
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="max-h-40 object-contain"
                  />
                ) : (
                  <div className="text-zinc-600">{t("items.noImage")}</div>
                )}
              </div>

              <div className="p-4 space-y-2">
                <h2 className="font-semibold text-white">{name}</h2>

                <p className="text-xs text-zinc-500">{t("items.type")}: {worldItem.kind}</p>

                <p className="text-xs text-zinc-500">
                  {t("items.size")}: {worldItem.width} x {worldItem.height}
                </p>

                <p className="text-xs text-zinc-500">
                  {t("items.category")}: {worldItem.category ?? t("items.noCategory")}
                </p>

                <div className="flex gap-4 pt-3">
                  <Link
                    href={`/admin/world-items/${worldItem.itemId}`}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {t("common.edit")}
                  </Link>

                  <button
                    onClick={() => remove(worldItem.itemId)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
