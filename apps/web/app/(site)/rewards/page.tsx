"use client";

import { useEffect, useState } from "react";
import { Coins, Filter, Gift, Ticket, Zap } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import {
  GamificationEmpty,
  GamificationError,
  GamificationSkeleton,
} from "../../../components/gamification/GamificationState";
import type { RewardLedgerEntry } from "../../../components/gamification/gamification-types";
import { useTranslation } from "../../../src/i18n/useTranslation";

type RewardsPayload = {
  items: RewardLedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
  summary: { coins: number; xp: number; objects: number };
};

const SOURCE_TYPE_KEYS: Record<string, string> = {
  MISSION: "site.rewardSourceMission",
  REFERRAL: "site.rewardSourceReferral",
  ACHIEVEMENT: "site.rewardSourceAchievement",
  SPECIAL: "site.rewardSourceSpecial",
  EVENT: "site.rewardSourceEvent",
  ADMIN: "site.rewardSourceAdmin",
  RANKING: "site.rewardSourceRanking",
};

const REWARD_TYPE_KEYS: Record<string, string> = {
  COINS: "site.rewardTypeCoins",
  XP: "site.rewardTypeXp",
  ITEM: "site.rewardTypeItem",
  FURNITURE: "site.rewardTypeFurniture",
  AVATAR_ITEM: "site.rewardTypeAvatarItem",
  BADGE: "site.rewardTypeBadge",
  PET: "site.rewardTypePet",
  TITLE: "site.rewardTypeTitle",
};

export default function RewardsPage() {
  const t = useTranslation();
  const [data, setData] = useState<RewardsPayload | null>(null);
  const [sourceType, setSourceType] = useState("");
  const [rewardType, setRewardType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "12" });
      if (sourceType) params.set("sourceType", sourceType);
      if (rewardType) params.set("rewardType", rewardType);
      setData(await api.get<RewardsPayload>(`/rewards-center?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("site.loadRewardsCenterError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [sourceType, rewardType, page]);

  const redeemCode = async () => {
    if (!promoCode.trim()) return;
    setRedeeming(true);
    try {
      const result = await api.post<{ promoCode: { rewardType: string; rewardAmount: number } }>(
        "/promo-codes/redeem",
        { code: promoCode.trim() },
      );
      if (result.promoCode.rewardType === "PREMIUM_DAYS") {
        toast.success(t("site.promoRedeemedPremiumToast", { amount: result.promoCode.rewardAmount }));
      } else {
        toast.success(t("site.promoRedeemedCoinsToast", { amount: result.promoCode.rewardAmount }));
      }
      setPromoCode("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("site.promoRedeemError"));
    } finally {
      setRedeeming(false);
    }
  };

  if (loading && !data) return <GamificationSkeleton />;
  if (error && !data) return <GamificationError message={error} onRetry={() => void load()} />;

  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 12)), 1);

  return (
    <div className="py-8 text-[rgb(var(--text))]">
      <section className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-black">{t("site.rewardsCenterTitle")}</h1>
            <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">
              {t("site.rewardsCenterDescription")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={<Coins size={16} />} label="Coins" value={data?.summary.coins ?? 0} />
            <Metric icon={<Zap size={16} />} label="XP" value={data?.summary.xp ?? 0} />
            <Metric icon={<Gift size={16} />} label={t("gamification.objectsCount")} value={data?.summary.objects ?? 0} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Select
            label={t("site.filterSourceLabel")}
            value={sourceType}
            onChange={setSourceType}
            options={["", "MISSION", "REFERRAL", "ACHIEVEMENT", "SPECIAL", "EVENT", "ADMIN", "RANKING"]}
            labelFor={(option) => (option ? t(SOURCE_TYPE_KEYS[option] ?? option) : t("common.allMasculine"))}
          />
          <Select
            label={t("site.filterTypeLabel")}
            value={rewardType}
            onChange={setRewardType}
            options={["", "COINS", "XP", "ITEM", "FURNITURE", "AVATAR_ITEM", "BADGE", "PET", "TITLE"]}
            labelFor={(option) => (option ? t(REWARD_TYPE_KEYS[option] ?? option) : t("common.allMasculine"))}
          />
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSourceType("");
                setRewardType("");
                setPage(1);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[rgb(var(--border))] px-4 py-3 font-bold"
            >
              <Filter size={16} />
              {t("common.clearFilters")}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-2 flex items-center gap-2 text-sm font-black">
              <Ticket size={16} className="text-[rgb(var(--primary))]" />
              {t("site.promoRedeemLabel")}
            </span>
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder={t("site.promoRedeemPlaceholder")}
              className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-3 text-[rgb(var(--text))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--primary))]"
            />
          </label>
          <button
            type="button"
            onClick={() => void redeemCode()}
            disabled={redeeming || !promoCode.trim()}
            className="rounded-md bg-[rgb(var(--primary))] px-6 py-3 font-black text-[rgb(var(--button-text))] disabled:opacity-60"
          >
            {redeeming ? t("site.promoRedeemingButton") : t("site.promoRedeemButton")}
          </button>
        </div>
      </section>

      <section className="mt-6">
        {data?.items.length ? (
          <div className="overflow-hidden rounded-lg border border-[rgb(var(--border))]">
            <div className="hidden grid-cols-[1fr_120px_120px_180px] bg-[rgb(var(--background))] px-4 py-3 text-xs font-black uppercase text-[rgb(var(--secondary-text))] md:grid">
              <span>{t("site.rewardColumnHeader")}</span>
              <span>{t("site.filterSourceLabel")}</span>
              <span>{t("site.filterTypeLabel")}</span>
              <span>{t("site.dateColumnHeader")}</span>
            </div>
            {data.items.map((item) => (
              <div key={item.id} className="grid gap-2 border-t border-[rgb(var(--border))] px-4 py-4 md:grid-cols-[1fr_120px_120px_180px]">
                <div>
                  <p className="font-black">{item.label}</p>
                  {item.message ? <p className="text-sm text-[rgb(var(--secondary-text))]">{item.message}</p> : null}
                </div>
                <span className="text-sm text-[rgb(var(--secondary-text))]">{t(SOURCE_TYPE_KEYS[item.sourceType] ?? item.sourceType)}</span>
                <span className="text-sm text-[rgb(var(--primary))]">{t(REWARD_TYPE_KEYS[item.rewardType] ?? item.rewardType)}</span>
                <time className="text-sm text-[rgb(var(--secondary-text))]">{new Date(item.grantedAt).toLocaleString("es-CO")}</time>
              </div>
            ))}
          </div>
        ) : (
          <GamificationEmpty
            title={t("site.noRewardsTitle")}
            description={t("site.noRewardsDescription")}
          />
        )}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            className="rounded-md border border-[rgb(var(--border))] px-4 py-2 font-bold disabled:opacity-40"
          >
            {t("common.previous")}
          </button>
          <span className="text-sm text-[rgb(var(--secondary-text))]">
            {t("common.pageOf", { page, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-md border border-[rgb(var(--border))] px-4 py-2 font-bold disabled:opacity-40"
          >
            {t("common.next")}
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
      <div className="flex items-center justify-between text-[rgb(var(--secondary-text))]">
        <span className="text-xs font-black uppercase">{label}</span>
        <span className="text-[rgb(var(--primary))]">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-[rgb(var(--text))]">{value}</p>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  labelFor,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labelFor: (option: string) => string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[rgb(var(--secondary-text))]">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-3 text-[rgb(var(--text))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--primary))]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labelFor(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
