"use client";

import { useEffect, useState } from "react";
import { Lock, Save } from "lucide-react";
import RewardBuilder from "./RewardBuilder";
import ConditionSelector from "./ConditionSelector";
import { Field, SelectField, Textarea, Toggle } from "./AdminFields";
import type { AdminAchievement, AdminReward, RewardBundle } from "./admin-gamification-types";
import GamificationProgress from "../../../../components/gamification/GamificationProgress";
import RewardChips from "../../../../components/gamification/RewardChips";
import { useTranslation } from "../../../../src/i18n/useTranslation";

type AchievementFormState = {
  name: string;
  description: string;
  condition: string;
  requiredValue: number;
  visible: boolean;
  rewards: AdminReward[];
  rewardBundleId: string;
};

const initialState: AchievementFormState = {
  name: "",
  description: "",
  condition: "FIRST_COURSE",
  requiredValue: 1,
  visible: true,
  rewards: [],
  rewardBundleId: "",
};

export default function AchievementAdminForm({
  initial,
  bundles,
  onSubmit,
}: {
  initial?: Partial<AdminAchievement>;
  bundles: RewardBundle[];
  onSubmit: (payload: AchievementFormState) => Promise<void>;
}) {
  const t = useTranslation();
  const [form, setForm] = useState<AchievementFormState>(initialState);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setForm({
      ...initialState,
      name: initial.name ?? "",
      description: initial.description ?? "",
      condition: initial.condition ?? "FIRST_COURSE",
      requiredValue: initial.requiredValue ?? 1,
      visible: initial.visible ?? true,
      rewards: initial.rewards ?? [],
    });
  }, [initial]);

  const selectedBundle = bundles.find((bundle) => bundle.id === form.rewardBundleId);
  const previewRewards = selectedBundle?.rewards ?? form.rewards;

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit({ ...form, rewards: previewRewards });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-5 rounded-md border border-zinc-800 bg-[#111111] p-5">
        <Field label={t("items.name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <Textarea label={t("items.description")} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
        <ConditionSelector
          value={form.condition}
          onChange={(value) => setForm((current) => ({ ...current, condition: value }))}
          onDefaultValue={(value) => setForm((current) => ({ ...current, requiredValue: value }))}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={t("gamification.requiredValue")}
            type="number"
            min={1}
            value={String(form.requiredValue)}
            onChange={(value) => setForm((current) => ({ ...current, requiredValue: Number(value) }))}
          />
          <Toggle label={t("gamification.visible")} checked={form.visible} onChange={(value) => setForm((current) => ({ ...current, visible: value }))} />
        </div>
        <SelectField
          label={t("gamification.reusablePack")}
          value={form.rewardBundleId}
          onChange={(value) => setForm((current) => ({ ...current, rewardBundleId: value }))}
          options={[{ value: "", label: t("gamification.createOwnRewards") }, ...bundles.map((bundle) => ({ value: bundle.id, label: bundle.name }))]}
        />
        {!form.rewardBundleId ? (
          <RewardBuilder value={form.rewards} onChange={(rewards) => setForm((current) => ({ ...current, rewards }))} />
        ) : null}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || !form.name || !form.description}
          className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-3 font-bold text-black disabled:opacity-50"
        >
          <Save size={16} />
          {t("gamification.saveAchievement")}
        </button>
      </section>

      <aside className="rounded-md border border-zinc-800 bg-[#111111] p-5">
        <h2 className="text-xl font-black">{t("gamification.preview")}</h2>
        <article className="mt-4 rounded-lg border border-white/10 bg-black p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#d5ff3f] text-black">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black">{form.name || t("gamification.achievementNamePreview")}</h3>
              <p className="mt-1 text-sm text-white/60">
                {form.description || t("gamification.userVisibleDescription")}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <GamificationProgress current={Math.floor(form.requiredValue / 2)} target={form.requiredValue} />
          </div>
          <div className="mt-4">
            <RewardChips rewards={previewRewards} />
          </div>
        </article>
      </aside>
    </div>
  );
}
