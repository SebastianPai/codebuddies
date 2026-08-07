"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Field, SelectField, Toggle } from "../gamification/components/AdminFields";
import { useConfirm } from "@/shared/ui";

interface LocalizedText {
  es: string;
  en: string;
  zh: string;
}

interface PricingPlan {
  id: string;
  key: string;
  priceUsd: string;
  billingInterval: "NONE" | "MONTHLY" | "YEARLY";
  featured: boolean;
  active: boolean;
  sortOrder: number;
  ctaHref: string;
  icon: string;
  name: LocalizedText;
  ctaLabel: LocalizedText;
  features: LocalizedText[];
}

type PlanFormState = Omit<PricingPlan, "id" | "priceUsd"> & { priceUsd: string };

const emptyPlan: PlanFormState = {
  key: "",
  priceUsd: "0",
  billingInterval: "NONE",
  featured: false,
  active: true,
  sortOrder: 0,
  ctaHref: "/register",
  icon: "Sparkles",
  name: { es: "", en: "", zh: "" },
  ctaLabel: { es: "", en: "", zh: "" },
  features: [{ es: "", en: "", zh: "" }],
};

function toFormState(plan: PricingPlan): PlanFormState {
  return { ...plan, priceUsd: plan.priceUsd };
}

function PlanForm({
  initial,
  onSaved,
  onCancelNew,
}: {
  initial: PricingPlan | null;
  onSaved: () => Promise<void>;
  onCancelNew?: () => void;
}) {
  const t = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [form, setForm] = useState<PlanFormState>(initial ? toFormState(initial) : emptyPlan);
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<PlanFormState>) => setForm((current) => ({ ...current, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        key: form.key,
        priceUsd: Number(form.priceUsd),
        billingInterval: form.billingInterval,
        featured: form.featured,
        active: form.active,
        sortOrder: form.sortOrder,
        ctaHref: form.ctaHref,
        icon: form.icon,
        name: form.name,
        ctaLabel: form.ctaLabel,
        features: form.features.filter((feature) => feature.es || feature.en || feature.zh),
      };
      if (initial) {
        await api.patch(`/admin/pricing/plans/${initial.id}`, payload);
      } else {
        await api.post("/admin/pricing/plans", payload);
        setForm(emptyPlan);
      }
      toast.success(t("admin.pricingPlanSaved"));
      await onSaved();
    } catch {
      toast.error(t("admin.pricingPlanSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initial) return;
    if (!(await confirm(t("admin.pricingPlanConfirmDelete")))) return;
    await api.delete(`/admin/pricing/plans/${initial.id}`);
    toast.success(t("admin.pricingPlanDeleted"));
    await onSaved();
  };

  return (
    <div className="space-y-5 rounded-md border border-zinc-800 bg-[#111111] p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("admin.pricingPlanKey")} value={form.key} onChange={(value) => update({ key: value })} />
        <Field
          label={t("admin.pricingPlanPrice")}
          type="number"
          value={form.priceUsd}
          onChange={(value) => update({ priceUsd: value })}
        />
        <SelectField
          label={t("admin.pricingPlanBillingInterval")}
          value={form.billingInterval}
          onChange={(value) => update({ billingInterval: value as PlanFormState["billingInterval"] })}
          options={[
            { value: "NONE", label: t("admin.pricingPlanBillingNone") },
            { value: "MONTHLY", label: t("admin.pricingPlanBillingMonthly") },
            { value: "YEARLY", label: t("admin.pricingPlanBillingYearly") },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Field label={t("admin.pricingPlanCtaHref")} value={form.ctaHref} onChange={(value) => update({ ctaHref: value })} />
        <SelectField
          label={t("admin.pricingPlanIcon")}
          value={form.icon}
          onChange={(value) => update({ icon: value })}
          options={[
            { value: "Sparkles", label: "Sparkles" },
            { value: "Crown", label: "Crown" },
            { value: "Award", label: "Award" },
          ]}
        />
        <Field
          label={t("admin.pricingPlanSortOrder")}
          type="number"
          value={String(form.sortOrder)}
          onChange={(value) => update({ sortOrder: Number(value) })}
        />
        <div className="flex flex-col gap-2">
          <Toggle label={t("admin.pricingPlanFeatured")} checked={form.featured} onChange={(value) => update({ featured: value })} />
          <Toggle label={t("admin.pricingPlanActive")} checked={form.active} onChange={(value) => update({ active: value })} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("admin.pricingPlanNameEs")} value={form.name.es} onChange={(value) => update({ name: { ...form.name, es: value } })} />
        <Field label={t("admin.pricingPlanNameEn")} value={form.name.en} onChange={(value) => update({ name: { ...form.name, en: value } })} />
        <Field label={t("admin.pricingPlanNameZh")} value={form.name.zh} onChange={(value) => update({ name: { ...form.name, zh: value } })} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("admin.pricingPlanCtaEs")} value={form.ctaLabel.es} onChange={(value) => update({ ctaLabel: { ...form.ctaLabel, es: value } })} />
        <Field label={t("admin.pricingPlanCtaEn")} value={form.ctaLabel.en} onChange={(value) => update({ ctaLabel: { ...form.ctaLabel, en: value } })} />
        <Field label={t("admin.pricingPlanCtaZh")} value={form.ctaLabel.zh} onChange={(value) => update({ ctaLabel: { ...form.ctaLabel, zh: value } })} />
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-zinc-400">{t("admin.pricingPlanFeatures")}</p>
        <div className="space-y-3">
          {form.features.map((feature, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-zinc-800 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <Field
                label={t("admin.pricingPlanFeatureEs")}
                value={feature.es}
                onChange={(value) =>
                  update({ features: form.features.map((f, i) => (i === index ? { ...f, es: value } : f)) })
                }
              />
              <Field
                label={t("admin.pricingPlanFeatureEn")}
                value={feature.en}
                onChange={(value) =>
                  update({ features: form.features.map((f, i) => (i === index ? { ...f, en: value } : f)) })
                }
              />
              <Field
                label={t("admin.pricingPlanFeatureZh")}
                value={feature.zh}
                onChange={(value) =>
                  update({ features: form.features.map((f, i) => (i === index ? { ...f, zh: value } : f)) })
                }
              />
              <button
                type="button"
                onClick={() => update({ features: form.features.filter((_, i) => i !== index) })}
                className="self-end rounded-md border border-zinc-800 p-3 text-red-300"
                aria-label={t("admin.pricingPlanRemoveFeature")}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => update({ features: [...form.features, { es: "", en: "", zh: "" }] })}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300"
        >
          <Plus size={14} />
          {t("admin.pricingPlanAddFeature")}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !form.key || !form.name.es}
          className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black disabled:opacity-50"
        >
          <Save size={16} />
          {t("common.save")}
        </button>
        {initial ? (
          <button type="button" onClick={() => void remove()} className="inline-flex items-center gap-2 rounded-md border border-red-900 px-4 py-3 font-bold text-red-300">
            <Trash2 size={16} />
            {t("common.delete")}
          </button>
        ) : (
          onCancelNew && (
            <button type="button" onClick={onCancelNew} className="rounded-md border border-zinc-800 px-4 py-3 font-bold text-zinc-300">
              {t("common.cancel")}
            </button>
          )
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}

export default function AdminPricingPage() {
  const t = useTranslation();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setPlans(await api.get<PricingPlan[]>("/admin/pricing/plans"));
    } catch {
      toast.error(t("admin.pricingPlanLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-yellow-400">{t("admin.pricingPlansTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-400">{t("admin.pricingPlansDescription")}</p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black"
          >
            <Plus size={16} />
            {t("admin.pricingPlanNewPlan")}
          </button>
        )}
      </div>

      {loading ? <div className="mt-8 text-zinc-500">{t("common.loading")}</div> : null}

      <div className="mt-6 space-y-6">
        {creating && (
          <PlanForm
            initial={null}
            onCancelNew={() => setCreating(false)}
            onSaved={async () => {
              setCreating(false);
              await load();
            }}
          />
        )}
        {plans.map((plan) => (
          <PlanForm key={plan.id} initial={plan} onSaved={load} />
        ))}
      </div>
    </div>
  );
}
