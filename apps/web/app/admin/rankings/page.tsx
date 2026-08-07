"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Flag, Plus, Trash2, Trophy } from "lucide-react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

interface SeasonInfo {
  id: string;
  name: string;
  startAt: string;
  endAt: string | null;
  status: "ACTIVE" | "FINALIZED";
}

export default function AdminRankingsPage() {
  const t = useTranslation();
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SeasonInfo[]>("/admin/rankings/seasons");
      setSeasons(data);
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeSeason = seasons.find((s) => s.status === "ACTIVE");

  const createSeason = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post("/admin/rankings/seasons", { name: newName.trim() });
      toast.success(t("admin.rankingSeasonCreated"));
      setNewName("");
      await load();
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setCreating(false);
    }
  };

  const finalizeSeason = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/admin/rankings/seasons/${id}/finalize`, {});
      toast.success(t("admin.rankingSeasonFinalized"));
      await load();
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setBusyId(null);
    }
  };

  const deleteSeason = async (id: string) => {
    setBusyId(id);
    try {
      await api.delete(`/admin/rankings/seasons/${id}`);
      toast.success(t("admin.rankingSeasonDeleted"));
      await load();
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 text-white">
      <div className="flex items-center gap-3">
        <Trophy className="text-yellow-400" />
        <h1 className="text-3xl font-black">{t("admin.rankingsStubTitle")}</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{t("admin.rankingSeasonsDescription")}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-[#111111] p-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("admin.rankingSeasonNamePlaceholder")}
          className="flex-1 rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={createSeason}
          disabled={!newName.trim() || creating}
          className="flex items-center gap-1 rounded-md bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          <Plus size={14} /> {t("admin.rankingSeasonCreateButton")}
        </button>
      </div>

      {activeSeason && (
        <p className="mt-3 text-xs text-zinc-500">
          {t("admin.rankingSeasonCreateHint", { name: activeSeason.name })}
        </p>
      )}

      {loading ? (
        <div className="mt-8 text-zinc-500">{t("common.loading")}</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
          {seasons.map((season) => (
            <div
              key={season.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-[#111111] p-4 first:border-t-0"
            >
              <div>
                <Link href={`/rankings/seasons/${season.id}`} className="font-black hover:text-yellow-400">
                  {season.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {new Date(season.startAt).toLocaleDateString()}
                  {season.endAt ? ` – ${new Date(season.endAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    season.status === "ACTIVE"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {season.status === "ACTIVE" ? t("site.seasonStatusActive") : t("site.seasonStatusFinalized")}
                </span>
                {season.status === "ACTIVE" && (
                  <button
                    type="button"
                    disabled={busyId === season.id}
                    onClick={() => finalizeSeason(season.id)}
                    className="flex items-center gap-1 rounded-md border border-yellow-700 px-2 py-1 text-xs text-yellow-300"
                  >
                    <Flag size={12} /> {t("admin.rankingSeasonFinalizeButton")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === season.id}
                  onClick={() => deleteSeason(season.id)}
                  className="flex items-center gap-1 rounded-md border border-red-800 px-2 py-1 text-xs text-red-300"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {seasons.length === 0 && <p className="p-4 text-sm text-zinc-500">{t("common.noResults")}</p>}
        </div>
      )}
    </div>
  );
}
