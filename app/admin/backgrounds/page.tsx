"use client";

import { useEffect, useMemo, useState } from "react";
import { Image, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

type AccessType = "FREE" | "PURCHASABLE" | "PREMIUM" | "EVENT";

type BackgroundCategory = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sortOrder: number;
};

type RoomBackground = {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  previewUrl?: string;
  categoryId?: string | null;
  category?: BackgroundCategory | null;
  active: boolean;
  sortOrder: number;
  accessType: AccessType;
  shopVisible: boolean;
  coinsPrice: number;
  gemsPrice: number;
  metadata?: unknown;
  _count?: { rooms: number; owners: number };
};

type LayoutOption = {
  id: string;
  name: string;
};

type BackgroundFormState = {
  id?: string;
  name: string;
  description: string;
  imageUrl: string;
  previewUrl: string;
  categoryId: string;
  active: boolean;
  shopVisible: boolean;
  accessType: AccessType;
  coinsPrice: number;
  gemsPrice: number;
  sortOrder: number;
  metadata: string;
};

type BackgroundMetadata = {
  anchor?: {
    x?: number;
    y?: number;
    scaleMode?: "cover" | "contain" | "height";
  };
  [key: string]: unknown;
};

const emptyForm: BackgroundFormState = {
  name: "",
  description: "",
  imageUrl: "",
  previewUrl: "",
  categoryId: "",
  active: true,
  shopVisible: true,
  accessType: "FREE",
  coinsPrice: 0,
  gemsPrice: 0,
  sortOrder: 0,
  metadata: "",
};

export default function AdminBackgroundsPage() {
  const t = useTranslation();
  const [backgrounds, setBackgrounds] = useState<RoomBackground[]>([]);
  const [categories, setCategories] = useState<BackgroundCategory[]>([]);
  const [layouts, setLayouts] = useState<LayoutOption[]>([]);
  const [form, setForm] = useState<BackgroundFormState>(emptyForm);
  const [categoryName, setCategoryName] = useState("");
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"image" | "preview" | null>(null);

  const load = async () => {
    const [backgroundData, categoryData, layoutData] = await Promise.all([
      api.get<RoomBackground[]>("/admin/backgrounds"),
      api.get<BackgroundCategory[]>("/admin/background-categories"),
      api.get<LayoutOption[]>("/layouts"),
    ]);
    setBackgrounds(backgroundData);
    setCategories(categoryData);
    setLayouts(layoutData);
  };

  useEffect(() => {
    void load().catch(() => toast.error(t("admin.loadBackgroundsError")));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return backgrounds.filter((background) => {
      if (accessFilter && background.accessType !== accessFilter) return false;
      if (!term) return true;
      return (
        background.name.toLowerCase().includes(term) ||
        background.description?.toLowerCase().includes(term) ||
        background.category?.name.toLowerCase().includes(term)
      );
    });
  }, [accessFilter, backgrounds, search]);

  const edit = (background: RoomBackground) => {
    setForm({
      id: background.id,
      name: background.name,
      description: background.description ?? "",
      imageUrl: background.imageUrl,
      previewUrl: background.previewUrl ?? background.imageUrl,
      categoryId: background.categoryId ?? background.category?.id ?? "",
      active: background.active,
      shopVisible: background.shopVisible,
      accessType: background.accessType,
      coinsPrice: background.coinsPrice,
      gemsPrice: background.gemsPrice,
      sortOrder: background.sortOrder,
      metadata: background.metadata ? JSON.stringify(background.metadata, null, 2) : "",
    });
  };

  const reset = () => setForm(emptyForm);

  const readMetadata = (): BackgroundMetadata => {
    if (!form.metadata.trim()) return {};
    try {
      const parsed = JSON.parse(form.metadata);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const updateAnchor = (
    patch: Partial<NonNullable<BackgroundMetadata["anchor"]>>,
  ) => {
    const current = readMetadata();
    const metadata: BackgroundMetadata = {
      ...current,
      anchor: {
        x: 50,
        y: 50,
        scaleMode: "cover",
        ...(current.anchor ?? {}),
        ...patch,
      },
    };
    setForm((state) => ({
      ...state,
      metadata: JSON.stringify(metadata, null, 2),
    }));
  };

  const upload = async (file: File, target: "image" | "preview") => {
    setUploading(target);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "room-backgrounds");
      const response = await fetch("http://localhost:3001/uploads", {
        method: "POST",
        body,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = (await response.json()) as { url: string };
      setForm((current) => ({
        ...current,
        [target === "image" ? "imageUrl" : "previewUrl"]: data.url,
      }));
      toast.success(t("admin.imageUploadedToast"));
    } catch {
      toast.error(t("admin.imageUploadError"));
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    if (!form.name.trim() || !form.imageUrl.trim()) {
      toast.error(t("admin.nameImageRequiredError"));
      return;
    }

    let metadata: unknown = undefined;
    if (form.metadata.trim()) {
      try {
        metadata = JSON.parse(form.metadata);
      } catch {
        toast.error(t("admin.invalidMetadataJsonError"));
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        previewUrl: form.previewUrl.trim() || form.imageUrl.trim(),
        categoryId: form.categoryId || null,
        active: form.active,
        shopVisible: form.shopVisible,
        accessType: form.accessType,
        coinsPrice: Number(form.coinsPrice || 0),
        gemsPrice: Number(form.gemsPrice || 0),
        sortOrder: Number(form.sortOrder || 0),
        metadata,
      };

      if (form.id) {
        await api.patch(`/admin/backgrounds/${form.id}`, payload);
        toast.success(t("admin.backgroundUpdatedToast"));
      } else {
        await api.post("/admin/backgrounds", payload);
        toast.success(t("admin.backgroundCreatedToast"));
      }
      reset();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.genericSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteBackground"))) return;
    await api.delete(`/admin/backgrounds/${id}`);
    toast.success(t("admin.backgroundDeletedToast"));
    await load();
  };

  const createCategory = async () => {
    if (!categoryName.trim()) return;
    await api.post("/admin/background-categories", { name: categoryName.trim() });
    setCategoryName("");
    await load();
  };

  const metadataPreview = readMetadata();
  const anchor = {
    x: Number(metadataPreview.anchor?.x ?? 50),
    y: Number(metadataPreview.anchor?.y ?? 50),
    scaleMode: metadataPreview.anchor?.scaleMode ?? "cover",
  };

  return (
    <div className="p-6 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-yellow-400">{t("admin.backgroundsTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {t("admin.backgroundsDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black"
        >
          <Plus size={16} />
          {t("admin.newBackgroundButton")}
        </button>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-xl border border-zinc-800 bg-[#0c0c0c] p-5">
          <h2 className="text-xl font-black">{form.id ? t("admin.editBackgroundTitle") : t("admin.createBackgroundTitle")}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label={t("items.name")} value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} />
            <Field
              label={t("admin.orderLabel")}
              type="number"
              value={String(form.sortOrder)}
              onChange={(sortOrder) => setForm((current) => ({ ...current, sortOrder: Number(sortOrder) }))}
            />
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-400">{t("items.description")}</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-24 w-full rounded-md border border-zinc-800 bg-[#111] p-3"
            />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Select
              label={t("admin.accessLabel")}
              value={form.accessType}
              onChange={(accessType) => setForm((current) => ({ ...current, accessType: accessType as AccessType }))}
              options={[
                ["FREE", t("admin.freeAccess")],
                ["PURCHASABLE", t("admin.purchasableAccess")],
                ["PREMIUM", "Premium"],
                ["EVENT", t("gamification.event")],
              ]}
            />
            <Select
              label={t("items.category")}
              value={form.categoryId}
              onChange={(categoryId) => setForm((current) => ({ ...current, categoryId }))}
              options={[["", t("items.noCategory")], ...categories.map((category) => [category.id, category.name] as [string, string])]}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label={t("items.coins")}
              type="number"
              value={String(form.coinsPrice)}
              onChange={(coinsPrice) => setForm((current) => ({ ...current, coinsPrice: Number(coinsPrice) }))}
            />
            <Field
              label={t("items.gems")}
              type="number"
              value={String(form.gemsPrice)}
              onChange={(gemsPrice) => setForm((current) => ({ ...current, gemsPrice: Number(gemsPrice) }))}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <UploadBox
              label={t("admin.imageTextureLabel")}
              url={form.imageUrl}
              uploading={uploading === "image"}
              onUpload={(file) => void upload(file, "image")}
              onUrl={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))}
            />
            <UploadBox
              label={t("admin.previewLabel")}
              url={form.previewUrl}
              uploading={uploading === "preview"}
              onUpload={(file) => void upload(file, "preview")}
              onUrl={(previewUrl) => setForm((current) => ({ ...current, previewUrl }))}
            />
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-[#111] p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="font-black text-yellow-400">{t("admin.anchorTitle")}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {t("admin.anchorDescription")}
                </p>
              </div>
              <select
                value={anchor.scaleMode}
                onChange={(event) =>
                  updateAnchor({
                    scaleMode: event.target.value as "cover" | "contain" | "height",
                  })
                }
                className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm"
              >
                <option value="cover">{t("admin.coverScreen")}</option>
                <option value="contain">{t("admin.viewFull")}</option>
                <option value="height">{t("admin.fitHeight")}</option>
              </select>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="space-y-3">
                <label className="block text-sm text-zinc-400">
                  {t("admin.anchorXLabel", { value: Math.round(anchor.x) })}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={anchor.x}
                    onChange={(event) => updateAnchor({ x: Number(event.target.value) })}
                    className="mt-2 w-full accent-yellow-400"
                  />
                </label>
                <label className="block text-sm text-zinc-400">
                  {t("admin.anchorYLabel", { value: Math.round(anchor.y) })}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={anchor.y}
                    onChange={(event) => updateAnchor({ y: Number(event.target.value) })}
                    className="mt-2 w-full accent-yellow-400"
                  />
                </label>
              </div>

              <div className="relative h-36 overflow-hidden rounded-lg border border-zinc-800 bg-black">
                {form.previewUrl || form.imageUrl ? (
                  <img
                    src={form.previewUrl || form.imageUrl}
                    alt={t("admin.previewLabel")}
                    className="h-full w-full object-cover opacity-80"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                    {t("items.noImage")}
                  </div>
                )}
                <div
                  className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-300 bg-black/70 shadow-[0_0_20px_rgba(250,204,21,0.75)]"
                  style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
                  title={t("admin.anchorTitle")}
                />
                <div
                  className="absolute h-px w-full -translate-y-1/2 bg-yellow-300/50"
                  style={{ top: `${anchor.y}%` }}
                />
                <div
                  className="absolute w-px -translate-x-1/2 bg-yellow-300/50"
                  style={{ left: `${anchor.x}%`, top: 0, bottom: 0 }}
                />
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm text-zinc-400">
                {t("admin.compatibleLayoutsLabel")}
              </span>
              <select
                multiple
                value={
                  Array.isArray((metadataPreview as any).compatibleLayoutIds)
                    ? ((metadataPreview as any).compatibleLayoutIds as string[])
                    : []
                }
                onChange={(event) => {
                  const selected = Array.from(event.target.selectedOptions).map(
                    (option) => option.value,
                  );
                  setForm((state) => ({
                    ...state,
                    metadata: JSON.stringify(
                      {
                        ...readMetadata(),
                        compatibleLayoutIds: selected,
                      },
                      null,
                      2,
                    ),
                  }));
                }}
                className="h-28 w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm"
              >
                {layouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {layout.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-zinc-500">
                {t("admin.compatibleLayoutsHelper")}
              </span>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-zinc-400">{t("admin.futureMetadataLabel")}</span>
            <textarea
              value={form.metadata}
              onChange={(event) => setForm((current) => ({ ...current, metadata: event.target.value }))}
              placeholder='{"width":2400,"height":1600,"scrollFactor":0.35}'
              className="min-h-24 w-full rounded-md border border-zinc-800 bg-[#111] p-3 font-mono text-xs"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-4">
            <Toggle label={t("gamification.activeMale")} checked={form.active} onChange={(active) => setForm((current) => ({ ...current, active }))} />
            <Toggle label={t("admin.shopVisibleLabel")} checked={form.shopVisible} onChange={(shopVisible) => setForm((current) => ({ ...current, shopVisible }))} />
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? t("admin.savingEllipsis") : t("admin.saveBackgroundButton")}
          </button>
        </section>

        <section className="space-y-5">
          <div className="rounded-xl border border-zinc-800 bg-[#0c0c0c] p-5">
            <h2 className="text-xl font-black">{t("gamification.categories")}</h2>
            <div className="mt-3 flex gap-2">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder={t("admin.newCategoryPlaceholder")}
                className="flex-1 rounded-md border border-zinc-800 bg-[#111] px-3 py-2"
              />
              <button onClick={() => void createCategory()} className="rounded-md bg-zinc-100 px-4 font-bold text-black">
                {t("common.create")}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category.id} className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  {category.name}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0c0c0c] p-5">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("admin.searchBackgroundPlaceholder")}
                  className="w-full rounded-md border border-zinc-800 bg-[#111] py-3 pl-9 pr-3"
                />
              </div>
              <select
                value={accessFilter}
                onChange={(event) => setAccessFilter(event.target.value)}
                className="rounded-md border border-zinc-800 bg-[#111] px-3 py-3"
              >
                <option value="">{t("common.allMasculine")}</option>
                <option value="FREE">{t("admin.freeAccess")}</option>
                <option value="PURCHASABLE">{t("admin.purchasablePluralAccess")}</option>
                <option value="PREMIUM">Premium</option>
                <option value="EVENT">{t("gamification.event")}</option>
              </select>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {filtered.map((background) => (
                <article key={background.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
                  <div className="relative h-36 bg-zinc-900">
                    {background.previewUrl || background.imageUrl ? (
                      <img
                        src={background.previewUrl || background.imageUrl}
                        alt={background.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-600">
                        <Image size={28} />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-black/80 px-2 py-1 text-xs font-black">
                      {background.accessType}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">{background.name}</h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          {background.category?.name ?? t("items.noCategory")} · {t("admin.roomsSuffix", { count: background._count?.rooms ?? 0 })}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${background.active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                        {background.active ? t("gamification.activeMale") : t("admin.inactiveMale")}
                      </span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => edit(background)} className="flex-1 rounded-md bg-zinc-800 px-3 py-2 text-sm font-bold">
                        {t("common.edit")}
                      </button>
                      <button onClick={() => void remove(background.id)} className="rounded-md bg-red-500/15 px-3 py-2 text-red-300">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <input value={value} type={type} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-zinc-800 bg-[#111] px-3 py-3" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-zinc-800 bg-[#111] px-3 py-3">
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function UploadBox({ label, url, uploading, onUpload, onUrl }: { label: string; url: string; uploading: boolean; onUpload: (file: File) => void; onUrl: (url: string) => void }) {
  return (
    <div>
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <div className="rounded-md border border-dashed border-zinc-700 bg-[#111] p-3">
        {url ? <img src={url} alt={label} className="mb-3 h-28 w-full rounded object-cover" /> : null}
        <input value={url} onChange={(event) => onUrl(event.target.value)} placeholder="URL" className="mb-2 w-full rounded border border-zinc-800 bg-black px-3 py-2 text-xs" />
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
          }}
          className="w-full text-xs text-zinc-400"
        />
      </div>
    </div>
  );
}
