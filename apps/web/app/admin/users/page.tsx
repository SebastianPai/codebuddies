"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Crown, Search, ShieldAlert } from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Pagination } from "../../../src/shared/ui";

interface AdminUserListItem {
  id: string;
  username: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  experience: number;
  coins: number;
  level: number;
  streak: number;
  createdAt: string;
  lastLoginAt: string | null;
  suspended: boolean;
  premiumSubscriptions: Array<{ id: string; expiresAt: string; origin: "PAYMENT" | "ADMIN" }>;
  _count: { certificates: number; certificateAccesses: number; completions: number };
}

interface PaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

type SortBy = "createdAt" | "coins" | "experience" | "lastLoginAt";

export default function AdminUsersPage() {
  const t = useTranslation();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"" | "STUDENT" | "ADMIN">("");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      sortBy,
      sortOrder,
    });
    if (query) params.set("q", query);
    if (role) params.set("role", role);
    if (premiumOnly) params.set("premiumOnly", "true");

    api
      .get<PaginatedResponse<AdminUserListItem>>(`/admin/users?${params.toString()}`)
      .then((data) => {
        setUsers(data.items);
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      })
      .catch(() => {
        setError(true);
        toast.error(t("admin.usersLoadError"));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, role, premiumOnly, sortBy, sortOrder]);

  const toggleSort = (key: SortBy) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  };

  return (
    <div className="p-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-yellow-400">{t("site.users")}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t("admin.userCountLabel", { count: total })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("admin.searchUsersPlaceholder")}
            className="w-full rounded-lg border border-zinc-800 bg-black/60 py-1.5 pl-8 pr-3 text-sm text-white outline-none focus:border-yellow-400"
          />
        </div>

        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value as "" | "STUDENT" | "ADMIN");
            setPage(1);
          }}
          className="rounded-lg border border-zinc-800 bg-black/60 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400"
        >
          <option value="">{t("admin.filterAnyRole")}</option>
          <option value="STUDENT">STUDENT</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={premiumOnly}
            onChange={(event) => {
              setPremiumOnly(event.target.checked);
              setPage(1);
            }}
            className="accent-yellow-400"
          />
          {t("admin.premiumOnlyFilterLabel")}
        </label>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-6 text-center">
          <p className="text-sm text-red-300">{t("admin.usersLoadError")}</p>
          <button
            onClick={() => setPage((p) => p)}
            className="mt-3 rounded bg-red-900/50 px-4 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">{t("common.loading")}</div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
          {t("admin.noUsersFound")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-[#111]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">
                  {t("admin.userColumnLabel")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">
                  {t("admin.roleColumnLabel")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Premium</th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-zinc-400 hover:text-zinc-200"
                  onClick={() => toggleSort("coins")}
                >
                  {t("admin.coinsColumnLabel")}
                  {sortBy === "coins" && (sortOrder === "asc" ? " ▲" : " ▼")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-zinc-400 hover:text-zinc-200"
                  onClick={() => toggleSort("experience")}
                >
                  XP {sortBy === "experience" && (sortOrder === "asc" ? " ▲" : " ▼")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-zinc-400 hover:text-zinc-200"
                  onClick={() => toggleSort("createdAt")}
                >
                  {t("admin.registeredColumnLabel")}
                  {sortBy === "createdAt" && (sortOrder === "asc" ? " ▲" : " ▼")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-zinc-400 hover:text-zinc-200"
                  onClick={() => toggleSort("lastLoginAt")}
                >
                  {t("admin.lastLoginColumnLabel")}
                  {sortBy === "lastLoginAt" && (sortOrder === "asc" ? " ▲" : " ▼")}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const activePremium = u.premiumSubscriptions[0];
                return (
                  <tr key={u.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-950">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5 font-medium text-white">
                        {u.username}
                        {u.suspended && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-900/40 px-1.5 py-0.5 text-[10px] text-red-400">
                            <ShieldAlert size={10} /> {t("admin.suspendedBadge")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          u.role === "ADMIN"
                            ? "bg-yellow-400/10 text-yellow-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {activePremium ? (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                          <Crown size={12} />
                          {activePremium.origin === "ADMIN"
                            ? t("admin.premiumOriginAdmin")
                            : t("admin.premiumOriginPayment")}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{u.coins.toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-300">{u.experience.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs font-semibold text-blue-400 hover:underline"
                      >
                        {t("admin.viewUserLink")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
