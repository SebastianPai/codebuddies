"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import MissionCard from "../../../../components/gamification/MissionCard";
import RewardBuilder from "./RewardBuilder";
import ConditionSelector from "./ConditionSelector";
import { Field, SelectField, Textarea, Toggle } from "./AdminFields";
import type { AdminMission, AdminReward, RewardBundle } from "./admin-gamification-types";
import { useTranslation } from "../../../../src/i18n/useTranslation";

type MissionFormState = {
  name: string;
  description: string;
  condition: string;
  cadence: string;
  requiredValue: number;
  active: boolean;
  visibility: string;
  repeatable: boolean;
  startsAt: string;
  endsAt: string;
  rewards: AdminReward[];
  rewardBundleId: string;
  notifyUsers: boolean;
};

const initialState: MissionFormState = {
  name: "",
  description: "",
  condition: "COMPLETE_PROFILE",
  cadence: "PERMANENT",
  requiredValue: 1,
  active: true,
  visibility: "VISIBLE",
  repeatable: false,
  startsAt: "",
  endsAt: "",
  rewards: [],
  rewardBundleId: "",
  notifyUsers: false,
};

export default function MissionAdminForm({
  initial,
  bundles,
  onSubmit,
}: {
  initial?: Partial<AdminMission>;
  bundles: RewardBundle[];
  onSubmit: (payload: MissionFormState) => Promise<void>;
}) {
  const t = useTranslation();
  const [form, setForm] = useState<MissionFormState>(initialState);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setForm({
      ...initialState,
      name: initial.name ?? "",
      description: initial.description ?? "",
      condition: initial.condition ?? "COMPLETE_PROFILE",
      cadence: initial.cadence ?? "PERMANENT",
      requiredValue: initial.requiredValue ?? 1,
      active: initial.active ?? true,
      visibility: initial.visibility ?? "VISIBLE",
      repeatable: initial.repeatable ?? false,
      startsAt: initial.startsAt ? initial.startsAt.slice(0, 16) : "",
      endsAt: initial.endsAt ? initial.endsAt.slice(0, 16) : "",
      rewards: initial.rewards ?? [],
      rewardBundleId: "",
      notifyUsers: false,
    });
  }, [initial]);

  const selectedBundle = bundles.find((bundle) => bundle.id === form.rewardBundleId);
  const previewRewards = selectedBundle?.rewards ?? form.rewards;

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        rewards: previewRewards,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-5 rounded-md border border-zinc-800 bg-[#111111] p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("items.name")} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <SelectField
            label={t("gamification.cadence")}
            value={form.cadence}
            onChange={(value) => setForm((current) => ({ ...current, cadence: value }))}
            options={[
              { value: "PERMANENT", label: t("gamification.permanent") },
              { value: "DAILY", label: t("gamification.daily") },
              { value: "WEEKLY", label: t("gamification.weekly") },
              { value: "MONTHLY", label: t("gamification.monthly") },
              { value: "EVENT", label: t("gamification.event") },
              { value: "SPECIAL", label: t("gamification.special") },
            ]}
          />
        </div>

        <Textarea label={t("items.description")} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />

        <ConditionSelector
          value={form.condition}
          onChange={(value) => setForm((current) => ({ ...current, condition: value }))}
          onDefaultValue={(value) => setForm((current) => ({ ...current, requiredValue: value }))}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label={t("gamification.requiredValue")}
            type="number"
            min={1}
            value={String(form.requiredValue)}
            onChange={(value) => setForm((current) => ({ ...current, requiredValue: Number(value) }))}
          />
          <Field label={t("gamification.startDate")} type="datetime-local" value={form.startsAt} onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))} />
          <Field label={t("gamification.endDate")} type="datetime-local" value={form.endsAt} onChange={(value) => setForm((current) => ({ ...current, endsAt: value }))} />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Toggle label={t("gamification.activeFemale")} checked={form.active} onChange={(value) => setForm((current) => ({ ...current, active: value }))} />
          <Toggle label={t("gamification.repeatable")} checked={form.repeatable} onChange={(value) => setForm((current) => ({ ...current, repeatable: value }))} />
          <Toggle label={t("gamification.visible")} checked={form.visibility === "VISIBLE"} onChange={(value) => setForm((current) => ({ ...current, visibility: value ? "VISIBLE" : "HIDDEN" }))} />
          <Toggle label={t("gamification.notifyUsers")} checked={form.notifyUsers} onChange={(value) => setForm((current) => ({ ...current, notifyUsers: value }))} />
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
          {t("gamification.saveMission")}
        </button>
      </section>

      <aside className="rounded-md border border-zinc-800 bg-[#111111] p-5">
        <h2 className="text-xl font-black">{t("gamification.preview")}</h2>
        <div className="mt-4">
          <MissionCard
            mission={{
              id: "preview",
              name: form.name || t("gamification.missionNamePreview"),
              description: form.description || t("gamification.userVisibleDescription"),
              cadence: form.cadence,
              condition: form.condition,
              requiredValue: form.requiredValue,
              rewards: previewRewards,
              progress: {
                currentValue: Math.min(Math.floor(form.requiredValue / 2), form.requiredValue),
                targetValue: form.requiredValue,
                status: "IN_PROGRESS",
                percentage: 50,
              },
            }}
            onClaim={() => undefined}
          />
        </div>
      </aside>
    </div>
  );
}
