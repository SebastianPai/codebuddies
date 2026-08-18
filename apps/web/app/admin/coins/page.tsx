"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Coins } from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Pagination } from "../../../src/shared/ui";

interface CoinPurchase {
  id: string;
  package: string;
  coins: number;
  amount: string;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED";
  createdAt: string;
  completedAt: string | null;
  user: { id: string; username: string; email: string };
}

interface LedgerEntry {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  user: { id: string; username: string; email: string };
}

interface PaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-green-900/40 text-green-400",
  PENDING: "bg-yellow-900/40 text-yellow-400",
  FAILED: "bg-red-900/40 text-red-400",
  REFUNDED: "bg-zinc-800 text-zinc-400",
  CANCELLED: "bg-zinc-800 text-zinc-400",
};

type Tab = "purchases" | "ledger";

export default function AdminCoinsPage() {
  const t = useTranslation();
  const [tab, setTab] = useState<Tab>("purchases");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [purchases, setPurchases] = useState<CoinPurchase[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const endpoint =
      tab === "purchases"
        ? `/admin/coins/purchases?page=${page}&limit=20`
        : `/admin/coins/ledger?page=${page}&limit=20`;

    api
      .get<PaginatedResponse<CoinPurchase | LedgerEntry>>(endpoint)
      .then((data) => {
        if (tab === "purchases") setPurchases(data.items as CoinPurchase[]);
        else setLedger(data.items as LedgerEntry[]);
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      })
      .catch(() => {
        setError(true);
        toast.error(t("admin.coinPurchasesLoadError"));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab]);

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center gap-3">
        <Coins className="text-yellow-400" />
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">{t("admin.coinsEconomyNav")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("admin.coinsPageDescription")}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {(["purchases", "ledger"] as Tab[]).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === tabId
                ? "border-b-2 border-yellow-400 text-yellow-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tabId === "purchases" ? t("admin.purchasesTabLabel") : t("admin.ledgerTabLabel")}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-6 text-center text-sm text-red-300">
          {t("admin.coinPurchasesLoadError")}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">{t("common.loading")}</div>
      ) : tab === "purchases" ? (
        purchases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
            {t("admin.noCoinPurchasesFound")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-[#111]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.userColumnLabel")}</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.coinPurchasesNav")}</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("common.amount")}</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.registeredColumnLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-950">
                    <td className="px-4 py-3">
                      <p className="text-white">{purchase.user.username}</p>
                      <p className="text-xs text-zinc-500">{purchase.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{purchase.coins.toLocaleString()} coins</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {purchase.currency} {purchase.amount}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[purchase.status]}`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(purchase.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : ledger.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
          {t("admin.noLedgerEntriesFound")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-[#111]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.userColumnLabel")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("common.amount")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("common.reason")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.registeredColumnLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-950">
                  <td className="px-4 py-3">
                    <p className="text-white">{entry.user.username}</p>
                    <p className="text-xs text-zinc-500">{entry.user.email}</p>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${entry.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {entry.amount >= 0 ? "+" : ""}
                    {entry.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{entry.reason}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
