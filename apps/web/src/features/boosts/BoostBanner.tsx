"use client";

import Link from "next/link";
import { Users, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useBoosts, useCountdown } from "./use-boosts";

// Aviso fijo abajo cuando hay un boost de monedas activo: el comunitario
// (con el nombre del Mecenas) o, si no, el personal del usuario.
export function BoostBanner() {
  const t = useTranslation();
  const { data } = useBoosts();
  const community = data?.community ?? null;
  const personal = data?.personal ?? null;
  const countdown = useCountdown(community?.queueEndsAt ?? personal?.endsAt ?? null);

  if (!countdown || countdown.seconds <= 0 || (!community && !personal)) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] flex justify-center sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
      <Link
        href="/pricing#boosts"
        className="pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl border border-[rgb(var(--accent))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm text-[rgb(var(--text))] shadow-[0_12px_36px_rgba(0,0,0,0.25)]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--accent)/0.18)] text-[rgb(var(--accent))]">
          {community ? <Users size={16} /> : <Zap size={16} />}
        </span>
        {community ? (
          <span className="min-w-0">
            <b className="block truncate">{t("pricing.boosts.banner.title", { mult: community.multiplier })}</b>
            <span className="block truncate text-xs text-[rgb(var(--secondary-text))]">
              <span className="font-black text-[rgb(var(--accent))]">{t("pricing.boosts.banner.by", { name: `@${community.sponsor.username}` })}</span>
              {" · "}
              {t("pricing.boosts.banner.left", { time: countdown.label })}
            </span>
          </span>
        ) : (
          <b className="truncate">{t("pricing.boosts.banner.mine", { mult: personal!.multiplier, time: countdown.label })}</b>
        )}
      </Link>
    </div>
  );
}
