"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { useConfirm } from "@/shared/ui";

type PromoCode = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  rewardType: "COINS" | "PREMIUM_DAYS";
  rewardAmount: number;
  expiresAt: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  active: boolean;
};

const formInitial = {
  code: "",
  name: "",
  description: "",
  rewardType: "COINS" as "COINS" | "PREMIUM_DAYS",
  rewardAmount: 100,
  expiresAt: "",
  maxRedemptions: "",
};

export default function PromoCodesAdminPage() {
  const t = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [form, setForm] = useState(formInitial);
  const [saving, setSaving] = useState(false);

  const load = () => api.get<PromoCode[]>("/admin/promo-codes").then(setCodes);
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setSaving(true);
    try {
      await api.post("/admin/promo-codes", {
        code: form.code || undefined,
        name: form.name,
        description: form.description || undefined,
        rewardType: form.rewardType,
        rewardAmount: Number(form.rewardAmount),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
      });
      toast.success(t("admin.promoCodeCreatedToast"));
      setForm(formInitial);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("admin.unexpectedErrorSentence");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    if (!(await confirm(t("admin.confirmDeactivatePromoCode")))) return;
    try {
      await api.patch(`/admin/promo-codes/${id}/deactivate`);
      toast.success(t("admin.promoCodeDeactivatedToast"));
      await load();
    } catch {
      toast.error(t("admin.unexpectedErrorSentence"));
    }
  };

  return (
    <div className="space-y-8 p-6 text-white md:p-10">
      <div>
        <h1 className="text-3xl font-black text-yellow-400">{t("admin.promoCodesTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          {t("admin.promoCodesDescription")}
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-[#111111] p-6 md:grid-cols-2">
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder={t("admin.promoCodeFieldPlaceholder")}
          className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
        />
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t("admin.promoCodeNamePlaceholder")}
          className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
        />
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={t("admin.promoCodeDescriptionPlaceholder")}
          className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white md:col-span-2"
        />
        <select
          value={form.rewardType}
          onChange={(e) => setForm({ ...form, rewardType: e.target.value as "COINS" | "PREMIUM_DAYS" })}
          className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
        >
          <option value="COINS">{t("admin.promoRewardCoins")}</option>
          <option value="PREMIUM_DAYS">{t("admin.promoRewardPremiumDays")}</option>
        </select>
        <input
          type="number"
          min={1}
          value={form.rewardAmount}
          onChange={(e) => setForm({ ...form, rewardAmount: Number(e.target.value) })}
          placeholder={
            form.rewardType === "COINS" ? t("admin.promoAmountCoinsPlaceholder") : t("admin.promoAmountDaysPlaceholder")
          }
          className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
        />
        <label className="block">
          <span className="mb-2 block text-sm text-zinc-400">{t("admin.promoExpiresAtLabel")}</span>
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-zinc-400">{t("admin.promoMaxRedemptionsLabel")}</span>
          <input
            type="number"
            min={1}
            value={form.maxRedemptions}
            onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
            placeholder={t("admin.promoMaxRedemptionsPlaceholder")}
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => void create()}
          disabled={saving || !form.name}
          className="rounded-2xl bg-yellow-400 px-4 py-3 font-bold text-black disabled:opacity-60 md:col-span-2"
        >
          {t("admin.createPromoCodeButton")}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {codes.map((code) => (
          <div key={code.id} className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-lg font-black text-yellow-400">{code.code}</p>
              {code.active ? (
                <button
                  type="button"
                  onClick={() => void deactivate(code.id)}
                  className="rounded-xl border border-red-700 px-3 py-2 text-xs font-bold text-red-300"
                >
                  {t("admin.deactivateButton")}
                </button>
              ) : (
                <span className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-500">
                  {t("admin.inactiveMale")}
                </span>
              )}
            </div>
            <p className="mt-2 font-bold">{code.name}</p>
            {code.description && <p className="text-sm text-zinc-400">{code.description}</p>}
            <p className="mt-2 text-sm text-zinc-300">
              {code.rewardType === "COINS"
                ? t("admin.promoRewardSummaryCoins", { amount: code.rewardAmount })
                : t("admin.promoRewardSummaryPremiumDays", { amount: code.rewardAmount })}
            </p>
            <p className="text-sm text-zinc-500">
              {t("admin.promoRedemptionsSummary", {
                used: code.redeemedCount,
                max: code.maxRedemptions ?? "∞",
              })}
              {code.expiresAt
                ? ` · ${t("admin.promoExpiresOnSummary", { date: new Date(code.expiresAt).toLocaleDateString() })}`
                : ""}
            </p>
          </div>
        ))}
      </div>
      {ConfirmDialog}
    </div>
  );
}
