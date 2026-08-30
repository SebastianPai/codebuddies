"use client";

import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import {
  Field,
  NumberInput,
  PhraseList,
  SpriteSheetPreview,
  SpriteUpload,
  TextInput,
} from "@/features/admin/companions/companion-ui";
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

const EMPTY: Partial<Npc> = {
  key: "",
  kind: "BUTLER",
  name: "",
  spriteSheetUrl: null,
  frameWidth: 32,
  frameHeight: 48,
  framesCount: 4,
  directions: 4,
  greetingLines: [],
  idleLines: [],
  enabled: true,
  sortOrder: 0,
};

export default function AdminButlerPage() {
  const t = useTranslation();
  const [list, setList] = useState<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<Npc>>(EMPTY);
  const [saving, setSaving] = useState(false);

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
  const set = (patch: Partial<Npc>) => setDraft((d) => ({ ...d, ...patch }));

  async function save() {
    setSaving(true);
    try {
      const payload = { ...draft, kind: "BUTLER" };
      if (editing) await api.patch(`/admin/npcs/${draft.id}`, payload);
      else await api.post("/admin/npcs", payload);
      setDraft(EMPTY);
      await load();
    } catch (err: any) {
      alert(err?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("admin.butlerConfirmDelete"))) return;
    await api.delete(`/admin/npcs/${id}`);
    await load();
  }

  return (
    <div className="p-8 space-y-8 text-white">
      <div>
        <h1 className="text-3xl font-bold text-yellow-400">
          {t("admin.butlerTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-500">
          {t("admin.butlerSubtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-xl border border-zinc-800 bg-[#111] p-6">
          <h2 className="text-lg font-bold">
            {editing ? t("admin.butlerEdit") : t("admin.butlerNew")}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("admin.petsKey")} hint={t("admin.butlerKeyHint")}>
              <TextInput
                value={draft.key ?? ""}
                onChange={(e) => set({ key: e.target.value })}
                placeholder="butler-main"
              />
            </Field>
            <Field label={t("admin.petsName")}>
              <TextInput
                value={draft.name ?? ""}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Alfred"
              />
            </Field>
          </div>

          <Field
            label={t("admin.companionSheet")}
            hint={t("admin.companionSheetHint")}
          >
            <SpriteUpload
              url={draft.spriteSheetUrl ?? null}
              folder="npcs"
              onChange={(url) => set({ spriteSheetUrl: url })}
              labels={{
                drop: t("admin.companionDrop"),
                replace: t("items.replaceImageButton"),
                remove: t("items.removeButton"),
                uploading: t("items.uploadingEllipsis"),
              }}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={t("admin.companionFrameW")}
              hint={t("admin.companionFrameWHint")}
            >
              <NumberInput
                value={draft.frameWidth ?? 32}
                onChange={(e) => set({ frameWidth: Number(e.target.value) })}
              />
            </Field>
            <Field
              label={t("admin.companionFrameH")}
              hint={t("admin.companionFrameHHint")}
            >
              <NumberInput
                value={draft.frameHeight ?? 48}
                onChange={(e) => set({ frameHeight: Number(e.target.value) })}
              />
            </Field>
            <Field
              label={t("admin.companionFramesCount")}
              hint={t("admin.companionFramesCountHint")}
            >
              <NumberInput
                value={draft.framesCount ?? 4}
                onChange={(e) => set({ framesCount: Number(e.target.value) })}
              />
            </Field>
            <Field
              label={t("admin.companionDirections")}
              hint={t("admin.companionDirectionsHint")}
            >
              <select
                value={draft.directions ?? 4}
                onChange={(e) => set({ directions: Number(e.target.value) })}
                className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white"
              >
                <option value={1}>{t("admin.companionDir1")}</option>
                <option value={2}>{t("admin.companionDir2")}</option>
                <option value={4}>{t("admin.companionDir4")}</option>
              </select>
            </Field>
          </div>

          <Field
            label={t("admin.butlerGreetings")}
            hint={t("admin.butlerGreetingsHint")}
          >
            <PhraseList
              value={draft.greetingLines ?? []}
              onChange={(v) => set({ greetingLines: v })}
              addLabel={t("admin.phraseAdd")}
              placeholder={t("admin.phrasePlaceholder")}
              emptyLabel={t("admin.phraseEmpty")}
            />
          </Field>

          <Field
            label={t("admin.butlerIdleLines")}
            hint={t("admin.butlerIdleLinesHint")}
          >
            <PhraseList
              value={draft.idleLines ?? []}
              onChange={(v) => set({ idleLines: v })}
              addLabel={t("admin.phraseAdd")}
              placeholder={t("admin.phrasePlaceholder")}
              emptyLabel={t("admin.phraseEmpty")}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={t("admin.petsSortOrder")}
              hint={t("admin.petsSortOrderHint")}
            >
              <NumberInput
                value={draft.sortOrder ?? 0}
                onChange={(e) => set({ sortOrder: Number(e.target.value) })}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={draft.enabled ?? true}
                onChange={(e) => set({ enabled: e.target.checked })}
              />
              {t("admin.petsEnabled")}
            </label>
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

        <div className="space-y-3 rounded-xl border border-zinc-800 bg-[#111] p-6">
          <h2 className="text-lg font-bold">{t("admin.companionPreview")}</h2>
          <SpriteSheetPreview
            url={draft.spriteSheetUrl ?? null}
            frameWidth={draft.frameWidth ?? 32}
            frameHeight={draft.frameHeight ?? 48}
            framesCount={draft.framesCount ?? 4}
            directions={draft.directions ?? 4}
            emptyLabel={t("admin.companionPreviewEmpty")}
          />
          <p className="text-xs text-zinc-600">
            {t("admin.companionPreviewHint")}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500">{t("common.loading")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((n) => (
            <div
              key={n.id}
              className="space-y-2 rounded-xl border border-zinc-800 bg-[#111] p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold">
                  {n.name}{" "}
                  <span className="text-xs text-zinc-500">({n.key})</span>
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
                  onClick={() => setDraft(n)}
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
