"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { capitalizeRarityKey, useRarityCatalog } from "@/features/items/useRarityCatalog";
import { resolveItemRarityEffect } from "@codebuddies/visual-effects";
import { RarityText } from "@/shared/ui/rarity-text";

type Item = {
  id: string;
  imageUrl?: string;
  layer: number;
  rarity: number;
  coinsPrice?: number;
  shopVisible?: boolean;
  isDefaultForSlot?: string | null;
  avatarData?: { slot: string };
  worldData?: {
    kind: string;
    width?: number;
    height?: number;
    placementType?: string;
    isCollidable?: boolean;
  };
  translations?: Array<{ name: string; language?: { code: string } }>;
};

type TypeFilter = "all" | "avatar" | "world" | "texture";

const TEXTURE_KINDS = new Set(["FLOOR", "WALL"]);

function getItemType(item: Item): "avatar" | "world" | "texture" | "base" {
  if (item.avatarData?.slot) return "avatar";
  if (item.worldData?.kind) {
    return TEXTURE_KINDS.has(item.worldData.kind) ? "texture" : "world";
  }
  return "base";
}

function getItemName(item: Item, fallback: string) {
  if (!item.translations?.length) return fallback;
  const es = item.translations.find((tr) => tr.language?.code === "es");
  return es?.name || item.translations[0]?.name || fallback;
}

export default function ItemsPage() {
  const t = useTranslation();
  const rarities = useRarityCatalog();
  const RARITY_LABELS: Record<number, string> = useMemo(() => {
    const map: Record<number, string> = {};
    for (const rarity of rarities) {
      map[rarity.id] = t(`items.rarity${capitalizeRarityKey(rarity.key)}`);
    }
    return map;
  }, [rarities, t]);
  const [items, setItems] = useState<Item[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");

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

  async function toggleDefault(item: Item) {
    const isCurrentlyDefault = Boolean(
      item.avatarData?.slot && item.isDefaultForSlot === item.avatarData.slot,
    );
    try {
      await api.patch(`/items/${item.id}/default-for-slot`, {
        isDefault: !isCurrentlyDefault,
      });
      loadItems();
    } catch (err) {
      console.error(err);
      alert(t("items.setDefaultError"));
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const counts = useMemo(() => {
    const result = { all: items.length, avatar: 0, world: 0, texture: 0 };
    items.forEach((item) => {
      const type = getItemType(item);
      if (type === "avatar") result.avatar++;
      else if (type === "world") result.world++;
      else if (type === "texture") result.texture++;
    });
    return result;
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && getItemType(item) !== typeFilter) return false;
      if (!query) return true;
      const name = getItemName(item, "").toLowerCase();
      return name.includes(query);
    });
  }, [items, typeFilter, search]);

  const TABS: Array<{ value: TypeFilter; label: string; count: number }> = [
    { value: "all", label: t("items.filterAllShort"), count: counts.all },
    { value: "avatar", label: t("items.filterAvatarShort"), count: counts.avatar },
    { value: "world", label: t("items.filterWorldShort"), count: counts.world },
    { value: "texture", label: t("items.filterTextureShort"), count: counts.texture },
  ];

  // Cuando se ven "todos", agrupamos por tipo (avatar/mundo/textura/base) en
  // vez de mezclarlos en una sola grilla, para que se distinga de un vistazo
  // qué es cada cosa.
  const groupedItems = useMemo(() => {
    if (typeFilter !== "all") return null;

    const groups: Array<{ type: TypeFilter | "base"; label: string; items: Item[] }> = [
      { type: "avatar", label: t("items.filterAvatarShort"), items: [] },
      { type: "world", label: t("items.filterWorldShort"), items: [] },
      { type: "texture", label: t("items.filterTextureShort"), items: [] },
      { type: "base", label: t("items.baseItemShort"), items: [] },
    ];
    const byType = new Map(groups.map((g) => [g.type, g]));

    filteredItems.forEach((item) => {
      byType.get(getItemType(item))?.items.push(item);
    });

    return groups.filter((g) => g.items.length > 0);
  }, [filteredItems, typeFilter, t]);

  return (
    <div className="p-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">{t("items.itemsTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t("items.itemCountLabel", { count: filteredItems.length })}
          </p>
        </div>
        <Link
          href="/admin/items/create"
          className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black hover:bg-yellow-300"
        >
          {t("items.createItemLink")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                typeFilter === tab.value
                  ? "bg-yellow-400 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {tab.label} <span className="opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("items.searchItemsPlaceholder")}
          className="w-full max-w-xs rounded-lg border border-zinc-800 bg-black/60 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400 sm:w-64"
        />
      </div>

      {groupedItems ? (
        <div className="space-y-8">
          {groupedItems.map((group) => (
            <section key={group.type}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  {group.label}
                </h2>
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-500">
                  {group.items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {group.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    t={t}
                    rarityLabels={RARITY_LABELS}
                    onToggleDefault={toggleDefault}
                    onDelete={deleteItem}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              t={t}
              rarityLabels={RARITY_LABELS}
              onToggleDefault={toggleDefault}
              onDelete={deleteItem}
            />
          ))}
        </div>
      )}

      {items.length === 0 && (
        <p className="py-10 text-center text-zinc-500">{t("items.noItemsYet")}</p>
      )}
      {items.length > 0 && filteredItems.length === 0 && (
        <p className="py-10 text-center text-zinc-500">{t("items.noItemsMatchFilter")}</p>
      )}
    </div>
  );
}

function ItemCard({
  item,
  t,
  rarityLabels,
  onToggleDefault,
  onDelete,
}: {
  item: Item;
  t: ReturnType<typeof useTranslation>;
  rarityLabels: Record<number, string>;
  onToggleDefault: (item: Item) => void;
  onDelete: (id: string) => void;
}) {
  const slot = item.avatarData?.slot;
  const kind = item.worldData?.kind;
  const typeBadge = slot
    ? t("items.avatarPrefix", { value: slot })
    : kind
      ? t("items.worldPrefix", { value: kind })
      : t("items.baseItemShort");
  const name = getItemName(item, typeBadge);

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-[#111] p-4 transition hover:border-yellow-400">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={name}
          className="mb-3 h-32 w-full object-contain [image-rendering:pixelated]"
        />
      ) : (
        <div className="mb-3 flex h-32 w-full items-center justify-center rounded bg-black/40 text-xs text-zinc-600">
          {t("items.noImage")}
        </div>
      )}

      <p className="truncate text-sm font-semibold text-white" title={name}>
        {name}
      </p>
      <p className="text-xs text-zinc-500">{typeBadge}</p>

      <div className="mt-2 space-y-0.5">
        <p className="text-xs text-zinc-500">
          {t("items.priceMonedasLabel", { price: item.coinsPrice ?? 0 })}
        </p>
        <p className="text-xs text-zinc-500">
          {t("items.shopStateLabel", {
            value: item.shopVisible ? t("items.visibleLowercase") : t("items.hiddenLowercase"),
          })}
        </p>
        {item.worldData && (
          <p className="text-xs text-zinc-500">
            {item.worldData.width ?? 1}x{item.worldData.height ?? 1} ·{" "}
            {item.worldData.placementType ?? "FLOOR"}
          </p>
        )}
        <RarityText effect={resolveItemRarityEffect(item.rarity).id} as="p" className="text-xs font-semibold">
          {rarityLabels[item.rarity] || t("items.unknownRarity")}
        </RarityText>
      </div>

      {slot && (
        <button
          onClick={() => onToggleDefault(item)}
          className={`mt-3 w-full rounded px-2 py-1 text-xs font-semibold transition ${
            item.isDefaultForSlot === slot
              ? "bg-yellow-400 text-black hover:bg-yellow-300"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          }`}
        >
          {item.isDefaultForSlot === slot
            ? t("items.isDefaultForSlotBadge", { slot })
            : t("items.setAsDefaultButton", { slot })}
        </button>
      )}

      <div className="mt-auto flex items-center justify-between pt-4 text-sm">
        <Link href={`/admin/items/${item.id}`} className="text-blue-400 hover:underline">
          {t("common.edit")}
        </Link>
        {slot && (
          <Link
            href={`/admin/item-sprites?itemId=${item.id}`}
            className="text-yellow-400 hover:underline"
          >
            {t("items.sprite")}
          </Link>
        )}
        <button onClick={() => onDelete(item.id)} className="text-red-400 hover:underline">
          {t("common.delete")}
        </button>
      </div>
    </div>
  );
}
