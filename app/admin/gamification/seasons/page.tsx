"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function AdminGamificationSeasonsPage() {
  const t = useTranslation();

  return (
    <div className="p-6">
      <section className="rounded-md border border-zinc-800 bg-[#111111] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-md bg-yellow-400 p-3 text-black">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-black">{t("gamification.seasons")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              {t("gamification.seasonsDescription")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/admin/referrals" className="rounded-md border border-zinc-800 px-4 py-3 font-bold text-yellow-400">
                {t("gamification.referralSeasons")}
              </Link>
              <Link href="/admin/rankings" className="rounded-md border border-zinc-800 px-4 py-3 font-bold text-yellow-400">
                {t("navbar.rankings")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
