"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../../utils/api";
import type { AdminReward, CatalogItem } from "./admin-gamification-types";
import { useTranslation } from "../../../../src/i18n/useTranslation";

const rewardTypes = [
  "COINS",
  "XP",
  "ITEM",
  "AVATAR_ITEM",
  "FURNITURE",
  "BADGE",
  "PET",
  "TITLE",
  "ROLE",
  "CUSTOM",
];

const roles = ["STUDENT", "ADMIN"];

function itemName(item: CatalogItem) {
  return item.translations?.[0]?.name ?? item.item?.translations?.[0]?.name ?? item.name ?? item.id;
}

function rewardKey(reward: AdminReward) {
  return `${reward.type}:${reward.itemId ?? ""}:${reward.amount ?? ""}:${reward.label}`;
}

export default function RewardBuilder({
  value,
  onChange,
}: {
  value: AdminReward[];
  onChange: (value: AdminReward[]) => void;
}) {
  const t = useTranslation();
  const [type, setType] = useState("COINS");
  const [amount, setAmount] = useState(100);
  const [label, setLabel] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [avatarItems, setAvatarItems] = useState<CatalogItem[]>([]);
  const [furniture, setFurniture] = useState<CatalogItem[]>([]);
  const [badges, setBadges] = useState<CatalogItem[]>([]);
  const [pets, setPets] = useState<CatalogItem[]>([]);
  const [titles, setTitles] = useState<CatalogItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const safeGet = async (endpoint: string) => {
      try {
        return await api.get<CatalogItem[]>(endpoint);
      } catch {
        return [];
      }
    };

    const load = async () => {
      const [itemsData, avatarData, furnitureData, badgesData, petsData, titlesData] =
        await Promise.all([
          safeGet("/items"),
          safeGet("/items?type=avatar"),
          safeGet("/items?type=world"),
          safeGet("/admin/gamification/badges"),
          safeGet("/admin/gamification/pets"),
          safeGet("/admin/gamification/titles"),
        ]);
      if (!mounted) return;
      setItems(itemsData);
      setAvatarItems(avatarData);
      setFurniture(furnitureData);
      setBadges(badgesData);
      setPets(petsData);
      setTitles(titlesData);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(() => {
    const source =
      type === "AVATAR_ITEM"
        ? avatarItems.map((item) => item.item ?? item)
        : type === "FURNITURE"
          ? furniture.map((item) => item.item ?? item)
          : type === "BADGE"
            ? badges
            : type === "PET"
              ? pets
              : type === "TITLE"
                ? titles
                : type === "ITEM"
                  ? items
                  : [];

    return source.filter((item) =>
      itemName(item).toLowerCase().includes(search.toLowerCase().trim()),
    );
  }, [avatarItems, badges, furniture, items, pets, search, titles, type]);

  const needsAmount = type === "COINS" || type === "XP";
  const needsSelector = ["ITEM", "AVATAR_ITEM", "FURNITURE", "BADGE", "PET", "TITLE"].includes(type);
  const needsRole = type === "ROLE";

  const addReward = () => {
    const selected = options.find((item) => item.id === selectedId);
    const computedLabel =
      label ||
      (needsAmount
        ? `${amount} ${type}`
        : needsRole
          ? t("gamification.rolePrefix", { value: selectedId })
          : selected
            ? itemName(selected)
            : type);

    if (needsSelector && !selectedId) {
      toast.error(t("gamification.selectCatalogItem"));
      return;
    }

    if (needsRole && !selectedId) {
      toast.error(t("gamification.selectRole"));
      return;
    }

    const reward: AdminReward = {
      type,
      label: computedLabel,
      ...(needsAmount ? { amount: Number(amount) } : {}),
      ...(needsSelector || needsRole ? { itemId: selectedId } : {}),
    };

    if (value.some((current) => rewardKey(current) === rewardKey(reward))) {
      toast.error(t("gamification.duplicateReward"));
      return;
    }

    onChange([...value, reward]);
    setLabel("");
    setSelectedId("");
    setSearch("");
  };

  return (
    <div className="rounded-md border border-zinc-800 bg-black p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm text-zinc-400">{t("gamification.conditionType")}</span>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setSelectedId("");
            }}
            className="w-full rounded-md border border-zinc-800 bg-[#111111] px-3 py-3"
          >
            {rewardTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {needsAmount ? (
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-400">{t("gamification.amount")}</span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="w-full rounded-md border border-zinc-800 bg-[#111111] px-3 py-3"
            />
          </label>
        ) : null}

        {needsRole ? (
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-400">{t("gamification.role")}</span>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-[#111111] px-3 py-3"
            >
              <option value="">{t("gamification.select")}</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {needsSelector ? (
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm text-zinc-400">{t("gamification.searchCatalog")}</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 text-zinc-500" size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("gamification.searchByName")}
                  className="w-full rounded-md border border-zinc-800 bg-[#111111] py-3 pl-9 pr-3"
                />
              </div>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="w-full max-w-xs rounded-md border border-zinc-800 bg-[#111111] px-3 py-3"
              >
                <option value="">{t("gamification.select")}</option>
                {options.slice(0, 50).map((item) => (
                  <option key={item.id} value={item.id}>
                    {itemName(item)}
                  </option>
                ))}
              </select>
            </div>
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm text-zinc-400">{t("gamification.optionalLabel")}</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-[#111111] px-3 py-3"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={addReward}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black"
          >
            <Plus size={16} />
            {t("gamification.addReward")}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {value.map((reward) => (
          <span
            key={rewardKey(reward)}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-[#111111] px-3 py-2 text-sm font-bold"
          >
            {reward.label}
            <button
              type="button"
              onClick={() => onChange(value.filter((current) => rewardKey(current) !== rewardKey(reward)))}
              className="text-red-300"
              aria-label={t("gamification.deleteRewardNamed", { name: reward.label })}
            >
              <Trash2 size={14} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
