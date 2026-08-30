"use client";

import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import {
  AnimClip,
  AnimClipList,
  Field,
  NumberInput,
  SpriteSheetPreview,
  SpriteUpload,
  TextInput,
} from "@/features/admin/companions/companion-ui";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Species = {
  id: string;
  key: string;
  name: string;
  spriteSheetUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  framesCount: number;
  directions: number;
  animations: AnimClip[];
  coinsPrice: number | null;
  shopVisible: boolean;
  enabled: boolean;
  sortOrder: number;
};

const EMPTY: Partial<Species> = {
  key: "",
  name: "",
  spriteSheetUrl: null,
  frameWidth: 68,
  frameHeight: 68,
  framesCount: 1,
  directions: 8,
  animations: [],
  coinsPrice: 500,
  shopVisible: true,
  enabled: true,
  sortOrder: 0,
};

export default function AdminPetsPage() {
  const t = useTranslation();
  const [list, setList] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<Species>>(EMPTY);
  const [saving, setSaving] = useState(false);

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
  const set = (patch: Partial<Species>) => setDraft((d) => ({ ...d, ...patch }));

  async function save() {
    setSaving(true);
    try {
      if (editing) await api.patch(`/admin/pet-species/${draft.id}`, draft);
      else await api.post("/admin/pet-species", draft);
      setDraft(EMPTY);
      await load();
    } catch (err: any) {
      alert(err?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("admin.petsConfirmDelete"))) return;
    await api.delete(`/admin/pet-species/${id}`);
    await load();
  }

  return (
    <div className="p-8 space-y-8 text-white">
      <div>
        <h1 className="text-3xl font-bold text-yellow-400">
          {t("admin.petsTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-500">{t("admin.petsSubtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FORM */}
        <div className="space-y-5 rounded-xl border border-zinc-800 bg-[#111] p-6">
          <h2 className="text-lg font-bold">
            {editing ? t("admin.petsEditSpecies") : t("admin.petsNewSpecies")}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("admin.petsKey")} hint={t("admin.petsKeyHint")}>
              <TextInput
                value={draft.key ?? ""}
                onChange={(e) => set({ key: e.target.value })}
                placeholder="cat"
              />
            </Field>
            <Field label={t("admin.petsName")}>
              <TextInput
                value={draft.name ?? ""}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Gato"
              />
            </Field>
          </div>

          <Field
            label={t("admin.companionSheet")}
            hint={t("admin.companionSheetHint")}
          >
            <SpriteUpload
              url={draft.spriteSheetUrl ?? null}
              folder="pets"
              onChange={(url) => set({ spriteSheetUrl: url })}
              labels={{
                drop: t("admin.companionDrop"),
                replace: t("items.replaceImageButton"),
                remove: t("items.removeButton"),
                uploading: t("items.uploadingEllipsis"),
              }}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label={t("admin.companionFrameW")}
              hint={t("admin.companionFrameWHint")}
            >
              <NumberInput
                value={draft.frameWidth ?? 68}
                onChange={(e) => set({ frameWidth: Number(e.target.value) })}
              />
            </Field>
            <Field
              label={t("admin.companionFrameH")}
              hint={t("admin.companionFrameHHint")}
            >
              <NumberInput
                value={draft.frameHeight ?? 68}
                onChange={(e) => set({ frameHeight: Number(e.target.value) })}
              />
            </Field>
            <Field
              label={t("admin.companionDirections")}
              hint={t("admin.companionDirectionsHint")}
            >
              <select
                value={draft.directions ?? 8}
                onChange={(e) => set({ directions: Number(e.target.value) })}
                className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
              >
                <option value={1}>{t("admin.companionDir1")}</option>
                <option value={2}>{t("admin.companionDir2")}</option>
                <option value={4}>{t("admin.companionDir4")}</option>
                <option value={8}>{t("admin.companionDir8")}</option>
              </select>
            </Field>
          </div>

          <Field
            label={t("admin.clipsLabel")}
            hint={t("admin.clipsHint")}
          >
            <AnimClipList
              value={draft.animations ?? []}
              onChange={(v) => set({ animations: v })}
              sheetUrl={draft.spriteSheetUrl ?? null}
              frameWidth={draft.frameWidth ?? 68}
              frameHeight={draft.frameHeight ?? 68}
              directions={draft.directions ?? 8}
              folder="pets"
              t={t}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t("admin.petsPrice")} hint={t("admin.petsPriceHint")}>
              <NumberInput
                value={draft.coinsPrice ?? 0}
                onChange={(e) => set({ coinsPrice: Number(e.target.value) })}
              />
            </Field>
            <Field
              label={t("admin.petsSortOrder")}
              hint={t("admin.petsSortOrderHint")}
            >
              <NumberInput
                value={draft.sortOrder ?? 0}
                onChange={(e) => set({ sortOrder: Number(e.target.value) })}
              />
            </Field>
            <div className="flex flex-col gap-2 self-end pb-2 text-sm text-zinc-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.shopVisible ?? true}
                  onChange={(e) => set({ shopVisible: e.target.checked })}
                />
                {t("admin.petsShopVisible")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.enabled ?? true}
                  onChange={(e) => set({ enabled: e.target.checked })}
                />
                {t("admin.petsEnabled")}
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded bg-yellow-400 px-5 py-2 font-bold text-black hover:bg-yellow-300"
            >
              {saving ? t("items.saving") : t("items.save")}
            </button>
            {editing && (
              <button
                onClick={() => setDraft(EMPTY)}
                className="rounded border border-zinc-700 px-5 py-2 font-bold"
              >
                {t("common.cancel")}
              </button>
            )}
          </div>
        </div>

        {/* PREVIEW + GUÍA */}
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-[#111] p-6">
          <h2 className="text-lg font-bold">{t("admin.companionPreview")}</h2>
          <SpriteSheetPreview
            url={draft.spriteSheetUrl ?? null}
            frameWidth={draft.frameWidth ?? 68}
            frameHeight={draft.frameHeight ?? 68}
            framesCount={Math.max(
              1,
              ...(draft.animations ?? []).map((c) => c.framesCount),
            )}
            directions={draft.directions ?? 8}
            emptyLabel={t("admin.companionPreviewEmpty")}
          />
          <div className="rounded-lg border border-zinc-800 bg-black/40 p-4 text-xs leading-relaxed text-zinc-400">
            <p className="mb-2 font-bold text-zinc-300">{t("admin.guideTitle")}</p>
            <p className="whitespace-pre-line">{t("admin.guideBody")}</p>
          </div>
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <p className="text-zinc-500">{t("common.loading")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <div
              key={s.id}
              className="space-y-2 rounded-xl border border-zinc-800 bg-[#111] p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold">
                  {s.name}{" "}
                  <span className="text-xs text-zinc-500">({s.key})</span>
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
                {s.directions} dir · {s.frameWidth}×{s.frameHeight}px ·{" "}
                {(s.animations ?? []).length} anim
              </p>
              <p className="text-xs text-yellow-500/80">
                {s.shopVisible && s.coinsPrice
                  ? `${s.coinsPrice} coins`
                  : t("admin.petsNotForSale")}
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
