"use client";

import { useEffect, useMemo, useState } from "react";
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

interface AdminOption {
  id: string;
  username: string;
}

export default function AdminAuditLogPage() {
  const t = useTranslation();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [admins, setAdmins] = useState<AdminOption[]>([]);

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

  // AdminActionLog no tiene FK a User a propósito (debe sobrevivir aunque se
  // borre la cuenta) -- así que para mostrar "quién" hizo cada acción se
  // resuelve el adminId contra la lista de admins actuales, sin cambiar el
  // backend. Si un admin ya no existe, se muestra el id crudo como fallback.
  useEffect(() => {
    api
      .get<PaginatedResponse<AdminOption>>("/admin/users?role=ADMIN&limit=100")
      .then((data) => setAdmins(data.items))
      .catch(() => {});
  }, []);

  const adminNameById = useMemo(() => {
    const map = new Map<string, string>();
    admins.forEach((admin) => map.set(admin.id, admin.username));
    return map;
  }, [admins]);

  const actionOptions = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.action))).sort(),
    [entries],
  );

  const filteredEntries = actionFilter
    ? entries.filter((entry) => entry.action === actionFilter)
    : entries;

  return (
    <div className="p-6 text-white">
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-yellow-400" />
        <h1 className="text-3xl font-black">{t("admin.auditLogTitle")}</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{t("admin.auditLogDescription")}</p>

      <div className="mt-4 flex items-center gap-3 border-b border-zinc-800 pb-4">
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="rounded-lg border border-zinc-800 bg-black/60 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400"
        >
          <option value="">{t("items.filterAllShort")}</option>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-8 text-zinc-500">{t("common.loading")}</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="border-t border-zinc-800 bg-[#111111] p-4 first:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-yellow-800 bg-yellow-950/30 px-2 py-1 text-xs font-black text-yellow-300">
                    {entry.action}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {t("admin.byAdminLabel", {
                      admin: adminNameById.get(entry.adminId) ?? entry.adminId.slice(0, 8),
                    })}
                  </span>
                </div>
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
          {filteredEntries.length === 0 && <p className="p-4 text-sm text-zinc-500">{t("common.noResults")}</p>}
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
