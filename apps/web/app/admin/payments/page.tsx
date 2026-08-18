"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CreditCard } from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Pagination } from "../../../src/shared/ui";

interface CertificateOrder {
  id: string;
  userId: string;
  courseId: string;
  amount: string;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  paymentProvider: string;
  providerPaymentId: string | null;
  createdAt: string;
  paidAt: string | null;
  user: { id: string; username: string; email: string };
}

interface PaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-900/40 text-green-400",
  PENDING: "bg-yellow-900/40 text-yellow-400",
  FAILED: "bg-red-900/40 text-red-400",
  REFUNDED: "bg-zinc-800 text-zinc-400",
  CANCELLED: "bg-zinc-800 text-zinc-400",
};

export default function AdminPaymentsPage() {
  const t = useTranslation();
  const [orders, setOrders] = useState<CertificateOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);

    api
      .get<PaginatedResponse<CertificateOrder>>(`/admin/payments/certificate-orders?${params.toString()}`)
      .then((data) => {
        setOrders(data.items);
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      })
      .catch(() => {
        setError(true);
        toast.error(t("admin.paymentsLoadError"));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="text-yellow-400" />
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">{t("admin.paymentsNav")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("admin.paymentsPageDescription")}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <span className="text-xs text-zinc-500">{t("admin.resultsCountLabel", { count: total })}</span>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="ml-auto rounded-lg border border-zinc-800 bg-black/60 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400"
        >
          <option value="">{t("items.filterAllShort")}</option>
          {["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-6 text-center text-sm text-red-300">
          {t("admin.paymentsLoadError")}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">{t("common.loading")}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
          {t("admin.noPaymentsFound")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-[#111]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.userColumnLabel")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("common.amount")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("common.status")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Provider</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.registeredColumnLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-950">
                  <td className="px-4 py-3">
                    <p className="text-white">{order.user.username}</p>
                    <p className="text-xs text-zinc-500">{order.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {order.currency} {order.amount}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{order.paymentProvider}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(order.createdAt).toLocaleString()}
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
