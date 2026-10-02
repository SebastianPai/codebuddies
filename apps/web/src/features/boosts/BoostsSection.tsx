"use client";

import { Loader2, Users, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CurrencyIcon } from "@/shared/ui/currency-icon";
import { useBoosts, useCountdown, type BoostPackage } from "./use-boosts";

// Boosts de monedas en /pricing. Precio en USD del catálogo del servidor
// (Paddle cobra un precio ad-hoc sobre el product "Boosts").
export function BoostsSection({ onBuy, checkingOutKey }: { onBuy: (packageKey: string) => void; checkingOutKey: string | null }) {
  const t = useTranslation();
  const { data } = useBoosts();
  if (!data || data.packages.length === 0) return null;

  return (
    <section id="boosts" className="mx-auto mt-16 max-w-5xl scroll-mt-28">
      <div className="text-center">
        <h2 className="text-2xl font-black text-[rgb(var(--text))]">{t("pricing.boosts.title")}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[rgb(var(--secondary-text))]">{t("pricing.boosts.subtitle")}</p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {data.packages.map((pkg) => (
          <BoostCard
            key={pkg.key}
            pkg={pkg}
            available={data.available}
            activeUntil={pkg.scope === "PERSONAL" ? data.personal?.endsAt ?? null : null}
            onBuy={() => onBuy(pkg.key)}
            checkingOut={checkingOutKey === pkg.key}
          />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-[rgb(var(--secondary-text))]">
        {t("pricing.boosts.queued")} {t("pricing.boosts.cap", { max: data.maxMultiplier })}
      </p>
    </section>
  );
}

function BoostCard({
  pkg,
  available,
  activeUntil,
  onBuy,
  checkingOut,
}: {
  pkg: BoostPackage;
  available: boolean;
  activeUntil: string | null;
  onBuy: () => void;
  checkingOut: boolean;
}) {
  const t = useTranslation();
  const countdown = useCountdown(activeUntil);
  const community = pkg.scope === "COMMUNITY";
  const base = community ? "pricing.boosts.community" : "pricing.boosts.personal";
  const price = `US$${pkg.priceUsd.toFixed(2)}`;

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-6 ${
        community ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.08)]" : "border-[rgb(var(--border))] bg-[rgb(var(--card))]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            community ? "bg-[rgb(var(--accent)/0.18)] text-[rgb(var(--accent))]" : "bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]"
          }`}
        >
          {community ? <Users size={22} /> : <Zap size={22} />}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-black text-[rgb(var(--text))]">{t(`${base}.name`)}</h3>
          <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-[rgb(var(--secondary-text))]">
            <CurrencyIcon currency="coins" size={12} /> {t(`${base}.badge`, { mult: pkg.multiplier })}
          </span>
        </div>
      </div>

      <p className="mt-4 flex-1 text-sm text-[rgb(var(--secondary-text))]">{t(`${base}.text`, { mult: pkg.multiplier })}</p>

      {countdown && countdown.seconds > 0 && (
        <p className="mt-3 text-xs font-bold text-[rgb(var(--primary))]">{t("pricing.boosts.active", { time: countdown.label })}</p>
      )}

      <button
        type="button"
        onClick={onBuy}
        disabled={!available || checkingOut}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--button))] px-5 py-3 text-sm font-black uppercase text-[rgb(var(--button-text))] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {checkingOut && <Loader2 size={16} className="animate-spin" />}
        {available ? t("pricing.boosts.buy", { price }) : t("pricing.boosts.soon")}
      </button>
    </article>
  );
}
