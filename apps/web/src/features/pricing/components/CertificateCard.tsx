"use client";

import { Award, Check } from "lucide-react";
import type { PriceByPriceId } from "../lib/usePricePreview";
import type { Translate } from "./translate.type";

interface CertificateCardProps {
  t: Translate;
  priceId: string;
  pricesByPriceId: PriceByPriceId;
  priceStatus: "idle" | "loading" | "ready" | "error";
  onBuy: () => void;
}

export function CertificateCard({ t, priceId, pricesByPriceId, priceStatus, onBuy }: CertificateCardProps) {
  const formattedTotal = pricesByPriceId[priceId]?.formattedTotals.total;
  const features = (t.pricing?.certificate?.features ?? []) as string[];

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8">
      <Award className="text-[rgb(var(--primary))]" size={28} />
      <h2 className="mt-3 text-xl font-black text-[rgb(var(--text))]">{t("pricing.certificate.name")}</h2>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
        {t("pricing.certificate.oneTime")}
      </p>

      <div className="mt-4">
        {priceStatus === "loading" || priceStatus === "idle" ? (
          <div className="h-9 w-24 animate-pulse rounded bg-[rgba(var(--background),0.6)]" />
        ) : priceStatus === "error" || !formattedTotal ? (
          <p className="text-sm text-red-400">{t("pricing.loadError")}</p>
        ) : (
          <p className="text-3xl font-black text-[rgb(var(--text))]">{formattedTotal}</p>
        )}
      </div>

      <ul className="mt-6 space-y-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-[rgb(var(--text))]">
            <Check size={16} className="mt-0.5 shrink-0 text-[rgb(var(--primary))]" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onBuy}
        className="mt-6 w-full rounded-full border-2 border-[rgb(var(--primary))] px-6 py-3 font-black text-[rgb(var(--primary))] transition-colors hover:bg-[rgb(var(--primary))]/10"
      >
        {t("pricing.certificate.cta")}
      </button>
    </div>
  );
}
