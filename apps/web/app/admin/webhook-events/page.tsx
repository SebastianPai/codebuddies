"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Webhook } from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Pagination } from "../../../src/shared/ui";

interface WebhookEvent {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  status: "RECEIVED" | "PROCESSED" | "FAILED" | "IGNORED";
  error: string | null;
  receivedAt: string;
  processedAt: string | null;
  retryCount: number;
}

interface PaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_STYLES: Record<string, string> = {
  PROCESSED: "bg-green-900/40 text-green-400",
  RECEIVED: "bg-yellow-900/40 text-yellow-400",
  FAILED: "bg-red-900/40 text-red-400",
  IGNORED: "bg-zinc-800 text-zinc-400",
};

export default function AdminWebhookEventsPage() {
  const t = useTranslation();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);

    api
      .get<PaginatedResponse<WebhookEvent>>(`/admin/webhook-events?${params.toString()}`)
      .then((data) => {
        setEvents(data.items);
        setTotal(data.meta.total);
        setTotalPages(data.meta.totalPages);
      })
      .catch(() => {
        setError(true);
        toast.error(t("admin.webhookEventsLoadError"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const reprocess = async (id: string) => {
    if (!confirm(t("admin.reprocessConfirm"))) return;
    setReprocessingId(id);
    try {
      await api.post(`/admin/webhook-events/${id}/reprocess`);
      toast.success(t("admin.reprocessSuccess"));
      load();
    } catch {
      toast.error(t("admin.reprocessError"));
    } finally {
      setReprocessingId(null);
    }
  };

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center gap-3">
        <Webhook className="text-yellow-400" />
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">{t("admin.webhooksNav")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("admin.webhookEventsPageDescription")}</p>
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
          {["RECEIVED", "PROCESSED", "FAILED", "IGNORED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-6 text-center text-sm text-red-300">
          {t("admin.webhookEventsLoadError")}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-zinc-500">{t("common.loading")}</div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
          {t("admin.noWebhookEventsFound")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-[#111]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Provider</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Event</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("common.status")}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Retries</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">{t("admin.registeredColumnLabel")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-950">
                  <td className="px-4 py-3 text-zinc-300">{event.provider}</td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-300">{event.eventType}</p>
                    <p className="text-xs text-zinc-600">{event.eventId}</p>
                    {event.error && <p className="mt-1 text-xs text-red-400">{event.error}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[event.status]}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{event.retryCount}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(event.receivedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {event.status !== "PROCESSED" && (
                      <button
                        disabled={reprocessingId === event.id}
                        onClick={() => reprocess(event.id)}
                        className="rounded bg-zinc-800 px-3 py-1 text-xs font-semibold text-yellow-400 hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {reprocessingId === event.id ? "..." : t("admin.reprocessButton")}
                      </button>
                    )}
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
