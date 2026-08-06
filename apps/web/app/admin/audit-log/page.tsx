"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Pagination } from "../../../src/shared/ui";

interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface PaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function AdminAuditLogPage() {
  const t = useTranslation();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<AuditLogEntry>>(`/admin/audit-log?page=${page}&limit=50`)
      .then((data) => {
        setEntries(data.items);
        setTotalPages(data.meta.totalPages);
      })
      .catch(() => toast.error(t("admin.auditLogLoadError")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="p-6 text-white">
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-yellow-400" />
        <h1 className="text-3xl font-black">{t("admin.auditLogTitle")}</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{t("admin.auditLogDescription")}</p>

      {loading ? (
        <div className="mt-8 text-zinc-500">{t("common.loading")}</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
          {entries.map((entry) => (
            <div key={entry.id} className="border-t border-zinc-800 bg-[#111111] p-4 first:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-yellow-800 bg-yellow-950/30 px-2 py-1 text-xs font-black text-yellow-300">
                  {entry.action}
                </span>
                <time className="text-xs text-zinc-500">{new Date(entry.createdAt).toLocaleString()}</time>
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                {entry.targetType && (
                  <span>
                    {entry.targetType}: {entry.targetId}
                  </span>
                )}
                {entry.metadata && (
                  <pre className="mt-1 overflow-x-auto rounded bg-black p-2 text-xs text-zinc-500">
                    {JSON.stringify(entry.metadata)}
                  </pre>
                )}
              </div>
            </div>
          ))}
          {entries.length === 0 && <p className="p-4 text-sm text-zinc-500">{t("common.noResults")}</p>}
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
