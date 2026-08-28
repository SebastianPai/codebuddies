"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../utils/api";
import { useTranslation } from "../../../../../src/i18n/useTranslation";
import { trackToolAction } from "../../../../../components/analytics/tool-tracking";

type Movement = {
  id: string;
  type: string;
  amount: number;
  balanceAfter?: number | null;
  description?: string | null;
  createdAt: string;
};

type Purchase = {
  id: string;
  priceCoins: number;
  createdAt: string;
  content?: { title: string };
};

type CreatorDashboard = {
  wallet?: {
    availableBalance: number;
    historicalTotal: number;
    totalWithdrawn: number;
    totalSales: number;
    totalCommissions: number;
    movements?: Movement[];
  };
  purchases?: Purchase[];
  analytics?: {
    topSold?: { title: string; salesCount: number } | null;
    conversion: number;
  };
};

function coins(value?: number | null) {
  return new Intl.NumberFormat("es-CO").format(value ?? 0);
}

export default function CreatorWalletPage() {
  const t = useTranslation();
  const [dashboard, setDashboard] = useState<CreatorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const load = async () => {
    setError("");
    try {
      setDashboard(await api.get<CreatorDashboard>("/creator/marketplace/dashboard"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("site.walletLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString();
    return (dashboard?.purchases ?? [])
      .filter((purchase) => new Date(purchase.createdAt).toDateString() === today)
      .reduce((sum, purchase) => sum + purchase.priceCoins, 0);
  }, [dashboard?.purchases]);

  const withdraw = async () => {
    setWithdrawing(true);
    setError("");
    try {
      await api.post("/creator/marketplace/wallet/withdraw");
      trackToolAction("creator_marketplace", "marketplace", "withdraw");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("site.withdrawError"));
    } finally {
      setWithdrawing(false);
    }
  };

  const wallet = dashboard?.wallet;
  const movements = wallet?.movements ?? [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#2b2108,transparent_35%),#050505] px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-[32px] border border-yellow-400/20 bg-[#0f1117] p-8 shadow-2xl shadow-black/40">
          <Link href="/creator/marketplace" className="text-sm font-black text-yellow-400 hover:text-yellow-300">
            {t("site.backToCreatorStudio")}
          </Link>
          <h1 className="mt-3 text-4xl font-black md:text-6xl">{t("site.walletTitle")}</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            {t("site.walletDescription")}
          </p>
        </div>

        {loading && <div className="h-72 animate-pulse rounded-3xl bg-zinc-900" />}

        {error && (
          <div className="rounded-3xl border border-red-900 bg-red-950/40 p-5 text-red-100">
            {error}
          </div>
        )}

        {!loading && (
          <>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[
                [t("site.availableBalanceLabel"), wallet?.availableBalance],
                [t("site.historicalTotalLabel"), wallet?.historicalTotal],
                [t("site.totalWithdrawnLabel"), wallet?.totalWithdrawn],
                [t("site.totalSalesLabel"), wallet?.totalSales],
                [t("site.commissionPaidLabel"), wallet?.totalCommissions],
                [t("site.todayRevenueLabel"), todayRevenue],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-zinc-800 bg-[#111] p-5">
                  <p className="text-sm text-zinc-500">{label}</p>
                  <b className="mt-2 block text-3xl text-yellow-400">{coins(Number(value ?? 0))}</b>
                </div>
              ))}
            </div>

            <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <div className="rounded-3xl border border-yellow-400/20 bg-[#111] p-6">
                <h2 className="text-2xl font-black text-yellow-400">{t("site.withdrawCoinsTitle")}</h2>
                <p className="mt-3 text-sm text-zinc-400">
                  {t("site.withdrawDescription")}
                </p>
                <div className="mt-5 rounded-2xl bg-black p-4">
                  <p className="text-sm text-zinc-500">{t("site.availableToWithdrawLabel")}</p>
                  <b className="mt-1 block text-4xl text-white">{coins(wallet?.availableBalance)} Coins</b>
                </div>
                <button
                  disabled={withdrawing || !wallet?.availableBalance}
                  onClick={() => void withdraw()}
                  className="mt-5 w-full rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {withdrawing ? t("site.withdrawingButton") : t("site.withdrawCoinsButton")}
                </button>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
                <h2 className="text-2xl font-black">{t("site.fullHistoryTitle")}</h2>
                <div className="mt-5 grid gap-3">
                  {!movements.length && (
                    <div className="rounded-2xl border border-dashed border-zinc-800 bg-black p-6 text-center text-zinc-500">
                      {t("site.noWalletMovementsYet")}
                    </div>
                  )}
                  {movements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-black p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <b>{movement.description || movement.type}</b>
                        <p className="text-sm text-zinc-500">
                          {new Date(movement.createdAt).toLocaleString("es-CO")} - {movement.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <b className={movement.amount >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {movement.amount >= 0 ? "+" : ""}
                          {coins(movement.amount)}
                        </b>
                        <p className="text-xs text-zinc-500">{t("site.balancePrefix", { balance: coins(movement.balanceAfter) })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
