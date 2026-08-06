"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Pagination } from "../../../src/shared/ui";

interface ContentReport {
  id: string;
  reason: string;
  description: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  user: { username: string; email: string };
  lesson: { translations: Array<{ title: string }> } | null;
  exercise: { translations: Array<{ title: string }> } | null;
}

interface PaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function AdminContentReportsPage() {
  const t = useTranslation();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<PaginatedResponse<ContentReport>>(
        `/admin/content-reports?page=${page}&limit=20&status=${statusFilter}`,
      );
      setReports(data.items);
      setTotalPages(data.meta.totalPages);
    } catch {
      toast.error(t("admin.contentReportsLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const resolve = async (id: string, status: "RESOLVED" | "DISMISSED") => {
    await api.patch(`/admin/content-reports/${id}`, { status });
    toast.success(t("admin.contentReportUpdated"));
    await load();
  };

  return (
    <div className="p-6 text-white">
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-yellow-400" />
        <h1 className="text-3xl font-black">{t("admin.contentReportsTitle")}</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{t("admin.contentReportsDescription")}</p>

      <div className="mt-4 flex gap-2">
        {(["OPEN", "RESOLVED", "DISMISSED"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              statusFilter === status ? "bg-yellow-400 text-black" : "border border-zinc-800 text-zinc-400"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 text-zinc-500">{t("common.loading")}</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
          {reports.map((report) => {
            const contentTitle =
              report.lesson?.translations[0]?.title ?? report.exercise?.translations[0]?.title ?? "-";
            return (
              <div key={report.id} className="border-t border-zinc-800 bg-[#111111] p-4 first:border-t-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-black">{report.reason}</p>
                    <p className="text-xs text-zinc-500">
                      {contentTitle} — {report.user.username}
                    </p>
                  </div>
                  <time className="text-xs text-zinc-600">{new Date(report.createdAt).toLocaleString()}</time>
                </div>
                {report.description && <p className="mt-2 text-sm text-zinc-400">{report.description}</p>}
                {report.status === "OPEN" && (
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => void resolve(report.id, "RESOLVED")} className="flex items-center gap-1 rounded-md border border-green-800 px-2 py-1 text-xs text-green-300">
                      <Check size={12} /> {t("admin.contentReportResolve")}
                    </button>
                    <button type="button" onClick={() => void resolve(report.id, "DISMISSED")} className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                      <X size={12} /> {t("admin.contentReportDismiss")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {reports.length === 0 && <p className="p-4 text-sm text-zinc-500">{t("common.noResults")}</p>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
