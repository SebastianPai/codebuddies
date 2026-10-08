"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ChevronDown, Coins, Gamepad2, Globe, History, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";

type EventRow = {
  id: string;
  userId: string | null;
  username: string | null;
  role: string | null;
  source: "HTTP" | "SOCKET";
  action: string;
  path: string | null;
  statusCode: number | null;
  success: boolean;
  durationMs: number | null;
  ip: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
};

type CoinRow = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  user: { id: string; username: string } | null;
};

type Page<T> = { items: T[]; meta: { page: number; totalPages: number; total: number } };

type Summary = {
  total: number;
  errors: number;
  activeUsers: number;
  topActions: Array<{ action: string; count: number }>;
};

type Tab = "events" | "coins";

// Nombres legibles para las acciones más comunes; el resto se muestra tal cual.
const ACTION_LABELS: Array<[RegExp, string]> = [
  [/^POST \/identity\/login$/, "Inicio de sesión"],
  [/^POST \/identity\/register$/, "Registro"],
  [/^POST \/progress$/, "Leyó una lección"],
  [/quiz\/answer$/, "Respondió un quiz"],
  [/code\/submit$/, "Envió código"],
  [/^POST \/battle-pass\/claim/, "Reclamó premio del pase"],
  [/^POST \/item-upgrades\/:id\/buy$/, "Compró una mejora"],
  [/^POST \/marketplace\/:id\/buy$/, "Compró en el marketplace"],
  [/^shop:item:buy$/, "Compró en la tienda (juego)"],
  [/^shop:item:gift$/, "Regaló un objeto"],
  [/^room:item:place$/, "Colocó un mueble"],
  [/^room:item:remove$/, "Recogió un mueble"],
  [/^createRoom$/, "Creó una sala"],
  [/^POST \/messages\/conversations\/:id\/messages$/, "Envió un mensaje"],
  [/^\w+ \/admin\//, "Acción de admin"],
];

function describe(action: string) {
  return ACTION_LABELS.find(([re]) => re.test(action))?.[1] ?? null;
}

function fmt(date: string) {
  return new Date(date).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Bogota" });
}

export default function AdminHistoryPage() {
  const [tab, setTab] = useState<Tab>("events");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<Page<EventRow> | null>(null);
  const [coins, setCoins] = useState<Page<CoinRow> | null>(null);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [filters, setFilters] = useState({ username: "", action: "", source: "", success: "", from: "", to: "" });
  const [applied, setApplied] = useState(filters);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    Object.entries(applied).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, key === "from" || key === "to" ? new Date(`${value}T${key === "to" ? "23:59:59" : "00:00:00"}-05:00`).toISOString() : value);
    });
    try {
      if (tab === "events") setEvents(await api.get<Page<EventRow>>(`/admin/history?${params}`));
      else setCoins(await api.get<Page<CoinRow>>(`/admin/history/coins?${params}`));
    } catch {
      toast.error("No se pudo cargar el historial");
    }
  }, [tab, page, applied]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void api.get<Summary>("/admin/history/summary").then(setSummary).catch(() => {});
  }, []);

  const apply = () => {
    setPage(1);
    setApplied(filters);
  };

  const meta = tab === "events" ? events?.meta : coins?.meta;
  const input = "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white";

  return (
    <div className="min-h-full bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black">
              <History className="text-yellow-400" /> Historial
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">
              Todo lo que cambia algo en la plataforma, de cualquier usuario: compras, premios, progreso, mensajes,
              muebles, salas y acciones de admin, con resultado y duración. Nunca se guardan contraseñas ni tokens. Se
              conserva 90 días.
            </p>
          </div>
          <Link href="/admin/audit-log" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-yellow-400">
            <ShieldCheck size={15} /> Auditoría de acciones sensibles
          </Link>
        </header>

        {summary && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={<Activity size={16} />} label="Eventos (24 h)" value={summary.total} />
            <Stat icon={<Users size={16} />} label="Usuarios activos (24 h)" value={summary.activeUsers} />
            <Stat icon={<AlertTriangle size={16} />} label="Con error (24 h)" value={summary.errors} tone={summary.errors ? "warn" : undefined} />
            <div className="col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 lg:col-span-1">
              <p className="text-[11px] font-bold uppercase text-zinc-500">Lo más frecuente</p>
              <ul className="mt-1 space-y-0.5 text-xs text-zinc-300">
                {summary.topActions.slice(0, 4).map((row) => (
                  <li key={row.action} className="flex justify-between gap-2">
                    <span className="truncate">{describe(row.action) ?? row.action}</span>
                    <b>{row.count}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {(
            [
              ["events", "Todo", <Activity key="a" size={15} />],
              ["coins", "Monedas", <Coins key="c" size={15} />],
            ] as const
          ).map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold ${
                tab === key ? "bg-yellow-400 text-black" : "border border-zinc-800 text-zinc-300"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
          className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 sm:grid-cols-2 lg:grid-cols-7"
        >
          <input className={input} placeholder="Usuario" value={filters.username} onChange={(e) => setFilters({ ...filters, username: e.target.value })} />
          <input
            className={`${input} lg:col-span-2`}
            placeholder={tab === "events" ? "Acción (ej. buy, room:item, /admin)" : "Motivo (ej. marketplace, item-upgrade)"}
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          />
          {tab === "events" && (
            <>
              <select className={input} value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
                <option value="">Web y juego</option>
                <option value="HTTP">Solo web/API</option>
                <option value="SOCKET">Solo juego</option>
              </select>
              <select className={input} value={filters.success} onChange={(e) => setFilters({ ...filters, success: e.target.value })}>
                <option value="">Éxito y error</option>
                <option value="true">Solo éxitos</option>
                <option value="false">Solo errores</option>
              </select>
              <input type="date" className={input} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} aria-label="Desde" />
              <input type="date" className={input} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} aria-label="Hasta" />
            </>
          )}
          <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-black lg:col-start-7">
            <Search size={15} /> Filtrar
          </button>
        </form>

        {tab === "events" ? (
          <ul className="space-y-2">
            {events?.items.map((row) => {
              const label = describe(row.action);
              const expanded = open === row.id;
              return (
                <li key={row.id} className={`rounded-xl border bg-zinc-950 ${row.success ? "border-zinc-800" : "border-red-900/70"}`}>
                  <button type="button" onClick={() => setOpen(expanded ? null : row.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left">
                    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${row.source === "SOCKET" ? "bg-purple-500/15 text-purple-300" : "bg-sky-500/15 text-sky-300"}`}>
                      {row.source === "SOCKET" ? <Gamepad2 size={14} /> : <Globe size={14} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{label ?? row.action}</span>
                      {label && <span className="block truncate font-mono text-[11px] text-zinc-500">{row.action}</span>}
                    </span>
                    <span className="text-xs text-zinc-300">{row.username ?? (row.userId ? row.userId.slice(0, 8) : "anónimo")}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${row.success ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                      {row.statusCode ?? (row.success ? "OK" : "ERROR")}
                    </span>
                    <span className="w-full text-[11px] text-zinc-500 sm:w-auto">{fmt(row.createdAt)}</span>
                    <ChevronDown size={15} className={`text-zinc-500 transition ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded && (
                    <div className="border-t border-zinc-800 p-3 text-xs text-zinc-300">
                      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                        <Detail label="Usuario" value={row.username ? `${row.username} (${row.role ?? "?"})` : row.userId ?? "anónimo"} />
                        <Detail label="Objetivo" value={row.targetId ?? "—"} />
                        <Detail label="Ruta" value={row.path ?? "—"} />
                        <Detail label="Duración" value={row.durationMs != null ? `${row.durationMs} ms` : "—"} />
                        <Detail label="IP" value={row.ip ?? "—"} />
                        <Detail label="Id de usuario" value={row.userId ?? "—"} />
                      </dl>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black p-3 font-mono text-[11px] text-zinc-400">
                        {JSON.stringify(row.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </li>
              );
            })}
            {events && events.items.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Sin eventos con esos filtros.</p>}
          </ul>
        ) : (
          <ul className="space-y-2">
            {coins?.items.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <span className={`w-20 shrink-0 text-right font-mono text-sm font-black ${row.amount >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {row.amount >= 0 ? "+" : ""}
                  {row.amount}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-300">{row.reason}</span>
                <span className="text-xs text-zinc-300">{row.user?.username ?? "—"}</span>
                <span className="w-full text-[11px] text-zinc-500 sm:w-auto">{fmt(row.createdAt)}</span>
              </li>
            ))}
            {coins && coins.items.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Sin movimientos con esos filtros.</p>}
          </ul>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40">
              Anterior
            </button>
            <span className="text-zinc-400">
              Página {meta.page} de {meta.totalPages} · {meta.total} registros
            </span>
            <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40">
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "warn" }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "warn" ? "border-amber-700/60 bg-amber-950/20" : "border-zinc-800 bg-zinc-950"}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-zinc-500">
        {icon} {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value.toLocaleString("es-CO")}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-zinc-500">{label}:</dt>
      <dd className="min-w-0 break-all">{value}</dd>
    </div>
  );
}
