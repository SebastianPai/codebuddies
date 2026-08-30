"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Npc = {
  id: string;
  key: string;
  kind: string;
  name: string;
  spriteSheetUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  framesCount: number;
  directions: number;
  greetingLines: string[];
  idleLines: string[];
  enabled: boolean;
  sortOrder: number;
};

const EMPTY: Partial<Npc> & { greetingText?: string; idleText?: string } = {
  key: "",
  kind: "BUTLER",
  name: "",
  spriteSheetUrl: null,
  frameWidth: 64,
  frameHeight: 96,
  framesCount: 1,
  directions: 4,
  greetingText: "",
  idleText: "",
  enabled: true,
  sortOrder: 0,
};

export default function AdminButlerPage() {
  const t = useTranslation();
  const [list, setList] = useState<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setList(await api.get<Npc[]>("/admin/npcs?kind=BUTLER"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const editing = Boolean(draft.id);

  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "npcs");
    const { url } = await api.post<{ url: string }>("/uploads", form);
    setDraft((d) => ({ ...d, spriteSheetUrl: url }));
  }

  function startEdit(n: Npc) {
    setDraft({
      ...n,
      greetingText: n.greetingLines.join("\n"),
      idleText: n.idleLines.join("\n"),
    });
  }

  async function save() {
    setSaving(true);
    try {
      const { greetingText, idleText, ...rest } = draft;
      const payload = {
        ...rest,
        kind: "BUTLER",
        greetingLines: (greetingText ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
        idleLines: (idleText ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
      };
      if (editing) await api.patch(`/admin/npcs/${draft.id}`, payload);
      else await api.post("/admin/npcs", payload);
      setDraft(EMPTY);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("admin.butlerConfirmDelete"))) return;
    await api.delete(`/admin/npcs/${id}`);
    await load();
  }

  const field = "bg-black border border-zinc-700 rounded p-2 text-white w-full";

  return (
    <div className="p-8 space-y-8 text-white">
      <div>
        <h1 className="text-3xl font-bold text-yellow-400">
          {t("admin.butlerTitle")}
        </h1>
        <p className="text-zinc-500 mt-2 max-w-2xl">
          {t("admin.butlerSubtitle")}
        </p>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg">
          {editing ? t("admin.butlerEdit") : t("admin.butlerNew")}
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.petsKey")}
            <input
              className={field}
              value={draft.key ?? ""}
              onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              placeholder="butler-main"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.petsName")}
            <input
              className={field}
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Alfred"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.petsSortOrder")}
            <input
              type="number"
              className={field}
              value={draft.sortOrder ?? 0}
              onChange={(e) =>
                setDraft({ ...draft, sortOrder: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.petsFrameWidth")}
            <input
              type="number"
              className={field}
              value={draft.frameWidth ?? 64}
              onChange={(e) =>
                setDraft({ ...draft, frameWidth: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.petsFrameHeight")}
            <input
              type="number"
              className={field}
              value={draft.frameHeight ?? 96}
              onChange={(e) =>
                setDraft({ ...draft, frameHeight: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.petsFramesCount")}
            <input
              type="number"
              className={field}
              value={draft.framesCount ?? 1}
              onChange={(e) =>
                setDraft({ ...draft, framesCount: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.petsDirections")}
            <select
              className={field}
              value={draft.directions ?? 4}
              onChange={(e) =>
                setDraft({ ...draft, directions: Number(e.target.value) })
              }
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={4}>4</option>
            </select>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.butlerGreetings")}
            <textarea
              rows={4}
              className={field}
              value={draft.greetingText ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, greetingText: e.target.value })
              }
              placeholder={t("admin.butlerLinesPlaceholder")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.butlerIdleLines")}
            <textarea
              rows={4}
              className={field}
              value={draft.idleText ?? ""}
              onChange={(e) => setDraft({ ...draft, idleText: e.target.value })}
              placeholder={t("admin.butlerLinesPlaceholder")}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
            className="text-sm text-zinc-400"
          />
          {draft.spriteSheetUrl && (
            <img
              src={draft.spriteSheetUrl}
              alt=""
              className="h-16 border border-zinc-700 [image-rendering:pixelated]"
            />
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={draft.enabled ?? true}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
            />
            {t("admin.petsEnabled")}
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-yellow-400 text-black px-5 py-2 rounded font-bold hover:bg-yellow-300"
          >
            {saving ? t("items.saving") : t("items.save")}
          </button>
          {editing && (
            <button
              onClick={() => setDraft(EMPTY)}
              className="border border-zinc-700 px-5 py-2 rounded font-bold"
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500">{t("common.loading")}</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((n) => (
            <div
              key={n.id}
              className="bg-[#111] border border-zinc-800 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold">
                  {n.name}{" "}
                  <span className="text-zinc-500 text-xs">({n.key})</span>
                </h3>
                {!n.enabled && (
                  <span className="text-xs text-red-400">
                    {t("admin.petsDisabled")}
                  </span>
                )}
              </div>
              {n.spriteSheetUrl && (
                <img
                  src={n.spriteSheetUrl}
                  alt=""
                  className="max-h-24 border border-zinc-800 [image-rendering:pixelated]"
                />
              )}
              <p className="text-xs text-zinc-500">
                {n.greetingLines.length} {t("admin.butlerGreetingsShort")}
              </p>
              <div className="flex gap-4 pt-1 text-sm">
                <button
                  onClick={() => startEdit(n)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => remove(n.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="text-zinc-500">{t("admin.butlerEmpty")}</p>
          )}
        </div>
      )}
    </div>
  );
}
