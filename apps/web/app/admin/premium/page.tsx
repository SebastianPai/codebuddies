"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Crown } from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Pagination } from "../../../src/shared/ui";

interface PremiumSubscription {
  id: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  origin: "PAYMENT" | "ADMIN";
  provider: string;
  reason: string | null;
  startedAt: string;
  expiresAt: string;
  user: { id: string; username: string; email: string };
}

interface PaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function AdminPremiumPage() {
  const t = useTranslation();
  const [subs, setSubs] = useState<PremiumSubscription[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
    if (origin) params.set("origin", origin);
    if (expiringSoon) params.set("expiringSoon", "true");

    api
      .get<PaginatedResponse<PremiumSubscription>>(`/admin/premium/subscriptions?${params.toString()}`)
      .then((data) => {
        setSubs(data.items);
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      })
      .catch(() => {
        setError(true);
        toast.error(t("admin.premiumLoadError"));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, origin, expiringSoon]);

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="text-yellow-400" />
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">{t("admin.premiumSubscriptionsNav")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("admin.premiumPageDescription")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 pb-4">
        <span className="text-xs text-zinc-500">{t("admin.resultsCountLabel", { count: total })}</span>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-800 bg-black/60 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400"
        >
          <option value="">{t("items.filterAllShort")}</option>
          {["ACTIVE", "CANCELLED", "EXPIRED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={origin}
          onChange={(event) => {
            setOrigin(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-800 bg-black/60 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400"
        >
          <option value="">{t("items.filterAllShort")}</option>
          <option value="PAYMENT">{t("admin.premiumOriginPayment")}</option>
          <option value="ADMIN">{t("admin.premiumOriginAdmin")}</option>
        </select>

        <label className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={expiringSoon}
            onChange={(event) => {
              setExpiringSoon(event.target.checked);
              setPage(1);
            }}
            className="accent-yellow-400"
          />
          {t("admin.expiringSoonFilterLabel")}
        </label>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-6 text-center text-sm text-red-300">
          {t("admin.premiumLoadError")}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">{t("common.loading")}</div>
      ) : subs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
          {t("admin.noPremiumFound")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-[#111]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.userColumnLabel")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("common.status")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.originColumnLabel")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Provider</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.registeredColumnLabel")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.expiresColumnLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr key={sub.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-950">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${sub.user.id}`} className="text-white hover:underline">
                      {sub.user.username}
                    </Link>
                    <p className="text-xs text-zinc-500">{sub.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        sub.status === "ACTIVE"
                          ? "bg-green-900/40 text-green-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {sub.origin === "ADMIN" ? t("admin.premiumOriginAdmin") : t("admin.premiumOriginPayment")}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{sub.provider}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(sub.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(sub.expiresAt).toLocaleDateString()}
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
