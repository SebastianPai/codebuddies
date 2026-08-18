"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User as UserIcon, Loader2 } from "lucide-react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../i18n/useTranslation";

interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface AdminNavSection {
  id: string;
  title: string;
  items: AdminNavItem[];
}

interface UserResult {
  id: string;
  username: string;
  email: string;
}

export function CommandPalette({
  open,
  onClose,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  sections: AdminNavSection[];
}) {
  const t = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setUsers([]);
      const timeout = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Búsqueda de usuarios en vivo (debounced) contra el endpoint real de
  // admin/users -- pagos/incidencias/etc se suman acá el día que existan
  // sus propios endpoints de búsqueda, no antes.
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setUsers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .get<{ items: UserResult[] }>(
          `/admin/users?q=${encodeURIComponent(query)}&limit=5`,
        )
        .then((res) => {
          if (!cancelled) setUsers(res.items);
        })
        .catch(() => {
          if (!cancelled) setUsers([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, open]);

  const matchingSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ href: string; label: string; sectionTitle: string }> = [];
    sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.label.toLowerCase().includes(q)) {
          results.push({ href: item.href, label: item.label, sectionTitle: section.title });
        }
      });
    });
    return results.slice(0, 8);
  }, [query, sections]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!open) return null;

  const hasQuery = query.trim().length >= 2;
  const noResults = hasQuery && !loading && users.length === 0 && matchingSections.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <Search size={16} className="text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("admin.searchAdminPlaceholder")}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
          {loading && <Loader2 size={14} className="animate-spin text-zinc-600" />}
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {!hasQuery && (
            <p className="px-3 py-6 text-center text-xs text-zinc-600">
              {t("admin.paletteTypeToSearch")}
            </p>
          )}

          {users.length > 0 && (
            <div className="mb-2">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                {t("admin.paletteUsersGroup")}
              </p>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                  className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  <UserIcon size={14} className="text-zinc-500" />
                  <span>{u.username}</span>
                  <span className="text-xs text-zinc-500">{u.email}</span>
                </button>
              ))}
            </div>
          )}

          {matchingSections.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                {t("admin.paletteSectionsGroup")}
              </p>
              {matchingSections.map((result) => (
                <button
                  key={result.href}
                  onClick={() => navigate(result.href)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  <span>{result.label}</span>
                  <span className="text-xs text-zinc-500">{result.sectionTitle}</span>
                </button>
              ))}
            </div>
          )}

          {noResults && (
            <p className="px-3 py-6 text-center text-xs text-zinc-600">{t("items.noResults")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
