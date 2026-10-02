"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Crown, Gift, MessageCircle, Pencil, Plus, Search, Shirt, Sofa, Sparkles, Trash2, Trophy, Type, X, Zap } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";

import { CurrencyIcon } from "@/shared/ui/currency-icon";
type Status = "UPCOMING" | "ACTIVE" | "ENDED";
type Track = "FREE" | "PREMIUM";

interface Season {
  id: string;
  name: string;
  description: string | null;
  seasonNumber: number;
  status: Status;
  startsAt: string;
  endsAt: string;
  totalLevels: number;
  progressMode: "XP" | "DAILY";
  _count?: { tiers: number; progress: number };
}

interface Tier {
  id: string;
  level: number;
  track: Track;
  rewardType: string;
  amount: number | null;
  itemId: string | null;
  label: string;
  sortOrder: number;
}

interface CatalogItem {
  id: string;
  name: string;
  imageUrl: string | null;
  group: "NAME_EFFECT" | "CHAT_BUBBLE" | "AVATAR" | "WORLD";
  rarity: number;
}

interface Catalog {
  items: CatalogItem[];
  badges: Array<{ id: string; name: string; icon: string | null }>;
  titles: Array<{ id: string; name: string }>;
}

// Tipos de premio tal como los piensa el admin; varios terminan siendo un
// Item del catálogo (rewardType ITEM) con distinto grupo.
type RewardKind = "COINS" | "XP" | "NAME_EFFECT" | "CHAT_BUBBLE" | "AVATAR" | "WORLD" | "BADGE" | "TITLE";

const KINDS: Array<{ kind: RewardKind; label: string; icon: React.ReactNode }> = [
  { kind: "COINS", label: "Monedas", icon: <CurrencyIcon currency="coins" size={15} /> },
  { kind: "XP", label: "XP", icon: <Zap size={15} /> },
  { kind: "NAME_EFFECT", label: "Nombre personalizado", icon: <Type size={15} /> },
  { kind: "CHAT_BUBBLE", label: "Burbuja de chat", icon: <MessageCircle size={15} /> },
  { kind: "AVATAR", label: "Ropa / avatar", icon: <Shirt size={15} /> },
  { kind: "WORLD", label: "Mueble / objeto", icon: <Sofa size={15} /> },
  { kind: "BADGE", label: "Insignia", icon: <Trophy size={15} /> },
  { kind: "TITLE", label: "Título", icon: <Crown size={15} /> },
];

const STATUS_STYLE: Record<Status, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  UPCOMING: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  ENDED: "bg-zinc-700/30 text-zinc-400 border-zinc-700",
};
const STATUS_LABEL: Record<Status, string> = { ACTIVE: "Activa", UPCOMING: "Programada", ENDED: "Terminada" };

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });
}

function toLocalInput(iso: string) {
  // datetime-local en hora de Colombia (UTC-5 fijo).
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return new Date(`${value}:00-05:00`).toISOString();
}

function kindOf(tier: Tier, catalog: Catalog | null): RewardKind {
  if (tier.rewardType === "COINS" || tier.rewardType === "XP" || tier.rewardType === "BADGE" || tier.rewardType === "TITLE") {
    return tier.rewardType as RewardKind;
  }
  const item = catalog?.items.find((i) => i.id === tier.itemId);
  return item?.group ?? "WORLD";
}

export default function AdminBattlePassPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [season, setSeason] = useState<(Season & { tiers: Tier[] }) | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [showMonthly, setShowMonthly] = useState(false);
  const [editing, setEditing] = useState<Partial<Tier> | null>(null);

  const loadSeasons = useCallback(async () => {
    const list = await api.get<Season[]>("/admin/battle-pass/seasons");
    setSeasons(list);
    setSelectedId((current) => current ?? list.find((s) => s.status === "ACTIVE")?.id ?? list[0]?.id ?? null);
  }, []);

  const loadSeason = useCallback(async (id: string) => {
    setSeason(await api.get<Season & { tiers: Tier[] }>(`/admin/battle-pass/seasons/${id}`));
  }, []);

  useEffect(() => {
    void loadSeasons().catch(() => toast.error("No se pudieron cargar las temporadas"));
    void api.get<Catalog>("/admin/battle-pass/reward-catalog").then(setCatalog).catch(() => {});
  }, [loadSeasons]);

  useEffect(() => {
    if (selectedId) void loadSeason(selectedId);
  }, [selectedId, loadSeason]);

  const refresh = async () => {
    await loadSeasons();
    if (selectedId) await loadSeason(selectedId);
  };

  return (
    <div className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black">
              <Gift className="text-yellow-400" /> Pase de batalla
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Cada temporada mensual va del día 1 a las 00:00 al último día del mes a las 23:59 (hora de Colombia) y
              tiene un día de premios por cada día del mes (28, 29, 30 o 31). Al empezar un mes sin temporada
              programada, se crea sola copiando los premios de la anterior.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMonthly(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-black text-black"
          >
            <Plus size={16} /> Nueva temporada mensual
          </button>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-2">
            {seasons.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedId === s.id ? "border-yellow-400 bg-yellow-400/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold">{s.name}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                  <CalendarDays size={12} /> {fmtDate(s.startsAt)} → {fmtDate(s.endsAt)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {s.totalLevels} días · {s._count?.tiers ?? 0} premios · {s._count?.progress ?? 0} jugadores
                </p>
              </button>
            ))}
            {seasons.length === 0 && <p className="text-sm text-zinc-500">Todavía no hay temporadas.</p>}
          </aside>

          <section className="min-w-0">
            {season ? (
              <>
                <SeasonEditor season={season} onSaved={refresh} />
                <RewardBoard
                  season={season}
                  catalog={catalog}
                  onAdd={(level, track) => setEditing({ level, track, rewardType: "COINS", amount: 50, label: "" })}
                  onEdit={(tier) => setEditing(tier)}
                  onDelete={async (tier) => {
                    if (!window.confirm(`¿Borrar "${tier.label}" del día ${tier.level}?`)) return;
                    await api.delete(`/admin/battle-pass/tiers/${tier.id}`);
                    await refresh();
                  }}
                />
              </>
            ) : (
              <p className="text-sm text-zinc-500">Elige una temporada.</p>
            )}
          </section>
        </div>
      </div>

      {showMonthly && (
        <MonthlySeasonDialog
          seasons={seasons}
          onClose={() => setShowMonthly(false)}
          onCreated={async (id) => {
            setShowMonthly(false);
            setSelectedId(id);
            await refresh();
          }}
        />
      )}

      {editing && season && (
        <TierDialog
          tier={editing}
          season={season}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function SeasonEditor({ season, onSaved }: { season: Season; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(season.name);
  const [status, setStatus] = useState<Status>(season.status);
  const [startsAt, setStartsAt] = useState(toLocalInput(season.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(season.endsAt));
  const [totalLevels, setTotalLevels] = useState(season.totalLevels);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(season.name);
    setStatus(season.status);
    setStartsAt(toLocalInput(season.startsAt));
    setEndsAt(toLocalInput(season.endsAt));
    setTotalLevels(season.totalLevels);
  }, [season]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/battle-pass/seasons/${season.id}`, {
        name,
        status,
        startsAt: fromLocalInput(startsAt),
        endsAt: fromLocalInput(endsAt),
        totalLevels,
      });
      toast.success("Temporada guardada");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const input = "mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs text-zinc-400 sm:col-span-2">
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </label>
        <label className="text-xs text-zinc-400">
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={input}>
            <option value="UPCOMING">Programada</option>
            <option value="ACTIVE">Activa</option>
            <option value="ENDED">Terminada</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Empieza (hora Colombia)
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={input} />
        </label>
        <label className="text-xs text-zinc-400">
          Termina (hora Colombia)
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={input} />
        </label>
        <label className="text-xs text-zinc-400">
          Días / niveles
          <input
            type="number"
            min={1}
            max={100}
            value={totalLevels}
            onChange={(e) => setTotalLevels(Math.max(1, Number(e.target.value) || 1))}
            className={input}
          />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar temporada"}
        </button>
      </div>
    </div>
  );
}

function RewardBoard({
  season,
  catalog,
  onAdd,
  onEdit,
  onDelete,
}: {
  season: Season & { tiers: Tier[] };
  catalog: Catalog | null;
  onAdd: (level: number, track: Track) => void;
  onEdit: (tier: Tier) => void;
  onDelete: (tier: Tier) => Promise<void>;
}) {
  const days = Array.from({ length: season.totalLevels }, (_, i) => i + 1);
  const byCell = useMemo(() => {
    const map = new Map<string, Tier[]>();
    for (const tier of season.tiers) {
      const key = `${tier.level}:${tier.track}`;
      map.set(key, [...(map.get(key) ?? []), tier]);
    }
    return map;
  }, [season.tiers]);
  const outOfRange = season.tiers.filter((t) => t.level > season.totalLevels);

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-black">Premios por día</h2>
      {outOfRange.length > 0 && (
        <p className="mb-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-200">
          {outOfRange.length} premio(s) están en días mayores a {season.totalLevels} y nadie podrá alcanzarlos.
        </p>
      )}
      <div className="hidden grid-cols-[70px_1fr_1fr] gap-2 px-2 pb-2 text-xs font-bold uppercase text-zinc-500 md:grid">
        <span>Día</span>
        <span>Gratis</span>
        <span className="text-yellow-400">Premium</span>
      </div>
      <div className="space-y-2">
        {days.map((day) => (
          <div key={day} className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2 md:grid-cols-[70px_1fr_1fr]">
            <div className="flex items-center gap-2 px-1 font-black text-zinc-300 md:flex-col md:justify-center">
              <span className="text-[10px] font-bold uppercase text-zinc-500">Día</span>
              {day}
            </div>
            {(["FREE", "PREMIUM"] as Track[]).map((track) => (
              <div key={track} className="min-w-0 rounded-lg border border-dashed border-zinc-800 p-2">
                <p className="mb-1 text-[10px] font-bold uppercase text-zinc-500 md:hidden">
                  {track === "FREE" ? "Gratis" : "Premium"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(byCell.get(`${day}:${track}`) ?? []).map((tier) => (
                    <TierChip key={tier.id} tier={tier} catalog={catalog} onEdit={() => onEdit(tier)} onDelete={() => void onDelete(tier)} />
                  ))}
                  <button
                    type="button"
                    onClick={() => onAdd(day, track)}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-yellow-400 hover:text-yellow-400"
                  >
                    <Plus size={12} /> Premio
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TierChip({ tier, catalog, onEdit, onDelete }: { tier: Tier; catalog: Catalog | null; onEdit: () => void; onDelete: () => void }) {
  const kind = kindOf(tier, catalog);
  const meta = KINDS.find((k) => k.kind === kind);
  const item = catalog?.items.find((i) => i.id === tier.itemId);
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-lg bg-zinc-900 py-1 pl-1.5 pr-1 text-xs">
      {item?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="h-6 w-6 rounded object-contain" style={{ imageRendering: "pixelated" }} />
      ) : (
        <span className="text-yellow-400">{meta?.icon}</span>
      )}
      <span className="truncate font-semibold">{tier.label}</span>
      <button type="button" onClick={onEdit} aria-label="Editar" className="rounded p-1 text-zinc-400 hover:text-white">
        <Pencil size={12} />
      </button>
      <button type="button" onClick={onDelete} aria-label="Borrar" className="rounded p-1 text-zinc-400 hover:text-red-400">
        <Trash2 size={12} />
      </button>
    </span>
  );
}

function MonthlySeasonDialog({
  seasons,
  onClose,
  onCreated,
}: {
  seasons: Season[];
  onClose: () => void;
  onCreated: (id: string) => Promise<void>;
}) {
  const options = useMemo(() => {
    const now = new Date(Date.now() - 5 * 3600 * 1000);
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
      return { year, month, days, current: i === 0, label: `${MONTHS[month - 1]} ${year} · ${days} días` };
    });
  }, []);
  const [choice, setChoice] = useState(1);
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState(seasons[0]?.id ?? "");
  const [activateNow, setActivateNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const picked = options[choice];

  const create = async () => {
    setSaving(true);
    try {
      const created = await api.post<{ id: string }>("/admin/battle-pass/seasons/monthly", {
        year: picked.year,
        month: picked.month,
        name: name.trim() || undefined,
        copyTiersFromSeasonId: copyFrom || undefined,
        activateNow: picked.current && activateNow,
      });
      toast.success("Temporada creada");
      await onCreated(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setSaving(false);
    }
  };

  const input = "mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white";
  return (
    <Dialog title="Nueva temporada mensual" onClose={onClose}>
      <label className="block text-xs text-zinc-400">
        Mes
        <select value={choice} onChange={(e) => setChoice(Number(e.target.value))} className={input}>
          {options.map((o, i) => (
            <option key={o.label} value={i}>
              {o.label}
              {o.current ? " (mes actual)" : ""}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs text-zinc-500">
        Del 1 de {MONTHS[picked.month - 1].toLowerCase()} a las 00:00 al {picked.days} a las 23:59 (hora de Colombia).
      </p>
      <label className="mt-4 block text-xs text-zinc-400">
        Nombre (opcional)
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Temporada: ${MONTHS[picked.month - 1]} ${picked.year}`} className={input} />
      </label>
      <label className="mt-4 block text-xs text-zinc-400">
        Copiar premios de
        <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={input}>
          <option value="">No copiar (empezar vacía)</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {picked.current && (
        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={activateNow} onChange={(e) => setActivateNow(e.target.checked)} className="accent-yellow-400" />
          Activarla ya (termina la temporada activa actual)
        </label>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
          Cancelar
        </button>
        <button type="button" onClick={() => void create()} disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-60">
          {saving ? "Creando…" : "Crear temporada"}
        </button>
      </div>
    </Dialog>
  );
}

function TierDialog({
  tier,
  season,
  catalog,
  onClose,
  onSaved,
}: {
  tier: Partial<Tier>;
  season: Season;
  catalog: Catalog | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [kind, setKind] = useState<RewardKind>(tier.id ? kindOf(tier as Tier, catalog) : "COINS");
  const [level, setLevel] = useState(tier.level ?? 1);
  const [track, setTrack] = useState<Track>(tier.track ?? "FREE");
  const [amount, setAmount] = useState(tier.amount ?? 50);
  const [itemId, setItemId] = useState<string | null>(tier.itemId ?? null);
  const [label, setLabel] = useState(tier.label ?? "");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const needsAmount = kind === "COINS" || kind === "XP";
  const options = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    const list =
      kind === "BADGE"
        ? catalog.badges.map((b) => ({ id: b.id, name: b.name, imageUrl: null as string | null }))
        : kind === "TITLE"
          ? catalog.titles.map((t) => ({ id: t.id, name: t.name, imageUrl: null as string | null }))
          : catalog.items.filter((i) => i.group === kind);
    return list.filter((o) => !q || o.name.toLowerCase().includes(q)).slice(0, 120);
  }, [catalog, kind, query]);

  const autoLabel = () => {
    if (kind === "COINS") return `${amount} monedas`;
    if (kind === "XP") return `${amount} XP`;
    const picked = options.find((o) => o.id === itemId);
    const prefix = KINDS.find((k) => k.kind === kind)?.label ?? "";
    return picked ? `${prefix}: ${picked.name}` : "";
  };

  const save = async () => {
    if (!needsAmount && !itemId) {
      toast.error("Elige qué premio se entrega");
      return;
    }
    const rewardType = needsAmount ? kind : kind === "BADGE" || kind === "TITLE" ? kind : "ITEM";
    const body = {
      level,
      track,
      rewardType,
      amount: needsAmount ? amount : null,
      itemId: needsAmount ? null : itemId,
      label: label.trim() || autoLabel(),
    };
    setSaving(true);
    try {
      if (tier.id) await api.patch(`/admin/battle-pass/tiers/${tier.id}`, body);
      else await api.post(`/admin/battle-pass/seasons/${season.id}/tiers`, body);
      toast.success("Premio guardado");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const input = "mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white";
  return (
    <Dialog title={tier.id ? "Editar premio" : "Nuevo premio"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-zinc-400">
          Día
          <input type="number" min={1} max={season.totalLevels} value={level} onChange={(e) => setLevel(Math.max(1, Number(e.target.value) || 1))} className={input} />
        </label>
        <label className="text-xs text-zinc-400">
          Track
          <select value={track} onChange={(e) => setTrack(e.target.value as Track)} className={input}>
            <option value="FREE">Gratis</option>
            <option value="PREMIUM">Premium</option>
          </select>
        </label>
      </div>

      <p className="mt-4 text-xs text-zinc-400">Tipo de premio</p>
      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => {
              setKind(k.kind);
              setItemId(null);
            }}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-bold ${
              kind === k.kind ? "border-yellow-400 bg-yellow-400/10 text-yellow-300" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
            }`}
          >
            {k.icon}
            {k.label}
          </button>
        ))}
      </div>

      {needsAmount ? (
        <label className="mt-4 block text-xs text-zinc-400">
          Cantidad
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))} className={input} />
        </label>
      ) : (
        <div className="mt-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" className={`${input} mt-0 pl-8`} />
          </div>
          <div className="mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setItemId(o.id)}
                className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs ${
                  itemId === o.id ? "border-yellow-400 bg-yellow-400/10" : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                {o.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-contain" style={{ imageRendering: "pixelated" }} />
                ) : (
                  <Sparkles size={16} className="shrink-0 text-yellow-400" />
                )}
                <span className="line-clamp-2">{o.name}</span>
              </button>
            ))}
            {options.length === 0 && (
              <p className="col-span-full py-6 text-center text-xs text-zinc-500">
                {catalog ? "No hay elementos de este tipo. Créalos primero en Items." : "Cargando catálogo…"}
              </p>
            )}
          </div>
        </div>
      )}

      <label className="mt-4 block text-xs text-zinc-400">
        Texto que ve el jugador
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={autoLabel() || "Ej. Burbuja de chat Galaxia"} maxLength={120} className={input} />
      </label>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
          Cancelar
        </button>
        <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-60">
          {saving ? "Guardando…" : "Guardar premio"}
        </button>
      </div>
    </Dialog>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
