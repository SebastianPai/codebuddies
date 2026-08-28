"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../../../utils/api";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { useTrackToolUsed, trackToolAction } from "../../../../components/analytics/tool-tracking";

type Eligibility = {
  canApply: boolean;
  isCreator: boolean;
  latestApplication?: { status: string; adminMessage?: string };
  checks: Array<{
    key: string;
    label: string;
    passed: boolean;
    current: number;
    required: number;
  }>;
};

type CreatorDashboard = {
  stats: Record<string, number>;
  wallet?: {
    availableBalance: number;
    historicalTotal: number;
    totalWithdrawn: number;
    totalSales: number;
    totalCommissions: number;
  };
  recentContents: Array<{
    id: string;
    title: string;
    status: string;
    priceCoins: number;
    previewUrl?: string;
  }>;
  comments: Array<{
    id: string;
    message: string;
    createdAt: string;
    content?: { title: string };
  }>;
  analytics?: {
    topSold?: { title: string; salesCount: number } | null;
    topFavorited?: { title: string; favoritesCount: number } | null;
    topRated?: { title: string; ratingAverage: number } | null;
    totalViews: number;
    totalDownloads: number;
    conversion: number;
  };
  goals?: Array<{ label: string; current: number; target: number }>;
};

const studioLinks = [
  ["site.navDashboard", "/creator/marketplace"],
  ["site.navMyItems", "/creator/marketplace"],
  ["site.navCreate", "/creator/marketplace/create"],
  ["site.marketplaceTitleNav", "/marketplace"],
  ["site.navWallet", "/creator/marketplace/wallet"],
  ["site.navReviews", "/creator/marketplace"],
  ["site.navStats", "/creator/marketplace"],
  ["site.navProfile", "/creator/marketplace"],
];

export default function CreatorMarketplacePage() {
  const t = useTranslation();
  useTrackToolUsed("creator_marketplace", "marketplace");
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [dashboard, setDashboard] = useState<CreatorDashboard | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    const eligibilityData = await api.get<Eligibility>("/creator/marketplace/eligibility");
    setEligibility(eligibilityData);
    if (eligibilityData.isCreator) {
      setDashboard(await api.get<CreatorDashboard>("/creator/marketplace/dashboard"));
    }
  };

  useEffect(() => {
    void load().catch((err) => setError(err.message));
  }, []);

  const apply = async () => {
    await api.post("/creator/marketplace/apply", { message });
    await load();
  };

  const submit = async (id: string) => {
    await api.post(`/creator/marketplace/contents/${id}/submit`);
    // Si el POST de arriba tira, esta línea nunca se alcanza.
    trackToolAction("creator_marketplace", "marketplace", "submit_content");
    await load();
  };

  if (!eligibility) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        {t("site.loadingCreatorStudio")}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#2b2108,transparent_35%),#050505] px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-[32px] border border-yellow-400/20 bg-[#0f1117] p-8 shadow-2xl shadow-black/40">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            {t("site.creatorStudio")}
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-6xl">{t("site.creatorDashboardTitle")}</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            {t("site.creatorDashboardDescription")}
          </p>
          <nav className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
            {studioLinks.map(([labelKey, href]) => (
              <Link
                key={labelKey}
                href={href}
                className="rounded-full border border-zinc-800 bg-black/50 px-4 py-2 text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-300"
              >
                {t(labelKey)}
              </Link>
            ))}
          </nav>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-red-200">
            {error}
          </div>
        )}

        {!eligibility.isCreator ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
              <h2 className="text-2xl font-black text-yellow-400">{t("site.requirementsTitle")}</h2>
              <div className="mt-5 grid gap-3">
                {eligibility.checks.map((check) => (
                  <div
                    key={check.key}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black p-4"
                  >
                    <span>{check.label}</span>
                    <b className={check.passed ? "text-emerald-400" : "text-red-400"}>
                      {check.passed ? t("site.requirementMet") : `${check.current}/${check.required}`}
                    </b>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
              <h2 className="text-2xl font-black">{t("site.applicationTitle")}</h2>
              {eligibility.latestApplication ? (
                <div className="mt-4 rounded-2xl bg-black p-4 text-zinc-300">
                  {t("site.statusLabel")} <b className="text-yellow-400">{eligibility.latestApplication.status}</b>
                  {eligibility.latestApplication.adminMessage && (
                    <p className="mt-3 text-sm text-zinc-400">
                      {eligibility.latestApplication.adminMessage}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={t("site.creatorPitchPlaceholder")}
                    className="mt-4 h-32 w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none focus:border-yellow-400"
                  />
                  <button
                    disabled={!eligibility.canApply}
                    onClick={() => void apply()}
                    className="mt-4 w-full rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("site.becomeCreatorButton")}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                [t("site.publishedLabel"), dashboard?.stats.published ?? 0],
                [t("gamification.pendingCount"), dashboard?.stats.pending ?? 0],
                [t("site.rejectedLabel"), dashboard?.stats.rejected ?? 0],
                [t("site.availableBalanceLabel"), dashboard?.wallet?.availableBalance ?? 0],
                [t("site.historicalTotalLabel"), dashboard?.wallet?.historicalTotal ?? dashboard?.stats.coinsGenerated ?? 0],
                [t("site.totalWithdrawnLabel"), dashboard?.wallet?.totalWithdrawn ?? 0],
                [t("site.commissionPaidLabel"), dashboard?.wallet?.totalCommissions ?? 0],
                [t("site.salesLabel"), dashboard?.stats.sales ?? 0],
                [t("site.viewsLabel"), dashboard?.analytics?.totalViews ?? 0],
                [t("gamification.conversion"), `${dashboard?.analytics?.conversion ?? 0}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-zinc-800 bg-[#111] p-5">
                  <p className="text-sm text-zinc-500">{label}</p>
                  <b className="mt-2 block text-3xl text-yellow-400">{value}</b>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
                <h2 className="text-2xl font-black text-yellow-400">{t("site.topItemsTitle")}</h2>
                <div className="mt-4 grid gap-3">
                  {[
                    [t("site.topSoldLabel"), dashboard?.analytics?.topSold?.title ?? t("site.noDataFallback")],
                    [t("site.topFavoritedLabel"), dashboard?.analytics?.topFavorited?.title ?? t("site.noDataFallback")],
                    [t("site.topRatedLabel"), dashboard?.analytics?.topRated?.title ?? t("site.noDataFallback")],
                    [t("site.mostUsedLabel"), dashboard?.analytics?.topSold?.title ?? t("site.preparedFallback")],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-zinc-800 bg-black p-4">
                      <p className="text-sm text-zinc-500">{label}</p>
                      <b className="mt-1 block text-white">{value}</b>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
                <h2 className="text-2xl font-black text-yellow-400">{t("site.upcomingGoalsTitle")}</h2>
                <div className="mt-4 grid gap-3">
                  {dashboard?.goals?.map((goal) => {
                    const progress = Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100));
                    return (
                      <div key={goal.label} className="rounded-2xl border border-zinc-800 bg-black p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <b>{goal.label}</b>
                          <span className="text-zinc-500">{goal.current}/{goal.target}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full bg-yellow-400" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-yellow-400/20 bg-[#111] p-6">
                <h2 className="text-2xl font-black text-yellow-400">{t("site.createContentTitle")}</h2>
                <p className="mt-3 text-sm text-zinc-400">
                  {t("site.createContentDescription")}
                </p>
                <Link
                  href="/creator/marketplace/create"
                  className="mt-5 inline-flex w-full justify-center rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black transition hover:bg-yellow-300"
                >
                  {t("site.createNewItemLink")}
                </Link>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
                <h2 className="text-2xl font-black">{t("site.myItemsTitle")}</h2>
                <div className="mt-5 grid gap-3">
                  {!dashboard?.recentContents.length && (
                    <div className="rounded-2xl border border-dashed border-zinc-800 bg-black p-6 text-center text-zinc-500">
                      {t("site.noDraftsYet")}
                    </div>
                  )}
                  {dashboard?.recentContents.map((content) => (
                    <div
                      key={content.id}
                      className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-black p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <b>{content.title}</b>
                        <p className="text-sm text-zinc-500">
                          {content.status} - {content.priceCoins} Coins
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["DRAFT", "CHANGES_REQUESTED"].includes(content.status) && (
                          <Link
                            href={`/creator/marketplace/${content.id}/edit`}
                            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-zinc-200 hover:border-yellow-400"
                          >
                            {t("common.edit")}
                          </Link>
                        )}
                        {["DRAFT", "CHANGES_REQUESTED"].includes(content.status) && (
                          <button
                            onClick={() => void submit(content.id)}
                            className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black"
                          >
                            {t("site.submitAction")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
