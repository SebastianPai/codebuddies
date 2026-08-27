"use client";

import { Check, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { PriceByPriceId } from "../lib/usePricePreview";
import type { Translate } from "./translate.type";

type BillingInterval = "monthly" | "yearly";

interface ProPricingCardProps {
  t: Translate;
  billingInterval: BillingInterval;
  onBillingIntervalChange: (interval: BillingInterval) => void;
  monthlyPriceId: string;
  yearlyPriceId: string;
  pricesByPriceId: PriceByPriceId;
  priceStatus: "idle" | "loading" | "ready" | "error";
  onCheckout: () => void;
  checkingOut: boolean;
  activeUntil: string | null;
}

export function ProPricingCard({
  t,
  billingInterval,
  onBillingIntervalChange,
  monthlyPriceId,
  yearlyPriceId,
  pricesByPriceId,
  priceStatus,
  onCheckout,
  checkingOut,
  activeUntil,
}: ProPricingCardProps) {
  const activePriceId = billingInterval === "monthly" ? monthlyPriceId : yearlyPriceId;
  const lineItem = pricesByPriceId[activePriceId];
  const formattedTotal = lineItem?.formattedTotals.total;
  const features = (t.pricing?.pro?.features ?? []) as string[];

  return (
    <div className="rounded-2xl border-2 border-[rgb(var(--primary))] bg-[rgb(var(--card))] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
      <div className="flex items-center gap-2">
        <Sparkles className="text-[rgb(var(--primary))]" size={22} />
        <h2 className="text-2xl font-black text-[rgb(var(--text))]">{t("pricing.pro.name")}</h2>
      </div>
      <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">{t("pricing.pro.description")}</p>

      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--primary))]/10 px-3 py-1 text-xs font-bold text-[rgb(var(--primary))]">
        {t("pricing.pro.trialBadge")}
      </span>

      <div className="mt-6 flex items-center gap-1 rounded-full bg-[rgba(var(--background),0.6)] p-1">
        <button
          type="button"
          onClick={() => onBillingIntervalChange("monthly")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            billingInterval === "monthly"
              ? "bg-[rgb(var(--primary))] text-[rgb(var(--button-text))]"
              : "text-[rgb(var(--secondary-text))]"
          }`}
        >
          {t("pricing.pro.monthly")}
        </button>
        <button
          type="button"
          onClick={() => onBillingIntervalChange("yearly")}
          className={`relative flex-1 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            billingInterval === "yearly"
              ? "bg-[rgb(var(--primary))] text-[rgb(var(--button-text))]"
              : "text-[rgb(var(--secondary-text))]"
          }`}
        >
          {t("pricing.pro.yearly")}
          <span className="ml-1.5 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-black text-green-500">
            {t("pricing.pro.yearlyBadge")}
          </span>
        </button>
      </div>

      <div className="mt-6">
        {priceStatus === "loading" || priceStatus === "idle" ? (
          <div className="h-11 w-32 animate-pulse rounded bg-[rgba(var(--background),0.6)]" />
        ) : priceStatus === "error" || !formattedTotal ? (
          <p className="text-sm text-red-400">{t("pricing.loadError")}</p>
        ) : (
          <p className="text-4xl font-black text-[rgb(var(--text))]">
            {formattedTotal}
            <span className="text-base font-semibold text-[rgb(var(--secondary-text))]">
              {billingInterval === "monthly" ? t("pricing.pro.perMonth") : t("pricing.pro.perYear")}
            </span>
          </p>
        )}
      </div>

      {activeUntil ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-full border border-[rgb(var(--primary))]/40 bg-[rgb(var(--primary))]/10 px-6 py-3 text-sm font-bold text-[rgb(var(--primary))]">
          <CheckCircle2 size={18} />
          {t("pricing.pro.alreadySubscribed", { date: new Date(activeUntil).toLocaleDateString() })}
        </div>
      ) : (
        <button
          onClick={onCheckout}
          disabled={checkingOut || priceStatus !== "ready"}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--primary))] px-6 py-3 font-black text-[rgb(var(--button-text))] shadow-lg transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
        >
          {checkingOut && <Loader2 className="animate-spin" size={18} />}
          {t("pricing.pro.cta")}
        </button>
      )}

      <div className="mt-8 border-t border-[rgb(var(--border))] pt-6">
        <p className="text-xs font-black uppercase tracking-wide text-[rgb(var(--secondary-text))]">
          {t("pricing.pro.featuresTitle")}
        </p>
        <ul className="mt-4 space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-[rgb(var(--text))]">
              <Check size={18} className="mt-0.5 shrink-0 text-[rgb(var(--primary))]" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
