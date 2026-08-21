"use client";

import { Loader2 } from "lucide-react";
import type { CoinPack } from "@/config/paddle-catalog";
import type { PriceByPriceId } from "../lib/usePricePreview";
import type { Translate } from "./translate.type";
import { CurrencyIcon } from "@/shared/ui/currency-icon";
import { RarityText } from "@/shared/ui/rarity-text";

interface CoinPackCardProps {
  t: Translate;
  pack: CoinPack;
  pricesByPriceId: PriceByPriceId;
  priceStatus: "idle" | "loading" | "ready" | "error";
  onBuy: () => void;
  checkingOut: boolean;
}

export function CoinPackCard({ t, pack, pricesByPriceId, priceStatus, onBuy, checkingOut }: CoinPackCardProps) {
  const formattedTotal = pricesByPriceId[pack.priceId]?.formattedTotals.total;

  return (
    <div
      className={`relative rounded-2xl border p-6 text-center ${
        pack.popular
          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card))]"
      }`}
    >
      {pack.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[rgb(var(--primary))] px-3 py-1 text-[10px] font-black uppercase text-[rgb(var(--button-text))] shadow">
          {t("pricing.coins.mostPopular")}
        </span>
      )}

      <CurrencyIcon currency="coins" className="mx-auto" size={28} />
      {/* Locale fijo ("en-US"): toLocaleString() sin locale explicito usa el
         default del runtime, que difiere entre el servidor (Node) y el
         navegador del visitante -- React tira un mismatch de hidratacion
         (#418) apenas esos dos textos no coinciden byte a byte. */}
      <p className="mt-3 text-2xl font-black">
        <RarityText effect="goldRank">{pack.coins.toLocaleString("en-US")}</RarityText>
      </p>
      <p className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
        {(t.pricing?.coins?.packs?.[pack.key] as string) ?? pack.name}
      </p>
      {pack.bonusCoins ? (
        <p className="mt-1 text-xs font-bold text-green-500">
          {t("pricing.coins.bonus", { bonus: pack.bonusCoins.toLocaleString("en-US") })}
        </p>
      ) : null}

      <div className="mt-4">
        {priceStatus === "loading" || priceStatus === "idle" ? (
          <div className="mx-auto h-7 w-16 animate-pulse rounded bg-[rgba(var(--background),0.6)]" />
        ) : priceStatus === "error" || !formattedTotal ? (
          <p className="text-xs text-red-400">{t("pricing.loadError")}</p>
        ) : (
          <p className="text-xl font-black text-[rgb(var(--text))]">{formattedTotal}</p>
        )}
      </div>

      <button
        onClick={onBuy}
        disabled={checkingOut || priceStatus !== "ready"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-black text-[rgb(var(--button-text))] disabled:opacity-60"
      >
        {checkingOut && <Loader2 className="animate-spin" size={16} />}
        {t("pricing.coins.cta")}
      </button>
    </div>
  );
}
