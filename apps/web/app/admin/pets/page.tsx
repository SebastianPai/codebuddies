"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Species = {
  id: string;
  key: string;
  name: string;
  spriteSheetUrl: string | null;
  previewUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  framesCount: number;
  directions: number;
  enabled: boolean;
  sortOrder: number;
};

const EMPTY: Partial<Species> = {
  key: "",
  name: "",
  spriteSheetUrl: null,
  frameWidth: 64,
  frameHeight: 64,
  framesCount: 1,
  directions: 1,
  enabled: true,
  sortOrder: 0,
};

export default function AdminPetsPage() {
  const t = useTranslation();
  const [list, setList] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<Species>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setList(await api.get<Species[]>("/admin/pet-species"));
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
    form.append("folder", "pets");
    const { url } = await api.post<{ url: string }>("/uploads", form);
    setDraft((d) => ({ ...d, spriteSheetUrl: url }));
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/pet-species/${draft.id}`, draft);
      } else {
        await api.post("/admin/pet-species", draft);
      }
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
    if (!confirm(t("admin.petsConfirmDelete"))) return;
    await api.delete(`/admin/pet-species/${id}`);
    await load();
  }

  const field =
    "bg-black border border-zinc-700 rounded p-2 text-white w-full";

  return (
    <div className="p-8 space-y-8 text-white">
      <div>
        <h1 className="text-3xl font-bold text-yellow-400">
          {t("admin.petsTitle")}
        </h1>
        <p className="text-zinc-500 mt-2 max-w-2xl">{t("admin.petsSubtitle")}</p>
      </div>

      {/* FORM */}
      <div className="bg-[#111] border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg">
          {editing ? t("admin.petsEditSpecies") : t("admin.petsNewSpecies")}
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.petsKey")}
            <input
              className={field}
              value={draft.key ?? ""}
              onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              placeholder="cat"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            {t("admin.petsName")}
            <input
              className={field}
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Gato"
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
              value={draft.frameHeight ?? 64}
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
              value={draft.directions ?? 1}
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
              onChange={(e) =>
                setDraft({ ...draft, enabled: e.target.checked })
              }
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

      {/* LIST */}
      {loading ? (
        <p className="text-zinc-500">{t("common.loading")}</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((s) => (
            <div
              key={s.id}
              className="bg-[#111] border border-zinc-800 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold">
                  {s.name}{" "}
                  <span className="text-zinc-500 text-xs">({s.key})</span>
                </h3>
                {!s.enabled && (
                  <span className="text-xs text-red-400">
                    {t("admin.petsDisabled")}
                  </span>
                )}
              </div>
              {s.spriteSheetUrl && (
                <img
                  src={s.spriteSheetUrl}
                  alt=""
                  className="max-h-20 border border-zinc-800 [image-rendering:pixelated]"
                />
              )}
              <p className="text-xs text-zinc-500">
                {s.frameWidth}×{s.frameHeight} · {s.framesCount}f ·{" "}
                {s.directions} {t("admin.petsFacesShort")}
              </p>
              <div className="flex gap-4 pt-1 text-sm">
                <button
                  onClick={() => setDraft(s)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="text-zinc-500">{t("admin.petsEmpty")}</p>
          )}
        </div>
      )}
    </div>
  );
}
