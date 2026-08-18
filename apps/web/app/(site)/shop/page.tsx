"use client";

import { Coins } from "lucide-react";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { getGameUrl } from "@/config/env";

export default function ShopPage() {
  const t = useTranslation();

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 text-[rgb(var(--text))]">
      <main className="max-w-xl rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center">
        <Coins className="mx-auto text-amber-400" size={40} />
        <h1 className="mt-4 text-3xl font-black uppercase text-[rgb(var(--primary))]">
          {t("pricing.shop.title")}
        </h1>
        <p className="mt-4 text-[rgb(var(--secondary-text))]">{t("pricing.shop.body")}</p>
        <a
          href={getGameUrl()}
          className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-[rgb(var(--primary))] px-6 py-3 font-black uppercase text-[rgb(var(--button-text))]"
        >
          {t("pricing.shop.cta")}
        </a>
      </main>
    </div>
  );
}
